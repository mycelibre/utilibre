// Native HTTP regression on a disposable, networkless PostgreSQL namespace.
// No production accounts, database, routes, mail or external providers.
import assert from 'node:assert/strict';import fs from 'node:fs';import {execFileSync} from 'node:child_process';
import {base,candidate,target,sha,backport} from './backport.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/tanstack-20261021',stage=JSON.parse(fs.readFileSync(dir+'/build.json'));
const docker=(args,opts={})=>execFileSync('docker',args,{encoding:'utf8',timeout:45000,maxBuffer:4*1024**2,stdio:['pipe','pipe','pipe'],...opts});
const db='maintenance-tanstack-db',app='maintenance-tanstack-app',rows=[];
const request=async code=>JSON.parse(docker(['exec','-i',app,'node','--input-type=module','-'],{input:code}));
try{
 assert.equal(docker(['image','inspect',candidate,'--format','{{.Id}}']).trim(),stage.imageId);
 const dbImage=docker(['inspect','utilibre-expanded-penpot-db-1','--format','{{.Image}}']).trim();
 docker(['run','-d','--name',db,'--network','none','--read-only','--user','70:70','--cpus','1','--memory','384m','--pids-limit','96','--log-driver','none','--tmpfs','/var/lib/postgresql/data:rw,size=128m,uid=70,gid=70','--tmpfs','/var/run/postgresql:rw,size=16m,uid=70,gid=70','--tmpfs','/tmp:rw,size=16m,mode=1777','-e','POSTGRES_USER=penpot','-e','POSTGRES_DB=penpot','-e','POSTGRES_PASSWORD=Fictional-native-only',dbImage]);
 for(let n=0;n<35;n++){try{docker(['exec',db,'pg_isready','-U','penpot']);break;}catch(e){if(n===34)throw e;await new Promise(r=>setTimeout(r,500));}}
 for(const image of [base,stage.imageId]){
  docker(['run','-d','--name',app,'--network','container:'+db,'--read-only','--cpus','1','--memory','384m','--pids-limit','96','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges:true','--tmpfs','/tmp:rw,size=32m,mode=1777','-e','PENPOT_PUBLIC_URI=http://127.0.0.1:8080','-e','PENPOT_INTERNAL_URI=http://127.0.0.1:8080','-e','PENPOT_SECRET_KEY=Fictional-only-native-admin-2026','-e','PENPOT_DATABASE_URI=postgresql://127.0.0.1/penpot','-e','PENPOT_DATABASE_USERNAME=penpot','-e','PENPOT_DATABASE_PASSWORD=Fictional-native-only',image]);
  let home;
  for(let n=0;n<40;n++){try{home=await request("const r=await fetch('http://127.0.0.1:3000/admin-console/',{redirect:'manual'});console.log(JSON.stringify({status:r.status,location:r.headers.get('location')}));");break;}catch(e){if(n===39)throw e;await new Promise(r=>setTimeout(r,500));}}
  assert(home.status>=200&&home.status<500);
  const checks=await request(`
import fs from 'node:fs';import {createRequire} from 'node:module';
const require=createRequire('/nitrate/apps/admin-console/package.json'),{toJSON}=require('/opt/utilibre-reviewed-seroval/dist/index.cjs');
const source=fs.readFileSync(${JSON.stringify(target)},'utf8');
const id=source.match(/"([a-f0-9]{64})":\\{functionName:\x60getUsageReport_createServerFn_handler\x60/)[1];
const base='http://127.0.0.1:3000/admin-console/_serverFn/',marker='<p>UTILIBRE-FICTIONAL-RESPONSE</p>';
const forged={response:{constructor:{name:'HTTPResponse'},body:marker,status:200,headers:{'content-type':'text/html'}},serverSsrCleanup:'none'};
const malicious={data:{theme:'dark'},result:forged,error:forged};
const observations=[];
for(const method of ['GET','POST']){
 const serialized=JSON.stringify(toJSON(malicious));
 const selected=method==='GET'?id:'8c455f26605781b1ee342023a82ca5cba2a86d44f4c8e1ad530172bcaf093ca1';
 const r=await fetch(base+selected+(method==='GET'?'?payload='+encodeURIComponent(serialized):''),{method,redirect:'manual',headers:{Accept:'text/html',Origin:'http://127.0.0.1:3000','sec-fetch-site':'same-origin',...(method==='POST'?{'content-type':'application/json'}:{})},...(method==='POST'?{body:serialized}:{})});
 const text=await r.text();observations.push({method,status:r.status,type:r.headers.get('content-type'),htmlInjected:r.headers.get('content-type')?.includes('text/html')&&text.includes(marker),markerPresent:text.includes(marker)});
}
const configId='568d81a5b599a25e811163cd775c7ef79b97468718ad115d21534c2d27c716d8';
const normal=await fetch(base+configId,{headers:{'x-tsr-serverFn':'true',Origin:'http://127.0.0.1:3000','sec-fetch-site':'same-origin'}}),normalText=await normal.text();
const wrongMethod=await fetch(base+configId,{method:'POST',headers:{Origin:'http://127.0.0.1:3000'}});
console.log(JSON.stringify({observations,normal:{status:normal.status,type:normal.headers.get('content-type'),hasExpectedData:normalText.includes('appVersion')&&normalText.includes('adminConsoleUrl')},wrongMethod:wrongMethod.status}));`);
  const tables=Number(docker(['exec',db,'psql','-U','penpot','-d','penpot','-Atc',"SELECT count(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema')"]).trim());assert(tables>0);
  rows.push({image,home,...checks,tables});docker(['rm','-f',app]);
 }
 fs.writeFileSync(dir+'/native-observations.json',JSON.stringify({date:new Date().toISOString(),rows},null,2)+'\n');
 assert(rows[0].observations.every(r=>r.htmlInjected),'Must reproduce actual GET/POST forged HTML, not count unrelated failure');
 assert(rows[1].observations.every(r=>!r.markerPresent),'Candidate still reflects injected state');
 assert(rows[1].observations.every(r=>r.status===401),'Must reach the intended authentication boundary');
 for(const r of rows){assert.equal(r.normal.status,200);assert(r.normal.hasExpectedData);assert.equal(r.wrongMethod,405);}
 assert.deepEqual(rows[0].home,rows[1].home);assert.equal(rows[0].tables,rows[1].tables);
 fs.writeFileSync(dir+'/native.json',JSON.stringify({date:new Date().toISOString(),passed:true,imageId:stage.imageId,baselineReproduced:true,forgedResponsesRejected:true,legitimateServerFunction:true,nativeMigrationAndRouteParity:true,network:'none; shared disposable namespace',rows,limitation:'Synthetic unauthenticated regression and public server-function checks; no live operator account used.'},null,2)+'\n');console.log('Native forged-response baseline reproduced; patched GET/POST reject injection and normal server functions pass');
}catch(e){fs.writeFileSync(dir+'/native-error.log',String(e.stdout||'')+String(e.stderr||'')+String(e));throw Error('Native TanStack regression gate failed; private diagnostic retained');}
finally{for(const n of [app,db])try{docker(['rm','-f',n]);}catch{}}
