// Native app and PostgreSQL, fictional poll, two browser sessions. No production
// volumes/configuration or external network; only loopback in a private netns.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {output} from './specs.mjs';
process.umask(0o077);
const dir=process.argv.includes('--symfony-oct28')?'/var/lib/utilibre-maintenance/security-20261028/symfony/pollaris':output+'/pollaris',b=JSON.parse(fs.readFileSync(dir+'/build.json'));
const db='utilibre-php-pollaris-db-check',app='utilibre-php-pollaris-app-check';
const database='sha256:34bce7234d7454085fd6131efd1471061e0e36e47e83baa4cd56ec9fbf1d63c3';
const run=(exe,args,o={})=>{try{return cp.execFileSync(exe,args,{encoding:'utf8',timeout:120000,maxBuffer:2*1024**2,stdio:['ignore','pipe','pipe'],...o}).trim();}catch(e){fs.writeFileSync(dir+'/application-error.log',String(e.stdout||'')+String(e.stderr||''));throw Error('Pollaris isolated workflow failed; private diagnostic retained');}};
const docker=(...args)=>run('docker',args);
const limits=['--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','384m','--memory-swap','384m','--pids-limit','96','--log-driver','none','--tmpfs','/tmp:rw,size=32m,mode=1777'];
assert.equal(docker('image','inspect','--format','{{.Id}}',b.candidate),b.imageId);
for(const n of [db,app])assert.equal(docker('ps','-aq','--filter','name=^/'+n+'$'),'');
let dbCreated=false,appCreated=false;
try{
 docker('run','-d','--name',db,...limits,'--network','none','--user','70:70','--tmpfs','/var/lib/postgresql/data:rw,size=128m,mode=0700,uid=70,gid=70','--tmpfs','/var/run/postgresql:rw,size=16m,mode=0700,uid=70,gid=70','-e','POSTGRES_USER=fixture','-e','POSTGRES_PASSWORD=fictional-only-password','-e','POSTGRES_DB=fictional',database,'postgres','-c','shared_buffers=16MB','-c','max_connections=10','-c','log_statement=none');dbCreated=true;
 for(let n=0;n<45;n++){try{assert.equal(docker('exec','-e','PGPASSWORD=fictional-only-password',db,'psql','-h','127.0.0.1','-U','fixture','-d','fictional','-Atc','SELECT 1'),'1');break;}catch{if(n===44)throw Error('Fictional database not ready');await new Promise(r=>setTimeout(r,500));}}
 const env={APP_ENV:'prod',APP_DEBUG:'0',APP_SECRET:'fictional-isolated-key-not-production',APP_BASE_URL:'http://127.0.0.1:8080',APP_NAME:'Fictional Pollaris check',APP_REQUIRE_EMAILS:'false',APP_TIMEZONE:'UTC',APP_SHARE_DIR:'var/share',POLL_EXPIRES_COMPLETED:'',POLL_EXPIRES_INCOMPLETE:'',DATABASE_URL:'postgresql://fixture:fictional-only-password@127.0.0.1:5432/fictional?serverVersion=17&charset=utf8',MAILER_DSN:'null://null',MAILER_FROM:'fictional@example.invalid',MAILER_FROM_NAME:'Fictional',MESSENGER_TRANSPORT_DSN:'doctrine://default?auto_setup=1'};
 docker('run','-d','--name',app,...limits,'--network','container:'+db,'--user','82:82','--tmpfs','/app/var:rw,size=96m,mode=0700,uid=82,gid=82',...Object.entries(env).flatMap(([k,v])=>['-e',k+'='+v]),'--entrypoint','sleep',b.imageId,'420');appCreated=true;
 docker('exec',app,'php','bin/console','doctrine:schema:create','--no-interaction','--quiet');
 docker('exec',app,'php','bin/console','messenger:setup-transports','--no-interaction','--quiet');
 docker('exec','-d',app,'php','-S','127.0.0.1:8080','-t','public');
 const pid=docker('inspect','--format','{{.State.Pid}}',app);
 const browser=run('nsenter',['-t',pid,'-n',process.execPath,new URL('./pollaris-browser.mjs',import.meta.url).pathname],{env:{PATH:process.env.PATH,LANG:'C.UTF-8',UTILIBRE_ISOLATED_POLLARIS:'1'}});
 const result=JSON.parse(browser);assert(result.passed&&result.twoSessions&&result.pollDeleted);
 docker('exec',app,'php','bin/console','messenger:consume','async','scheduler_default','--time-limit=2','--memory-limit=96M','--no-interaction','--quiet');
 fs.writeFileSync(dir+'/application.json',JSON.stringify({date:new Date().toISOString(),imageId:b.imageId,passed:true,databaseImage:database,...result,workerStarted:true,checks:['Native PostgreSQL schema in disposable tmpfs','Create poll through actual HTTP UI','Independent guest vote','CSV export','Invalid management-token denial','Native deletion and subsequent 404','Queue/scheduler worker startup'],network:'No external interface; shared loopback namespace',limitations:['Linux Chromium only','Synthetic new database, not a production migration/restore','PHP built-in test HTTP server; native FPM syntax separately verified','No emails delivered']},null,2)+'\n');
 console.log('Pollaris native creation, second-session vote, CSV export, deletion and worker startup passed');
}finally{if(appCreated)docker('rm','-f',app);if(dbCreated)docker('rm','-f','-v',db);}
