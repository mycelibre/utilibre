// Existing native application journeys, with fictional data in isolated tmpfs.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/python-bookworm-followup-20261012',here=new URL('.',import.meta.url).pathname;
const run=(args,input)=>{try{return cp.execFileSync('docker',args,{input,encoding:'utf8',timeout:120000,maxBuffer:4*1024**2,stdio:['pipe','pipe','pipe']}).trim();}catch(e){fs.writeFileSync(dir+'/application-error.log',String(e.stderr||e));throw Error('Isolated application gate failed; private diagnostics retained');}};
const limits=['--network','none','--cpus','1','--memory','1g','--pids-limit','128','--security-opt','no-new-privileges','--log-driver','none'];
async function ready(fn){for(let n=0;n<90;n++){try{if(fn())return;}catch{}await new Promise(r=>setTimeout(r,500));}throw Error('Readiness timeout');}
for(const s of JSON.parse(fs.readFileSync(here+'specs.json')).filter(s=>process.argv.length<3||process.argv.slice(2).includes(s.key))){
 const out=dir+'/images/'+s.key,build=JSON.parse(fs.readFileSync(out+'/build.json')),name='maintenance-python-'+s.key;
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
   run(['run','-d','--name',name,...limits,'--tmpfs','/var/lib/postgresql/data:rw,size=768m','--tmpfs','/tmp:rw,size=128m','--mount','type=bind,src=/var/lib/utilibre-maintenance/geospatial-followup-20261012/source-tree,dst=/work/source-tree,readonly','-e','POSTGRES_HOST_AUTH_METHOD=trust',s.candidate,'postgres','-c','shared_buffers=32MB','-c','max_connections=10','-c','log_statement=none','-c','log_min_error_statement=panic']);created=true;
   const sql=q=>run(['exec','-i',name,'psql','-h','127.0.0.1','-U','postgres','-v','ON_ERROR_STOP=1','-At'],q);
   await ready(()=>sql('SELECT 1;')==='1');assert.match(sql('SHOW server_version;'),/^17\.11/);
   assert.match(sql("SELECT extversion FROM pg_extension WHERE extname='documentdb';"),/^0\.107/);
   sql('CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS postgis_raster; CREATE EXTENSION IF NOT EXISTS postgis_sfcgal; CREATE EXTENSION IF NOT EXISTS postgis_topology;');
   const spatial=run(['exec','-e','PGUSER=postgres','-e','PGHOST=127.0.0.1','-w','/work/source-tree',name,'perl','/work/source-tree/regress/run_test.pl','--extension','--dumprestore','/work/source-tree/regress/core/flatgeobuf']);
   fs.writeFileSync(out+'/spatial-regression.log',spatial+'\n');assert.match(spatial,/flatgeobuf.*ok/);assert.match(spatial,/Run tests: 2\nFailed: 0/);
   sql(`CREATE TABLE python_fixture(id integer PRIMARY KEY,geom geometry(Point,4326),payload documentdb_core.bson);INSERT INTO python_fixture VALUES(1,ST_SetSRID(ST_Point(-90.5,14.6),4326),'{"fictional":true,"label":"Ficción"}'::documentdb_core.bson);CREATE ROLE fixture_reader LOGIN;CREATE DATABASE python_permissions TEMPLATE template0;`);
   const query='SELECT ST_AsGeoJSON(geom),payload::text FROM python_fixture;';
   const expected=sql(query);assert.equal(sql('SELECT round(ST_X(ST_Transform(geom,3857))) FROM python_fixture;'),'-10074414');
   // Keep DocumentDB internal schema grants intact; test ordinary native role
   // isolation in a separate template0 database with the same PostGIS binary.
   sql('\\connect python_permissions\nCREATE EXTENSION postgis;CREATE TABLE python_fixture(id integer,geom geometry);INSERT INTO python_fixture VALUES(1,ST_Point(2,3));GRANT SELECT ON python_fixture TO fixture_reader;');
   assert.equal(run(['exec',name,'psql','-U','fixture_reader','-d','python_permissions','-Atc','SELECT id,ST_AsText(geom) FROM python_fixture;']),'1|POINT(2 3)');
   assert.throws(()=>cp.execFileSync('docker',['exec',name,'psql','-U','fixture_reader','-d','python_permissions','-v','ON_ERROR_STOP=1','-Atc','DELETE FROM python_fixture'],{encoding:'utf8',timeout:10000,stdio:['ignore','pipe','pipe']}),error=>error.status===1&&String(error.stderr).includes('permission denied for table python_fixture'));
   const dump=run(['exec',name,'pg_dump','-U','postgres','-t','public.python_fixture']);
   sql('DROP TABLE python_fixture;');sql(dump);assert.equal(sql(query),expected);
   result.nativeTypedDataAndIsolation=true;result.logicalRestore=true;result.postgisRegressionAndProjection=true;
  }
  result.passed=true;
 }finally{
  if(created)run(['rm','-f','-v',name]);result.completedAt=new Date().toISOString();
  fs.writeFileSync(out+'/application.json',JSON.stringify(result,null,2)+'\n');
 }
 console.log(s.key+': native application gate passed; synthetic state removed.');
}
