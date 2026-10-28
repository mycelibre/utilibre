// Tests the exact installed packages, not a fresh substitute from npm.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/security-20261028/undici',specs=JSON.parse(fs.readFileSync(new URL('./undici-inputs.json',import.meta.url))).rows,here=new URL('.',import.meta.url).pathname;
const keys=process.argv.slice(2);assert(keys.length&&keys.every(k=>specs.some(s=>s.key===k)));
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:30000,maxBuffer:1024**2,stdio:['ignore','pipe','pipe']}).trim();
for(const key of keys){
 const s=specs.find(s=>s.key===key),dir=root+'/'+key,b=JSON.parse(fs.readFileSync(dir+'/build.json'));assert(b.passed&&!fs.existsSync(dir+'/native.json'));
 const fixture=fs.mkdtempSync(dir+'/fixture-'),rows=[];
 try{
  run('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','2','-keyout',fixture+'/key.pem','-out',fixture+'/cert.pem','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost']);
  for(const imageId of [s.base,b.imageId])for(const path of Object.keys(s.before)){
   let n;try{n=JSON.parse(run('docker',['run','--rm','--network','none','--read-only','--user','0','--cap-drop','ALL','--cap-add','DAC_OVERRIDE','--security-opt','no-new-privileges','--cpus','1','--memory','256m','--memory-swap','256m','--pids-limit','64','--log-driver','none','-v',fixture+':/fixture:ro','-v',here+'undici-native.cjs:/native.cjs:ro','--entrypoint','node',imageId,'/native.cjs',path]));}
   catch(e){fs.writeFileSync(dir+'/native-error-'+Date.now()+'.log',String(e.stdout||'')+String(e.stderr||e.message));throw Error(key+': native check failed');}
   assert(n.normalPassed&&n.checks===7);
   if(imageId===b.imageId)assert(n.customTlsPinRejected&&n.customTlsCallbackCalled,'TLS pin must be preserved');
   rows.push({imageId,path,...n});
  }
  fs.writeFileSync(dir+'/native.json',JSON.stringify({date:new Date().toISOString(),passed:true,imageId:b.imageId,rows,regressionReproduced:rows.filter(r=>r.imageId===s.base).every(r=>!r.customTlsPinRejected&&!r.customTlsCallbackCalled),scope:'Native HTTP/TLS and CVE-2026-109383 regression in network-none containers; not Node bundled fetch or full app behavior'},null,2)+'\n');
  console.log(key+': normal transfers and TLS callback regression verified');
 }finally{fs.rmSync(fixture,{recursive:true,force:true});}
}
