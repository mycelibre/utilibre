// Exact signed Debian packages; native synthetic traffic never leaves loopback.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012',here=new URL('.',import.meta.url).pathname;
const sha=b=>createHash('sha256').update(b).digest('hex');
const docker=a=>{try{return cp.execFileSync('docker',a,{encoding:'utf8',timeout:180000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,DOCKER_BUILDKIT:'0'}}).trim();}catch(e){fs.writeFileSync(dir+'/urllib3-stage-error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('urllib3 stage failed; private diagnostics retained');}};
const inspect=n=>JSON.parse(docker(['inspect',n]))[0];
const packages={
 'python3-urllib3_2.8.0-2_all.deb':'d48b157c65ac9b28a86cd2d6f5af3baa841208bae724bed3a33b0058727b0ff3',
 'python3-requests_2.32.3+dfsg-5+deb13u1_all.deb':'7d271bd47c6647b16aec9facc656c39eca763062ec392aea615dd6597b8304c2',
};
for(const [p,h] of Object.entries(packages))assert.equal(sha(fs.readFileSync(dir+'/sources/'+p)),h);
const limits=['--rm','--network','none','--hostname','utilibre-urllib3-fixture','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','384m','--pids-limit','64','--log-driver','none','--ulimit','core=0','--tmpfs','/tmp:rw,size=32m,mode=1777'];
const run=(im,cmd)=>docker(['run',...limits,'--user','0','--entrypoint','sh',im,'-ec',cmd]);
for(const s of JSON.parse(fs.readFileSync(here+'urllib3-specs.json'))){
 const out=dir+'/urllib3/'+s.key;assert(!fs.existsSync(out+'/build.json'));fs.mkdirSync(out+'/packages',{recursive:true});
 assert.equal(inspect(s.baseRef).Id,s.base);for(const name of s.containers)assert.equal(inspect(name).Image,s.base);
 assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3);
 for(const p of Object.keys(packages))fs.copyFileSync(dir+'/sources/'+p,out+'/packages/'+p);
 const before=inspect(s.base);
 docker(['build','--pull=false','--network=none','--memory','384m','--cpu-period','100000','--cpu-quota','100000','--build-arg','BASE='+s.baseRef,'--build-arg','RESTORE_USER='+(before.Config.User||'root'),'-f',here+'../xml-final/Dockerfile','-t',s.candidate,out]);
 const after=inspect(s.candidate),norm=c=>({...c,User:['','root','0',undefined].includes(c.User)?'root':c.User});assert.deepEqual(norm(after.Config),norm(before.Config));
 const fingerprints={
  application:'for d in /app /opt /usr/local /usr/lib/postgresql /usr/share/postgresql; do if test -d "$d"; then find "$d" -type f -exec sha256sum {} +; fi; done | sort | sha256sum',
  configuration:'find /etc -type f -exec sha256sum {} + | sort | sha256sum',
  libraries:'find /usr/lib /lib -type f -name "*.so*" -exec sha256sum {} + | sort | sha256sum',
  otherPython:'find /usr/lib/python3/dist-packages -type f ! -path "*/__pycache__/*" ! -path "*/urllib3/*" ! -path "*/urllib3-*.egg-info/*" ! -path "*/urllib3-*.dist-info/*" ! -path "*/requests/*" ! -path "*/requests-*.egg-info/*" ! -path "*/requests-*.dist-info/*" -exec sha256sum {} + | sort | sha256sum',
 },hashes={};
 for(const [key,cmd] of Object.entries(fingerprints)){hashes[key]=run(s.base,cmd);assert.equal(run(s.candidate,cmd),hashes[key],key+' changed');}
 const native=JSON.parse(docker(['run',...limits,'--user','0','--mount','type=bind,src='+dir+'/curl-fixture,dst=/fixture,readonly','--mount','type=bind,src='+here+'urllib3-native.py,dst=/check.py,readonly','--entrypoint','python3',s.candidate,'/check.py']));
 assert(native.passed);assert.equal(native.checks.length,11);assert.equal(native.urllib3,'2.8.0');assert.equal(native.requests,'2.32.3');
 if(s.kind==='kuma')assert(docker(['run',...limits,'--user','0','--mount','type=bind,src='+here+'../sqlite-final/kuma-jwt.py,dst=/check.py,readonly','--entrypoint','python3',s.candidate,'/check.py']).includes('Apprise parser passed'));
 fs.writeFileSync(out+'/build.json',JSON.stringify({...s,date:new Date().toISOString(),imageId:after.Id,passed:true,configurationUnchanged:true,hashes,packages},null,2)+'\n');
 fs.writeFileSync(out+'/native.json',JSON.stringify({...native,date:new Date().toISOString(),imageId:after.Id,applicationUnchanged:true,sharedLibrariesUnchanged:true,apprise:s.kind==='kuma'},null,2)+'\n');
 console.log(s.kind+': 11 native HTTP/TLS/proxy/chunk checks; application/config/native libraries unchanged. Not deployed.');
}
