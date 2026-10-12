// Native stable OpenSSL overlay. Synthetic, network-isolated gates; no live mutation.
import fs from 'node:fs';import cp from 'node:child_process';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {suites,dtlsControl} from './policy.mjs';import {exportedSymbols} from '../bookworm-curl-followup/policy.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/openssl-bookworm-followup-20261012',here=new URL('.',import.meta.url).pathname;
const prior='/var/lib/utilibre-maintenance/closure-followup-20261012',curl='/var/lib/utilibre-maintenance/bookworm-curl-followup-20261012';
const version='3.0.22-1~deb12u1+utilibre1',sha=b=>createHash('sha256').update(b).digest('hex');
const run=(p,a,o={})=>cp.execFileSync(p,a,{encoding:'utf8',timeout:240000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe'],...o}).trim();
const docker=a=>{try{return run('docker',a,{env:{...process.env,DOCKER_BUILDKIT:'0'}});}catch(e){fs.writeFileSync(dir+'/stage-error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('OpenSSL stage failed; private diagnostics retained.');}};
const inspect=n=>JSON.parse(docker(['inspect',n]))[0];
const upstreamSuites=suites(fs.readFileSync(dir+'/build/build.log','utf8'));
// Exported directly from this tested source build; no remote test executable.
fs.mkdirSync(dir+'/fixture',{recursive:true});
for(const name of ['dtlstest','server.pem']){fs.copyFileSync(dir+'/build/'+name,dir+'/fixture/'+name);fs.chmodSync(dir+'/fixture/'+name,name==='dtlstest'?0o755:0o644);}
const sums=new Map(fs.readFileSync(dir+'/build/SHA256SUMS','utf8').trim().split('\n').map(l=>[path.basename(l.slice(66)),l.slice(0,64)]));
const packages=new Map();
for(const file of fs.readdirSync(dir+'/build').filter(f=>f.endsWith('_amd64.deb'))){
 const full=dir+'/build/'+file;assert.equal(sha(fs.readFileSync(full)),sums.get(file));
 assert.equal(run('dpkg-deb',['-f',full,'Version']),version);packages.set(run('dpkg-deb',['-f',full,'Package']),{file,version,sha256:sums.get(file)});
}
const limits=['--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','512m','--pids-limit','64','--ulimit','core=0','--log-driver','none','--tmpfs','/tmp:rw,size=32m,mode=1777','--tmpfs','/run:rw,size=8m'];
const imageRun=(image,command)=>docker(['run','--rm',...limits,'--hostname','utilibre-openssl-fixture','--network','none','--user','0','--entrypoint','sh',image,'-ec',command]);
const fixture='maintenance-bookworm-openssl-fixture';
docker(['run','-d','--name',fixture,...limits,'--network','none','--user','0','--mount','type=bind,src='+prior+'/curl-fixture,dst=/fixture,readonly','--mount','type=bind,src='+here+'../closure-followup/curl-fixture-server.py,dst=/server.py,readonly','--entrypoint','python3','utilibre-kuma:python-expat-security-20261012','/server.py']);
try{
 docker(['exec',fixture,'python3','-c','import socket,time\nfor i in range(40):\n try:\n  socket.create_connection(("127.0.0.1",18443),.1).close();break\n except OSError: time.sleep(.1)\nelse: raise RuntimeError("TLS fixture readiness")']);
 for(const s of JSON.parse(fs.readFileSync(here+'specs.json')).filter(s=>process.argv.length<3||process.argv.slice(2).includes(s.key))){
  assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3,'8 GiB recovery floor');
  assert.equal(inspect(s.baseRef).Id,s.base);assert.equal(inspect(s.container).Image,s.base);
  const out=dir+'/images/'+s.key;fs.mkdirSync(out+'/packages',{recursive:true});assert(!fs.existsSync(out+'/build.json'),'Preserve completed proof');
  for(const name of s.packages){assert(packages.has(name));const p=packages.get(name);fs.copyFileSync(dir+'/build/'+p.file,out+'/packages/'+p.file);}
  const before=inspect(s.base);docker(['build','--pull=false','--network=none','--memory','512m','--cpu-period','100000','--cpu-quota','100000','--build-arg','BASE='+s.baseRef,'--build-arg','RESTORE_USER='+(before.Config.User||'root'),'-f',here+'../xml-final/Dockerfile','-t',s.candidate,out]);
  const after=inspect(s.candidate),norm=c=>({...c,User:['','root','0',undefined].includes(c.User)?'root':c.User});assert.deepEqual(norm(after.Config),norm(before.Config));
  const app='for d in /app /opt /usr/local /usr/src /usr/lib/python3 /usr/lib/postgresql /usr/share/postgresql; do if test -d "$d"; then find "$d" -type f -exec sha256sum {} +; fi; done | sort | sha256sum';
  const applicationSha256=imageRun(s.base,app);assert.equal(imageRun(s.candidate,app),applicationSha256);
  const cfg='find /etc -type f ! -name ld.so.cache -exec sha256sum {} + | sort | sha256sum';const etcSha256=imageRun(s.base,cfg);assert.equal(imageRun(s.candidate,cfg),etcSha256);
  const libs='find /usr/lib /lib -type f -name "*.so*" ! -name "libssl.so.3" ! -name "libcrypto.so.3" ! -path "*/engines-3/*" ! -path "*/ossl-modules/*" -exec sha256sum {} + | sort | sha256sum';
  const unrelatedLibrariesSha256=imageRun(s.base,libs);assert.equal(imageRun(s.candidate,libs),unrelatedLibrariesSha256);
  const inventory='openssl list -providers -provider default -provider legacy; openssl list -cipher-algorithms; openssl list -digest-algorithms; openssl ciphers -v ALL';
  const algorithmsSha256=sha(imageRun(s.base,inventory));assert.equal(sha(imageRun(s.candidate,inventory)),algorithmsSha256);
  const temp=fs.mkdtempSync('/dev/shm/utilibre-openssl-abi-'),oldId=docker(['create','--entrypoint','true',s.base]),newId=docker(['create','--entrypoint','true',after.Id]),abi=[];
  try{for(const p of ['/usr/lib/x86_64-linux-gnu/libssl.so.3','/usr/lib/x86_64-linux-gnu/libcrypto.so.3']){
   const oldFile=temp+'/old-'+path.basename(p),newFile=temp+'/new-'+path.basename(p);docker(['cp','-L',oldId+':'+p,oldFile]);docker(['cp','-L',newId+':'+p,newFile]);
   const oldSymbols=exportedSymbols(run('readelf',['--dyn-syms','--wide',oldFile])),newSymbols=exportedSymbols(run('readelf',['--dyn-syms','--wide',newFile]));assert(oldSymbols.size>100);for(const symbol of oldSymbols)assert(newSymbols.has(symbol),'Lost OpenSSL ABI '+symbol);
   abi.push({path:p,oldSha256:sha(fs.readFileSync(oldFile)),newSha256:sha(fs.readFileSync(newFile)),preservedSymbols:oldSymbols.size});
  }}finally{docker(['rm','-v',oldId,newId]);fs.rmSync(temp,{recursive:true});}
  const native=[];
  for(const image of [s.base,after.Id]){
   const checks={image,passed:false};
   const crypto=docker(['run','--rm',...limits,'--network','none','--user','65534:65534','--mount','type=bind,src='+here+'native-crypto.sh,dst=/native.sh,readonly','--entrypoint','sh',image,'/native.sh']);assert.match(crypto,/OPENSSL_NATIVE_RSA_ECDSA_TAMPER_AES_PBKDF2_RANDOM_PROVIDERS_PASSED/);checks.nativeCrypto=true;
   checks.dtls=[];
   for(const name of ['test_dtls_client_retransmit','test_dtls_server_retransmit']){
    const r=cp.spawnSync('docker',['run','--rm',...limits,'--network','none','--user','65534:65534','--mount','type=bind,src='+dir+'/fixture,dst=/fixture,readonly','--entrypoint','/fixture/dtlstest',image,'-test',name,'/fixture/server.pem','/fixture/server.pem'],{encoding:'utf8',timeout:180000,maxBuffer:4*1024**2});
    const output=String(r.stdout||'')+String(r.stderr||'');fs.writeFileSync(out+'/'+(image===s.base?'old':'new')+'-'+name+'.log',output);assert(!r.error);
    checks.dtls.push({name,...dtlsControl({status:r.status,output},image!==s.base,name)});
   }
   for(const tls of ['tls1_2','tls1_3']){
    const result=docker(['run','--rm',...limits,'--network','container:'+fixture,'--user','65534:65534','--mount','type=bind,src='+prior+'/curl-fixture/cert.pem,dst=/ca.pem,readonly','--entrypoint','sh',image,'-ec',`printf 'GET / HTTP/1.0\r\nHost: localhost\r\n\r\n' | openssl s_client -quiet -ign_eof -ignore_unexpected_eof -connect 127.0.0.1:18443 -CAfile /ca.pem -verify_return_error -verify_hostname localhost -${tls} 2>/dev/null`]);assert.match(result,/fictional transfer/);
   }
   const rejected=cp.spawnSync('docker',['run','--rm',...limits,'--network','container:'+fixture,'--user','65534:65534','--mount','type=bind,src='+prior+'/curl-fixture/cert.pem,dst=/ca.pem,readonly','--entrypoint','openssl',image,'s_client','-connect','127.0.0.1:18443','-CAfile','/ca.pem','-verify_return_error','-verify_hostname','wrong.invalid'],{encoding:'utf8',timeout:10000});assert(!rejected.error);assert.notEqual(rejected.status,0);assert.match(rejected.stderr,/hostname mismatch/);checks.tls12And13AndWrongHost=true;
   if(s.key!=='wishlist'){
    const curlResult=docker(['run','--rm',...limits,...(s.key==='rssbridge'?['-e','LD_PRELOAD=']:[]),'--network','container:'+fixture,'--user','65534:65534','--mount','type=bind,src='+curl+'/build/curl-native,dst=/curl-native,readonly','--mount','type=bind,src='+prior+'/curl-fixture/cert.pem,dst=/ca.pem,readonly','--entrypoint','/curl-native',image,'/usr/lib/x86_64-linux-gnu/libcurl.so.4','/ca.pem']);assert.match(curlResult,/CURL_NATIVE_GET_REDIRECT_GZIP_POST_TLS_TRUST_REJECTION_404_PASSED/);checks.systemCurlTransfers=7;
   }else{assert.equal(imageRun(image,'test ! -e /usr/lib/x86_64-linux-gnu/libcurl.so.4 && echo absent'),'absent');checks.systemCurl='not installed; native Prisma/application gate required separately';}
   if(['kuma','gathio'].includes(s.key)){
    // Fixture key remains mode0600 on disk; isolated root reads that fictional
    // key without broadening host permissions or mounting production secrets.
    const python=JSON.parse(docker(['run','--rm',...limits,'--network','none','--user','0','--mount','type=bind,src='+prior+'/curl-fixture,dst=/fixture,readonly','--mount','type=bind,src='+here+'../closure-followup/urllib3-native.py,dst=/native.py,readonly','--entrypoint','python3',image,'-B','/native.py']));assert(python.passed);assert.equal(python.checks.length,11);checks.nativePythonTls=python;
   }
   checks.passed=true;native.push(checks);
  }
  fs.writeFileSync(out+'/build.json',JSON.stringify({date:new Date().toISOString(),...s,imageId:after.Id,version,passed:true,configurationUnchanged:true,applicationSha256,etcSha256,unrelatedLibrariesSha256,algorithmsSha256,abi,packages:s.packages.map(name=>({name,...packages.get(name)})),deployed:false},null,2)+'\n');
  fs.writeFileSync(out+'/native.json',JSON.stringify({date:new Date().toISOString(),imageId:after.Id,passed:true,abiPreserved:true,upstreamSuites,native,limitation:'Native stable CVE-2026-84782 DTLS backport only; unrelated OpenSSL advisories require separate review. Isolated synthetic checks, no production user data.'},null,2)+'\n');
  console.log(s.key+': OpenSSL ABI, old/new DTLS controls, crypto, TLS and native consumer gates passed.');
 }
}finally{docker(['rm','-f',fixture]);}
