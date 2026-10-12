import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012',build=dir+'/python-system/build',here=new URL('.',import.meta.url).pathname,version='3.13.16-1~deb13u1+utilibre1';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(p,a)=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:180000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,DOCKER_BUILDKIT:'0'}}).trim();}catch(e){fs.writeFileSync(dir+'/python-system-stage-error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('Python candidate gate failed; private diagnostics retained');}};
const docker=a=>run('docker',a),inspect=n=>JSON.parse(docker(['inspect',n]))[0];
assert(fs.readFileSync(build+'/runner.log','utf8').includes('NATIVE_PYTHON_SYSTEM_BUILD_AND_FOCUSED_TESTS_PASSED'));
const suites=fs.readFileSync(build+'/security-tests.log','utf8');assert(suites.includes('Result: SUCCESS'));assert.match(suites,/Total tests: run=5,658 skipped=104/);assert.match(suites,/Total test files: run=42\/42 skipped=2/);
const sums=new Map(fs.readFileSync(build+'/SHA256SUMS','utf8').trim().split('\n').map(l=>[l.slice(66).split('/').at(-1),l.slice(0,64)]));
const limits=['--rm','--network','none','--hostname','utilibre-python-native','--read-only','--cpus','1','--memory','1g','--pids-limit','128','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--ulimit','core=0','--tmpfs','/tmp:rw,exec,nosuid,nodev,size=128m,mode=1777'];
for(const s of JSON.parse(fs.readFileSync(here+'python-system-specs.json'))){
 const out=dir+'/python-system/'+s.key;assert(!fs.existsSync(out+'/build.json'));fs.mkdirSync(out+'/packages',{recursive:true});
 assert.equal(inspect(s.baseRef).Id,s.base);for(const name of s.containers)assert.equal(inspect(name).Image,s.base);
 assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3);
 const packages={};for(const pkg of ['libpython3.13','libpython3.13-minimal','libpython3.13-stdlib','python3.13-minimal','python3.13']){
  const leaf=pkg+'_'+version+'_amd64.deb';assert.equal(sha(build+'/'+leaf),sums.get(leaf));packages[pkg]=sums.get(leaf);fs.copyFileSync(build+'/'+leaf,out+'/packages/'+leaf);
 }
 const before=inspect(s.base);docker(['build','--pull=false','--network=none','--memory','512m','--cpu-period','100000','--cpu-quota','100000','--build-arg','BASE='+s.baseRef,'--build-arg','RESTORE_USER='+(before.Config.User||'root'),'-f',here+'../xml-final/Dockerfile','-t',s.candidate,out]);
 const after=inspect(s.candidate);assert.deepEqual(after.Config,before.Config);
 const shell=(im,cmd)=>docker(['run',...limits,'--user','0','--entrypoint','bash',im,'-euo','pipefail','-c',cmd]);
 const scripts={application:'for d in /opt /app /usr/local; do if test -d "$d"; then find "$d" -type f -exec sha256sum {} +; fi; done | sort | sha256sum',configuration:'find /etc -type f -exec sha256sum {} + | sort | sha256sum',otherLibraries:'find /usr/lib /lib -type f -name "*.so*" ! -path "*/python3.13/*" ! -name "libpython3.13*" -exec sha256sum {} + | sort | sha256sum'},hashes={};
 for(const [key,cmd] of Object.entries(scripts)){hashes[key]=shell(s.base,cmd);assert.equal(shell(s.candidate,cmd),hashes[key],key+' changed');}
 assert.equal(shell(s.candidate,'dpkg --audit'),'');
 const native=JSON.parse(docker(['run',...limits,'--mount','type=bind,src='+here+'python-system-native.py,dst=/check.py,readonly','--entrypoint','python3',s.candidate,'-B','/check.py']));assert(native.passed);
 const app=JSON.parse(docker(['run',...limits,'--mount','type=bind,src='+here+'../penpot-2.18.3/check-runtime-native.py,dst=/check.py,readonly','--entrypoint','python3',s.candidate,'-B','/check.py']));assert(app.woff2Roundtrip&&app.fontforgeTtfOtf&&app.pngJpegWebpThumbnails);
 // FontForge is an unchanged native Python embedding consumer; its round-trip
 // above exercises the replaced libpython rather than just an interpreter CLI.
 fs.writeFileSync(out+'/build.json',JSON.stringify({...s,date:new Date().toISOString(),imageId:after.Id,version,passed:true,configurationUnchanged:true,hashes,packages,upstreamSuiteSha256:sha(build+'/security-tests.log')},null,2)+'\n');
 fs.writeFileSync(out+'/native.json',JSON.stringify({...native,date:new Date().toISOString(),imageId:after.Id,application:app,upstreamCases:5658,upstreamSkipped:104,upstreamModules:42,upstreamSkippedModules:2},null,2)+'\n');
 console.log('Penpot candidate: native Python, Unicode SQLite/tar, venv, images and font round trips passed; not deployed.');
}
