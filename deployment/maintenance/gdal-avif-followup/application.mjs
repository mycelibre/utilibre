// Exercise the real GDAL reader and unchanged DB/codec consumers; networkless,
// synthetic and disposable. No live database or user content is accessed.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {root,geo,sha,read,docker,limits,inspect} from './common.mjs';
import {gdalProbeCases,verifyDriverInventory} from '../geospatial-followup/gdal-policy.mjs';
process.umask(0o077);
const stage=read(root+'/stage.json');assert.equal(stage.status,'passed');assert.equal(inspect(stage.candidate).Id,stage.image);
const baseline=read(geo+'/gdal-baseline.json');for(const f of baseline.fixtures)assert.equal(sha(fs.readFileSync(geo+'/gdal-fixtures/'+f.file)),f.sha256);
const probe=(id,mode)=>docker('run',...limits,'--mount','type=bind,src='+geo+'/gdal-fixtures,dst=/fixtures,readonly','--entrypoint','/fixtures/gdal-probe',id,mode,'/fixtures');
const drivers=verifyDriverInventory(probe(stage.base,'--drivers'),probe(stage.image,'--drivers')),cases=[];
for(const mode of gdalProbeCases){const output=probe(stage.image,mode);assert(output);cases.push({mode,status:0,stdout:output});}
const heif='/var/lib/utilibre-maintenance/heif-bookworm-followup-20261012',fixtures=read(heif+'/native.json');
assert(fixtures.hevcAv1RgbaOldHeaderRoundtrips);
const codec=(id,arg)=>docker('run',...limits,'--user','65534:65534','--mount','type=bind,src='+heif+'/fixtures,dst=/checks,readonly','--entrypoint','/checks/heif-native',id,arg);
assert.equal(codec(stage.image,'codecs'),codec(stage.base,'codecs'));assert.equal((codec(stage.image,'/tmp').match(/roundtrip passed/g)||[]).length,2);
const image=id=>docker('run',...limits,'--user','65534:65534','--mount','type=bind,src='+heif+'/fixtures,dst=/checks,readonly','--entrypoint','/checks/gdal-heif',id,'/checks');
const output=image(stage.image);assert.match(output,/heic RGBA dimensions\/pixels passed/);assert.match(output,/avif RGBA dimensions\/pixels passed/);
const name='maintenance-gdal-avif-native',bounded=['--network','none','--cpus','1','--memory','1g','--memory-swap','1g','--pids-limit','128','--security-opt','no-new-privileges','--log-driver','none','--ulimit','core=0'];
let created=false;const report={schema:1,date:new Date().toISOString(),status:'running',image:stage.image,base:stage.base,stageSha256:sha(fs.readFileSync(root+'/stage.json')),baselineSha256:sha(fs.readFileSync(geo+'/gdal-baseline.json')),drivers:drivers.length,cases,codecInventoryUnchanged:true,hevcAv1RgbaOldHeaderRoundtrips:true,gdalHeicAndAvifRead:true,gdalOutput:output,fictionalDataOnly:true,network:'none',productionChanged:false};
try{
 docker('run','-d','--name',name,...bounded,'--tmpfs','/var/lib/postgresql/data:rw,size=768m','--tmpfs','/tmp:rw,size=128m','--mount','type=bind,src='+geo+'/source-tree,dst=/work/source-tree,readonly','-e','POSTGRES_HOST_AUTH_METHOD=trust',stage.image,'postgres','-c','shared_buffers=32MB','-c','max_connections=10','-c','log_statement=none','-c','log_min_error_statement=panic');created=true;
 const query=text=>docker('exec',name,'psql','-h','127.0.0.1','-U','postgres','-v','ON_ERROR_STOP=1','-Atc',text);
 let ready=false;for(let n=0;n<90;n++){try{if(query('SELECT 1;')==='1'){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert(ready);
 assert.match(query('SHOW server_version;'),/^17\.11/);assert.equal(query("SELECT extversion FROM pg_extension WHERE extname='documentdb';"),'0.107-0');
 query('CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS postgis_raster;');report.nativeVersion=query('SELECT postgis_full_version();');assert.match(report.nativeVersion,/GDAL="GDAL 3\.6\.2/);
 const regression=docker('exec','-e','PGUSER=postgres','-e','PGHOST=127.0.0.1','-w','/work/source-tree',name,'perl','/work/source-tree/regress/run_test.pl','--extension','--dumprestore','/work/source-tree/regress/core/flatgeobuf');fs.writeFileSync(root+'/upstream-flatgeobuf.log',regression);assert.match(regression,/Run tests: 2\nFailed: 0$/m);
 query("CREATE TABLE avif_fixture(id int PRIMARY KEY, geom geometry(Point,4326), rast raster, payload documentdb_core.bson); INSERT INTO avif_fixture VALUES(1, ST_SetSRID(ST_Point(-90.5,14.6),4326), ST_AddBand(ST_MakeEmptyRaster(2,2,0,0,1,-1,0,0,4326),'8BUI'::text,7,0), '{}'::documentdb_core.bson);");
 assert.equal(query("SET postgis.gdal_enabled_drivers='GTiff'; SELECT ST_Value(ST_FromGDALRaster(ST_AsGDALRaster(rast,'GTiff')),1,1) FROM avif_fixture;").split('\n').at(-1),'7');assert.equal(query('SELECT round(ST_X(ST_Transform(geom,3857))) FROM avif_fixture;'),'-10074414');
 const data='SELECT id,ST_AsGeoJSON(geom),ST_AsBinary(rast),payload::text FROM avif_fixture;',expected=query(data),dump=docker('exec',name,'pg_dump','-U','postgres','-t','public.avif_fixture');query('DROP TABLE avif_fixture;');
 const restore=spawnSync('docker',['exec','-i',name,'psql','-U','postgres','-v','ON_ERROR_STOP=1'],{input:dump,encoding:'utf8',timeout:30000});assert.equal(restore.status,0);assert.equal(query(data),expected);
 query('CREATE ROLE avif_reader LOGIN; GRANT SELECT ON avif_fixture TO avif_reader;');assert.equal(docker('exec',name,'psql','-U','avif_reader','-d','postgres','-Atc','SELECT id FROM avif_fixture;'),'1');
 const denied=spawnSync('docker',['exec',name,'psql','-U','avif_reader','-d','postgres','-v','ON_ERROR_STOP=1','-Atc','DELETE FROM avif_fixture;'],{encoding:'utf8',timeout:15000});assert.equal(denied.status,1);assert.match(denied.stderr,/permission denied for table avif_fixture/);
 report.upstreamFlatGeobuf=true;report.documentdbTypedData=true;report.nativeRasterExportImport=true;report.geometryProjection=true;report.readOnlyRoleAndDeniedDelete=true;report.syntheticDumpRestoreSha256=sha(dump);report.status='passed';
}catch(e){report.status='failed';report.error=e.message;throw e;}finally{if(created)docker('rm','-f','-v',name);report.completedAt=new Date().toISOString();fs.writeFileSync(root+'/application.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,image:stage.image,drivers:report.drivers,cases:cases.length,gdalHeicAndAvifRead:true,nativeRasterExportImport:report.nativeRasterExportImport,syntheticDumpRestore:true,productionChanged:false}));
