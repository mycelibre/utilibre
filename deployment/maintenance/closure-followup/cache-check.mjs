import fs from 'node:fs';
import cp from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012';
const specs=JSON.parse(fs.readFileSync(new URL('./cache-specs.json',import.meta.url)));
for(const s of specs.filter(s=>process.argv.length<3||process.argv.slice(2).includes(s.key))){
 const output=dir+'/cache/'+s.key,b=JSON.parse(fs.readFileSync(output+'/build.json'));assert(b.passed&&b.configurationUnchanged);
 try{
 const text=cp.execFileSync('docker',['run','--rm','--network','none','--read-only','--user','0','--cpus','1','--memory','256m','--pids-limit','64','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges','--tmpfs','/tmp:rw,size=32m,mode=1777','-e','HOME=/tmp','-e','NPM_CONFIG_CACHE=/tmp/npm-cache','-v',path.resolve('deployment/maintenance/closure-followup/cache-native.cjs')+':/check.cjs:ro','--entrypoint','node',b.imageId,'/check.cjs',JSON.stringify(s.paths['http-cache-semantics'])],{encoding:'utf8',timeout:60000,stdio:['ignore','pipe','pipe']});
 const native=JSON.parse(text);assert(native.passed);fs.writeFileSync(output+'/native.json',JSON.stringify({date:new Date().toISOString(),imageId:b.imageId,...native},null,2)+'\n');console.log(s.key+': native cache contracts passed');
 }catch(e){fs.writeFileSync(output+'/native-error.log',String(e.stdout||'')+String(e.stderr||e));throw Error(s.key+': see private native-error.log');}
}
