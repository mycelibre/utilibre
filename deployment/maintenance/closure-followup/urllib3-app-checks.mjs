// Existing native application checks, with fictional data in isolated tmpfs.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012',here=new URL('.',import.meta.url).pathname;
const run=(args,input)=>{try{return cp.execFileSync('docker',args,{input,encoding:'utf8',timeout:120000,maxBuffer:4*1024**2,stdio:['pipe','pipe','pipe']}).trim();}catch(e){fs.writeFileSync(dir+'/urllib3-application-error.log',String(e.stderr||e));throw Error('Isolated application gate failed; private diagnostics retained');}};
const limits=['--network','none','--cpus','1','--memory','1g','--pids-limit','128','--security-opt','no-new-privileges','--log-driver','none'];
async function ready(fn){for(let n=0;n<90;n++){try{if(fn())return;}catch{}await new Promise(r=>setTimeout(r,500));}throw Error('Readiness timeout');}
for(const s of JSON.parse(fs.readFileSync(here+'urllib3-specs.json'))){
 const out=dir+'/urllib3/'+s.key,build=JSON.parse(fs.readFileSync(out+'/build.json')),name='maintenance-urllib3-'+s.kind;
 assert.equal(run(['image','inspect','--format','{{.Id}}',s.candidate]),build.imageId);
 assert(!fs.existsSync(out+'/application.json'));let created=false;
 const result={date:new Date().toISOString(),imageId:build.imageId,passed:false,fictionalDataOnly:true,network:'none'};
 try{
  if(s.kind==='kuma'){
   run(['run','-d','--name',name,...limits,'--read-only','--user','1000:1000','--cap-drop','ALL','-e','UPTIME_KUMA_DB_TYPE=sqlite','--tmpfs','/app/data:rw,nosuid,nodev,size=128m,uid=1000,gid=1000','--tmpfs','/tmp:rw,nosuid,nodev,size=32m,mode=1777','--mount','type=bind,src='+here+'../sqlite-final/kuma-native.cjs,dst=/tmp/kuma-native.cjs,readonly',s.candidate]);created=true;
   await ready(()=>run(['exec',name,'node','-e',"fetch('http://127.0.0.1:3001/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"])==='');
   assert.match(run(['exec',name,'node','/tmp/kuma-native.cjs']),/authenticated Socket/);
   result.nativeSetupLogin=true;result.noNotificationSent=true;
  }else{
   run(['run','-d','--name',name,...limits,'--tmpfs','/var/lib/postgresql/data:rw,size=512m','--tmpfs','/tmp:rw,size=32m','-e','POSTGRES_HOST_AUTH_METHOD=trust',s.candidate,'postgres','-c','shared_buffers=32MB','-c','max_connections=10','-c','log_statement=none']);created=true;
   const sql=q=>run(['exec','-i',name,'psql','-h','127.0.0.1','-U','postgres','-v','ON_ERROR_STOP=1','-At'],q);
   await ready(()=>sql('SELECT 1;')==='1');assert.match(sql('SHOW server_version;'),/^17\.11/);
   assert.match(sql("SELECT extversion FROM pg_extension WHERE extname='documentdb';"),/^0\.107/);
   sql(`CREATE TABLE urllib3_fixture(id integer PRIMARY KEY,payload documentdb_core.bson);INSERT INTO urllib3_fixture VALUES(1,'{"fictional":true,"label":"Ficción"}'::documentdb_core.bson);CREATE ROLE fixture_reader LOGIN;GRANT SELECT ON urllib3_fixture TO fixture_reader;`);
   const expected=sql('SELECT payload::text FROM urllib3_fixture;');
   assert.equal(run(['exec',name,'psql','-U','fixture_reader','-d','postgres','-Atc','SELECT payload::text FROM urllib3_fixture']),expected);
   assert.throws(()=>run(['exec',name,'psql','-U','fixture_reader','-d','postgres','-v','ON_ERROR_STOP=1','-Atc','DELETE FROM urllib3_fixture']));
   const dump=run(['exec',name,'pg_dump','-U','postgres','-t','public.urllib3_fixture']);
   sql('DROP TABLE urllib3_fixture;');sql(dump);assert.equal(sql('SELECT payload::text FROM urllib3_fixture;'),expected);
   result.nativeTypedDataAndIsolation=true;result.logicalRestore=true;
  }
  result.passed=true;
 }finally{
  if(created)run(['rm','-f','-v',name]);result.completedAt=new Date().toISOString();
  fs.writeFileSync(out+'/application.json',JSON.stringify(result,null,2)+'\n');
 }
 console.log(s.kind+': native application gate passed; synthetic state removed.');
}
