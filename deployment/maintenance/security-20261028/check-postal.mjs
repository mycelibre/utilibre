import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/security-20261028/postal';
const specs=JSON.parse(fs.readFileSync(new URL('./postal-inputs.json',import.meta.url))).rows;
const keys=process.argv.slice(2);assert(keys.length&&new Set(keys).size===keys.length&&keys.every(k=>specs.some(s=>s.key===k)));
for(const key of keys){
 const s=specs.find(s=>s.key===key),dir=root+'/'+key,b=JSON.parse(fs.readFileSync(dir+'/build.json'));assert(b.passed&&!fs.existsSync(dir+'/native.json'));
 const rows=[];
 for(const imageId of [s.base,b.imageId])for(const path of Object.keys(s.before)){
  const r=cp.spawnSync('docker',['run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','256m','--memory-swap','256m','--cpus','1','--pids-limit','64','--log-driver','none','-v',new URL('./postal-native.cjs',import.meta.url).pathname+':/test.cjs:ro','--entrypoint','node',imageId,'/test.cjs',path],{encoding:'utf8',timeout:30000,maxBuffer:1024**2});
  fs.writeFileSync(dir+'/native-'+rows.length+'.log',r.stdout+r.stderr+String(r.error||''));assert(!r.error&&!r.signal&&r.status===0,'Native MIME failure; inspect private evidence');
  const n=JSON.parse(r.stdout);assert(n.passed&&n.normalChecks===7);
  if(imageId===b.imageId)assert(!n.repeatedGrowingStringScan&&n.version==='4.0.8');
  rows.push({imageId,path,...n});
 }
 fs.writeFileSync(dir+'/native.json',JSON.stringify({date:new Date().toISOString(),passed:true,imageId:b.imageId,rows,regressionReproduced:rows.filter(r=>r.imageId===s.base).every(r=>r.repeatedGrowingStringScan),network:'none',source:'https://github.com/postalsys/postal-mime/security/advisories/GHSA-f2hq-32vh-53cc'},null,2)+'\n');
 console.log(key+': legitimate MIME and bounded decoder regression checks passed');
}
