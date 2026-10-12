// Reuse the established native DB fixture; no live data, external network or new protocol probes.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/xlib-followup-20261012/images/gathio';
const row=JSON.parse(fs.readFileSync(dir+'/build.json')),name='maintenance-xlib-gathio';
const run=(args,input)=>cp.execFileSync('docker',args,{input,encoding:'utf8',timeout:180000,maxBuffer:8*1024**2,stdio:['pipe','pipe','pipe']}).trim();
assert.equal(run(['image','inspect','--format','{{.Id}}',row.candidate]),row.imageId);
assert(!fs.existsSync(dir+'/application.json'),'Preserve completed proof');
let created=false;const result={date:new Date().toISOString(),imageId:row.imageId,passed:false,fictionalDataOnly:true,network:'none'};
try{
 run(['run','-d','--name',name,'--network','none','--cpus','1','--memory','1g','--pids-limit','128','--security-opt','no-new-privileges','--log-driver','none','--ulimit','core=0','--tmpfs','/var/lib/postgresql/data:rw,size=768m','--tmpfs','/tmp:rw,size=128m','--mount','type=bind,src=/var/lib/utilibre-maintenance/geospatial-followup-20261012/source-tree,dst=/work/source-tree,readonly','-e','POSTGRES_HOST_AUTH_METHOD=trust',row.imageId,'postgres','-c','shared_buffers=32MB','-c','max_connections=10','-c','log_statement=none','-c','log_min_error_statement=panic']);created=true;
 const sql=q=>run(['exec','-i',name,'psql','-h','127.0.0.1','-U','postgres','-v','ON_ERROR_STOP=1','-At'],q);
 let ready=false;for(let n=0;n<90;n++){try{if(sql('SELECT 1;')==='1'){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert(ready);
 assert.match(sql('SHOW server_version;'),/^17\.11/);assert.match(sql("SELECT extversion FROM pg_extension WHERE extname='documentdb';"),/^0\.107/);
 sql('CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS postgis_raster; CREATE EXTENSION IF NOT EXISTS postgis_sfcgal; CREATE EXTENSION IF NOT EXISTS postgis_topology;');
 const spatial=run(['exec','-e','PGUSER=postgres','-e','PGHOST=127.0.0.1','-w','/work/source-tree',name,'perl','/work/source-tree/regress/run_test.pl','--extension','--dumprestore','/work/source-tree/regress/core/flatgeobuf']);
 fs.writeFileSync(dir+'/spatial-regression.log',spatial+'\n');assert.match(spatial,/flatgeobuf.*ok/);assert.match(spatial,/Run tests: 2\nFailed: 0/);
 sql(`CREATE TABLE xlib_fixture(id integer PRIMARY KEY,geom geometry(Point,4326),payload documentdb_core.bson);INSERT INTO xlib_fixture VALUES(1,ST_SetSRID(ST_Point(-90.5,14.6),4326),'{"fictional":true,"label":"Ficción"}'::documentdb_core.bson);CREATE ROLE fixture_reader LOGIN;CREATE DATABASE xlib_permissions TEMPLATE template0;`);
 const query='SELECT ST_AsGeoJSON(geom),payload::text FROM xlib_fixture;',expected=sql(query);
 assert.equal(sql('SELECT round(ST_X(ST_Transform(geom,3857))) FROM xlib_fixture;'),'-10074414');
 sql('\\connect xlib_permissions\nCREATE EXTENSION postgis;CREATE TABLE xlib_fixture(id integer,geom geometry);INSERT INTO xlib_fixture VALUES(1,ST_Point(2,3));GRANT SELECT ON xlib_fixture TO fixture_reader;');
 assert.equal(run(['exec',name,'psql','-U','fixture_reader','-d','xlib_permissions','-Atc','SELECT id,ST_AsText(geom) FROM xlib_fixture;']),'1|POINT(2 3)');
 assert.throws(()=>run(['exec',name,'psql','-U','fixture_reader','-d','xlib_permissions','-v','ON_ERROR_STOP=1','-Atc','DELETE FROM xlib_fixture']),e=>e.status===1&&String(e.stderr).includes('permission denied for table xlib_fixture'));
 const dump=run(['exec',name,'pg_dump','-U','postgres','-t','public.xlib_fixture']);sql('DROP TABLE xlib_fixture;');sql(dump);assert.equal(sql(query),expected);
 Object.assign(result,{passed:true,nativeTypedDataAndIsolation:true,logicalRestore:true,postgisRegressionAndProjection:true,limitation:'Native compatibility, not a malicious X server regression.'});
}finally{
 if(created)run(['rm','-f','-v',name]);result.completedAt=new Date().toISOString();fs.writeFileSync(dir+'/application.json',JSON.stringify(result,null,2)+'\n');
}
console.log(JSON.stringify(result));
