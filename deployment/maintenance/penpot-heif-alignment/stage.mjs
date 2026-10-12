import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
process.umask(0o077);
export const root='/var/lib/utilibre-maintenance/penpot-heif-alignment-20261012',sha=b=>createHash('sha256').update(b).digest('hex');
export const current='92490d4adeb12215ed647de8e1eabc5cc315582eff9cbad55f09b70f29e2ecc9',previous='8f1d6e3e7966ccc7fd9f5168706e5c92c71ff8934c55236f421b9c52cc16634c';
export function run(cmd,args,input){try{return execFileSync(cmd,args,{input,encoding:'utf8',timeout:180000,maxBuffer:32e6,stdio:['pipe','pipe','pipe'],env:{...process.env,DOCKER_BUILDKIT:'0'}}).trim();}catch(e){fs.writeFileSync(root+'/error.log',String(e.stdout||'')+String(e.stderr||''));throw Error('Penpot HEIF alignment gate failed; private diagnostics saved');}}
export const docker=(...a)=>run('docker',a),inspect=n=>JSON.parse(docker('inspect',n))[0];
export const bounds=['--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','512m','--pids-limit','128','--log-driver','none','--ulimit','core=0','--tmpfs','/tmp:rw,size=128m,mode=1777'];
if(process.argv[1]===new URL(import.meta.url).pathname){
 assert(!fs.existsSync(root+'/stage.json'));assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>=8*1024**3);
 const rows=[];for(const role of ['backend','exporter']){
  const container='utilibre-expanded-penpot-'+role+'-1',live=inspect(container),baseRef=live.Config.Image,base=live.Image,candidate='utilibre-penpot-'+role+':heif-aligned-20261012';
  assert.equal(baseRef,'utilibre-penpot-'+role+':xlib-security-20261012');assert.equal(inspect(baseRef).Id,base);
  docker('build','--network=none','--pull=false','--memory','256m','--cpu-period','100000','--cpu-quota','100000','--build-arg','BASE='+baseRef,'--build-arg','RESTORE_USER='+(inspect(base).Config.User||'root'),'-t',candidate,new URL('.',import.meta.url).pathname);
  const next=inspect(candidate),before=inspect(base),norm=c=>({...c,User:['','root','0',undefined].includes(c.User)?'root':c.User});assert.deepEqual(norm(next.Config),norm(before.Config));
  const shell=(id,script)=>docker('run',...bounds,'--user','0','--entrypoint','sh',id,'-ec',script);
  assert.equal(shell(base,"dpkg-query -W -f='${Package} ${Version}\\n'"),shell(next.Id,"dpkg-query -W -f='${Package} ${Version}\\n'"));
  const sum='find /opt /usr /etc -type f ! -path /opt/imagick/lib/deps/libheif.so.1 ! -path /etc/hosts ! -path /etc/hostname ! -path /etc/resolv.conf -exec sha256sum {} + | sort | sha256sum';
  const unchanged= shell(base,sum);assert.equal(shell(next.Id,sum),unchanged);
  assert.equal(shell(next.Id,'sha256sum /opt/imagick/lib/deps/libheif.so.1').split(/\s/)[0],current);assert.equal(shell(next.Id,'sha256sum /usr/lib/x86_64-linux-gnu/libheif.so.1').split(/\s/)[0],current);
  rows.push({role,container,baseRef,base,candidate,image:next.Id,allOtherRuntimeConfigBytesUnchanged:true,packageInventoryUnchanged:true,unchangedDigest:unchanged});
 }
 const frontend=inspect('utilibre-expanded-penpot-frontend-1');const record={date:new Date().toISOString(),status:'passed',rows,frontend:{image:frontend.Config.Image,imageId:frontend.Image},librarySha256:current,previousSha256:previous,productionChanged:false};fs.writeFileSync(root+'/stage.json',JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record));
}
