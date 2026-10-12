// Signed compatible codec layer; only disposable fictional data in this gate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/aom-final-20261011';
const base='utilibre-gathio-documentdb:17.11-0.107.0-sqlite-security-20261011';
const baseId='sha256:6d370f60be2c84f5ea6c44fb2e475da18f4f97af6bdc6c234aa2a0cdfd8b04ef';
const candidate='utilibre-gathio-documentdb:17.11-0.107.0-aom-security-20261011';
const sha=b=>createHash('sha256').update(b).digest('hex');
const cmd=(c,a,input)=>{try{return execFileSync(c,a,{input,encoding:'utf8',timeout:120000,maxBuffer:8*1024**2,stdio:['pipe','pipe','pipe']}).trim();}catch(e){fs.writeFileSync(dir+'/error.log',String(e.stderr||e.message));throw Error('Native AOM gate failed; restricted error.log contains details.');}};
const docker=(...a)=>cmd('docker',a);
const inspect=n=>JSON.parse(docker('image','inspect',n))[0];
assert.equal(inspect(base).Id,baseId);
const deb=dir+'/libaom3_3.14.1-1_amd64.deb';
assert.equal(sha(fs.readFileSync(deb)),'8f932e686c8a0e3e09ef211b924bac0a43d3d6fd774e0dfbeba9c301aa129fca');
const original=inspect(base),updated=inspect(candidate);
for(const key of ['User','Env','Entrypoint','Cmd','WorkingDir','Healthcheck','Volumes','ExposedPorts','Labels'])assert.deepEqual(updated.Config[key],original.Config[key],key);
const tools=dir+'/aom-tools_3.6.0-1+deb12u3_amd64.deb';
assert.equal(sha(fs.readFileSync(tools)),'792ae859fc6e098b82258c76eec52552524874e1b7e6ea43b44ecd6c3f679bcc');
fs.mkdirSync(dir+'/old-tools',{recursive:true});cmd('dpkg-deb',['-x',tools,dir+'/old-tools']);
for(const [file,checksum] of [
 ['libavif-bin_0.11.1-1+deb12u1_amd64.deb','8779c64d2b879a84091c94927692ce77a9a04e774f41b25805e9277218f805fc'],
 ['libheif-examples_1.15.1-1+deb12u1_amd64.deb','4b7f52ed966a0cfaf1590371189143805f3986c53d1095a62fc3307ccd8519f4'],
]){assert.equal(sha(fs.readFileSync(dir+'/'+file)),checksum);cmd('dpkg-deb',['-x',dir+'/'+file,dir+'/old-consumers']);}
const raw=Buffer.concat([Buffer.from(Array.from({length:256},(_,i)=>16+((i*7)%200))),Buffer.alloc(128,128)]);
fs.writeFileSync(dir+'/fictional.yuv',raw);
fs.writeFileSync(dir+'/fictional.y4m',Buffer.concat([Buffer.from('YUV4MPEG2 W16 H16 F1:1 Ip A1:1 C420jpeg\nFRAME\n'),raw]));
const limits=['--network','none','--cpus','1','--memory','1g','--pids-limit','128','--log-driver','none','--security-opt','no-new-privileges'];
const run=(image,script)=>docker('run','--rm',...limits,'--read-only','--tmpfs','/tmp:rw,nosuid,nodev,size=64m','--mount','type=bind,src='+dir+',dst=/fixture,readonly','--entrypoint','sh',image,'-ec',script);
assert.equal(run(candidate,"dpkg-query -W -f='${Version}' libaom3"),'3.14.1-1');
assert.equal(run(candidate,'dpkg --audit'),'');
const appScript='find /usr/local /usr/lib/postgresql /usr/share/postgresql -type f -exec sha256sum {} + | sort | sha256sum';
const appHash=run(base,appScript).split(' ')[0];assert.equal(run(candidate,appScript).split(' ')[0],appHash);
const active=new Set();
const report={date:new Date().toISOString(),base,baseId,candidate,imageId:updated.Id,status:'running',deployed:false};
try{
 const symbols=[];
 for(const [label,image] of [['old',base],['new',candidate]]){
  const name='maintenance-aom-abi-'+label;active.add(name);docker('create','--name',name,'--entrypoint','true',image);
  docker('cp','-L',name+':/usr/lib/x86_64-linux-gnu/libaom.so.3',dir+'/'+label+'.so');docker('rm','-v',name);active.delete(name);
  assert.match(cmd('readelf',['--dynamic',dir+'/'+label+'.so']),/SONAME.*\[libaom\.so\.3\]/);
  symbols.push(cmd('readelf',['--dyn-syms','--wide',dir+'/'+label+'.so']).split('\n').filter(l=>/\bGLOBAL\s+DEFAULT\s+\d+\s+/.test(l)).map(l=>l.trim().split(/\s+/).at(-1)).sort());
 }
 assert(symbols[0].length>30);
 const removed=symbols[0].filter(s=>!symbols[1].includes(s));
 // libaom's old diagnostic CLI uses removed helper exports: not a drop-in
 // replacement for arbitrary consumers. Require the two actual runtime
 // consumers' complete relocations and test their native interfaces instead.
 assert.equal(run(base,"dpkg-query -W -f='${db:Status-Status}' aom-tools 2>/dev/null || true"),'','Unexpected installed legacy CLI');
 const directConsumers=run(candidate,`find /usr/lib /usr/bin /usr/sbin /usr/local -type f -exec readelf -d {} + 2>/dev/null | awk '/^File: / {file=$0} /NEEDED.*libaom.so/ {print file}'`).split('\n').sort();
 assert.deepEqual(directConsumers,['File: /usr/lib/x86_64-linux-gnu/libavif.so.15.0.1','File: /usr/lib/x86_64-linux-gnu/libheif.so.1.15.1'],'Changed direct consumer set needs its own compatibility review');
 const references=run(base,"readelf --dyn-syms --wide /usr/lib/x86_64-linux-gnu/libavif.so.15 /usr/lib/x86_64-linux-gnu/libheif.so.1").split('\n').filter(l=>/\bUND\s+/.test(l)).map(l=>l.trim().split(/\s+/).at(-1));
 assert(removed.every(s=>!references.includes(s)),'An actual consumer needs a removed export');
 const codecScript=`
 for file in /usr/lib/x86_64-linux-gnu/libgdal.so.32 /usr/lib/x86_64-linux-gnu/libavif.so.15 /usr/lib/x86_64-linux-gnu/libheif.so.1; do relocations=$(ldd -r "$file" 2>&1); if printf '%s' "$relocations" | grep -E 'not found|undefined symbol'; then exit 1; fi; done
 /fixture/old-consumers/usr/bin/avifenc --codec aom --min 0 --max 0 --speed 8 --jobs 2 /fixture/fictional.y4m /tmp/example.avif
 /fixture/old-consumers/usr/bin/avifdec --codec aom /tmp/example.avif /tmp/result.y4m
 tail -c 384 /tmp/result.y4m > /tmp/pixels.yuv
 cmp /fixture/fictional.yuv /tmp/pixels.yuv
 /fixture/old-consumers/usr/bin/avifdec --codec aom /tmp/example.avif /tmp/image.png
 /fixture/old-consumers/usr/bin/heif-enc --avif --lossless -o /tmp/heif.avif /tmp/image.png
 /fixture/old-consumers/usr/bin/heif-convert /tmp/heif.avif /tmp/heif.png
 test -s /tmp/heif.png
 echo 'Installed AVIF/HEIF consumers: native AV1 round trips passed'
 `;
 assert.match(run(candidate,codecScript),/native AV1 round trips passed/);
 const name='maintenance-aom-documentdb';active.add(name);
 docker('run','-d','--name',name,...limits,'--tmpfs','/var/lib/postgresql/data:rw,size=512m','--tmpfs','/tmp:rw,size=32m','-e','POSTGRES_HOST_AUTH_METHOD=trust',candidate,'postgres','-c','shared_buffers=32MB','-c','max_connections=10','-c','log_statement=none');
 const sql=q=>cmd('docker',['exec','-i',name,'psql','-h','127.0.0.1','-U','postgres','-v','ON_ERROR_STOP=1','-At'],q);
 let ready=false;for(let n=0;n<90;n++){try{if(sql('SELECT 1;')==='1'){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert(ready);
 assert.match(sql('SHOW server_version;'),/^17\.11/);
 assert.match(sql("SELECT extversion FROM pg_extension WHERE extname='documentdb';"),/^0\.107/);
 sql('CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS postgis_raster;');
 assert.match(sql('SELECT PostGIS_Full_Version();'),/POSTGIS=/);
 assert.equal(sql("SELECT ST_AsText(ST_Point(1,2));"),'POINT(1 2)');
 assert.match(sql('SELECT PostGIS_GDAL_Version();'),/GDAL/);
 sql(`CREATE TABLE aom_fixture(id integer PRIMARY KEY,payload documentdb_core.bson);INSERT INTO aom_fixture VALUES(1,'{"fictional":true,"label":"Ficción"}'::documentdb_core.bson);CREATE ROLE fixture_reader LOGIN;GRANT SELECT ON aom_fixture TO fixture_reader;`);
 const expected=sql('SELECT payload::text FROM aom_fixture;');
 assert.equal(docker('exec',name,'psql','-U','fixture_reader','-d','postgres','-Atc','SELECT payload::text FROM aom_fixture'),expected);
 assert.throws(()=>docker('exec',name,'psql','-U','fixture_reader','-d','postgres','-v','ON_ERROR_STOP=1','-Atc','DELETE FROM aom_fixture'));
 const dump=docker('exec',name,'pg_dump','-U','postgres','-t','public.aom_fixture');sql('DROP TABLE aom_fixture;');sql(dump);assert.equal(sql('SELECT payload::text FROM aom_fixture;'),expected);
 Object.assign(report,{status:'passed',applicationSha256:appHash,nativeConfigurationUnchanged:true,oldAbiSymbols:symbols[0].length,removedHelperExports:removed,actualConsumerRelocationsPassed:true,installedAvifHeifRoundTrips:true,postgisGdalNative:true,documentdbRolesAndDumpRestore:true,newLibrarySha256:sha(fs.readFileSync(dir+'/new.so')),limitation:'Not a universal drop-in for old AOM diagnostic tools; these are absent in production. Small synthetic codec/database gates, not all GDAL formats or concurrent load.'});
 console.log(JSON.stringify(report));
}finally{
 for(const name of active)try{docker('rm','-f','-v',name);}catch{report.cleanupFailed=true;}
 report.completedAt=new Date().toISOString();fs.writeFileSync(dir+'/checks.json',JSON.stringify(report,null,2)+'\n');
}
