import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/security-20261028/undici',specs=JSON.parse(fs.readFileSync(new URL('./undici-inputs.json',import.meta.url))).rows;
const keys=process.argv.slice(2);assert(keys.length&&keys.every(k=>specs.some(s=>s.key===k)));
for(const key of keys){
 const s=specs.find(s=>s.key===key),dir=root+'/'+key,b=JSON.parse(fs.readFileSync(dir+'/build.json'));assert(b.passed&&!fs.existsSync(dir+'/encoding.json'));
 const rows=[];
 for(const imageId of [s.base,b.imageId])for(const path of Object.keys(s.before)){
  const r=cp.spawnSync('docker',['run','--rm','--network','none','--read-only','--user','0','--cap-drop','ALL','--cap-add','DAC_OVERRIDE','--security-opt','no-new-privileges','--cpus','1','--memory','256m','--memory-swap','256m','--pids-limit','64','--log-driver','none','-v',new URL('./undici-encoding.cjs',import.meta.url).pathname+':/test.cjs:ro','--entrypoint','node',imageId,'/test.cjs',path],{encoding:'utf8',timeout:30000,maxBuffer:1024**2});
  fs.writeFileSync(dir+'/encoding-'+rows.length+'-'+Date.now()+'.log',r.stdout+r.stderr+String(r.error||''));
  assert(!r.error&&!r.signal,'Fixture failed or timed out');
  const passed=r.status===0&&r.stdout.trim()==='ENCODING_REJECTION_WITHOUT_PROCESS_CRASH_PASSED';
  const unhandled=r.stderr.includes("Unhandled 'error' event")||(s.runtime==='bun'&&r.stderr.includes('Bun v1.3.14')&&r.stderr.includes('at emit (node:events:'));
  const reproduced=r.status===1&&unhandled&&/UND_ERR_RES_CONTENT_LENGTH_MISMATCH|ResponseContentLengthMismatchError/.test(r.stderr);
  if(imageId===b.imageId)assert(passed,'Candidate still crashes');else assert(passed||reproduced,'Unrelated baseline failure');
  rows.push({imageId,path,exitCode:r.status,passed,regressionReproduced:reproduced});
 }
 fs.writeFileSync(dir+'/encoding.json',JSON.stringify({date:new Date().toISOString(),passed:true,imageId:b.imageId,rows,network:'network-none; one synthetic response per package/version'},null,2)+'\n');console.log(key+': content-encoding regression checked');
}
