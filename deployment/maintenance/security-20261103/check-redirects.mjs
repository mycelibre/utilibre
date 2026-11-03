import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
process.umask(0o077);
const inputs=JSON.parse(fs.readFileSync(new URL('./redirects-inputs.json',import.meta.url))),keys=process.argv.slice(2);
assert(keys.length&&new Set(keys).size===keys.length&&keys.every(k=>inputs.rows.some(s=>s.key===k)));
for(const s of inputs.rows.filter(s=>keys.includes(s.key))){
 const dir='/var/lib/utilibre-maintenance/security-20261103/redirects/'+s.key,b=JSON.parse(fs.readFileSync(dir+'/build.json'));
 assert(b.passed&&b.configurationUnchanged&&b.base===s.base);
 const rows=[];
 for(const path of s.paths['follow-redirects'])for(const [state,imageId] of [['baseline',b.base],['fixed',b.imageId]]){
  const out=cp.execFileSync('docker',['run','--rm','-i','--network','none','--read-only','--cpus','1','--memory','256m','--memory-swap','256m','--pids-limit','64','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--entrypoint','node',imageId,'-',path,state],{input:fs.readFileSync(new URL('./redirects-check.cjs',import.meta.url)),encoding:'utf8',timeout:30000,maxBuffer:1024**2,stdio:['pipe','pipe','pipe']});
  rows.push({path,imageId,...JSON.parse(out)});
 }
 assert(rows.every(r=>r.passed&&r.sameOriginPreserved&&r.redirectLimit));
 for(const r of rows)assert.equal(r.observations.filter(o=>o.credentialForwarded).length,r.fixed?0:2);
 fs.writeFileSync(dir+'/application.json',JSON.stringify({date:new Date().toISOString(),passed:true,imageId:b.imageId,base:b.base,rows,noExternalRequests:true,scope:'Synthetic native HTTP redirect consumer, not a complete application workflow.'},null,2)+'\n');
 console.log(s.key+': credential regression reproduced and fixed; normal redirects preserved');
}
