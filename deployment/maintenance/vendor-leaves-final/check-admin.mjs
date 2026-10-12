// Empty native PostgreSQL and native admin migrations; isolated namespace only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/vendor-leaves-final-20261011',stage=JSON.parse(fs.readFileSync(dir+'/admin-stage.json'));
const docker=(args)=>execFileSync('docker',args,{encoding:'utf8',timeout:45000,maxBuffer:2*1024**2,stdio:['ignore','pipe','pipe']});
const db='maintenance-admin-ssl-db',app='maintenance-admin-ssl-app',rows=[];
try{
 assert.equal(docker(['image','inspect',stage.candidate,'--format','{{.Id}}']).trim(),stage.candidateId);
 const dbImage=JSON.parse(docker(['inspect','utilibre-expanded-penpot-db-1']))[0].Image;
 docker(['run','-d','--name',db,'--network','none','--read-only','--user','70:70','--cpus','1','--memory','384m','--pids-limit','96','--log-driver','none','--tmpfs','/var/lib/postgresql/data:rw,size=128m,uid=70,gid=70','--tmpfs','/var/run/postgresql:rw,size=16m,uid=70,gid=70','--tmpfs','/tmp:rw,size=16m,mode=1777','-e','POSTGRES_USER=penpot','-e','POSTGRES_DB=penpot','-e','POSTGRES_PASSWORD=Fictional-native-only',dbImage]);
 for(let n=0;n<35;n++){try{docker(['exec',db,'pg_isready','-U','penpot']);break;}catch(e){if(n===34)throw e;await new Promise(r=>setTimeout(r,500));}}
 for(const image of [stage.base,stage.candidate]){
  docker(['run','-d','--name',app,'--network','container:'+db,'--read-only','--cpus','1','--memory','384m','--pids-limit','96','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges:true','--tmpfs','/tmp:rw,size=32m,mode=1777','-e','PENPOT_PUBLIC_URI=http://127.0.0.1:8080','-e','PENPOT_INTERNAL_URI=http://127.0.0.1:8080','-e','PENPOT_SECRET_KEY=Fictional-only-native-admin-2026','-e','PENPOT_DATABASE_URI=postgresql://127.0.0.1/penpot','-e','PENPOT_DATABASE_USERNAME=penpot','-e','PENPOT_DATABASE_PASSWORD=Fictional-native-only',image]);
  let response;
  for(let n=0;n<40;n++){
   try{response=JSON.parse(docker(['exec',app,'node','-e',`fetch('http://127.0.0.1:3000/',{redirect:'manual'}).then(async r=>console.log(JSON.stringify({status:r.status,body:(await r.text()).slice(0,2000),location:r.headers.get('location')}))).catch(()=>process.exit(1))`]));break;}
   catch(e){if(n===39)throw e;await new Promise(r=>setTimeout(r,500));}
  }
  assert(response.status>=200&&response.status<500);
  const schemas=docker(['exec',db,'psql','-U','penpot','-d','penpot','-Atc',"SELECT count(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema')"]).trim();assert(Number(schemas)>0);
  rows.push({imageId:image,status:response.status,location:response.location,bodySha256:(await import('node:crypto')).createHash('sha256').update(response.body).digest('hex'),nativeMigrationTables:Number(schemas)});
  docker(['rm','-f',app]);
 }
 assert.equal(rows[0].status,rows[1].status);assert.equal(rows[0].location,rows[1].location);assert.equal(rows[0].nativeMigrationTables,rows[1].nativeMigrationTables);
 fs.writeFileSync(dir+'/admin-native.json',JSON.stringify({status:'passed',imageId:stage.candidateId,completedAt:new Date().toISOString(),network:'none; shared disposable namespace',nativeStartupAndMigration:true,predecessorParity:rows,limitation:'Synthetic native admin migration and unauthenticated route parity; not a live operator account test.'},null,2)+'\n');console.log('Admin native PostgreSQL migrations and HTTP route pass; predecessor parity preserved.');
}catch(e){fs.writeFileSync(dir+'/admin-native-error.log',String(e.stdout||'')+String(e.stderr||'')+String(e));throw Error('Admin native gate failed; private diagnostic retained');}
finally{for(const n of [app,db])try{docker(['rm','-f',n]);}catch{}}
