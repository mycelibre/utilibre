import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const here=new URL('.',import.meta.url).pathname,root='/var/lib/utilibre-maintenance/security-20261110/kuma-without-apprise';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const spec=read(here+'inputs.json'),build=read(root+'/build.json');assert(build.passed&&build.base===spec.base);
const docker=args=>cp.execFileSync('docker',args,{encoding:'utf8',timeout:120000,maxBuffer:2*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const rows=[];
for(const [kind,image] of [['baseline',spec.base],['candidate',build.imageId]]){
 const name='maintenance-kuma-removal-'+kind;let created=false;
 try{
  docker(['run','-d','--name',name,'--network','none','--cpus','1','--memory','512m','--pids-limit','128','--security-opt','no-new-privileges','--log-driver','none','--read-only','--user','1000:1000','--cap-drop','ALL','-e','UPTIME_KUMA_DB_TYPE=sqlite','--tmpfs','/app/data:rw,nosuid,nodev,size=128m,uid=1000,gid=1000','--tmpfs','/tmp:rw,nosuid,nodev,size=32m,mode=1777','--mount','type=bind,src='+here+'native.cjs,dst=/tmp/native.cjs,readonly',image]);created=true;
  let ready=false;
  for(let i=0;i<60;i++){try{docker(['exec',name,'node','-e',"fetch('http://127.0.0.1:3001/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]);ready=true;break;}catch{}await new Promise(r=>setTimeout(r,500));}
  assert(ready,'Native readiness timeout');
  const output=docker(['exec',name,'node','/tmp/native.cjs',kind]);fs.writeFileSync(root+'/'+kind+'-native.log',output+'\n');
  const result=JSON.parse(output.split('\n').at(-1));assert(result.passed&&result.realNotificationsSent===0);rows.push({kind,image,...result});
 }catch(e){fs.writeFileSync(root+'/'+kind+'-error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('Isolated Kuma check failed; see private evidence.');}
 finally{if(created)docker(['rm','-f','-v',name]);}
}
fs.writeFileSync(root+'/application.json',JSON.stringify({passed:true,date:new Date().toISOString(),imageId:build.imageId,fixtureSha256:sha(here+'native.cjs'),runnerSha256:sha(here+'check.mjs'),rows},null,2)+'\n');
console.log('Both images passed fresh accounts, native notifications and monitoring checks; no real notification sent.');
