// Reuse native Kuma account checks against disposable tmpfs SQLite only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {dir,spec,docker,inspect} from './stage-kuma.mjs';
process.umask(0o077);
const build=JSON.parse(fs.readFileSync(dir+'/kuma-build.json')),here=new URL('.',import.meta.url).pathname;
assert.equal(inspect(spec.candidate).Id,build.imageId);assert(!fs.existsSync(dir+'/kuma-application.json'));
const name='maintenance-sudo-kuma-20261012',result={date:new Date().toISOString(),imageId:build.imageId,passed:false,fictionalDataOnly:true,network:'none'};
let created=false;
try{
 docker('run','-d','--name',name,'--network','none','--cpus','1','--memory','1g','--pids-limit','128','--security-opt','no-new-privileges','--log-driver','none','--read-only','--user','1000:1000','--cap-drop','ALL','-e','UPTIME_KUMA_DB_TYPE=sqlite','--tmpfs','/app/data:rw,nosuid,nodev,size=128m,uid=1000,gid=1000','--tmpfs','/tmp:rw,nosuid,nodev,size=32m,mode=1777','--mount','type=bind,src='+here+'../sqlite-final/kuma-native.cjs,dst=/tmp/kuma-native.cjs,readonly',spec.candidate);created=true;
 let ready=false;for(let n=0;n<60;n++){try{docker('exec',name,'node','-e',"fetch('http://127.0.0.1:3001/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))");ready=true;break;}catch{}await new Promise(r=>setTimeout(r,500));}assert(ready);
 assert.match(docker('exec',name,'node','/tmp/kuma-native.cjs'),/authenticated Socket/);
 result.nativeSetupLogin=true;result.noNotificationSent=true;result.passed=true;
}finally{
 if(created)docker('rm','-f','-v',name);result.completedAt=new Date().toISOString();
 fs.writeFileSync(dir+'/kuma-application.json',JSON.stringify(result,null,2)+'\n');
}
console.log('Native Kuma setup/authentication passed; synthetic tmpfs state removed.');
