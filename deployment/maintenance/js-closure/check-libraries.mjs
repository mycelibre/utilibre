import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import path from 'node:path';
import {specs,output} from './specs.mjs';
process.umask(0o077);
for(const s of specs){
 const b=JSON.parse(fs.readFileSync(output+'/'+s.key+'/build.json'));assert(b.passed);
 try{
  const result=cp.execFileSync('docker',['run','--rm','--network','none','--read-only','--user','0','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--cpus','1','--memory','512m','--pids-limit','64','--tmpfs','/tmp:rw,size=16m,mode=1777','-v',path.resolve('deployment/maintenance/js-closure/library.cjs')+':/check.cjs:ro','--entrypoint','node',b.imageId,'/check.cjs',JSON.stringify(s.paths)],{encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']});
  const native=JSON.parse(result);assert(native.passed);
  fs.writeFileSync(output+'/'+s.key+'/libraries.json',JSON.stringify({date:new Date().toISOString(),imageId:b.imageId,...native,productionChanged:false},null,2)+'\n');
  console.log(s.key+': networkless library contracts passed');
 }catch(e){fs.writeFileSync(output+'/'+s.key+'/library-error.log',String(e.stderr||e.message));throw Error(s.key+': private library-error.log');}
}
