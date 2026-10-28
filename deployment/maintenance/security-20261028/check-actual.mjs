// Native application startup, disposable synthetic database, no outbound network.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';
process.umask(0o077);const root='/var/lib/utilibre-maintenance/security-20261028/body/actual',b=JSON.parse(fs.readFileSync(root+'/build.json')),rows=[];
const docker=(...a)=>cp.execFileSync('docker',a,{encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']}).trim();
for(const imageId of [b.base,b.imageId]){
 const name='maintenance-actual-native';try{
  docker('run','-d','--name',name,'--network','none','--read-only','--user','1000:1000','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','512m','--memory-swap','512m','--pids-limit','128','--log-driver','none','--tmpfs','/tmp:rw,size=32m,mode=1777','--tmpfs','/data:rw,size=64m,uid=1000,gid=1000,mode=0700','-e','ACTUAL_PORT=5006','-e','ACTUAL_LOGIN_METHOD=password','-e','ACTUAL_ALLOWED_LOGIN_METHODS=password',imageId);
  let ok=false;for(let n=0;n<35;n++){try{const out=docker('exec',name,'node','-e',"fetch('http://127.0.0.1:5006/health').then(async r=>{if(r.status!==200)process.exit(1);console.log('ACTUAL_NATIVE_HEALTH_PASSED')}).catch(()=>process.exit(1))");assert.equal(out,'ACTUAL_NATIVE_HEALTH_PASSED');ok=true;break;}catch{await new Promise(r=>setTimeout(r,500));}}
  assert(ok,'Actual native startup failed');const state=JSON.parse(docker('inspect','--format','{{json .State}}',name));assert(state.Running);rows.push({imageId,passed:true,health:200,user:'1000:1000',storage:'new tmpfs database'});
 }finally{try{docker('rm','-f',name);}catch{}}
}
fs.writeFileSync(root+'/app.json',JSON.stringify({date:new Date().toISOString(),passed:true,imageId:b.imageId,rows,network:'none',limitation:'Password-mode synthetic startup; production OIDC verified only by the bounded existing health/route release gate'},null,2)+'\n');console.log('Actual: both native startups passed as runtime UID with synthetic data');
