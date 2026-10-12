// Independent old/new controls. Test-only shim never enters production images.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012',here=new URL('.',import.meta.url).pathname;
const spec=JSON.parse(fs.readFileSync(here+'util-linux-specs.json')).find(s=>s.key==='util-linux-calendar-radicale');
const fixtureDir=dir+'/util-linux-test-fixtures';
const rows=[];
for(const [kind,image] of [['original',spec.base],['repaired',spec.candidate]]){
 for(const [test,command] of [['failed-helper','/native/mount-helper-regression 1'],['successful-helper','/native/mount-helper-regression 0'],['cgroup-descriptor','export UTILIBRE_CGROUP_FIXTURE=$(mktemp /tmp/utilibre-cgroup-XXXXXX); LD_PRELOAD=/native/nsenter-fd-shim.so nsenter --mount=/proc/self/ns/mnt --target $$ --join-cgroup /native/check-inherited-fd']]){
  const r=cp.spawnSync('docker',['run','--rm','--network','none','--read-only','--user','0','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','128m','--pids-limit','32','--ulimit','core=0','--log-driver','none','--tmpfs','/tmp:rw,size=16m,mode=1777','--mount','type=bind,src='+fixtureDir+',dst=/native,readonly','--mount','type=bind,src='+here+'mount.utilibrefixture,dst=/sbin/mount.utilibrefixture,readonly','--entrypoint','sh',image,'-ec',command],{encoding:'utf8',timeout:30000});
  assert.equal(r.status,kind==='original'&&test!=='successful-helper'?10:0);
  rows.push({kind,image,test,exitCode:r.status,output:r.stdout.trim()});
 }
}
const fixtureSha256=Object.fromEntries(['mount-helper-regression','nsenter-fd-shim.so','check-inherited-fd'].map(f=>[f,createHash('sha256').update(fs.readFileSync(fixtureDir+'/'+f)).digest('hex')]));
fs.writeFileSync(dir+'/util-linux-regression.json',JSON.stringify({date:new Date().toISOString(),passed:true,rows,fixtureSha256,limitations:'Synthetic helper and same-namespace simulated cgroup descriptor only; no real mount or host cgroup write.'},null,2)+'\n');
console.log('Six old/new controls passed: original failures reproduced; native repairs pass; successful helper preserved.');
