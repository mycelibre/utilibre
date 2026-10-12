import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
process.umask(0o077);
const recipe=fileURLToPath(new URL('.',import.meta.url));
const directory='/var/lib/utilibre-maintenance/sqlite-final-20261011';
const build=JSON.parse(readFileSync(directory+'/build.json'));
const report={date:new Date().toISOString(),status:'running',deployed:false,rows:[]};
const active=new Set();
function docker(args,input){try{return execFileSync('docker',args,{input,encoding:'utf8',timeout:120000,maxBuffer:4*1024**2,stdio:['pipe','pipe','pipe']});}catch(error){writeFileSync(directory+'/native-error.log',String(error.stderr||''));const failure=Error('Isolated synthetic runtime operation failed');failure.status=error.status;throw failure;}}
const bounded=['--network','none','--cpus','1','--memory','1g','--pids-limit','128','--security-opt','no-new-privileges','--log-driver','none'];
const run=(image,script,args=[])=>docker(['run','--rm',...bounded,'--read-only','--user','0:0','--tmpfs','/tmp:rw,nosuid,nodev,size=32m','--mount','type=bind,src='+directory+',dst=/fixtures,readonly','--entrypoint','sh',image,'-ec',script,'fixture',...args]);
const sha=value=>createHash('sha256').update(value).digest('hex');
async function ready(fn){for(let n=0;n<90;n++){try{if(fn())return;}catch{}await new Promise(r=>setTimeout(r,500));}throw Error('Synthetic runtime failed readiness');}
function remove(name){docker(['rm','-f','-v',name]);active.delete(name);}
try{
 for(const image of build.rows){
  const before=JSON.parse(docker(['image','inspect',image.base]))[0],after=JSON.parse(docker(['image','inspect',image.candidate]))[0];
  assert.equal(before.Id,image.baseId);assert.equal(after.Id,image.candidateId);
  for(const key of ['User','Env','Entrypoint','Cmd','WorkingDir','Healthcheck','Volumes','ExposedPorts','Labels'])assert.deepEqual(after.Config[key],before.Config[key],'Native configuration changed: '+key);
  const packages=image.cli?'libsqlite3-0 sqlite3':'libsqlite3-0';
  const version=run(image.candidate,`dpkg-query -W -f='\${Version}\\n' ${packages}`).trim().split('\n');
  assert(version.every(v=>v===build.version));assert.equal(run(image.candidate,'dpkg --audit').trim(),'');
  const options=run(image.candidate,'/fixtures/sqlite-probe --options').trim().split('\n').sort();
  assert.deepEqual(options,run(image.base,'/fixtures/sqlite-probe --options').trim().split('\n').sort(),'Debian compile options changed');
  assert.match(run(image.candidate,'ldd /fixtures/sqlite-probe'),/libsqlite3\.so\.0 => \/(?:usr\/)?lib\/x86_64-linux-gnu\/libsqlite3\.so\.0/);
  const libraryHashes=[],symbols=[];
  for(const [label,id] of [['before',image.baseId],['after',image.candidateId]]){
   const name='maintenance-sqlite-abi-'+image.kind+'-'+label;active.add(name);
   docker(['create','--name',name,'--entrypoint','true',id]);
   const file=directory+'/'+image.kind+'-'+label+'.so';
   docker(['cp',name+':/usr/lib/x86_64-linux-gnu/libsqlite3.so.0.8.6',file]);remove(name);
   const dynamic=execFileSync('readelf',['--dynamic',file],{encoding:'utf8'});
   assert.match(dynamic,/SONAME.*\[libsqlite3\.so\.0\]/);
   const table=execFileSync('readelf',['--dyn-syms','--wide',file],{encoding:'utf8'});
   symbols.push(table.split('\n').filter(line=>/\bGLOBAL\s+DEFAULT\s+\d+\s+/.test(line)).map(line=>line.trim().split(/\s+/).at(-1)).sort());
   libraryHashes.push(sha(readFileSync(file)));
  }
  assert(symbols[0].length>200);assert.deepEqual(symbols[1],symbols[0],'Exported library ABI changed');assert.notEqual(libraryHashes[0],libraryHashes[1]);
  assert.match(run(image.candidate,'/fixtures/sqlite-probe /fixtures/distinct-10.1.sql /fixtures/distinct-10.2.sql /fixtures/distinct-10.3.sql /fixtures/distinct-10.4.sql /fixtures/distinct-10.5.sql'),/Five exact upstream/);
  const roots=image.kind==='documentdb'?'/usr/local /usr/lib/postgresql /usr/share/postgresql':'/app /usr/local';
  const hashScript=`find ${roots} -type f -exec sha256sum {} + | sort | sha256sum`;
  const appHash=run(image.base,hashScript).trim().split(/\s/)[0];
  assert.match(appHash,/^[a-f0-9]{64}$/);assert.equal(run(image.candidate,hashScript).trim().split(/\s/)[0],appHash,'Application code changed');
  const row={...image,status:'passed',nativeConfigurationUnchanged:true,applicationSha256:appHash,compileOptionsUnchanged:true,sharedLibraryFiveRegressions:true,nativeSqliteBackupRestore:true,sonameAndExportsUnchanged:true,exportedSymbols:symbols[0].length,oldLibrarySha256:libraryHashes[0],librarySha256:libraryHashes[1]};
  if(image.kind==='kuma'){
   assert.equal(run(image.candidate,"dpkg-query -W -f='${Version}' python3-jwt"),'2.15.1-1');
   assert.match(docker(['run','--rm',...bounded,'--read-only','--user','0:0','--cap-drop','ALL','--mount','type=bind,src='+recipe+'kuma-jwt.py,dst=/fixture.py,readonly','--entrypoint','python3',image.candidate,'-B','/fixture.py']),/Native PyJWT/);
   assert.match(run(image.candidate,"python3 -c 'import sqlite3; db=sqlite3.connect(\":memory:\"); db.execute(\"create table fictional(label text)\"); db.execute(\"insert into fictional values(?)\",(\"Ficción\",)); db.commit(); other=sqlite3.connect(\":memory:\"); db.backup(other); assert other.execute(\"select label from fictional\").fetchone()[0]==\"Ficción\"; print(sqlite3.sqlite_version)'"),/3\.40\.1/);
   assert.match(run(image.candidate,'apprise --version'),/Apprise/i);
   const name='maintenance-sqlite-kuma';active.add(name);
   docker(['run','-d','--name',name,...bounded,'--read-only','--user','1000:1000','--cap-drop','ALL','-e','UPTIME_KUMA_DB_TYPE=sqlite','--tmpfs','/app/data:rw,nosuid,nodev,size=128m,uid=1000,gid=1000','--tmpfs','/tmp:rw,nosuid,nodev,size=32m,mode=1777','--mount','type=bind,src='+recipe+'kuma-native.cjs,dst=/tmp/kuma-native.cjs,readonly',image.candidate]);
   await ready(()=>docker(['exec',name,'node','-e',"fetch('http://127.0.0.1:3001/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]).length===0);
   assert.match(docker(['exec',name,'node','/tmp/kuma-native.cjs']),/authenticated Socket/);
   remove(name);Object.assign(row,{pythonSqliteBackupRestore:true,apprisePreserved:true,nativeKumaSetupAndLogin:true,pyjwtNativeAlgorithmsAndDenials:true});
  }else if(image.kind==='rssbridge'){
   const php=`$db=new PDO('sqlite::memory:');$db->exec('CREATE TABLE fictional(label TEXT)');$s=$db->prepare('INSERT INTO fictional VALUES(?)');$s->execute(['Ficción']);if($db->query('SELECT label FROM fictional')->fetchColumn()!=='Ficción')exit(1);echo 'native PHP SQLite passed';`;
   assert.match(run(image.candidate,'php -r "$1"',[php]),/native PHP SQLite passed/);
   const name='maintenance-sqlite-rssbridge';active.add(name);
   docker(['run','-d','--name',name,...bounded,'--read-only','--cap-drop','ALL','--user','33:33','--tmpfs','/tmp:rw,nosuid,nodev,size=16m,mode=1777','--tmpfs','/app/cache:rw,nosuid,nodev,size=32m,uid=33,gid=33','--entrypoint','php',image.candidate,'-S','127.0.0.1:9080','-t','/app']);
   await ready(()=>/RSS-Bridge/.test(docker(['exec',name,'php','-r',"echo file_get_contents('http://127.0.0.1:9080/');"])));
   remove(name);Object.assign(row,{phpSqlite:true,nativeHomepage:true,limitation:'No external feed/source fetched; application bytes unchanged.'});
  }else{
   const name='maintenance-sqlite-documentdb';active.add(name);
   docker(['run','-d','--name',name,...bounded,'--tmpfs','/var/lib/postgresql/data:rw,size=512m','--tmpfs','/tmp:rw,size=32m','-e','POSTGRES_HOST_AUTH_METHOD=trust',image.candidate,'postgres','-c','shared_buffers=32MB','-c','max_connections=10','-c','log_statement=none']);
   const sql=query=>docker(['exec','-i',name,'psql','-h','127.0.0.1','-U','postgres','-v','ON_ERROR_STOP=1','-At'],query);
   await ready(()=>sql('SELECT 1;').trim()==='1');assert.match(sql('SHOW server_version;'),/^17\.11/);
   assert.match(sql("SELECT extversion FROM pg_extension WHERE extname='documentdb';"),/^0\.107/);
   sql(`CREATE TABLE sqlite_patch_fixture(id integer PRIMARY KEY,payload documentdb_core.bson);INSERT INTO sqlite_patch_fixture VALUES(1,'{"fictional":true,"label":"Ficción"}'::documentdb_core.bson);CREATE ROLE fixture_reader LOGIN;GRANT SELECT ON sqlite_patch_fixture TO fixture_reader;`);
   const expected=sql('SELECT payload::text FROM sqlite_patch_fixture;').trim();
   assert.equal(docker(['exec',name,'psql','-U','fixture_reader','-d','postgres','-Atc','SELECT payload::text FROM sqlite_patch_fixture']).trim(),expected);
   assert.throws(()=>docker(['exec',name,'psql','-U','fixture_reader','-d','postgres','-v','ON_ERROR_STOP=1','-Atc','DELETE FROM sqlite_patch_fixture']));
   const dump=docker(['exec',name,'pg_dump','-U','postgres','-t','public.sqlite_patch_fixture']);
   sql('DROP TABLE sqlite_patch_fixture;');sql(dump);assert.equal(sql('SELECT payload::text FROM sqlite_patch_fixture;').trim(),expected);
   remove(name);Object.assign(row,{postgresNativeInitialization:true,documentdbTypedDataAndPermissions:true,logicalDumpRestore:true,fictionalDumpSha256:sha(dump)});
  }
  report.rows.push(row);console.log('SQLite native runtime gate passed: '+image.kind);
 }
 report.status='passed';
}catch(error){report.status='failed';report.error={message:error.message,status:error.status??null};throw error;}
finally{for(const name of active)try{remove(name);}catch{report.cleanupFailed=true;}report.completedAt=new Date().toISOString();writeFileSync(directory+'/checks.json',JSON.stringify(report,null,2)+'\n');}
