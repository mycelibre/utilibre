// Synthetic native startup and PHP compatibility checks. No external network,
// production settings, user data, provider queries or mail.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {output} from './specs.mjs';
process.umask(0o077);
const dir=output+'/degoog',b=JSON.parse(fs.readFileSync(dir+'/build.json'));
const run=(exe,args)=>cp.execFileSync(exe,args,{encoding:'utf8',timeout:60000,maxBuffer:1024**2,stdio:['ignore','pipe','pipe']}).trim();
const docker=(...a)=>run('docker',a),proofs=[];
const safety=['--network','none','--read-only','--user','1000:1000','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--memory','512m','--memory-swap','512m','--cpus','1','--pids-limit','96','--tmpfs','/tmp:size=32m,mode=1777','--tmpfs','/app/data:size=16m,uid=1000,gid=1000'];
for(const id of [b.base,b.imageId]){
 const name='maintenance-degoog-php-'+process.pid;
 try{
  docker('run','-d','--name',name,...safety,'-e','DEGOOG_PUBLIC_INSTANCE=true','-e','DEGOOG_WIZARD=false','-e','DEGOOG_DATA_DIR=/app/data','-e','LOG_LEVEL=error','--entrypoint','bun',id,'run','src/server/index.ts');
  const x=JSON.parse(docker('inspect',name))[0];assert.equal(x.Image,id);assert.equal(x.HostConfig.NetworkMode,'none');
  let html;
  for(let n=0;n<40;n++){
   try{html=run('nsenter',['-t',String(x.State.Pid),'-n','curl','-fsS','--max-time','2','http://127.0.0.1:4444/']);break;}
   catch{await new Promise(r=>setTimeout(r,250));}
  }
  assert(html?.includes('search-input'),'Native search page unavailable');
  const php=docker('exec',name,'php','-r',`require '/app/src/server/extensions/compatibility-layer/fourget/bridge/stage.php'; $s=stager::wrap('<?php function fictional(){return "café";}'); eval(substr($s,5)); if (Degoog\\FourGet\\Sandbox\\fictional()!=="café") exit(2); if(mb_strlen("café")!==4)exit(3); echo json_encode(["version"=>PHP_VERSION,"compatibility"=>true]);`);
  proofs.push({imageId:id,homepage:true,...JSON.parse(php)});
 }finally{try{docker('rm','-f',name);}catch{}}
}
fs.writeFileSync(dir+'/application.json',JSON.stringify({date:new Date().toISOString(),imageId:b.imageId,passed:true,network:'none',proofs,limitations:['Synthetic native startup and PHP bridge; no real search provider queried. Existing application/source hashes are checked separately.']},null,2)+'\n');
console.log('DeGoog maintained baseline and PHP candidate: isolated homepage and PHP compatibility passed');
