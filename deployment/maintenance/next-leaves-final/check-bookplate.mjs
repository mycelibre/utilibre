// Disposable native PostgreSQL + production image; no existing account data.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {request,chromium} from '../../../portal/node_modules/playwright/index.mjs';
import {profile,november} from './profile.mjs';
const {image,dir,next}=profile;
const base='http://172.29.240.10:3000',net='maintenance-bookplate-next-native',db=net+'-db',app=net+'-app';
mkdirSync(dir,{recursive:true,mode:0o700});
const docker=args=>{try{return execFileSync('docker',args,{encoding:'utf8',timeout:60000,stdio:['ignore','pipe','pipe']});}catch(e){if(november)writeFileSync(dir+'/native-command-error.log',String(e.stdout||'')+String(e.stderr||'')+'\nExit: '+e.status+' Signal: '+e.signal+'\n',{mode:0o600});throw Error('Bookplate staging command failed; private diagnostic retained');}};
const secret=randomBytes(32).toString('hex'),created=[],contexts=[],checks=[];let browser;
try{
 docker(['network','create','--internal','--subnet','172.29.240.0/24',net]);created.push(['network','rm',net]);
 docker(['run','-d','--name',db,'--network',net,'--log-driver','none','--memory','256m','--cpus','.5','--tmpfs','/var/lib/postgresql/data:rw,size=128m','-e','POSTGRES_PASSWORD='+secret,'-e','POSTGRES_USER=bookplate','-e','POSTGRES_DB=bookplate','postgres:16-alpine@sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea']);created.push(['rm','-f','-v',db]);
 for(let i=0;i<30;i++){try{docker(['exec',db,'pg_isready','-U','bookplate']);break;}catch{}await new Promise(r=>setTimeout(r,500));}
 // Only this isolated provisioning fixture has open registration; production
 // stays closed. Native PoW is not part of this version-regression check.
 docker(['run','-d','--name',app,'--network',net,'--ip','172.29.240.10','--log-driver','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','768m','--cpus','1','--user','1000:1000','--tmpfs','/tmp:size=32m','--tmpfs','/data/uploads:uid=1000,gid=1000,size=32m','-e',`DATABASE_URL=postgres://bookplate:${secret}@${db}:5432/bookplate`,'-e','AUTH_SECRET='+secret,'-e','PUBLIC_URL='+base,'-e','REGISTRATION=open','-e','SIGNUP_BOT_CHECK=false',image]);created.push(['rm','-f','-v',app]);
 let ready=false;for(let i=0;i<60;i++){try{const r=await fetch(base+'/api/health');if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
 assert(ready,'Synthetic candidate startup');
 const users=[0,1].map(i=>({name:'Fictional Security Reader '+i,email:`fictional-${i}@example.invalid`,password:randomBytes(24).toString('hex')}));
 for(const user of users){
  const c=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});contexts.push(c);
   const r=await c.post('/api/auth/sign-up/email',{data:user});assert.equal(r.status(),200,'Native stage registration');
 }
 const [a,b]=contexts,id='fictional-'+randomUUID(),book={id,title:'Fictional Security Field Notes',author:'Example Author',status:'reading',rating:0,colorIndex:0,pages:120,genre:'Fiction',addedAt:new Date().toISOString()};
 assert((await a.put('/api/books/'+id,{data:book})).ok());
 assert((await (await a.get('/api/books')).json()).books.some(x=>x.id===id));
 assert(!(await (await b.get('/api/books')).json()).books.some(x=>x.id===id));
 const guest=await request.newContext({baseURL:base});contexts.push(guest);assert.equal((await guest.get('/api/books')).status(),401);
 const exported=await a.get('/api/export');assert(exported.ok());const zip=await exported.body();assert.equal(zip.subarray(0,2).toString(),'PK');
 checks.push('Native account creation, saved book, A/B isolation, anonymous denial and ZIP export');
 browser=await chromium.launch();const c=await browser.newContext({storageState:await a.storageState()}),p=await c.newPage(),external=[],errors=[];
 p.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==base)external.push(new URL(r.url()).origin);});p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base,{waitUntil:'networkidle'});await p.getByText(book.title,{exact:true}).first().waitFor();await p.reload({waitUntil:'networkidle'});await p.getByText(book.title,{exact:true}).first().waitFor();
 if(november){await p.setViewportSize({width:390,height:844});await p.evaluate(()=>document.fonts.ready);assert(await p.evaluate(()=>document.fonts.check('16px Inter','Fictional café, acción, ñ')&&document.fonts.check('24px Fraunces','Fictional café')));await p.screenshot({path:dir+'/bookplate-mobile.png',fullPage:true});checks.push('390px simulated viewport and preserved local fonts loaded; no real-phone claim');}
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
 assert((await a.delete('/api/books/'+id)).ok());assert(!(await (await a.get('/api/books')).json()).books.some(x=>x.id===id));
 checks.push('Chromium saved-library render/reload, native book deletion; no external browser requests or script errors');
 assert.equal(docker(['exec',app,'node','-p','require("next/package.json").version']).trim(),next);
 if(november){
  const spec=JSON.parse(readFileSync(new URL('../security-20261103/bookplate-inputs.json',import.meta.url))),sha=b=>createHash('sha256').update(b).digest('hex');
  const lock=readFileSync(dir+'/package-lock.json');assert.equal(sha(lock),spec.lockSha256);
  const before=execFileSync('git',['show',spec.baselineCommit+':deployment/bookplate/security-package-lock.json'],{encoding:'utf8'});assert.equal(sha(before),spec.baselineLockSha256);
  const oldPackage=JSON.parse(before).packages['node_modules/markdown-it'],archive=readFileSync('/var/lib/utilibre-maintenance/security-20261103/markmap/dependencies/markdown-it-14.3.2.tgz');assert.equal('sha512-'+createHash('sha512').update(archive).digest('base64'),oldPackage.integrity);writeFileSync(dir+'/markdown-baseline.tgz',archive);
  const code=`const a=require('assert/strict'),before=require('markdown-it-baseline')(),after=require('markdown-it')();a.equal(require('markdown-it/package.json').version,'14.3.3');const examples=['# Fictional café\\n\\n- acción, ñ\\n- second item','[label]: /local "Title"\\n\\n[label]','**strong** and '+String.fromCharCode(96)+'code'+String.fromCharCode(96),'[a]: /u "'+'x\\n'.repeat(2048),'['+'a\\n'.repeat(2048)];for(const text of examples)a.equal(after.render(text),before.render(text));a(after.render(examples[1]).includes('href="/local"'));console.log(JSON.stringify({passed:true,markdownCases:examples.length,regressionReproduced:false,limitation:'Bounded compatibility checks; no parser timing or Vite exploit reproduction.'}));`;
  writeFileSync(dir+'/markdown-check.cjs',code);
  const script='mkdir /work/app; cd /work/app; cp /input/package.json /input/package-lock.json .; npm ci --offline --ignore-scripts --no-audit --no-fund --cache=/cache >/work/npm.log; mkdir node_modules/markdown-it-baseline; tar -xzf /input/markdown-baseline.tgz --strip-components=1 -C node_modules/markdown-it-baseline; cp /input/markdown-check.cjs .; node markdown-check.cjs';
  const native=JSON.parse(docker(['run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','2g','--memory-swap','2g','--cpus','1','--pids-limit','64','--log-driver','none','--tmpfs','/work:rw,exec,size=2g','--tmpfs','/tmp:rw,size=16m','-v',dir+':/input:ro','-v',dir+'/npm-cache:/cache:ro',spec.compiler,'sh','-ec',script]));assert(native.passed);
  const scans=[];for(const[state,bytes]of [['baseline',before],['candidate',lock]]){
   const d=dir+'/scan-'+state;mkdirSync(d,{recursive:true});writeFileSync(d+'/package-lock.json',bytes);
   execFileSync('/opt/utilibre/maintenance/bin/trivy',['fs','--disable-telemetry','--cache-dir','/var/cache/utilibre-security','--cache-backend','memory','--scanners','vuln','--offline-scan','--skip-db-update','--skip-java-db-update','--parallel','1','--timeout','1m','--no-progress','--format','json','--output',dir+'/'+state+'-dependencies-scan.json',d],{timeout:90000,stdio:['ignore','pipe','pipe'],env:{PATH:'/usr/bin:/bin',TRIVY_SKIP_VERSION_CHECK:'true'}});
   const scan=JSON.parse(readFileSync(dir+'/'+state+'-dependencies-scan.json'));assert(scan.Results.some(r=>r.Type==='npm'));const findings=scan.Results.flatMap(r=>r.Vulnerabilities||[]);scans.push({state,highCritical:findings.filter(v=>['CRITICAL','HIGH'].includes(v.Severity)).length,advisories:findings.map(v=>v.VulnerabilityID)});
  }
  assert.equal(scans[0].highCritical,2);assert.equal(scans[1].highCritical,0);
  writeFileSync(dir+'/bookplate-dependencies.json',JSON.stringify({date:new Date().toISOString(),passed:true,lockSha256:spec.lockSha256,sourceHighCritical:0,native,scans,databaseSha256:sha(readFileSync('/var/cache/utilibre-security/db/trivy.db')),network:'none; isolated native app and dependency fixtures',productionChanged:false},null,2)+'\n');
 }
 writeFileSync(dir+'/bookplate-native.json',JSON.stringify({date:new Date().toISOString(),status:'passed',passed:true,image,imageId:docker(['image','inspect','--format','{{.Id}}',image]).trim(),checks,scope:'Isolated synthetic accounts and RAM-backed database; not public-edge or real-user migration evidence'},null,2)+'\n',{mode:0o600});
 console.log('Bookplate patched Next.js: '+checks.join('; '));
}finally{await browser?.close();for(const c of contexts)await c.dispose();for(const args of created.reverse())docker(args);}
