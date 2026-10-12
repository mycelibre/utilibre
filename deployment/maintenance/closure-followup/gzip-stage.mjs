// CLI-only native/vendor overlays. Never mount production data in fixtures.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const here=new URL('.',import.meta.url).pathname,dir='/var/lib/utilibre-maintenance/closure-followup-20261012';
const sha=b=>createHash('sha256').update(b).digest('hex');
const specs=JSON.parse(fs.readFileSync(here+'gzip-specs.json'));
const docker=a=>{try{return cp.execFileSync('docker',a,{encoding:'utf8',timeout:240000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,DOCKER_BUILDKIT:'0'}}).trim();}catch(e){fs.writeFileSync(dir+'/gzip-stage-error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('Gzip candidate gate failed; private diagnostics retained');}};
const inspect=n=>JSON.parse(docker(['inspect',n]))[0];
const limits=['--rm','--hostname','utilibre-gzip-fixture','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','256m','--cpus','1','--pids-limit','64','--ulimit','core=0','--log-driver','none','--tmpfs','/tmp:rw,exec,nosuid,nodev,size=16m,mode=1777'];
const run=(image,cmd,user='0')=>docker(['run',...limits,'--user',user,...(user==='0'?['--cap-add','DAC_OVERRIDE']:[]),'--mount','type=bind,src='+here+'gzip-native.sh,dst=/fixture,readonly','--entrypoint','sh',image,'-ec',cmd]);
for(const s of specs){
 assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3);
 assert.equal(inspect(s.baseRef).Id,s.base);for(const name of s.containers)assert.equal(inspect(name).Image,s.base);
 const out=dir+'/gzip/'+s.key;fs.mkdirSync(out+'/packages',{recursive:true});
 const version=s.suite==='noble'?'1.12-1ubuntu3.2':'1.14-1~deb12u1+utilibre1';
 const pkg=dir+(s.suite==='noble'?'/gzip-ubuntu/':'/gzip-bookworm/')+'gzip_'+version+'_amd64.deb';
 const checksum=sha(fs.readFileSync(pkg));
 if(s.suite==='noble'){
  assert.equal(checksum,'4067522fbffe22672e4cf683bfc32e4a304bc872cf76f10049ab36d1a9eedb91');
  const index=fs.readFileSync(dir+'/gzip-ubuntu/package-index.txt','utf8');assert(index.includes('Version: '+version));assert(index.includes('SHA256: '+checksum));
 }else{
  assert.equal(checksum,'bdfaf98a8f3da34b0f5b10e986467e98eabbf017422082592ae4d159a5853f20');
  assert(fs.readFileSync(dir+'/gzip-bookworm/runner.log','utf8').includes('NATIVE_GZIP_BUILD_AND_UPSTREAM_TESTS_PASSED'));
  const log=fs.readFileSync(dir+'/gzip-bookworm/build.log','utf8');assert.match(log,/# TOTAL:\s+30/);assert.match(log,/# PASS:\s+30/);assert.match(log,/# SKIP:\s+0/);assert.match(log,/# FAIL:\s+0/);assert(!/^FAIL:/m.test(log));
 }
 fs.copyFileSync(pkg,out+'/packages/gzip.deb');
 const before=inspect(s.base);
 docker(['build','--pull=false','--network=none','--memory','512m','--cpu-period','100000','--cpu-quota','100000','--build-arg','BASE='+s.baseRef,'--build-arg','RESTORE_USER='+(before.Config.User||'root'),'-f',here+'../xml-final/Dockerfile','-t',s.candidate,out]);
 const after=inspect(s.candidate),normalize=c=>({...c,User:['','root','0',undefined].includes(c.User)?'root':c.User});assert.deepEqual(normalize(after.Config),normalize(before.Config));
 assert.equal(run(s.candidate,'dpkg-query -W -f=\'${Version}\' gzip'),version);
 const manifest='for d in /app /opt /usr/local /usr/src /usr/lib/python3 /usr/lib/postgresql /usr/share/postgresql /etc; do if test -d "$d"; then find "$d" -type f -exec sha256sum {} +; fi; done | sort | sha256sum';
 const app=run(s.base,manifest);assert.equal(run(s.candidate,manifest),app);
 const libs='find /usr/lib /lib -type f -name "*.so*" -exec sha256sum {} + | sort | sha256sum';
 const libraries=run(s.base,libs);assert.equal(run(s.candidate,libs),libraries);
 for(const image of [s.base,after.Id])assert.match(run(image,'sh /fixture','65534:65534'),/NATIVE_GZIP_STREAM_CONCAT_INTEGRITY_PRESERVE_ZGREP_GZEXE_PASSED/);
 fs.writeFileSync(out+'/build.json',JSON.stringify({...s,date:new Date().toISOString(),version,packageSha256:checksum,imageId:after.Id,passed:true,configurationUnchanged:true,applicationSha256:app,librariesSha256:libraries},null,2)+'\n');
 fs.writeFileSync(out+'/native.json',JSON.stringify({date:new Date().toISOString(),imageId:after.Id,passed:true,nativeStreamsAndIntegrity:true,nativeGzexeAndZgrep:true,originalsPreserved:true,sharedLibrariesUnchanged:true,upstreamPassed:s.suite==='bookworm'?30:null,upstreamSkipped:s.suite==='bookworm'?0:null,network:'none',limitations:'CLI-only overlay; actual app/config/library bytes unchanged. Not a new complete application browser journey or adversarial LZH proof.'},null,2)+'\n');
 console.log(s.key+': old/new native CLI and unchanged app/config/library gates passed');
}
