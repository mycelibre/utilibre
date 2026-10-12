// Bounded old/new regression, only disposable no-network containers.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012',here=fileURLToPath(new URL('.',import.meta.url));
const specs=JSON.parse(fs.readFileSync(here+'ncurses-specs.json'));
const rows=[];
for(const key of ['ncurses-linkding-linkding','ncurses-community-rssbridge']){
 const s=specs.find(s=>s.key===key),b=JSON.parse(fs.readFileSync(dir+'/ncurses/'+key+'/build.json'));
 assert(b.passed);
 for(const [kind,image] of [['old',s.base],['patched',b.imageId]]){
  const result=cp.spawnSync('docker',['run','--rm','--network','none','--read-only','--user','0','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','128m','--cpus','1','--pids-limit','32','--ulimit','core=0','--log-driver','none','--tmpfs','/tmp:rw,size=8m','--mount','type=bind,src='+here+'ncurses-native.sh,dst=/check,readonly','--entrypoint','sh',image,'/check'],{encoding:'utf8',timeout:60000,maxBuffer:1024**2});
  assert(!result.error);
  if(kind==='old'){assert.equal(result.status,134);assert.match(result.stderr,/buffer overflow detected/);}
  else{assert.equal(result.status,0);assert.match(result.stdout,/NATIVE_TERMINAL_ROUNDTRIP_AND_LONG_SGR_PASSED/);}
  rows.push({suite:s.suite,kind,image,exitCode:result.status,overflowDetected:result.stderr.includes('buffer overflow detected'),nativePassed:result.stdout.includes('NATIVE_TERMINAL_ROUNDTRIP_AND_LONG_SGR_PASSED')});
 }
}
fs.writeFileSync(dir+'/ncurses-regression.json',JSON.stringify({date:new Date().toISOString(),passed:true,fixtureSha256:createHash('sha256').update(fs.readFileSync(here+'ncurses-native.sh')).digest('hex'),network:'none',coreDumps:false,rows},null,2)+'\n');
console.log('Both distributions: old binaries reproduce overflow, patched binaries pass identical native fixture. No network or production input.');
