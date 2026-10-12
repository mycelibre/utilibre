// Native Python/Expat packages only; no production restart, pin or data mutation.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {exportedSymbols} from '../bookworm-curl-followup/policy.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/python-bookworm-followup-20261012';
const here=new URL('.',import.meta.url).pathname,build=dir+'/build';
const pyversion='3.11.2-6+deb12u9+utilibre1',expatversion='2.9.0-1~deb12u1+utilibre1';
const selected=['python3.11','python3.11-minimal','libpython3.11-minimal','libpython3.11-stdlib','libexpat1'];
const sdk=JSON.parse(fs.readFileSync(here+'sdk-packages.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const run=(p,a,o={})=>cp.execFileSync(p,a,{encoding:'utf8',timeout:300000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe'],...o}).trim();
const docker=a=>{try{return run('docker',a,{env:{...process.env,DOCKER_BUILDKIT:'0'}});}catch(e){fs.writeFileSync(dir+'/stage-error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('Native Python stage failed; private diagnostics retained.');}};
const inspect=n=>JSON.parse(docker(['inspect',n]))[0];
assert.match(fs.readFileSync(build+'/runner.log','utf8'),/BOOKWORM_PYTHON_EXPAT_BUILD_AND_FOCUSED_TESTS_PASSED/);
assert.match(fs.readFileSync(build+'/expat-native-tests.log','utf8'),/100%: Checks: 5196, Failed: 0/);
const pythonTests=fs.readFileSync(build+'/python-tests.log','utf8');
assert.match(pythonTests,/Tests result: SUCCESS/);
assert.match(pythonTests,/All 10 tests OK/);
run('node',[here+'verify-source.mjs']);
const checksums=new Map(fs.readFileSync(build+'/SHA256SUMS','utf8').trim().split('\n').map(l=>[path.basename(l.slice(66)),l.slice(0,64)]));
for(const f of ['entropy-probe.so','test-library.tar.gz'])assert.equal(sha(fs.readFileSync(build+'/'+f)),checksums.get(f));
const packages=new Map();
for(const f of fs.readdirSync(build).filter(f=>f.endsWith('_amd64.deb'))){
 assert.equal(sha(fs.readFileSync(build+'/'+f)),checksums.get(f));
 packages.set(run('dpkg-deb',['-f',build+'/'+f,'Package']),{file:f,sha256:checksums.get(f),version:run('dpkg-deb',['-f',build+'/'+f,'Version'])});
}
for(const p of selected){assert(packages.has(p));assert.equal(packages.get(p).version,p==='libexpat1'?expatversion:pyversion);}
for(const p of sdk){
 assert.equal(sha(fs.readFileSync(dir+'/sdk/'+p.file)),p.sha256);
 assert.equal(run('dpkg-deb',['-f',dir+'/sdk/'+p.file,'Architecture']),'all');
 assert.equal(run('dpkg-deb',['-f',dir+'/sdk/'+p.file,'Version']),p.version);
 packages.set(p.name,{...p,sourceDirectory:dir+'/sdk'});
}
const limits=['--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','512m','--pids-limit','64','--ulimit','core=0','--log-driver','none','--tmpfs','/tmp:rw,size=32m,mode=1777','--tmpfs','/run:rw,size=8m','--network','none','--hostname','utilibre-python-fixture'];
const imageRun=(image,command)=>docker(['run','--rm',...limits,'--user','0','--entrypoint','sh',image,'-ec',command]);
const symbols=f=>exportedSymbols(run('readelf',['--dyn-syms','--wide',f]));
for(const s of JSON.parse(fs.readFileSync(here+'specs.json')).filter(s=>process.argv.length<3||process.argv.slice(2).includes(s.key))){
 assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3,'8 GiB recovery floor');
 assert.equal(inspect(s.baseRef).Id,s.base);for(const name of s.containers)assert.equal(inspect(name).Image,s.base,'Reconcile current live ancestry before staging');
 const out=dir+'/images/'+s.key;fs.mkdirSync(out+'/packages',{recursive:true});assert(!fs.existsSync(out+'/build.json'),'Preserve completed proof');
 const before=inspect(s.base);
 const wanted=s.key==='gathio'?[...selected,...sdk.map(p=>p.name)]:selected;
 const inventory=image=>new Map(imageRun(image,"dpkg-query -W -f='${binary:Package}\t${Version}\\n'").split('\n').map(l=>l.split('\t')));
 const originalPackages=inventory(s.base);
 for(const p of wanted){assert([...originalPackages.keys()].some(k=>k===p||k===p+':amd64'));const a=packages.get(p);fs.copyFileSync((a.sourceDirectory||build)+'/'+a.file,out+'/packages/'+a.file);}
 docker(['build','--pull=false','--network=none','--memory','512m','--cpu-period','100000','--cpu-quota','100000','--build-arg','BASE='+s.baseRef,'--build-arg','RESTORE_USER='+(before.Config.User||'root'),'-f',here+'../xml-final/Dockerfile','-t',s.candidate,out]);
 const after=inspect(s.candidate),norm=c=>({...c,User:['','root','0',undefined].includes(c.User)?'root':c.User});assert.deepEqual(norm(after.Config),norm(before.Config));
 const currentPackages=inventory(after.Id);assert.equal(currentPackages.size,originalPackages.size);
 for(const [name,version] of originalPackages){const p=name.replace(/:amd64$/,'');assert.equal(currentPackages.get(name),wanted.includes(p)?packages.get(p).version:version,'Unexpected native package change: '+name);}
 const app='for d in /app /opt /usr/local /usr/src /usr/lib/python3 /usr/lib/postgresql /usr/share/postgresql; do if test -d "$d"; then find "$d" -type f -exec sha256sum {} +; fi; done | sort';
 const appRows=image=>imageRun(image,app).split('\n').filter(line=>s.key!=='gathio'||!/^\/usr\/lib\/python3\/dist-packages\/(boto3|botocore|s3transfer)(\/|-[0-9][^/]*\.egg-info\/)/.test(line.slice(66)));
 const beforeApp=appRows(s.base);assert.deepEqual(appRows(after.Id),beforeApp);const applicationSha256=sha(beforeApp.join('\n'));
 const cfg='find /etc -type f ! -name ld.so.cache -exec sha256sum {} + | sort | sha256sum';
 const etcSha256=imageRun(s.base,cfg);assert.equal(imageRun(after.Id,cfg),etcSha256);
 const libs='find /usr/lib /lib -type f -name "*.so*" ! -path "/usr/lib/python3.11/*" ! -name "libexpat.so*" ! -name "libexpatw.so*" -exec sha256sum {} + | sort | sha256sum';
 const unrelatedLibrariesSha256=imageRun(s.base,libs);assert.equal(imageRun(after.Id,libs),unrelatedLibrariesSha256);
 const temp=fs.mkdtempSync('/dev/shm/utilibre-python-abi-'),oldId=docker(['create','--entrypoint','true',s.base]),newId=docker(['create','--entrypoint','true',after.Id]);
 const abi=[];
 try{for(const lib of ['/usr/lib/x86_64-linux-gnu/libexpat.so.1','/usr/lib/x86_64-linux-gnu/libexpatw.so.1']){
  const oldFile=temp+'/old-'+path.basename(lib),newFile=temp+'/new-'+path.basename(lib);
  docker(['cp','-L',oldId+':'+lib,oldFile]);docker(['cp','-L',newId+':'+lib,newFile]);
  const oldSymbols=symbols(oldFile),newSymbols=symbols(newFile);assert(oldSymbols.size>0);for(const name of oldSymbols)assert(newSymbols.has(name),'Lost Expat ABI: '+name);
  assert([...newSymbols].some(n=>n==='FUNC:XML_SetHashSalt16Bytes'));
  abi.push({path:lib,oldSha256:sha(fs.readFileSync(oldFile)),newSha256:sha(fs.readFileSync(newFile)),preservedSymbols:oldSymbols.size,added128bitApi:true});
 }}finally{docker(['rm','-v',oldId,newId]);fs.rmSync(temp,{recursive:true});}
 const native=[];
 for(const image of [s.base,after.Id]){
  const baseline=image===s.base;
  const result=JSON.parse(docker(['run','--rm',...limits,'--user','65534:65534','--mount','type=bind,src='+here+'native.py,dst=/native.py,readonly','--mount','type=bind,src='+build+'/entropy-probe.so,dst=/entropy-probe.so,readonly','-e','LD_PRELOAD=/entropy-probe.so','--entrypoint','python3',image,'-B','/native.py',...(baseline?['--baseline']:[])]));
  assert(result.passed);native.push({image,...result});
 }
 let consumer,sdkNative;
 if(s.kind==='kuma'){
  consumer=docker(['run','--rm',...limits,'--user','65534:65534','--mount','type=bind,src='+here+'../sqlite-final/kuma-jwt.py,dst=/consumer.py,readonly','--entrypoint','python3',after.Id,'-B','/consumer.py']);
  assert.match(consumer,/Native PyJWT HS\/RS\/PS\/ES/);
 }else{
  consumer=imageRun(after.Id,"PYTHONDONTWRITEBYTECODE=1 barman-cloud-backup --help >/dev/null; python3 -B -c 'import psycopg2,boto3,yaml,requests; print(\"BARMAN_NATIVE_IMPORT_AND_HELP_PASSED\")'");
  assert.equal(consumer,'BARMAN_NATIVE_IMPORT_AND_HELP_PASSED');
  sdkNative=JSON.parse(docker(['run','--rm',...limits,'--user','0','--mount','type=bind,src='+here+'sdk-native.py,dst=/sdk-native.py,readonly','--mount','type=bind,src=/var/lib/utilibre-maintenance/closure-followup-20261012/curl-fixture,dst=/fixture,readonly','--entrypoint','python3',after.Id,'-B','/sdk-native.py']));
  assert(sdkNative.passed&&sdkNative.nativeSigV4VerifiedIndependently&&sdkNative.nativeBarmanUploadListReadDownload);
 }
 const proof={date:new Date().toISOString(),...s,imageId:after.Id,passed:true,configurationUnchanged:true,applicationSha256,etcSha256,unrelatedLibrariesSha256,abi,packages:wanted.map(name=>({name,...packages.get(name)})),sdkCompatibilityRepair:s.key==='gathio',deployed:false};
 fs.writeFileSync(out+'/build.json',JSON.stringify(proof,null,2)+'\n');
 fs.writeFileSync(out+'/native.json',JSON.stringify({date:new Date().toISOString(),imageId:after.Id,passed:true,native,consumer,sdkNative,upstreamPythonModules:10,upstreamExpatChecks:5196,abiPreserved:true,limitations:'Synthetic native checks only. No production traffic. A separate service application gate is required. Legacy tar extraction filters are absent: no claim that the old unrestricted extraction API is safe.'},null,2)+'\n');
 console.log(s.key+': native parser entropy, package/configuration preservation and Python consumers passed.');
}
