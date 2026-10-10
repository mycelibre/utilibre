// Isolated native regression using only ephemeral PostgreSQL and fictional accounts.
// No production connection or data copy; exact containers/network are removed in finally.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFile,writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium,request } from '../../portal/node_modules/playwright-core/index.mjs';
const suffix=randomBytes(4).toString('hex'),network=`utilibre-cv-check-${suffix}`,db=`${network}-db`,app=`${network}-app`;
const port=process.env.UTILIBRE_RESUME_CHECK_PORT||'3430',base=`http://127.0.0.1:${port}`;
const password=randomBytes(30).toString('hex');
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const sql=query=>docker('exec',db,'psql','-U','review','-d','review','-At','-c',query);
const image=process.env.UTILIBRE_RESUME_CHECK_IMAGE||'utilibre-resume:6.0.0-p1';
let browser,owner,anonymous;
try {
 docker('network','create',network);
 docker('run','-d','--name',db,'--network',network,'--memory','256m','--cpus','1','--pids-limit','128','--log-driver','none','--tmpfs','/var/lib/postgresql/data:rw,size=384m',
  '-e','PGDATA=/var/lib/postgresql/data','-e','POSTGRES_USER=review','-e','POSTGRES_DB=review','-e',`POSTGRES_PASSWORD=${password}`,
  'postgres@sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73');
 let ready=false;for(let i=0;i<30;i++){try{docker('exec',db,'pg_isready','-U','review');ready=true;break;}catch{await new Promise(r=>setTimeout(r,500));}}assert(ready,'Test database starts');
 docker('run','-d','--name',app,'--network',network,'--memory','768m','--cpus','1','--pids-limit','128','--log-driver','json-file','--log-opt','max-size=256k','--log-opt','max-file=1','-p',`127.0.0.1:${port}:3000`,
  '-e','NODE_ENV=production','-e',`APP_URL=${base}`,'-e',`DATABASE_URL=postgresql://review:${password}@${db}:5432/review`,
  '-e',`AUTH_SECRET=${randomBytes(32).toString('hex')}`,'-e','STORAGE_BACKEND=local','-e','LOCAL_STORAGE_PATH=/app/data',
  '-v',`${fileURLToPath(new URL('./check-resume-no-tracking-start.mjs',import.meta.url))}:/verification/start.mjs:ro`,
  '--entrypoint','node',image,'/verification/start.mjs');
 ready=false;for(let i=0;i<60;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break;}}catch{}if(docker('inspect',app,'--format','{{.State.Running}}')==='false')break;await new Promise(r=>setTimeout(r,500));}
 if(!ready && process.env.UTILIBRE_RESUME_CHECK_REPORT){const log=execFileSync('docker',['logs',app],{encoding:'utf8',stdio:['ignore','pipe','pipe']});await writeFile(process.env.UTILIBRE_RESUME_CHECK_REPORT+'.startup.log',log,{mode:0o600});}
 assert(ready,'Patched test server starts');
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const auth=await request.newContext({baseURL:base});
 const username=`fictional${suffix}`;
 let response=await auth.post('/api/auth/sign-up/email',{headers:{origin:base,referer:base+'/auth/register'},data:{name:'Fictional Privacy Review',email:`${username}@example.test`,password,username,displayUsername:username,callbackURL:'/dashboard'}});
 assert.equal(response.status(),200,'Native fictional registration');
 response=await auth.post('/api/openapi/resumes',{data:{name:'Fictional Privacy Review',tags:[],withSampleData:true}});
 assert.equal(response.status(),200,'Native resume creation');const id=await response.json();
 response=await auth.get(`/api/openapi/resumes/${id}`);assert.equal(response.status(),200);const resume=await response.json();
 resume.data.picture.url='';resume.data.picture.hidden=true;resume.data.basics.name='Fictional Privacy Review';
 response=await auth.patch(`/api/openapi/resumes/${id}/metadata`,{data:{isPublic:true,showDownloadButtons:true,slug:`review-${suffix}`,data:resume.data}});assert.equal(response.status(),200,'Native sharing');
 const publicPath=`/${username}/review-${suffix}`;
 owner=await browser.newContext({baseURL:base,storageState:await auth.storageState()});
 const page=await owner.newPage();await page.goto(`/builder/${id}`);await page.getByRole('button',{name:/^Share\b/}).click();
 const sheet=page.getByRole('dialog',{name:'Share & export'});await sheet.waitFor();
 assert.equal(await sheet.locator('#share-stats-title').count(),0,'Owner analytics widget removed');
 assert.equal(await sheet.getByText('Counts are anonymous.').count(),0);
 await page.keyboard.press('Escape');
 // Native JSON export remains available and contains the fictional document.
 await page.getByRole('button',{name:'More download formats',exact:true}).click();
 await page.getByRole('radio',{name:/^JSON/}).click();
 const jsonDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Download JSON',exact:true}).click();
 const exported=await jsonDownload;assert.equal(await exported.failure(),null);
 const json=JSON.parse(await readFile(await exported.path(),'utf8'));assert.equal(json.basics.name,'Fictional Privacy Review');
 anonymous=await browser.newContext({baseURL:base});const visitor=await anonymous.newPage(),events=[];
 visitor.on('request',r=>{if(/statistics.*download|statistics\/recordDownload/.test(r.url()))events.push(r.url());});
 await visitor.goto(publicPath);await visitor.getByRole('button',{name:'Download PDF',exact:true}).first().waitFor();
 const pdfDownload=visitor.waitForEvent('download');await visitor.getByRole('button',{name:'Download PDF',exact:true}).first().click();
 const pdf=await pdfDownload;assert.equal(await pdf.failure(),null);assert.equal((await readFile(await pdf.path())).subarray(0,5).toString(),'%PDF-');
 await visitor.reload();await visitor.getByRole('button',{name:'Download PDF',exact:true}).first().waitFor();
 assert.equal(events.length,0,'Browser must not send visitor-statistics events');
 // An older client or direct caller cannot bypass the server gate.
 response=await anonymous.request.post(`/api/openapi/resumes/${username}/review-${suffix}/statistics/downloads`,{data:{}});
 assert.equal(response.status(),200,'Legacy native download endpoint remains compatible');
 assert.equal(await response.json(),true);
 assert.equal(sql('SELECT count(*) FROM resume_statistics'),'0','No aggregate counter rows');
 assert.equal(sql('SELECT count(*) FROM resume_statistics_daily'),'0','No daily counter rows');
 response=await auth.get(`/api/openapi/resumes/${id}/statistics`);const stats=await response.json();
 assert.equal(stats.views,0);assert.equal(stats.downloads,0);assert.equal(stats.lastViewedAt,null);assert.equal(stats.lastDownloadedAt,null);
 // Turning sharing off still denies the anonymous visitor.
 response=await auth.patch(`/api/openapi/resumes/${id}/metadata`,{data:{isPublic:false}});assert.equal(response.status(),200);
 response=await anonymous.request.get(`/api/openapi/resumes/${username}/review-${suffix}`);assert.equal(response.status(),404);
 const report={date:new Date().toISOString(),image,nativeOwnerRead:true,nativeJsonExport:true,publicReadAndPdf:true,sharingAndPrivateDenial:true,browserStatisticsRequests:0,aggregateRows:0,dailyRows:0,dedupAndIdentifierTripwiresNotReached:true,directDownloadEndpointCannotCount:true,fictionalOnly:true};
 if(process.env.UTILIBRE_RESUME_CHECK_REPORT)await writeFile(process.env.UTILIBRE_RESUME_CHECK_REPORT,JSON.stringify(report,null,2));
 console.log('Native owner/public/PDF/JSON/sharing checks passed; visitor identifier/dedup tripwires stayed unreachable and both counter tables stayed empty.');
 await auth.dispose();
} finally {
 await owner?.close();await anonymous?.close();await browser?.close();
 for(const name of [app,db]){try{docker('rm','-f',name);}catch{}}
 try{docker('network','rm',network);}catch{}
 console.log('Exact isolated test containers and synthetic database removed.');
}
