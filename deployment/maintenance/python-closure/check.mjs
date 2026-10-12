import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/python-closure-20261012';
const docker=(...a)=>cp.execFileSync('docker',a,{encoding:'utf8',timeout:120000,stdio:['ignore','pipe','pipe'],maxBuffer:4*1024**2}).trim();
for(const [key,base,ref,user,paths] of [
 ['simplelogin','utilibre-simplelogin:4.82.4-p8-os-security-20261011','utilibre-simplelogin:4.82.4-python-closure-20261012','1000:1000',['/code/app','/code/migrations','/code/templates','/code/static','/code/commands','/code/tasks','/root/.local/share/uv/python']],
 ['grist','utilibre-grist:1.7.21-js-closure-20261012','utilibre-grist:1.7.21-python-js-closure-20261012','1000:1000',['/grist','/opt/utilibre-grist-reviewed-leaves']],
]){
 const before=JSON.parse(docker('image','inspect','--format','{{json .Config}}',base)),after=JSON.parse(docker('image','inspect','--format','{{json .Config}}',ref));
 assert.deepEqual(after,before);assert.equal(after.User,user);
 const run=(image,code)=>docker('run','--rm','--network','none','--read-only','--user','0','--memory','512m','--cpus','1','--log-driver','none','--entrypoint','sh',image,'-ec',code);
 const hashes={};for(const p of paths){const code=`test -d ${p} && find ${p} -type f -exec sha256sum {} + | sort | sha256sum`;hashes[p]=run(base,code).split(' ')[0];assert.equal(run(ref,code).split(' ')[0],hashes[p]);}
 if(key==='simplelogin')assert.equal(run(ref,'test ! -e /usr/bin/uv && test ! -e /usr/bin/uvx && test ! -e /root/.cache/uv && echo absent'),'absent');
 const id=docker('image','inspect',ref,'--format','{{.Id}}');
 fs.writeFileSync(root+'/'+key+'-parity.json',JSON.stringify({date:new Date().toISOString(),passed:true,base:dockImage(base),candidate:ref,imageId:id,configurationUnchanged:true,unchangedApplicationAndInterpreterHashes:hashes,removedOnlyInstallerCacheAndUnusedTools:key==='simplelogin',productionChanged:false},null,2)+'\n');
 console.log(key+': native configuration and application/interpreter parity passed');
}
function dockImage(ref){return docker('image','inspect',ref,'--format','{{.Id}}');}
