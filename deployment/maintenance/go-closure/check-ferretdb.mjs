// Native MongoDB/Gathio regression with fresh fictional data and stopped-copy
// restore. No production database, secret or network access is used.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/go-closure-20261012/ferretdb';
const image='utilibre-ferretdb:2.7.0-mcp-closure-20261012';
const stage=fs.mkdtempSync(root+'/native-'),prefix='maintenance-ferret-closure',pg=prefix+'-pg',ferret=prefix+'-db',app=prefix+'-app';
const docker=(args,input)=>{try{return cp.execFileSync('docker',args,{input,encoding:'utf8',timeout:90000,stdio:['pipe','pipe','pipe']}).trim();}catch(e){fs.writeFileSync(stage+'/error.log',String(e.stderr||e.message));throw Error('Native FerretDB check failed; private error.log');}};
const imageOf=n=>docker(['inspect','--format','{{.Image}}',n]);
const pgImage=imageOf('utilibre-gathio-postgres-1'),appImage=imageOf('utilibre-gathio-gathio-1');
const password=randomBytes(24).toString('hex');
fs.chmodSync(stage,0o755);
for(const [n,uid] of [['data',999],['images',1000]]){fs.mkdirSync(stage+'/'+n,{mode:0o700});fs.chownSync(stage+'/'+n,uid,uid);}
const bounds=['--read-only','--log-driver','none','--cpus','1','--memory','768m','--pids-limit','128','--cap-drop','ALL','--security-opt','no-new-privileges'];
async function ready(args){for(let n=0;n<70;n++){try{docker(args);return;}catch{}await new Promise(r=>setTimeout(r,500));}throw Error('Readiness timed out');}
function stop(){for(const name of [app,ferret,pg])try{docker(['stop','--time','15',name]);docker(['rm',name]);}catch{}}
async function start(data){
 docker(['run','-d','--name',pg,'--network','none',...bounds,'--user','999:999','--tmpfs','/tmp:rw,size=32m,mode=1777','--tmpfs','/var/run/postgresql:rw,size=4m,uid=999,gid=999','-v',data+':/var/lib/postgresql/data','-e','POSTGRES_USER=gathio','-e','POSTGRES_DB=postgres','-e','POSTGRES_PASSWORD='+password,pgImage,'postgres','-c','shared_buffers=32MB','-c','cron.log_run=off','-c','cron.log_statement=off']);
 await ready(['exec',pg,'pg_isready','-U','gathio']);
 docker(['run','-d','--name',ferret,'--network','container:'+pg,...bounds,'--tmpfs','/state:rw,size=4m,mode=1777','-e','FERRETDB_POSTGRESQL_URL=postgres://gathio:'+password+'@127.0.0.1:5432/postgres','-e','FERRETDB_TELEMETRY=disable','-e','FERRETDB_STATE_DIR=/state','-e','FERRETDB_LOG_LEVEL=error',image]);
 docker(['run','-d','--name',app,'--network','container:'+pg,...bounds,'--user','1000:1000','--tmpfs','/tmp:rw,size=32m,mode=1777','-v',path.resolve('deployment/calendar/gathio/config.toml')+':/srv/gathio/config/config.toml:ro','-v',path.resolve('deployment/calendar/gathio/data-notes.md')+':/srv/gathio/static/data-notes.md:ro','-v',stage+'/images:/srv/gathio/public/events','-e','GATHIO_MONGODB_URL=mongodb://gathio:'+password+'@127.0.0.1:27017/gathio',appImage]);
 await ready(['exec',app,'node','-e',"fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]);
}
try{
 await start(stage+'/data');
 for(const f of ['check-gathio-native.mjs','check-gathio-flows.mjs'])docker(['exec','-i',app,'node','--input-type=module'],fs.readFileSync('deployment/calendar/'+f,'utf8'));
 const fixture=JSON.parse(docker(['exec',app,'cat','/tmp/gathio-fixture.json']));
 stop();fs.cpSync(stage+'/data',stage+'/restored',{recursive:true,preserveTimestamps:true});
 function own(d){fs.chownSync(d,999,999);if(fs.statSync(d).isDirectory())for(const f of fs.readdirSync(d))own(d+'/'+f);}own(stage+'/restored');
 await start(stage+'/restored');
 const code=`import assert from 'node:assert/strict';const f=${JSON.stringify(fixture)};for(const id of [f.eventID,f.imported.eventID]){const r=await fetch('http://127.0.0.1:3000/'+id);assert.equal(r.status,200);assert((await r.text()).includes('Fictional revised deployment event'));}const r=await fetch('http://127.0.0.1:3000/events/'+f.eventID+'.jpg');assert.equal(r.status,200);assert((await r.arrayBuffer()).byteLength>20);console.log('Native restored events and image passed');`;
 assert.match(docker(['exec','-i',app,'node','--input-type=module'],code),/passed/);
 const result={date:new Date().toISOString(),imageId:docker(['image','inspect',image,'--format','{{.Id}}']),passed:true,nativeGathioCreateEdit:true,invalidEditTokenDenied:true,imageUpload:true,icsImportExport:true,stoppedDatabaseCopyRestore:true,reopenedOriginalAndImportedEvents:true,network:'none/shared fictional loopback only',productionChanged:false};
 fs.writeFileSync(root+'/native.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{stop();}
