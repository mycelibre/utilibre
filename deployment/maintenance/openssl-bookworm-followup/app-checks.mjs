// Exercise the unchanged native consumers using fictional, disposable state.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/openssl-bookworm-followup-20261012',here=new URL('.',import.meta.url).pathname;
const run=(args,input)=>{try{return cp.execFileSync('docker',args,{input,encoding:'utf8',timeout:120000,maxBuffer:4*1024**2,stdio:['pipe','pipe','pipe']}).trim();}catch(e){fs.writeFileSync(dir+'/application-error.log',String(e.stderr||e));throw Error('Isolated application gate failed; private diagnostics retained.');}};
const limits=['--network','none','--cpus','1','--memory','1g','--pids-limit','128','--security-opt','no-new-privileges','--log-driver','none'];
async function ready(fn){for(let n=0;n<90;n++){try{if(fn())return;}catch{}await new Promise(r=>setTimeout(r,500));}throw Error('Native readiness timeout');}
const selected=process.argv.slice(2);assert(selected.every(k=>['kuma','gathio','rssbridge'].includes(k)));
for(const s of JSON.parse(fs.readFileSync(here+'specs.json')).filter(s=>['kuma','gathio','rssbridge'].includes(s.key)&&(!selected.length||selected.includes(s.key)))){
 const out=dir+'/images/'+s.key,build=JSON.parse(fs.readFileSync(out+'/build.json')),name='maintenance-bookworm-openssl-'+s.key;
 assert.equal(run(['image','inspect','--format','{{.Id}}',s.candidate]),build.imageId);
 assert(!fs.existsSync(out+'/application.json'));let created=false;
 const result={date:new Date().toISOString(),imageId:build.imageId,passed:false,fictionalDataOnly:true,network:'none'};
 try{
  if(s.key==='kuma'){
   run(['run','-d','--name',name,...limits,'--read-only','--user','1000:1000','--cap-drop','ALL','-e','UPTIME_KUMA_DB_TYPE=sqlite','--tmpfs','/app/data:rw,nosuid,nodev,size=128m,uid=1000,gid=1000','--tmpfs','/tmp:rw,nosuid,nodev,size=32m,mode=1777','--mount','type=bind,src='+here+'../sqlite-final/kuma-native.cjs,dst=/tmp/kuma-native.cjs,readonly',s.candidate]);created=true;
   await ready(()=>run(['exec',name,'node','-e',"fetch('http://127.0.0.1:3001/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"])==='');
   assert.match(run(['exec',name,'node','/tmp/kuma-native.cjs']),/authenticated Socket/);
   result.nativeSetupLogin=true;result.noNotificationSent=true;
  }else if(s.key==='rssbridge'){
   run(['run','-d','--name',name,...limits,'--read-only','--cap-drop','ALL','--user','33:33','--tmpfs','/tmp:rw,nosuid,nodev,size=16m,mode=1777','--tmpfs','/app/cache:rw,nosuid,nodev,size=32m,uid=33,gid=33','--entrypoint','php',s.candidate,'-S','127.0.0.1:9080','-t','/app']);created=true;
   await ready(()=>/RSS-Bridge/.test(run(['exec',name,'php','-r',"echo file_get_contents('http://127.0.0.1:9080/');"])));
   result.nativeHomepage=true;result.limitation='No external feed/source fetched. Separate native PHP curl HTTP/TLS check passed.';
  }else{
   run(['run','-d','--name',name,...limits,'--tmpfs','/var/lib/postgresql/data:rw,size=768m','--tmpfs','/tmp:rw,size=64m','-e','POSTGRES_HOST_AUTH_METHOD=trust','--entrypoint','sh',s.candidate,'-ec','openssl req -x509 -newkey rsa:2048 -nodes -days 1 -keyout /tmp/key.pem -out /tmp/cert.pem -subj /CN=localhost -addext subjectAltName=DNS:localhost >/dev/null 2>&1; chmod 600 /tmp/key.pem; chown postgres:postgres /tmp/key.pem; exec docker-entrypoint.sh postgres -c shared_buffers=32MB -c max_connections=10 -c log_statement=none -c log_min_error_statement=panic -c ssl=on -c ssl_cert_file=/tmp/cert.pem -c ssl_key_file=/tmp/key.pem']);created=true;
   const sql=q=>run(['exec','-i',name,'psql','-h','127.0.0.1','-U','postgres','-v','ON_ERROR_STOP=1','-At'],q);
   await ready(()=>sql('SELECT 1;')==='1');assert.match(sql('SHOW server_version;'),/^17\.11/);
   assert.match(sql("SELECT extversion FROM pg_extension WHERE extname='documentdb';"),/^0\.107/);
   const tls=run(['exec',name,'psql','host=localhost user=postgres dbname=postgres sslmode=verify-full sslrootcert=/tmp/cert.pem','-Atc','SELECT ssl,version FROM pg_stat_ssl WHERE pid=pg_backend_pid();']);assert.match(tls,/^t\|TLSv1\.[23]$/);
   assert.throws(()=>run(['exec',name,'psql','host=wrong.invalid hostaddr=127.0.0.1 user=postgres dbname=postgres sslmode=verify-full sslrootcert=/tmp/cert.pem','-Atc','SELECT 1;']));result.nativePostgresTlsAndWrongHost=true;
   sql(`CREATE EXTENSION IF NOT EXISTS postgis;CREATE TABLE openssl_fixture(id integer PRIMARY KEY,payload documentdb_core.bson,geom geometry(Point,4326));INSERT INTO openssl_fixture VALUES(1,'{"fictional":true,"label":"Ficción"}'::documentdb_core.bson,ST_SetSRID(ST_Point(-90.5,14.6),4326));CREATE ROLE fixture_reader LOGIN;GRANT SELECT ON openssl_fixture TO fixture_reader;`);
   assert.equal(sql('SELECT round(ST_X(ST_Transform(geom,3857))) FROM openssl_fixture;'),'-10074414');result.nativePostgisProjection=true;
   const expected=sql('SELECT payload::text FROM openssl_fixture;');
   assert.equal(run(['exec',name,'psql','-U','fixture_reader','-d','postgres','-Atc','SELECT payload::text FROM openssl_fixture']),expected);
   assert.throws(()=>run(['exec',name,'psql','-U','fixture_reader','-d','postgres','-v','ON_ERROR_STOP=1','-Atc','DELETE FROM openssl_fixture']));
   const dump=run(['exec',name,'pg_dump','-U','postgres','-t','public.openssl_fixture']);
   sql('DROP TABLE openssl_fixture;');sql(dump);assert.equal(sql('SELECT payload::text FROM openssl_fixture;'),expected);
   result.nativeTypedDataAndIsolation=true;result.logicalRestore=true;
   const sdk=JSON.parse(run(['run','--rm',...limits,'--read-only','--tmpfs','/tmp:rw,size=32m,mode=1777','--user','0','--mount','type=bind,src='+here+'../python-bookworm-followup/sdk-native.py,dst=/sdk.py,readonly','--mount','type=bind,src=/var/lib/utilibre-maintenance/closure-followup-20261012/curl-fixture,dst=/fixture,readonly','--entrypoint','python3',s.candidate,'-B','/sdk.py']));assert(sdk.passed&&sdk.nativeSigV4VerifiedIndependently&&sdk.nativeBarmanUploadListReadDownload);result.nativeSdkTls=sdk;
  }
  result.passed=true;
 }finally{
  if(created)run(['rm','-f','-v',name]);result.completedAt=new Date().toISOString();
  fs.writeFileSync(out+'/application.json',JSON.stringify(result,null,2)+'\n');
 }
 console.log(s.key+': native application gate passed; synthetic state removed.');
}
