// Same-engine vendor-library rehearsal and per-database recovery gate.
// Never restores into production; backups contain private saved work, not logs.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync,statfsSync} from 'node:fs';
import {createHash} from 'node:crypto';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/postgres-vendor-20261011';mkdirSync(dir,{recursive:true,mode:0o700});
const groups=[{version:'17.11',base:'sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73',ref:'utilibre-postgres:17.11-alpine-vendor-security-20261011',count:8},{version:'16.15',base:'sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea',ref:'utilibre-postgres:16.15-alpine-vendor-security-20261011',count:3}];
function docker(args,input){try{return execFileSync('docker',args,{input,encoding:'utf8',timeout:180000,maxBuffer:128*1024**2,stdio:['pipe','pipe','pipe']});}catch(e){writeFileSync(dir+'/error.log',String(e.stderr||e.message),{mode:0o600});throw Error('Private PostgreSQL diagnostic: '+dir+'/error.log');}}
const inspect=name=>JSON.parse(docker(['inspect',name]))[0];
const hash=text=>createHash('sha256').update(text).digest('hex');
const ids=docker(['ps','-q']).trim().split(/\s+/),live=JSON.parse(docker(['inspect',...ids]));
const report={date:new Date().toISOString(),status:'running',deployed:false,groups:[],backups:[]};
for(const g of groups){
 const space=statfsSync(dir);assert(space.bsize*space.bavail>=8*1024**3,'Preserve 8 GiB recovery floor');
 const before=inspect(g.base),after=inspect(g.ref);
 for(const key of ['User','Env','Cmd','Entrypoint','WorkingDir','ExposedPorts','Volumes','Healthcheck'])assert.deepEqual(before.Config[key],after.Config[key],'Preserve native '+key);
 const bytes=image=>docker(['run','--rm','--network','none','--read-only','--memory','128m','--cpus','.5','--log-driver','none','--entrypoint','sh',image,'-c','cd /usr/local && find . -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum']).trim().split(/\s+/)[0];
 g.engineSha256=bytes(g.base);assert.match(g.engineSha256,/^[a-f0-9]{64}$/);assert.equal(bytes(g.ref),g.engineSha256,'Engine files changed');
 g.image=after.Id;const selected=live.filter(x=>x.Image===g.base&&x.Name.startsWith('/utilibre-')&&!x.Name.includes('roundtrip'));
 assert.equal(selected.length,g.count,'Review changed live DB scope');
 const test='maintenance-postgres-vendor-'+g.version.replace('.','-');
 try{
  docker(['run','-d','--name',test,'--network','none','--memory','512m','--cpus','1','--pids-limit','96','--log-driver','none','--tmpfs','/var/lib/postgresql/data:rw,size=768m','-e','POSTGRES_HOST_AUTH_METHOD=trust',g.ref]);
  let ready=false;for(let n=0;n<40;n++){try{docker(['exec',test,'pg_isready','-h','127.0.0.1','-U','postgres']);ready=true;break;}catch{}await new Promise(r=>setTimeout(r,500));}assert(ready);
  const sql=text=>docker(['exec','-i',test,'psql','-U','postgres','-v','ON_ERROR_STOP=1','-At'],text);
  assert.equal(sql('SHOW server_version;').trim(),g.version);
  sql("CREATE DATABASE fictional;\\connect fictional\nCREATE EXTENSION IF NOT EXISTS pgcrypto;CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";CREATE TABLE samples(id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),label text NOT NULL,n numeric(8,2),data jsonb);INSERT INTO samples(label,n,data)VALUES('Ficción — prueba',12.34,'{\"safe\":true}');");
  const dump=docker(['exec',test,'pg_dump','-U','postgres','-d','fictional']);sql('CREATE DATABASE reopened;');docker(['exec','-i',test,'psql','-U','postgres','-d','reopened','-v','ON_ERROR_STOP=1'],dump);
  assert.equal(docker(['exec',test,'psql','-U','postgres','-d','reopened','-Atc',"SELECT label||'|'||n||'|'||(data->>'safe') FROM samples"]).trim(),'Ficción — prueba|12.34|true');
  sql('DROP DATABASE fictional;DROP DATABASE reopened;');
  for(const x of selected){
   const name=x.Name.slice(1),path=dir+'/'+name;mkdirSync(path,{recursive:true,mode:0o700});
   const user=x.Config.Env.find(e=>e.startsWith('POSTGRES_USER='))?.slice(14)||'postgres';
   const roles=docker(['exec',name,'pg_dumpall','-U',user,'--globals-only']);writeFileSync(path+'/roles.sql',roles,{mode:0o600});
   const databases=docker(['exec',name,'psql','-U',user,'-d','postgres','-Atc',"SELECT datname FROM pg_database WHERE NOT datistemplate AND datname != 'postgres' ORDER BY datname"]).trim().split('\n').filter(Boolean);
   const entries=[];
   for(const db of databases){
    assert(/^[A-Za-z0-9_-]{1,63}$/.test(db),'Unreviewed DB name');
    // Plain native dump is UTF-8, not binary; never send it to the terminal.
    const content=docker(['exec',name,'pg_dump','-U',user,'-d',db,'--no-owner','--no-acl']);writeFileSync(path+'/'+db+'.sql',content,{mode:0o600});
    docker(['exec',test,'createdb','-U','postgres','restore_fixture']);docker(['exec','-i',test,'psql','-U','postgres','-d','restore_fixture','-v','ON_ERROR_STOP=1'],content);
    docker(['exec',test,'dropdb','-U','postgres','restore_fixture']);entries.push({file:db+'.sql',sha256:hash(content),restored:true});
   }
   const labels=x.Config.Labels;report.backups.push({name,oldRef:x.Config.Image,oldImage:x.Image,newRef:g.ref,newImage:g.image,project:labels['com.docker.compose.project'],service:labels['com.docker.compose.service'],cwd:labels['com.docker.compose.project.working_dir'],files:labels['com.docker.compose.project.config_files'].split(','),directory:path,rolesSha256:hash(roles),databases:entries});
   console.log('Native dump/isolated restore passed: '+name);
  }
  report.groups.push({...g,syntheticWriteAndRestore:'passed'});
 }finally{try{docker(['rm','-f','-v',test]);}catch{}}
}
report.status='passed';report.completedAt=new Date().toISOString();report.limits='Per-database native logical restore with ownership/ACL omitted; native roles backed up separately, not replayed. Same /usr/local engine bytes, schema/data format and application access unchanged. No app account workflow implied by database readiness.';
writeFileSync(dir+'/stage.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify({status:report.status,databases:report.backups.length,deployed:false}));
