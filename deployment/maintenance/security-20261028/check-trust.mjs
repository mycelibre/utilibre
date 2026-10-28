import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const here=new URL('.',import.meta.url).pathname,root='/var/lib/utilibre-maintenance/security-20261028/trust',inputs=JSON.parse(fs.readFileSync(here+'trust-inputs.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const run=(p,a,o={})=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:240000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe'],...o}).trim();}catch(e){fs.writeFileSync(root+'/native-error-'+Date.now()+'.log',String(e.stdout||'')+String(e.stderr||e.message));throw Error('Trust compatibility check failed; private diagnostics retained');}};
const docker=(...a)=>run('docker',a),fixture=root+'/fixture';fs.mkdirSync(fixture,{recursive:true});
const source=here+'trust-native.go';
if(!fs.existsSync(fixture+'/build.json')){
 docker('run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','1g','--memory-swap','1g','--pids-limit','128','--log-driver','none',
 '--tmpfs','/tmp:rw,size=768m,mode=1777','-e','GOCACHE=/tmp/go-cache','-e','GOPROXY=off','-e','GOTOOLCHAIN=local','-e','CGO_ENABLED=0','-e','GOFLAGS=-mod=readonly',
 '-v',source+':/source.go:ro','-v',fixture+':/out','--entrypoint','/usr/local/go/bin/go',inputs.compiler,'build','-trimpath','-o','/out/trust-native','/source.go');
 fs.writeFileSync(fixture+'/build.json',JSON.stringify({compiler:inputs.compiler,sourceSha256:sha(fs.readFileSync(source)),binarySha256:sha(fs.readFileSync(fixture+'/trust-native'))},null,2)+'\n');
}
const build=JSON.parse(fs.readFileSync(fixture+'/build.json'));assert.equal(build.compiler,inputs.compiler);assert.equal(build.sourceSha256,sha(fs.readFileSync(source)));assert.equal(build.binarySha256,sha(fs.readFileSync(fixture+'/trust-native')));
for(const s of inputs.rows){
 const dir=root+'/'+s.key,b=JSON.parse(fs.readFileSync(dir+'/build.json'));assert(b.passed&&!fs.existsSync(dir+'/native.json'));fs.chmodSync(dir+'/before.pem',0o644);
 const rows=[];
 for(const [state,imageId]of [['before',b.base],['after',b.imageId]]){
  const r=JSON.parse(docker('run','--rm','--network','none','--read-only','--user','65532:65532','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','.5','--memory','128m','--pids-limit','32','--log-driver','none','-v',fixture+'/trust-native:/trust-native:ro','-v',dir+'/before.pem:/before.pem:ro','--entrypoint','/trust-native',imageId,state,'/before.pem'));
  assert(r.passed&&r.go==='go1.26.10'&&r.ordinaryTrustedRootPassed&&r.removedRootsStillPresent===(state==='before'?3:0));rows.push({imageId,...r});
 }
 fs.writeFileSync(dir+'/native.json',JSON.stringify({date:new Date().toISOString(),passed:true,imageId:b.imageId,rows,fixture:build,limitation:'System-root loading and ordinary root verification; no external TLS requests. Already-patched Go may independently distrust these chains, so this is not a claim of a current exploitable Go client.'},null,2)+'\n');
 console.log(s.key+': obsolete roots absent; ordinary system trust preserved');
}
