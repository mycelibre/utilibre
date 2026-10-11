// Native application checks in disposable, network-isolated containers. Never
// mounts production data or changes public registrations/authentication.
import assert from 'node:assert/strict';
import {execFileSync as exec} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
const dir='/var/lib/utilibre-maintenance/proxyaddr-20261011';
mkdirSync(dir,{recursive:true,mode:0o700});
const docker=args=>exec('docker',args,{encoding:'utf8',timeout:120000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']});
const scripts={
actual: `const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
(async()=>{const base='http://127.0.0.1:5006';let token;
async function api(path,data,headers={}){const r=await fetch(base+path,{method:data?'POST':'GET',headers:{'content-type':'application/json',...(token?{'x-actual-token':token}:{}),...headers},body:data?JSON.stringify(data):undefined});assert(r.ok,path+': '+r.status);const x=await r.json();assert.equal(x.status,'ok');return x.data;}
const boot=await api('/account/needs-bootstrap');assert.equal(boot.bootstrapped,false);
const password=randomUUID();await api('/account/bootstrap',{password});
token=(await api('/account/login',{password})).token;assert(token);
assert.equal((await api('/sync/list-user-files')).length,0);
const id=randomUUID(),bytes=Buffer.from('Fictional opaque synchronization test; not a budget export.');
const headers={'x-actual-token':token,'x-actual-file-id':id};
const upload=await fetch(base+'/sync/upload-user-file',{method:'POST',headers:{...headers,'x-actual-name':'Fictional test','content-type':'application/encrypted-file'},body:bytes});assert.equal(upload.status,200);assert.equal((await upload.json()).status,'ok');
assert.deepEqual(Buffer.from(await(await fetch(base+'/sync/download-user-file',{headers})).arrayBuffer()),bytes);
assert.equal((await fetch(base+'/sync/download-user-file',{headers:{'x-actual-file-id':id}})).status,401);
await api('/sync/delete-user-file',{fileId:id});
console.log('Actual isolated password login, opaque file round trip, anonymous denial and deletion passed. Production OIDC unchanged.');
})().catch(e=>{console.error(e.message);process.exitCode=1});`,
grist: `const assert=require('node:assert/strict');
(async()=>{const base='http://127.0.0.1:8484',a={'X-Forwarded-Email':'fictional-a@example.invalid'},b={'X-Forwarded-Email':'fictional-b@example.invalid'};
async function api(path,method='GET',data,identity=a){const r=await fetch(base+path,{method,headers:{...identity,'content-type':'application/json'},body:data?JSON.stringify(data):undefined});assert(r.ok,path+': '+r.status);return r.json();}
const orgs=await api('/api/orgs');assert(orgs.length);
const spaces=await api('/api/orgs/'+orgs[0].id+'/workspaces');assert(spaces.length);
const doc=await api('/api/workspaces/'+spaces[0].id+'/docs','POST',{name:'Fictional security regression'});
await api('/api/docs/'+doc+'/tables','POST',{tables:[{id:'Practice',columns:[{id:'Quantity',fields:{type:'Numeric'}},{id:'Total',fields:{type:'Numeric',isFormula:true,formula:'$Quantity * 3'}}]}]});
await api('/api/docs/'+doc+'/tables/Practice/records','POST',{records:[{fields:{Quantity:7}}]});
assert.equal((await api('/api/docs/'+doc+'/tables/Practice/records')).records[0].fields.Total,21);
assert.equal((await fetch(base+'/api/docs/'+doc+'/tables/Practice/records',{headers:b})).status,403);
const exported=await fetch(base+'/api/docs/'+doc+'/download',{headers:a,redirect:'manual'});assert.equal(exported.status,200,'Grist export: '+exported.status+' '+(exported.headers.get('location')||''));
assert.equal(Buffer.from(await exported.arrayBuffer()).subarray(0,15).toString(),'SQLite format 3');
assert.equal((await fetch(base+'/api/docs/'+doc,{method:'DELETE',headers:{...a,'content-type':'application/json'}})).status,200,'Grist delete');
console.log('Grist isolated native creation, sandboxed formula, second-account denial, SQLite export and deletion passed.');
})().catch(e=>{console.error(e.message);process.exitCode=1});`
};
const selected=process.argv[2]?[process.argv[2]]:['actual','grist'];assert(selected.every(x=>['actual','grist'].includes(x)));
for(const key of selected){
 const name='utilibre-'+key+'-proxyaddr-stage';
 const image=process.env.UTILIBRE_GRIST_LIBRARY_CHECK==='1'&&key==='grist'
  ? 'utilibre-grist:libraries-security-20261011' : 'utilibre-'+key+':proxyaddr-security-20261011';
 assert.equal(docker(['ps','-aq','--filter','name=^/'+name+'$']).trim(),'');
 const volume=key==='actual'?'/data':'/persist',port=key==='actual'?5006:8484;
 const config=key==='grist'?['--env-file','/opt/utilibre/records/private/grist.env','-e','APP_HOME_URL=http://127.0.0.1:8484','-e','GRIST_DEFAULT_EMAIL=fictional-a@example.invalid']:[];
 try{
  docker(['run','-d','--name',name,'--network','none','--read-only','--user','1000:1000','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--cpus','1','--memory','1g','--pids-limit','128','--tmpfs','/tmp:rw,nosuid,size=128m,mode=1777','--tmpfs',volume+':rw,nosuid,size=128m,uid=1000,gid=1000',...config,image]);
  let ready=false;for(let i=0;i<90;i++){try{docker(['exec',name,'node','-e',`fetch('http://127.0.0.1:${port}/${key==='grist'?'status':''}').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))`]);ready=true;break;}catch{}await new Promise(r=>setTimeout(r,1000));}assert(ready);
  const result=exec('docker',['exec','-i',name,'node','-'],{input:scripts[key],encoding:'utf8',timeout:120000,maxBuffer:1024**2});
  const receipt=key==='grist'&&process.env.UTILIBRE_GRIST_LIBRARY_CHECK==='1'?'grist-libraries-native':key+'-native';
  writeFileSync(dir+'/'+receipt+'.json',JSON.stringify({date:new Date().toISOString(),image,status:'passed',checks:result.trim(),network:'none',data:'fictional disposable tmpfs'},null,2),{mode:0o600});console.log(result.trim());
 }catch(error){writeFileSync(dir+'/'+key+'-native-error.log',String(error.stderr||error.message),{mode:0o600});throw Error(key+': inspect private native-error.log');}
 finally{docker(['rm','-f',name]);}
}
