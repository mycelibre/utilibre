// Native, coupled stable-package overlays. No production volumes or restarts.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
process.umask(0o077);
const here=fileURLToPath(new URL('.',import.meta.url)),dir='/var/lib/utilibre-maintenance/closure-followup-20261012';
const buildDir=dir+'/util-linux-trixie',version='2.41.5-0+deb13u1+utilibre2';
const sha=b=>createHash('sha256').update(b).digest('hex');
assert(fs.readFileSync(buildDir+'/runner.log','utf8').includes('NATIVE_UTIL_LINUX_BUILD_PASSED'));
const suite=fs.readFileSync(buildDir+'/native-suite.log','utf8');assert(suite.includes('All 337 tests PASSED'));
// That upstream summary includes skipped/known-failed cases: retain them.
const suiteCounts={reported:337,skippedLines:suite.split('\n').filter(l=>l.includes('... SKIPPED')).length,knownFailedLines:suite.split('\n').filter(l=>l.includes('... KNOWN FAILED')).length};
const run=(p,a,o={})=>cp.execFileSync(p,a,{encoding:'utf8',timeout:240000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe'],...o}).trim();
const docker=a=>{try{return run('docker',a,{env:{...process.env,DOCKER_BUILDKIT:'0'}});}catch(e){fs.writeFileSync(dir+'/util-linux-stage-error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('Native utility stage failed; private diagnostic retained');}};
const inspect=n=>JSON.parse(docker(['inspect',n]))[0];
const packages=new Map();
const checksums=new Map(fs.readFileSync(buildDir+'/SHA256SUMS','utf8').trim().split('\n').map(l=>[path.basename(l.slice(66)),l.slice(0,64)]));
for(const file of fs.readdirSync(buildDir).filter(f=>f.endsWith('_amd64.deb'))){
 assert.equal(sha(fs.readFileSync(buildDir+'/'+file)),checksums.get(file));
 const pkg=run('dpkg-deb',['-f',buildDir+'/'+file,'Package']);packages.set(pkg,{file,sha256:checksums.get(file)});
}
const specs=JSON.parse(fs.readFileSync(here+'util-linux-specs.json')).filter(s=>process.argv.length<3||process.argv.slice(2).includes(s.key));
const limits=['--hostname','utilibre-utility-fixture','--network','none','--read-only','--user','0','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','512m','--pids-limit','64','--ulimit','core=0','--log-driver','none','--tmpfs','/tmp:rw,size=32m,mode=1777','--tmpfs','/run:rw,size=8m'];
const imageRun=(image,command)=>docker(['run','--rm',...limits,'--entrypoint','sh',image,'-ec',command]);
const exports=file=>new Set(run('readelf',['--dyn-syms','--wide',file]).split('\n').map(l=>l.trim().split(/\s+/)).filter(v=>['GLOBAL','WEAK'].includes(v[4])&&v[5]==='DEFAULT'&&v[6]!=='UND').map(v=>v[3]+':'+v[7].replace('@@','@')));
const libraries=['libmount.so.1','libblkid.so.1','libuuid.so.1','libsmartcols.so.1','liblastlog2.so.2'];
for(const spec of specs){
 assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3,'Recovery floor');
 assert.equal(inspect(spec.baseRef).Id,spec.base);for(const name of spec.containers)assert.equal(inspect(name).Image,spec.base);
 const out=dir+'/util-linux/'+spec.key;fs.mkdirSync(out+'/packages',{recursive:true});
 assert(!fs.existsSync(out+'/build.json'),'Preserve completed immutable candidate proof');
 for(const pkg of spec.packages){assert(packages.has(pkg));fs.copyFileSync(buildDir+'/'+packages.get(pkg).file,out+'/packages/'+packages.get(pkg).file);}
 fs.copyFileSync(here+'install-util-linux.sh',out+'/install-util-linux.sh');
 const before=inspect(spec.base);
 docker(['build','--pull=false','--network=none','--memory','512m','--cpu-period','100000','--cpu-quota','100000','--build-arg','BASE='+spec.baseRef,'--build-arg','RESTORE_USER='+(before.Config.User||'root'),'-f',here+'Dockerfile.util-linux','-t',spec.candidate,out]);
 const after=inspect(spec.candidate),normalize=c=>({...c,User:['','root','0',undefined].includes(c.User)?'root':c.User});assert.deepEqual(normalize(after.Config),normalize(before.Config));
 const app='for d in /app /opt /usr/local /usr/src /usr/lib/python3 /usr/lib/postgresql /usr/share/postgresql /priviblur /upstream /grist; do if test -d "$d"; then find "$d" -type f ! -path /opt/imagick/lib/deps/libmount.so.1 ! -path /opt/imagick/lib/deps/libblkid.so.1 -exec sha256sum {} +; fi; done | sort | sha256sum';
 const applicationSha256=imageRun(spec.base,app);assert.equal(imageRun(spec.candidate,app),applicationSha256);
 const config='find /etc -type f ! -name ld.so.cache -exec sha256sum {} + | sort | sha256sum';
 const etcSha256=imageRun(spec.base,config);assert.equal(imageRun(spec.candidate,config),etcSha256,'Existing image configuration changed');
 const suid='find /usr/bin /usr/sbin -type f -perm /6000 -printf "%p %m\\n" | sort';
 assert.equal(imageRun(spec.candidate,suid),imageRun(spec.base,suid),'SUID/SGID surface changed');
 const libHash='find /usr/lib /lib -type f -name "*.so*" ! -name "libmount.so.*" ! -name "libblkid.so.*" ! -name "libuuid.so.*" ! -name "libsmartcols.so.*" ! -name "liblastlog2.so.*" -exec sha256sum {} + | sort | sha256sum';
 const unrelatedLibrariesSha256=imageRun(spec.base,libHash);assert.equal(imageRun(spec.candidate,libHash),unrelatedLibrariesSha256);
 const tmp=fs.mkdtempSync('/dev/shm/utilibre-utility-abi-'),oldId=docker(['create','--entrypoint','true',spec.base]),newId=docker(['create','--entrypoint','true',after.Id]);
 const abi=[];
 const privateLibraries=imageRun(spec.base,'for f in /opt/imagick/lib/deps/libmount.so.1 /opt/imagick/lib/deps/libblkid.so.1; do if test -f "$f"; then printf "%s\\n" "$f"; fi; done').split('\n').filter(Boolean);
 try{for(const file of [...libraries.map(l=>'/usr/lib/x86_64-linux-gnu/'+l),...privateLibraries]){
  const library=file.startsWith('/opt/')?'private-'+path.basename(file):path.basename(file),oldFile=tmp+'/old-'+library,newFile=tmp+'/new-'+library;
  docker(['cp','-L',oldId+':'+file,oldFile]);docker(['cp','-L',newId+':'+file,newFile]);
  const oldSymbols=exports(oldFile),newSymbols=exports(newFile);assert(oldSymbols.size>0);for(const symbol of oldSymbols)assert(newSymbols.has(symbol),'Lost ABI symbol '+symbol);
  abi.push({library,path:file,oldSha256:sha(fs.readFileSync(oldFile)),newSha256:sha(fs.readFileSync(newFile)),preservedSymbols:oldSymbols.size});
 }}finally{docker(['rm',oldId,newId]);fs.rmSync(tmp,{recursive:true});}
 const native=docker(['run','--rm',...limits,'--mount','type=bind,src='+here+',dst=/fixture,readonly','--mount','type=bind,src='+dir+'/util-linux-test-fixtures,dst=/native,readonly','--mount','type=bind,src='+here+'mount.utilibrefixture,dst=/sbin/mount.utilibrefixture,readonly','--entrypoint','sh',after.Id,'/fixture/util-linux-native.sh']);
 assert(native.includes('NATIVE_UTIL_LINUX_REGRESSIONS_AND_PARSING_PASSED'));
 const proof={date:new Date().toISOString(),...spec,imageId:after.Id,version,passed:true,configurationUnchanged:true,applicationSha256,etcSha256,unrelatedLibrariesSha256,abi,packages:spec.packages.map(name=>({name,...packages.get(name)})),deployed:false};
 fs.writeFileSync(out+'/build.json',JSON.stringify(proof,null,2)+'\n');
 fs.writeFileSync(out+'/native.json',JSON.stringify({date:new Date().toISOString(),imageId:after.Id,passed:true,nativeMountFailureAndSuccess:true,simulatedCgroupDescriptorClosed:true,nativeFstabAndLock:true,abiPreserved:true,...suiteCounts,limitations:'No real privileged mount, host cgroup mutation or namespace escape test. Existing application files, configuration and SUID surface unchanged; production readiness still required.'},null,2)+'\n');
 console.log(spec.key+': ABI, native regressions and unchanged application/configuration passed');
}
