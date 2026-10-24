import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/security-20261024',dir=root+'/echo-regression';fs.mkdirSync(dir,{recursive:true});
const phase=process.argv[2];assert(['download','check'].includes(phase));
const compiler=JSON.parse(fs.readFileSync(root+'/opengist/inputs.json')).compiler;
const args=['run','--rm','--network',phase==='download'?'bridge':'none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--cpus','1','--memory','1g','--memory-swap','1g','--pids-limit','128','--tmpfs','/work:rw,size=768m,exec','-v',root+'/modules:/modules'+(phase==='check'?':ro':''),'-v',dir+':/out','-v',new URL('.',import.meta.url).pathname+':/scripts:ro',compiler,'sh','/scripts/echo-regression.sh',phase];
const result=cp.spawnSync('docker',args,{encoding:'utf8',timeout:300000,maxBuffer:1024**2});fs.writeFileSync(dir+'/'+phase+'.log',result.stdout+result.stderr);assert.equal(result.status,0,'Upstream regression failed; inspect private evidence');
if(phase==='check'){
 const proofs=Object.fromEntries(['v4-v4.15.4.txt','v4-v4.16.1.txt','v5-v5.3.1.txt','v5-v5.4.1.txt'].map(f=>[f,createHash('sha256').update(fs.readFileSync(dir+'/'+f)).digest('hex')]));
 fs.writeFileSync(dir+'/result.json',JSON.stringify({date:new Date().toISOString(),passed:true,compiler,network:'none',oldFailsForExpectedAccessControlReason:true,fixedPasses:true,proofs},null,2));
}
console.log('Echo upstream regression '+phase+' passed');
