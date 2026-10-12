// New synthetic database only; no production account, credentials or records.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {chromium} from '../../../../portal/node_modules/playwright/index.mjs';
process.umask(0o077);
const rollback=process.argv[2]==='--privacy-rollback',closure=process.argv[2]==='--closure';assert(!process.argv[2]||rollback||closure);
const image=closure?'utilibre-spliit:1.29.0-js-closure-20261012':rollback?'utilibre-spliit:1.29.0-privacy-rollback-20261011':'utilibre-spliit:1.29.0-mysql-security-20261011';
const report=fs.mkdtempSync('/opt/utilibre/reports/app-leaves-spliit-native-');
const network='maintenance-spliit-leaves-'+randomBytes(4).toString('hex'),db=network+'-db',app=network+'-app',origin='http://127.0.0.1:3434';
const docker=(...args)=>cp.execFileSync('docker',args,{encoding:'utf8',timeout:90000,stdio:['ignore','pipe','pipe'],maxBuffer:2*1024**2});
const pause=()=>new Promise(r=>setTimeout(r,500));let browser,bridge;
try{
 docker('network','create','--internal',network);
 const password=randomBytes(24).toString('hex');
 docker('run','-d','--name',db,'--network',network,'--memory','256m','--cpus','1','--log-driver','none','--tmpfs','/var/lib/postgresql/data:rw,size=256m','-e','POSTGRES_USER=spliit','-e','POSTGRES_DB=spliit','-e','POSTGRES_PASSWORD='+password,'utilibre-postgres:17.11-alpine-gosu-security-20261011-p2');
 let ready=false;for(let n=0;n<60;n++){try{docker('exec',db,'pg_isready','-U','spliit');ready=true;break;}catch{await pause();}}assert(ready);
 docker('run','-d','--name',app,'--network',network,'--read-only','--user','1000:1000','--memory','768m','--cpus','1','--pids-limit','128','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges','--tmpfs','/tmp:rw,size=64m,mode=1777','--tmpfs','/usr/app/.next/cache:rw,size=64m,uid=1000,gid=1000','-e','BASE_URL='+origin,'-e','POSTGRES_PRISMA_URL=postgresql://spliit:'+password+'@'+db+':5432/spliit','-e','POSTGRES_URL_NON_POOLING=postgresql://spliit:'+password+'@'+db+':5432/spliit','-e','NEXT_TELEMETRY_DISABLED=1','-e','CHECKPOINT_DISABLE=1','-e','PRISMA_HIDE_UPDATE_MESSAGE=1','-e','ANALYTICS_PROVIDER=','-e','ENABLE_EXPENSE_DOCUMENTS=false','-e','ENABLE_RECEIPT_EXTRACT=false','-e','ENABLE_CATEGORY_EXTRACT=false',image);
 const ip=docker('inspect',app,'--format','{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}').trim();
 bridge=cp.spawn('socat',['TCP4-LISTEN:3434,bind=127.0.0.1,reuseaddr,fork','TCP4:'+ip+':3000'],{detached:true,stdio:'ignore'});
 ready=false;for(let n=0;n<120;n++){try{if((await fetch(origin+'/api/health/readiness',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}await pause();}assert(ready,'Native migrations and health');
 browser=await chromium.launch();const context=await browser.newContext({locale:'en-US',serviceWorkers:'block'}),page=await context.newPage(),outside=new Set();
 context.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==origin)outside.add(new URL(r.url()).origin);});
 page.setDefaultTimeout(20000);await page.goto(origin+'/groups/create');
 await page.locator('input[name="name"]').fill('Fictional maintenance group');await page.waitForTimeout(250);
 for(const [i,name] of ['Ana Example','Bruno Example','Clara Example'].entries())await page.locator(`input[name="participants.${i}.name"]`).fill(name);
 await page.getByRole('button',{name:'Create',exact:true}).click();await page.waitForURL(/\/groups\/[^/]+\/expenses$/);
 const id=new URL(page.url()).pathname.split('/')[2];await page.goto(`${origin}/groups/${id}/expenses/create`);
 await page.locator('input[name="title"]').fill('Fictional notebooks');await page.locator('input[name="amount"]').fill('60');
 await page.getByTestId('paid-by').click();await page.getByRole('option',{name:'Ana Example',exact:true}).click();await page.getByRole('button',{name:'Create',exact:true}).click();await page.waitForURL(/\/groups\/[^/]+\/expenses$/);
 await page.getByTestId('expense-card').filter({hasText:'Fictional notebooks'}).waitFor();
 const data=await page.evaluate(async path=>(await fetch(path)).json(),`/groups/${id}/expenses/export/json`);
 const csv=await page.evaluate(async path=>(await fetch(path)).text(),`/groups/${id}/expenses/export/csv`);
 assert.equal(data.expenses.length,1);assert.equal(data.expenses[0].amount,6000);assert.equal(data.participants.length,3);assert(csv.includes('Fictional notebooks'));
 await page.reload();await page.getByTestId('expense-card').filter({hasText:'Fictional notebooks'}).waitFor();
 await page.goto(`${origin}/groups/${id}/expenses/${data.expenses[0].id}/edit`);await page.getByRole('button',{name:'Delete',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Yes',exact:true}).click();await page.waitForURL(/\/groups\/[^/]+\/expenses$/);assert.equal(await page.getByTestId('expense-card').count(),0);
 assert.deepEqual([...outside],[]);
 fs.writeFileSync(report+'/result.json',JSON.stringify({status:'passed',date:new Date().toISOString(),image,imageId:docker('image','inspect',image,'--format','{{.Id}}').trim(),blankDatabase:true,nativeGroupAndExpenseCreated:true,jsonCsvExport:true,reloadPersistence:true,nativeExpenseDeletion:true,externalBrowserOrigins:[...outside],productionChanged:false,limitation:'Isolated Chromium desktop workflow; real mobile hardware not tested.'},null,2)+'\n');console.log(report);
}catch(e){fs.writeFileSync(report+'/error.log',String(e.stderr||e.stack));throw Error('Spliit stage failed; private report '+report);}
finally{if(browser)await browser.close();if(bridge?.pid)try{process.kill(-bridge.pid,'SIGTERM');}catch{}for(const name of [app,db])try{docker('rm','-f',name);}catch{}try{docker('network','rm',network);}catch{}}
