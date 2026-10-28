// Prepare one upstream backport on disposable source; never write live code.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);const checkOnly=process.argv[2]==='--check';assert.equal(process.argv.length,checkOnly?3:2);
const dir='/var/lib/utilibre-maintenance/security-20261028/cryptpad-body',live='/opt/utilibre/src/cryptpad';
const read=p=>JSON.parse(fs.readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex'),sha=p=>hash(fs.readFileSync(p));
const s=read(new URL('./cryptpad-body-inputs.json',import.meta.url)),patch=new URL('./cryptpad-body.patch',import.meta.url).pathname;
const run=(p,a,o={})=>cp.execFileSync(p,a,{encoding:'utf8',timeout:30000,maxBuffer:1024**2,stdio:['ignore','pipe','pipe'],...o}).trim();
assert.equal(s.schemaVersion,1);assert.equal(sha(patch),s.patchSha256);assert.equal(sha(dir+'/body-parser-2.3.0.tgz'),s.archiveSha256);assert.equal(sha(dir+'/f7075ea.patch'),s.upstreamPatchSha256);
assert.equal(run('git',['-C',live,'rev-parse','HEAD']),s.revision);assert.equal(read(live+'/node_modules/body-parser/package.json').version,s.packageVersion);assert.equal(sha(live+'/package-lock.json'),s.lockSha256);assert.equal(sha(live+'/'+s.file),s.beforeSha256);
assert.equal(run('docker',['inspect','--format','{{.Image}}','utilibre-pack-cryptpad-cryptpad-1']),s.runtimeImage);if(!checkOnly)assert(!fs.existsSync(dir+'/source.json'),'Preserve completed candidate');
const stage=dir+'/source';
if(!checkOnly){
fs.mkdirSync(stage+'/lib',{recursive:true});fs.writeFileSync(stage+'/lib/read.js',fs.readFileSync(live+'/'+s.file));
run('git',['apply','--check',patch],{cwd:stage});run('git',['apply',patch],{cwd:stage});assert.equal(sha(stage+'/lib/read.js'),s.afterSha256);
for(const p of [stage,stage+'/lib'])fs.chmodSync(p,0o755);fs.chmodSync(stage+'/lib/read.js',0o644);
const stat=fs.statSync(live+'/'+s.file),integration=dir+'/integration/'+s.file,rollback=dir+'/rollback/'+s.file;
for(const p of [integration,rollback])fs.mkdirSync(new URL('.','file://'+p).pathname,{recursive:true});fs.copyFileSync(stage+'/lib/read.js',integration);fs.copyFileSync(live+'/'+s.file,rollback);
const source={...s,date:new Date().toISOString(),passed:true,changedFiles:[s.file],packageMetadataUnchanged:true};fs.writeFileSync(dir+'/source.json',JSON.stringify(source,null,2)+'\n');
fs.writeFileSync(dir+'/integration.json',JSON.stringify({date:new Date().toISOString(),passed:true,liveRoot:live,sourceProofSha256:sha(dir+'/source.json'),files:{[s.file]:{before:s.beforeSha256,after:s.afterSha256,mode:stat.mode&511,uid:stat.uid,gid:stat.gid}}},null,2)+'\n');
}
assert.equal(sha(stage+'/lib/read.js'),s.afterSha256);assert(!fs.existsSync(dir+'/checks.json'),'Preserve completed verification');
const rows=[],limits=['run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','256m','--pids-limit','64','--log-driver','none','-e','NODE_PATH=/deps','-v',live+'/node_modules:/deps:ro','-v',new URL('./body-native.cjs',import.meta.url).pathname+':/test.cjs:ro'];
for(const state of ['before','after'])for(const mode of ['normal','regression']){
 const r=cp.spawnSync('docker',[...limits,...(state==='after'?['-v',stage+'/lib/read.js:/deps/body-parser/lib/read.js:ro']:[]),'--entrypoint','node',s.runtimeImage,'/test.cjs','/deps/body-parser',mode],{encoding:'utf8',timeout:20000,maxBuffer:1024**2});
 fs.writeFileSync(dir+'/'+state+'-'+mode+'-'+Date.now()+'.log',r.stdout+r.stderr+String(r.error||''));assert(!r.error&&!r.signal);
 const reproduced=mode==='regression'&&r.status===1&&r.stderr.includes("Unhandled 'error' event")&&r.stderr.includes('Z_DATA_ERROR');
 const passed=r.status===0&&(mode==='normal'?JSON.parse(r.stdout).normalChecks===7:r.stdout.trim()==='BODY_PARSER_TRAILING_BYTES_SURVIVED');
 assert(state==='before'&&mode==='regression'?reproduced:passed,'Actual parser regression/compatibility gate');rows.push({state,mode,passed,reproduced});
}
const lifecycle=run('docker',[...limits,'-v',stage+'/lib/read.js:/deps/body-parser/lib/read.js:ro','-v',new URL('./body-lifecycle.cjs',import.meta.url).pathname+':/lifecycle.cjs:ro','--entrypoint','node',s.runtimeImage,'/lifecycle.cjs','/deps/body-parser']);assert.equal(lifecycle,'BODY_PARSER_LIFECYCLE_PASSED');
fs.writeFileSync(dir+'/checks.json',JSON.stringify({date:new Date().toISOString(),passed:true,imageId:s.runtimeImage,sourceProofSha256:sha(dir+'/source.json'),normalChecksPerState:7,lifecycleChecks:3,rows,network:'none'},null,2)+'\n');
console.log('CryptPad: upstream parser backport prepared; original crash reproduced, legitimate requests and three lifecycle checks passed.');
