// Isolated native migration and fictional poll; no production data or mail.
import assert from 'node:assert/strict';
import {execFileSync as exec,spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';
process.umask(0o077);
const appLeaves=process.argv[2]==='--app-leaves',closure=process.argv[2]==='--closure';assert(!process.argv[2]||appLeaves||closure);
const image=closure?'utilibre-rallly:4.15.4-js-closure-20261012':appLeaves?'utilibre-rallly:4.15.4-mysql-security-20261011':'utilibre-rallly:libraries-security-20261011-p2',tag=randomBytes(4).toString('hex');
const root=closure?'/var/lib/utilibre-maintenance/js-closure-20261012/rallly':'/var/lib/utilibre-maintenance/rallly-libraries-20261011'+(appLeaves?'/mysql':'');await mkdir(root,{recursive:true,mode:0o700});
const network='utilibre-rallly-library-'+tag,db=network+'-db',app=network+'-app',base='http://127.0.0.1:3433';
const docker=(...args)=>exec('docker',args,{encoding:'utf8',timeout:120000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']});
const sql=text=>exec('docker',['exec','-i',db,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','rallly','-d','rallly'],{input:text,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const pause=()=>new Promise(r=>setTimeout(r,500));let bridge,browser;
try{
 docker('network','create','--internal',network);
 const password=randomBytes(32).toString('hex');
 docker('run','-d','--name',db,'--network',network,'--memory','256m','--cpus','1','--log-driver','none','--tmpfs','/var/lib/postgresql/data:rw,size=256m','-e','POSTGRES_USER=rallly','-e','POSTGRES_DB=rallly','-e','POSTGRES_PASSWORD='+password,'postgres@sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73');
 let ready=false;for(let i=0;i<45;i++){try{docker('exec',db,'pg_isready','-U','rallly');ready=true;break;}catch{await pause();}}assert(ready);
 docker('run','-d','--name',app,'--network',network,'--memory','768m','--cpus','1','--pids-limit','128','--log-driver','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--tmpfs','/tmp:rw,size=64m,mode=1777','--tmpfs','/app/apps/web/.next/cache:rw,size=64m,uid=1001,gid=1001','-e',`DATABASE_URL=postgres://rallly:${password}@${db}:5432/rallly`,'-e','SECRET_PASSWORD='+randomBytes(32).toString('hex'),'-e','NEXT_PUBLIC_BASE_URL='+base,'-e','NEXT_TELEMETRY_DISABLED=1','-e','SUPPORT_EMAIL=operator@example.invalid','-e','NOREPLY_EMAIL=no-reply@example.invalid','-e','REGISTRATION_ENABLED=false','-e','EMAIL_LOGIN_ENABLED=false',image);
 const ip=docker('inspect',app,'--format','{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}').trim();
 bridge=spawn('socat',['TCP4-LISTEN:3433,bind=127.0.0.1,reuseaddr,fork',`TCP4:${ip}:3000`],{detached:true,stdio:'ignore'});
 ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/login',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}await pause();}assert(ready,'Native Rallly startup/migrations');
 const id='utilibresecurity'+tag;
 sql(`BEGIN; INSERT INTO polls(id,title,updated_at,disable_comments,muted) VALUES ('${id}','Fictional security review',now(),true,true); INSERT INTO options(id,poll_id,start_time) VALUES ('${id}a','${id}','2026-12-10 00:00:00'),('${id}b','${id}','2026-12-11 00:00:00'); COMMIT;`);
 browser=await chromium.launch();const context=await browser.newContext();const page=await context.newPage();const outside=new Set(),errors=[];
 page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==base)outside.add(new URL(r.url()).origin);});page.on('pageerror',e=>errors.push(e.message));
 assert.equal((await page.goto(base+'/invite/'+id)).status(),200);await page.getByText('Fictional security review',{exact:true}).waitFor();
 await writeFile(root+'/fixture-interface.txt',await page.locator('body').innerText());
 const parser=exec('docker',['exec','-i',app,'node','-'],{input:await readFile('deployment/maintenance/check-rallly-xml.cjs'),encoding:'utf8'});
 assert.deepEqual([...outside],[]);assert.deepEqual(errors,[]);
 const report={date:new Date().toISOString(),status:'passed',image,imageId:docker('image','inspect',image,'--format','{{.Id}}').trim(),nativeMigrations:true,fictionalInviteRendered:true,parser:parser.trim(),network:'internal; no external browser origins',limitations:['Isolated invite render, not an organizer account/poll-creation test']};
 await writeFile(root+'/stage.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(e){await writeFile(root+'/error.txt',String(e.stderr||e.message));throw Error('Rallly candidate failed; private error.txt');}
finally{if(browser)await browser.close();if(bridge?.pid)try{process.kill(-bridge.pid,'SIGTERM');}catch{}for(const name of [app,db])try{docker('rm','-f',name);}catch{}try{docker('network','rm',network);}catch{}}
