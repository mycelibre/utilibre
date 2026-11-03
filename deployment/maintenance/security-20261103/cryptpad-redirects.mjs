// Exact upstream one-file backport; no dependency resolution or live writes.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash}from'node:crypto';
process.umask(0o077);assert.equal(process.argv.length,2);
const here=new URL('.',import.meta.url).pathname,d='/var/lib/utilibre-maintenance/security-20261103/cryptpad-redirects',live='/opt/utilibre/src/cryptpad',read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const s=read(here+'cryptpad-redirects-inputs.json'),hash=p=>sha(fs.readFileSync(p)),run=(p,a,o={})=>cp.execFileSync(p,a,{encoding:'utf8',timeout:30000,maxBuffer:1024**2,stdio:['ignore','pipe','pipe'],...o}).trim();
assert.equal(run('git',['-C',live,'rev-parse','HEAD']),s.revision);assert.equal(hash(live+'/package-lock.json'),s.lockSha256);assert.equal(hash(live+'/'+s.file),s.beforeSha256);assert.equal(read(live+'/node_modules/follow-redirects/package.json').version,s.packageVersion);
assert.equal(run('docker',['inspect','--format','{{.Image}}','utilibre-pack-cryptpad-cryptpad-1']),s.runtimeImage);assert.equal(hash(here+'cryptpad-redirects.patch'),s.patchSha256);assert.equal(hash(d+'/follow-redirects-1.16.2.tgz'),s.archiveSha256);assert(!fs.existsSync(d+'/source.json'));
fs.mkdirSync(d+'/source');fs.copyFileSync(live+'/'+s.file,d+'/source/index.js');run('git',['apply','--check',here+'cryptpad-redirects.patch'],{cwd:d+'/source'});run('git',['apply',here+'cryptpad-redirects.patch'],{cwd:d+'/source'});assert.equal(hash(d+'/source/index.js'),s.afterSha256);
assert.equal(sha(cp.execFileSync('tar',['-xOzf',d+'/follow-redirects-1.16.2.tgz','package/index.js'],{timeout:30000,maxBuffer:1024**2})),s.afterSha256);
fs.chmodSync(d+'/source',0o755);fs.chmodSync(d+'/source/index.js',0o644);
const save=(p,v)=>fs.writeFileSync(d+'/'+p,JSON.stringify(v,null,2)+'\n');
save('source.json',{...s,date:new Date().toISOString(),passed:true,changedFiles:[s.file],packageMetadataUnchanged:true});
const stat=fs.statSync(live+'/'+s.file);for(const which of ['integration','rollback']){const path=d+'/'+which+'/'+s.file;fs.mkdirSync(new URL('.','file://'+path).pathname,{recursive:true});fs.copyFileSync(which==='integration'?d+'/source/index.js':live+'/'+s.file,path);}
save('integration.json',{date:new Date().toISOString(),passed:true,liveRoot:live,sourceProofSha256:hash(d+'/source.json'),files:{[s.file]:{before:s.beforeSha256,after:s.afterSha256,mode:stat.mode&511,uid:stat.uid,gid:stat.gid}}});
const rows=[];for(const state of ['baseline','backport']){
 const a=['run','--rm','-i','--network','none','--read-only','--cpus','1','--memory','256m','--memory-swap','256m','--pids-limit','64','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','-v',live+'/node_modules:/deps:ro',...(state==='backport'?['-v',d+'/source/index.js:/deps/follow-redirects/index.js:ro']:[]),'--entrypoint','node',s.runtimeImage,'-','/deps/follow-redirects',state];
 const result=run('docker',a,{input:fs.readFileSync(here+'redirects-check.cjs'),stdio:['pipe','pipe','pipe']});fs.writeFileSync(d+'/'+state+'.log',result+'\n');const row=JSON.parse(result);assert(row.passed&&row.sameOriginPreserved&&row.redirectLimit);assert.equal(row.observations.filter(o=>o.credentialForwarded).length,state==='baseline'?2:0);rows.push({state,...row});
}
save('checks.json',{date:new Date().toISOString(),passed:true,imageId:s.runtimeImage,sourceProofSha256:hash(d+'/source.json'),rows,network:'none'});console.log('CryptPad redirect backport prepared: old cross-realm leak reproduced, fixed and normal redirect behavior verified.');
