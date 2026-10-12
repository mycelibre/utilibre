// Fresh, isolated same-engine initialization/XML/PostGIS/DocumentDB restore.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
process.umask(0o077);
assert(process.argv.slice(2).length<=1&&process.argv.slice(2).every(a=>['--security-followup','--rsync-followup'].includes(a)));
const rsync=process.argv.includes('--rsync-followup');
const dir=rsync?'/var/lib/utilibre-maintenance/closure-followup-20261012/rsync/rsync-gathio-postgres':process.argv.includes('--security-followup')?'/var/lib/utilibre-maintenance/closure-followup-20261012/bookworm-images':'/var/lib/utilibre-maintenance/xml-final-20261011';
const built=JSON.parse(readFileSync(dir+'/build.json'));
const row=rsync?{...built,candidateId:built.imageId}:built.rows.find(row=>row.kind==='gathio');
const output=rsync?dir:dir+'/gathio';
const name='maintenance-xml-gathio-database';
const docker=(args,input)=>execFileSync('docker',args,{input,encoding:'utf8',timeout:120000,maxBuffer:4*1024**2,stdio:['pipe','pipe','pipe']});
try{
 assert.equal(docker(['image','inspect',row.candidate,'--format','{{.Id}}']).trim(),row.candidateId);
 docker(['run','-d','--name',name,'--network','none','--cpus','1','--memory','1g','--pids-limit','128','--log-driver','none',
  '--security-opt','no-new-privileges','--tmpfs','/var/lib/postgresql/data:rw,size=512m','--tmpfs','/tmp:rw,size=32m',
  '-e','POSTGRES_HOST_AUTH_METHOD=trust',row.candidate,'postgres','-c','shared_buffers=32MB','-c','max_connections=10','-c','log_statement=none']);
 const sql=q=>docker(['exec','-i',name,'psql','-h','127.0.0.1','-U','postgres','-v','ON_ERROR_STOP=1','-At'],q).trim();
 let ready=false;for(let n=0;n<90;n++){try{if(sql('SELECT 1;')==='1'){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert(ready);
 assert.match(sql('SHOW server_version;'),/^17\.11/);
 assert.match(sql("SELECT extversion FROM pg_extension WHERE extname='documentdb';"),/^0\.107/);
 sql('CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS postgis_raster;');
 assert.equal(sql("SELECT (xpath('string(/fixture/text)', '<fixture><text>Ficción</text></fixture>'::xml))[1]::text;"),'Ficción');
 assert.equal(sql("SELECT ST_AsText(ST_GeomFromGML('<gml:Point xmlns:gml=\"http://www.opengis.net/gml\"><gml:coordinates>1,2</gml:coordinates></gml:Point>'));"),'POINT(1 2)');
 assert.match(sql('SELECT PostGIS_GDAL_Version();'),/GDAL/);
 sql(`CREATE TABLE xml_fixture(id integer PRIMARY KEY,payload documentdb_core.bson);INSERT INTO xml_fixture VALUES(1,'{"fictional":true,"label":"Ficción"}'::documentdb_core.bson);CREATE ROLE fixture_reader LOGIN;GRANT SELECT ON xml_fixture TO fixture_reader;`);
 const expected=sql('SELECT payload::text FROM xml_fixture;');
 assert.equal(docker(['exec',name,'psql','-U','fixture_reader','-d','postgres','-Atc','SELECT payload::text FROM xml_fixture']).trim(),expected);
 assert.throws(()=>docker(['exec',name,'psql','-U','fixture_reader','-d','postgres','-v','ON_ERROR_STOP=1','-Atc','DELETE FROM xml_fixture']));
 const dump=docker(['exec',name,'pg_dump','-U','postgres','-t','public.xml_fixture']);sql('DROP TABLE xml_fixture;');sql(dump);
 assert.equal(sql('SELECT payload::text FROM xml_fixture;'),expected);
 const ldd=docker(['exec',name,'sh','-ec',`for f in /usr/lib/x86_64-linux-gnu/libgdal.so.32 /usr/lib/x86_64-linux-gnu/libspatialite.so.7; do out=$(ldd -r "$f" 2>&1); if printf '%s' "$out" | grep -E 'not found|undefined symbol'; then exit 1; fi; done; echo XML_CONSUMERS_PASSED`]);
 assert.match(ldd,/XML_CONSUMERS_PASSED/);
 writeFileSync(output+'/database.json',JSON.stringify({date:new Date().toISOString(),image:row.candidate,imageId:row.candidateId,passed:true,nativePostgresXml:true,postgisGml:true,gdal:true,documentdbTypedDataAndRoleIsolation:true,nativeDumpRestore:true,network:'none',limitation:'Small synthetic native fixture; no user data or production database mutations.'},null,2)+'\n');
 console.log('Gathio XML/PostGIS/DocumentDB native dump/restore passed.');
}catch(error){writeFileSync(output+'/database-error.log',String(error.stdout||'')+String(error.stderr||'')+String(error));throw Error('Isolated Gathio XML test failed; private diagnostic retained.');}
finally{try{docker(['rm','-f','-v',name]);}catch{}}
