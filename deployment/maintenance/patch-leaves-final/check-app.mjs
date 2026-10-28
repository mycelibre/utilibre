// Isolated native application parity. Never uses production env/data or accounts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {specs,output as originalOutput} from './specs.mjs';
process.umask(0o077);
const zod=process.argv.includes('--zod-oct28'),pcre=process.argv.includes('--pcre-oct28');
const oct22=process.argv.includes('--oct22'),oct28=zod||pcre||process.argv.includes('--undici-oct28'),output=oct28?'/var/lib/utilibre-maintenance/security-20261028/'+(zod?'zod':pcre?'pcre':'undici'):oct22?'/var/lib/utilibre-maintenance/security-20261022':originalOutput;
const original=specs.find(x=>x.key===process.argv[2]);assert(original);
if(oct22||oct28)assert((zod?['candlr','admin']:['candlr','degoog']).includes(original.key));
const s=oct22||oct28?{...original,...JSON.parse(fs.readFileSync(output+'/'+original.key+'/build.json'))}:original;
const dir=output+'/'+s.key,stage=JSON.parse(fs.readFileSync(dir+'/build.json'));
const docker=(args,opt={})=>cp.execFileSync('docker',args,{encoding:'utf8',timeout:45000,maxBuffer:3*1024**2,stdio:['pipe','pipe','pipe'],...opt});
const names=new Set(),rows=[],pause=()=>new Promise(r=>setTimeout(r,400));
const guard=['--read-only','--cpus','1','--memory','512m','--pids-limit','128','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges','--tmpfs','/tmp:rw,size=32m,mode=1777'];
const remove=n=>{docker(['rm','-f',n]);names.delete(n);};
const start=(n,args)=>{assert.equal(docker(['ps','-aq','--filter','name=^/'+n+'$']).trim(),'');docker(['run','-d','--name',n,...args]);names.add(n);};
async function ready(n,runtime,port,path){for(let i=0;i<75;i++){try{return JSON.parse(docker(['exec',n,runtime,'-e',`fetch('http://127.0.0.1:${port}${path}',{redirect:'manual'}).then(async r=>{if(r.status>=500)process.exit(1);console.log(JSON.stringify({status:r.status,location:r.headers.get('location'),body:(await r.text()).slice(0,5000)}))}).catch(()=>process.exit(1))`]));}catch{await pause();}}throw Error('Native readiness deadline');}
try{
 assert.equal(docker(['image','inspect','--format','{{.Id}}',s.candidate]).trim(),stage.imageId);
 for(const image of [s.base,stage.imageId]){
  const n='maintenance-patch-app-'+s.key;
  if(s.key==='admin'){
   const db='maintenance-patch-admin-db';
   const dbImage=docker(['inspect','--format','{{.Image}}','utilibre-expanded-penpot-db-1']).trim();
   start(db,['--network','none','--read-only','--user','70:70','--cpus','1','--memory','384m','--pids-limit','96','--log-driver','none','--tmpfs','/var/lib/postgresql/data:rw,size=128m,uid=70,gid=70','--tmpfs','/var/run/postgresql:rw,size=16m,uid=70,gid=70','--tmpfs','/tmp:rw,size=16m,mode=1777','-e','POSTGRES_USER=penpot','-e','POSTGRES_DB=penpot','-e','POSTGRES_PASSWORD=Fictional-native-only',dbImage]);
   let pg=false;for(let i=0;i<60;i++){try{docker(['exec',db,'pg_isready','-U','penpot']);pg=true;break;}catch{await pause();}}assert(pg);
   start(n,[...guard,'--network','container:'+db,'-e','PENPOT_PUBLIC_URI=http://127.0.0.1:8080','-e','PENPOT_INTERNAL_URI=http://127.0.0.1:8080','-e','PENPOT_SECRET_KEY=Fictional-only-native-admin-2026','-e','PENPOT_DATABASE_URI=postgresql://127.0.0.1/penpot','-e','PENPOT_DATABASE_USERNAME=penpot','-e','PENPOT_DATABASE_PASSWORD=Fictional-native-only',image]);
   const response=await ready(n,'node',3000,'/');assert(response.status>=200&&response.status<400);
   const count=Number(docker(['exec',db,'psql','-U','penpot','-d','penpot','-Atc',"SELECT count(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema')"]).trim());assert(count>0);
   rows.push({imageId:image,status:response.status,location:response.location,nativeMigrationTables:count});remove(n);remove(db);
  }else if(s.key==='degoog'){
   start(n,[...guard,'--network','none','--tmpfs','/app/data:rw,size=64m,uid=1000,gid=1000','-e','DEGOOG_PUBLIC_INSTANCE=true','-e','DEGOOG_WIZARD=false','-e','DEGOOG_SETTINGS_PASSWORDS=Fictional-only-native-gate','-e','DEGOOG_PORT=4444','-e','LOG_LEVEL=error','--entrypoint','bun',image,'run','src/server/index.ts']);
   const response=await ready(n,'bun',4444,'/readyz');assert.equal(response.status,200);
   const checks=JSON.parse(docker(['exec',n,'bun','-e',`const a=await fetch('http://127.0.0.1:4444/');const body=await a.text();if(!a.ok||!body.toLowerCase().includes('search'))throw Error('search page');const b=await fetch('http://127.0.0.1:4444/no-such-fictional-page');if(b.status!==404)throw Error('404');console.log(JSON.stringify({searchForm:true,missing404:true,noReferrer:a.headers.get('referrer-policy')==='no-referrer'}));`]));assert(checks.noReferrer);
   rows.push({imageId:image,status:response.status,...checks});remove(n);
  }else{
   start(n,[...guard,'--network','none','--user','1000:1000','--tmpfs','/app/backend/data:rw,size=64m,uid=1000,gid=1000','-e','SECRET_KEY=Fictional-only-local-candlr-native-2026','-e','BACKEND_PORT=8000','-e','SERVER_URL=http://127.0.0.1:4258','-e','TIMEZONE=UTC','-e','ENABLE_REGISTRATIONS=true','-e','REGISTRATION_MAX_ALLOWED_USERS=2','-e','OIDC_ENABLED=false','-e','OIDC_DISABLE_PASSWORD_LOGIN=false','-e','CARDDAV_SYNC_INTERVAL_MINUTES=0','--entrypoint','/bin/sh',image,'-c','cd /app/backend && alembic upgrade head && exec supervisord -n -c /etc/supervisor/conf.d/candlr.conf']);
   assert.equal((await ready(n,'node',8000,'/health')).status,200);
   const front=await ready(n,'node',4258,'/login');assert.equal(front.status,200);assert(/sign in|log in|candlr/i.test(front.body));
   const result=JSON.parse(docker(['exec','-i',n,'node','-'],{input:fs.readFileSync(new URL('./candlr-native.cjs',import.meta.url))}));
   rows.push({imageId:image,status:front.status,...result});remove(n);
  }
 }
 const comparable=r=>{const {imageId,...rest}=r;return rest;};assert.deepEqual(comparable(rows[0]),comparable(rows[1]));
 const library=JSON.parse(fs.readFileSync(dir+(pcre?'/build.json':oct28?'/native.json':'/libraries.json')));assert(library.passed&&library.imageId===stage.imageId);
 fs.writeFileSync(dir+(zod?'/application.json':oct28?'/app.json':'/native.json'),JSON.stringify({date:new Date().toISOString(),imageId:stage.imageId,passed:true,nativeStartup:true,network:'none; disposable DB namespace where required',applicationParity:rows,libraryGate:true,productionChanged:false,limitations:['No live account data was read or changed.','DeGoog search providers were not queried; the search form, startup and error route were tested.','Candlr local synthetic accounts do not replace a live OIDC operator check.','Admin gate tests native empty-DB migrations and login routing, not operator privileges.']},null,2)+'\n');console.log(s.key+' native application and dependency gates passed');
}catch(e){fs.writeFileSync(dir+'/native-error.log',String(e.stdout||'')+String(e.stderr||'')+String(e));throw Error('Native application gate failed; private report '+dir);}
finally{for(const n of names)try{docker(['rm','-f',n]);}catch{}}
