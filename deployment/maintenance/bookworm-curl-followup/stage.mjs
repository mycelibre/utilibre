// Native Bookworm library overlay, with no production changes or external traffic.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {curlSuites} from '../closure-followup/curl-policy.mjs';
import {featureChanges,libraryChanges,exportedSymbols} from './policy.mjs';
process.umask(0o077);
const oct28=process.argv.includes('--oct28'),dir=oct28?'/var/lib/utilibre-maintenance/security-20261028/curl-bookworm':'/var/lib/utilibre-maintenance/bookworm-curl-followup-20261012';
const prior=oct28?'/var/lib/utilibre-maintenance/security-20261028':'/var/lib/utilibre-maintenance/closure-followup-20261012';
const here=new URL('.',import.meta.url).pathname,build=dir+'/build';
const release=oct28?'8.23.0':'8.22.0',version=release+'-1~deb12u1+utilibre1';
const sha=b=>createHash('sha256').update(b).digest('hex');
const run=(p,a,o={})=>cp.execFileSync(p,a,{encoding:'utf8',timeout:240000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe'],...o}).trim();
const docker=a=>{try{return run('docker',a,{env:{...process.env,DOCKER_BUILDKIT:'0'}});}catch(e){fs.writeFileSync(dir+'/stage-error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('Bookworm curl staging failed; private diagnostics retained.');}};
const inspect=n=>JSON.parse(docker(['inspect',n]))[0];
assert(fs.readFileSync(build+'/runner.log','utf8').includes('NATIVE_BOOKWORM_CURL_UPSTREAM_SUITES_PASSED'));
const fullLog=fs.readFileSync(build+'/build.log','utf8');
const suites=curlSuites(fullLog);
for(const tls of ['openssl','gnutls']){
 const regressions=fs.readFileSync(build+'/security-regressions-'+tls+'.log','utf8');
 assert.match(regressions,/TESTDONE: 3 tests out of 3 reported OK: 100%/);
 assert.match(regressions,/TESTDONE: 3 tests were considered/);
 assert(!regressions.includes('SKIPPED')&&!regressions.includes('TESTFAIL'));
}
const gnutlsSuite=fullLog.slice(fullLog.lastIndexOf('cd debian/build-gnutls && VERBOSE=1'));
assert.match(gnutlsSuite,/test 1725 \[SCP incorrect host key with --proto-default SCP\][\s\S]{0,150}? OK /);
const checksums=new Map(fs.readFileSync(build+'/SHA256SUMS','utf8').trim().split('\n').map(l=>[path.basename(l.slice(66)),l.slice(0,64)]));
const packages=new Map();
for(const f of fs.readdirSync(build).filter(f=>f.endsWith('_amd64.deb'))){
 assert.equal(sha(fs.readFileSync(build+'/'+f)),checksums.get(f));
 packages.set(run('dpkg-deb',['-f',build+'/'+f,'Package']),{file:f,sha256:checksums.get(f)});
}
const limits=['--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','512m','--pids-limit','64','--ulimit','core=0','--log-driver','none','--tmpfs','/tmp:rw,size=32m,mode=1777','--tmpfs','/run:rw,size=8m'];
const imageRun=(image,command)=>docker(['run','--rm',...limits,'--hostname','utilibre-curl-fixture','--network','none','--user','0','--entrypoint','sh',image,'-ec',command]);
const symbols=f=>exportedSymbols(run('readelf',['--dyn-syms','--wide',f]));
const server='maintenance-bookworm-curl-fixture';
docker(['run','-d','--name',server,...limits,'--network','none','--user','0','--mount','type=bind,src='+prior+'/curl-fixture,dst=/fixture,readonly','--mount','type=bind,src='+here+'../closure-followup/curl-fixture-server.py,dst=/server.py,readonly','--entrypoint','python3',oct28?'utilibre-curl-native-builder:trixie-20261028':'utilibre-kuma:urllib3-security-20261012','/server.py']);
try{
 docker(['exec',server,'python3','-c','import socket,time\nfor i in range(40):\n try:\n  socket.create_connection(("127.0.0.1",18443),.1).close();break\n except OSError: time.sleep(.1)\nelse: raise RuntimeError("TLS fixture readiness")']);
 const requested=process.argv.slice(2).filter(k=>k!=='--oct28');
 const specs=oct28?JSON.parse(fs.readFileSync(here+'../security-20261028/curl-bookworm-inputs.json')).rows:JSON.parse(fs.readFileSync(here+'specs.json'));
 assert(!oct28||requested.length,'Explicit targets required');
 for(const s of specs.filter(s=>!requested.length||requested.includes(s.key))){
  assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3,'8 GiB recovery floor');
  assert.equal(inspect(s.baseRef).Id,s.base);for(const name of s.containers)assert.equal(inspect(name).Image,s.base);
  const out=dir+'/images/'+s.key;fs.mkdirSync(out+'/packages',{recursive:true});assert(!fs.existsSync(out+'/build.json'),'Preserve completed proof');
  for(const p of s.packages){assert(packages.has(p));const a=packages.get(p);fs.copyFileSync(build+'/'+a.file,out+'/packages/'+a.file);}
  const before=inspect(s.base);
  if(s.key==='rssbridge')assert.equal(JSON.parse(fs.readFileSync(dir+'/impersonate/payload.json')).release,oct28?'v2.3.1':'v2.2.3');
  docker(['build','--pull=false','--network=none','--memory','512m','--cpu-period','100000','--cpu-quota','100000','--build-arg','BASE='+s.baseRef,'--build-arg','RESTORE_USER='+(before.Config.User||'root'),...(oct28&&s.key==='rssbridge'?['--build-arg','IMPERSONATE_VERSION=8.23.0-IMPERSONATE','--build-arg','IMPERSONATE_SHA=1d80e39a4691a7261a30c578b4b4497a604184826e9c9c1f96dab65196200bb0']:[]),'-f',here+(s.key==='rssbridge'?'Dockerfile.rssbridge':'../xml-final/Dockerfile'),'-t',s.candidate,out]);
  const after=inspect(s.candidate),norm=c=>({...c,User:['','root','0',undefined].includes(c.User)?'root':c.User});assert.deepEqual(norm(after.Config),norm(before.Config));
  const vendorExclusion=s.key==='rssbridge'?' -path /usr/local/lib/curl-impersonate -prune -o':'';
  const app='for d in /app /opt /usr/local /usr/src /usr/lib/python3 /usr/lib/postgresql /usr/share/postgresql; do if test -d "$d"; then find "$d"'+vendorExclusion+' -type f -exec sha256sum {} +; fi; done | sort | sha256sum';
  const applicationSha256=imageRun(s.base,app);assert.equal(imageRun(s.candidate,app),applicationSha256);
  const cfg='find /etc -type f ! -name ld.so.cache -exec sha256sum {} + | sort | sha256sum';
  const etcSha256=imageRun(s.base,cfg);assert.equal(imageRun(s.candidate,cfg),etcSha256);
  const libs='find /usr/lib /lib -type f -name "*.so*" ! -name "libcurl*.so*" -exec sha256sum {} + | sort | sha256sum';
  const unrelatedLibrariesSha256=imageRun(s.base,libs);assert.equal(imageRun(s.candidate,libs),unrelatedLibrariesSha256);
  const libPaths=imageRun(s.base,'find /usr/lib/x86_64-linux-gnu -maxdepth 1 -type l -name "libcurl*.so.[0-9]" | sort').split('\n').filter(Boolean);assert(libPaths.length);
  const temp=fs.mkdtempSync('/dev/shm/utilibre-bookworm-curl-abi-'),oldId=docker(['create','--entrypoint','true',s.base]),newId=docker(['create','--entrypoint','true',after.Id]),abi=[];
  try{for(const p of libPaths){
   const oldFile=temp+'/old-'+path.basename(p),newFile=temp+'/new-'+path.basename(p);docker(['cp','-L',oldId+':'+p,oldFile]);docker(['cp','-L',newId+':'+p,newFile]);
   const oldSymbols=symbols(oldFile),newSymbols=symbols(newFile);assert(oldSymbols.size>0);for(const name of oldSymbols)assert(newSymbols.has(name),'Lost ABI '+p+' '+name);
   abi.push({path:p,oldSha256:sha(fs.readFileSync(oldFile)),newSha256:sha(fs.readFileSync(newFile)),preservedSymbols:oldSymbols.size});
  }}finally{docker(['rm','-v',oldId,newId]);fs.rmSync(temp,{recursive:true});}
  const native=[];
  for(const image of [s.base,after.Id])for(const lib of libPaths){
   // Explicit system-library ABI is separate from RSS-Bridge's intentional
   // unversioned LD_PRELOAD library. Its actual PHP consumer gets its own gate.
   const result=docker(['run','--rm',...limits,...(s.key==='rssbridge'?['-e','LD_PRELOAD=']:[]),'--network','container:'+server,'--user','65534:65534','--mount','type=bind,src='+build+'/curl-native,dst=/curl-native,readonly','--mount','type=bind,src='+prior+'/curl-fixture/cert.pem,dst=/ca.pem,readonly','--entrypoint','/curl-native',image,lib,'/ca.pem']);
   assert(result.includes('CURL_NATIVE_GET_REDIRECT_GZIP_POST_TLS_TRUST_REJECTION_404_PASSED'));
   native.push({image,library:lib,abiVersion:lib.includes('gnutls')?'CURL_GNUTLS_3':'CURL_OPENSSL_4',checks:7,passed:true,inventory:result.split('\n').slice(0,3)});
  }
  const libraryFeatures=[];
  for(const library of libPaths){
   const old=native.find(n=>n.image===s.base&&n.library===library).inventory;
   const current=native.find(n=>n.image===after.Id&&n.library===library).inventory;
   libraryFeatures.push({library,...libraryChanges(old,current,release)});
  }
  let features=[],php=false;
  if(s.packages.includes('curl')){
   features=featureChanges(imageRun(s.base,'curl --version'),imageRun(s.candidate,'curl --version'),release);
   const cli=docker(['run','--rm',...limits,'--network','container:'+server,'--user','65534:65534','--mount','type=bind,src='+prior+'/curl-fixture/cert.pem,dst=/ca.pem,readonly','--entrypoint','curl',after.Id,'--silent','--show-error','--fail','--noproxy','*','--max-time','5','--cacert','/ca.pem','https://localhost:18443/']);assert.equal(cli,'fictional transfer');
  }
  if(s.key==='rssbridge'){
   const result=docker(['run','--rm',...limits,'--network','container:'+server,'--user','65534:65534','--mount','type=bind,src='+prior+'/curl-fixture/cert.pem,dst=/ca.pem,readonly','--entrypoint','php',after.Id,'-r','$c=curl_init("https://localhost:18443/");curl_setopt_array($c,[CURLOPT_CAINFO=>"/ca.pem",CURLOPT_RETURNTRANSFER=>true,CURLOPT_NOPROXY=>"*"]);$b=curl_exec($c);if($b!=="fictional transfer\\n")exit(1);echo "PHP_CURL_NATIVE_TLS_PASSED";']);assert.equal(result,'PHP_CURL_NATIVE_TLS_PASSED');php=true;
  }
  const proof={date:new Date().toISOString(),...s,imageId:after.Id,version,passed:true,configurationUnchanged:true,applicationSha256,etcSha256,unrelatedLibrariesSha256,abi,features,libraryFeatures,packages:s.packages.map(name=>({name,...packages.get(name)})),...(s.key==='rssbridge'?{vendorReplacement:JSON.parse(fs.readFileSync(dir+'/impersonate/payload.json')),applicationHashExclusion:'/usr/local/lib/curl-impersonate; separately tested upstream runtime payload',additionalRequiredGate:'impersonate.json; not release-ready from system-library tests alone'}:{}),deployed:false};
  fs.writeFileSync(out+'/build.json',JSON.stringify(proof,null,2)+'\n');
  fs.writeFileSync(out+'/native.json',JSON.stringify({date:new Date().toISOString(),imageId:after.Id,passed:true,nativeTransfers:native,abiPreserved:true,phpCurlTls:php,upstreamSuites:suites,sshDefaultProtocolWrongKeyRejectedBothTls:true,limitations:'Synthetic loopback HTTP/TLS; no production traffic. Bookworm native dependencies retained; no HTTP/3 added. Upstream removed RTMP, TLS-SRP and NTLM_WB; 8.23 also removes SMB/SMBS. Application/source/config bytes unchanged; separate native application gates still required.'},null,2)+'\n');
  console.log(s.key+': native transfers, ABI and unchanged application/configuration passed.');
 }
}finally{docker(['rm','-f',server]);}
