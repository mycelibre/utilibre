// Existing Rallly native fixture, run with this exact curl-only candidate.
import assert from 'node:assert/strict';
import {execFileSync as exec,spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import fs from 'node:fs';
import {chromium} from '../../../portal/node_modules/playwright-core/index.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/bookworm-curl-followup-20261012/images/rallly';
const proof=JSON.parse(fs.readFileSync(dir+'/build.json')),image=proof.imageId;
assert(proof.passed);assert(!fs.existsSync(dir+'/application.json'));
const tag=randomBytes(4).toString('hex'),network='utilibre-curl-rallly-'+tag,db=network+'-db',app=network+'-app',base='http://127.0.0.1:3435';
const docker=(...args)=>exec('docker',args,{encoding:'utf8',timeout:120000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const sql=text=>exec('docker',['exec','-i',db,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','rallly','-d','rallly'],{input:text,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
async function ready(fn){for(let n=0;n<100;n++){try{if(await fn())return;}catch{}await new Promise(r=>setTimeout(r,500));}throw Error('Native Rallly readiness timeout');}
let bridge,browser;
try{
 docker('network','create','--internal',network);
 const password=randomBytes(32).toString('hex');
 docker('run','-d','--name',db,'--network',network,'--memory','256m','--cpus','1','--pids-limit','128','--log-driver','none','--tmpfs','/var/lib/postgresql/data:rw,size=256m','-e','POSTGRES_USER=rallly','-e','POSTGRES_DB=rallly','-e','POSTGRES_PASSWORD='+password,'postgres@sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73');
 await ready(()=>{docker('exec',db,'pg_isready','-U','rallly');return true;});
 docker('run','-d','--name',app,'--network',network,'--memory','768m','--cpus','1','--pids-limit','128','--log-driver','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--tmpfs','/tmp:rw,size=64m,mode=1777','--tmpfs','/app/apps/web/.next/cache:rw,size=64m,uid=1001,gid=1001','-e',`DATABASE_URL=postgres://rallly:${password}@${db}:5432/rallly`,'-e','SECRET_PASSWORD='+randomBytes(32).toString('hex'),'-e','NEXT_PUBLIC_BASE_URL='+base,'-e','NEXT_TELEMETRY_DISABLED=1','-e','SUPPORT_EMAIL=operator@example.invalid','-e','NOREPLY_EMAIL=no-reply@example.invalid','-e','REGISTRATION_ENABLED=false','-e','EMAIL_LOGIN_ENABLED=false',image);
 const ip=docker('inspect',app,'--format','{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}');
 bridge=spawn('socat',['TCP4-LISTEN:3435,bind=127.0.0.1,reuseaddr,fork',`TCP4:${ip}:3000`],{detached:true,stdio:'ignore'});
 await ready(async()=>{if(bridge.exitCode!==null)throw Error('Local fixture listener unavailable');return (await fetch(base+'/login',{signal:AbortSignal.timeout(1000)})).ok;});
 const id='utilibrecurl'+tag;
 sql(`BEGIN; INSERT INTO polls(id,title,updated_at,disable_comments,muted) VALUES ('${id}','Fictional curl review',now(),true,true); INSERT INTO options(id,poll_id,start_time) VALUES ('${id}a','${id}','2026-12-10 00:00:00'),('${id}b','${id}','2026-12-11 00:00:00'); COMMIT;`);
 browser=await chromium.launch();const context=await browser.newContext();const page=await context.newPage(),outside=new Set(),errors=[];
 page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==base)outside.add(new URL(r.url()).origin);});page.on('pageerror',e=>errors.push(e.message));
 assert.equal((await page.goto(base+'/invite/'+id)).status(),200);await page.getByText('Fictional curl review',{exact:true}).waitFor();
 assert.deepEqual([...outside],[]);assert.deepEqual(errors,[]);
 const report={date:new Date().toISOString(),imageId:image,passed:true,nativeMigrations:true,fictionalInviteRendered:true,network:'internal; no external browser origins',limitations:['Isolated native invite render, not organizer account creation or a production-data check.']};
 fs.writeFileSync(dir+'/application.json',JSON.stringify(report,null,2)+'\n');console.log('Rallly: native migrations and fictional invite render passed.');
}catch(e){fs.writeFileSync(dir+'/application-error.txt',String(e.stderr||e.message));throw Error('Rallly candidate failed; private diagnostic retained.');}
finally{if(browser)await browser.close();if(bridge?.pid)try{process.kill(-bridge.pid,'SIGTERM');}catch{}for(const name of [app,db])try{docker('rm','-f','-v',name);}catch{}try{docker('network','rm',network);}catch{}}
