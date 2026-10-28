import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/security-20261028/zod',here=new URL('.',import.meta.url).pathname;
const specs=JSON.parse(fs.readFileSync(here+'zod-inputs.json')).rows,keys=process.argv.slice(2);
assert(keys.length&&new Set(keys).size===keys.length&&keys.every(k=>specs.some(s=>s.key===k)));
for(const key of keys){
 const s=specs.find(s=>s.key===key),dir=root+'/'+key,b=JSON.parse(fs.readFileSync(dir+'/build.json'));assert(b.passed&&!fs.existsSync(dir+'/native.json'));
 const rows=[];
 for(const imageId of [s.base,b.imageId])for(const path of Object.keys(s.before)){
  const r=cp.spawnSync('docker',['run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','256m','--memory-swap','256m','--cpus','1','--pids-limit','64','--log-driver','none','-v',here+'zod-native.cjs:/test.cjs:ro','--entrypoint','node',imageId,'/test.cjs',path],{encoding:'utf8',timeout:30000,maxBuffer:1024**2});
  fs.writeFileSync(dir+'/native-'+rows.length+'-'+Date.now()+'.log',r.stdout+r.stderr+String(r.error||''));assert(!r.error&&!r.signal&&r.status===0,'Native Zod failure; private evidence retained');
  const n=JSON.parse(r.stdout);assert(n.passed&&n.normalChecks===15&&n.results.length===6);
  if(imageId===s.base)assert(n.results.every(x=>x.calls===20),'Required baseline behavior absent');else assert(n.earlyBounds&&n.version==='4.6.6');
  rows.push({imageId,path,...n});
 }
 fs.writeFileSync(dir+'/native.json',JSON.stringify({date:new Date().toISOString(),passed:true,imageId:b.imageId,rows,regressionReproduced:true,network:'none',fixtureSha256:createHash('sha256').update(fs.readFileSync(here+'zod-native.cjs')).digest('hex'),limits:'Configured upper bounds only. Unbounded containers unchanged; no external feed or application-wide DoS guarantee.'},null,2)+'\n');
 console.log(key+': fifteen normal parser checks and six bounded-container regressions passed per state');
}
