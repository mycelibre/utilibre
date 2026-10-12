// Existing Redlib native startup/settings check. No visitor content is fetched.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {root,read,run,docker,inspect} from './ubuntu-common.mjs';
process.umask(0o077);
const dir=root+'/ubuntu-images/redlib',s=read(dir+'/stage.json'),name='maintenance-noble-mount-redlib';
assert(!fs.existsSync(dir+'/application.json'));assert.equal(inspect(s.candidate).Id,s.image);
try{
 docker('run','-d','--name',name,'--network','bridge','--read-only','--cpus','1','--memory','256m','--pids-limit','64','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges:true','--tmpfs','/tmp:rw,size=16m,mode=1777',s.image,'redlib','-4','-H','0');
 const pid=inspect(name).State.Pid;assert(pid>0);let passed=false;
 for(let n=0;n<12;n++){
  try{const output=run('nsenter',['-t',String(pid),'-n',process.execPath,'--input-type=module','-e',`let r=await fetch('http://127.0.0.1:8080/settings');if(r.status!==200||!(await r.text()).includes('Redlib'))throw Error('Native settings failed');console.log('REDLIB_NATIVE_PASSED')`]);assert(output.includes('REDLIB_NATIVE_PASSED'));passed=true;break;}
  catch(e){if(n===11)throw e;await new Promise(r=>setTimeout(r,1000));}
 }
 assert(passed);fs.writeFileSync(dir+'/application.json',JSON.stringify({date:new Date().toISOString(),passed:true,imageId:s.image,checks:['Native Redlib startup','HTTP settings page served inside isolated container network'],network:'Unchanged native startup OAuth request to Reddit; no visitor/search/content query',limitations:'No repeated public upstream requests or full proxy-content/media journey; application bytes are unchanged.',productionChanged:false},null,2)+'\n');
 console.log('Redlib native settings/startup passed.');
}catch(e){fs.writeFileSync(dir+'/application-error.log',String(e.stderr||e.stack));throw Error('Redlib native gate failed; private diagnostics retained');}
finally{try{docker('rm','-f',name);}catch{}}
