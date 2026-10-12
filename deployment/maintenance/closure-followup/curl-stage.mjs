// Exact native-library overlays; all fixture traffic stays in a network-none namespace.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {curlSuites,allowedCurlFeatureChanges} from './curl-policy.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012',here=new URL('.',import.meta.url).pathname;
const build=dir+'/curl-trixie',version='8.22.0-1~deb13u1+utilibre1';
const sha=b=>createHash('sha256').update(b).digest('hex');
const run=(p,a,o={})=>cp.execFileSync(p,a,{encoding:'utf8',timeout:240000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe'],...o}).trim();
const docker=a=>{try{return run('docker',a,{env:{...process.env,DOCKER_BUILDKIT:'0'}});}catch(e){fs.writeFileSync(dir+'/curl-stage-error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('Curl stage failed; private diagnostics retained');}};
const inspect=n=>JSON.parse(docker(['inspect',n]))[0];
assert(fs.readFileSync(build+'/runner.log','utf8').includes('NATIVE_CURL_BUILD_AND_UPSTREAM_TESTS_PASSED'));
const suite=fs.readFileSync(build+'/build.log','utf8');
const counts=curlSuites(suite);
const checksum=new Map(fs.readFileSync(build+'/SHA256SUMS','utf8').trim().split('\n').map(l=>[path.basename(l.slice(66)),l.slice(0,64)]));
const packages=new Map();
for(const f of fs.readdirSync(build).filter(f=>f.endsWith('_amd64.deb'))){
 assert.equal(sha(fs.readFileSync(build+'/'+f)),checksum.get(f));
 packages.set(run('dpkg-deb',['-f',build+'/'+f,'Package']),{file:f,dir:build,sha256:checksum.get(f)});
}
const deps={
 'libnghttp3-9_1.15.0-1~bpo13+1_amd64.deb':'fa6e52fa0243e91d936c596d4d65978813a65f292deed67d4beff75362c152ae',
 'libngtcp2-16_1.22.1-1~bpo13+1_amd64.deb':'addfa0f3ca11880689ebd2d6f137b2505df39271eadf11ab63027e91887c6d83',
 'libngtcp2-crypto-gnutls8_1.22.1-1~bpo13+1_amd64.deb':'d26e503fe97c74b32c2906ab2be0979d48a87c18add1d9f116c2dbc4c3d27d85',
 'libngtcp2-crypto-ossl0_1.22.1-1~bpo13+1_amd64.deb':'403c292ec7672ff8c36fba1d8dbd35f0e17aec941092533c931513adfc0d0dc9',
};
for(const [f,hash] of Object.entries(deps)){assert.equal(sha(fs.readFileSync(dir+'/curl-runtime/'+f)),hash);packages.set(f.split('_')[0],{file:f,dir:dir+'/curl-runtime',sha256:hash});}
const limits=['--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','512m','--pids-limit','64','--ulimit','core=0','--log-driver','none','--tmpfs','/tmp:rw,size=32m,mode=1777','--tmpfs','/run:rw,size=8m'];
const imageRun=(image,command)=>docker(['run','--rm',...limits,'--hostname','utilibre-curl-fixture','--network','none','--user','0','--entrypoint','sh',image,'-ec',command]);
const symbols=f=>new Set(run('readelf',['--dyn-syms','--wide',f]).split('\n').map(l=>l.trim().split(/\s+/)).filter(v=>['GLOBAL','WEAK'].includes(v[4])&&v[5]==='DEFAULT'&&v[6]!=='UND').map(v=>v[3]+':'+v[7].replace('@@','@')));
const server='maintenance-curl-http-fixture';
docker(['run','-d','--name',server,...limits,'--network','none','--user','0','--mount','type=bind,src='+dir+'/curl-fixture,dst=/fixture,readonly','--mount','type=bind,src='+here+'curl-fixture-server.py,dst=/server.py,readonly','--entrypoint','python3','utilibre-curl-native-builder:trixie-20261012','/server.py']);
try{
 docker(['exec',server,'python3','-c','import socket,time\nfor i in range(40):\n try:\n  socket.create_connection(("127.0.0.1",18443),.1).close();break\n except OSError: time.sleep(.1)\nelse: raise RuntimeError("fixture TLS readiness")']);
 const specs=JSON.parse(fs.readFileSync(here+'curl-specs.json')).filter(s=>process.argv.length<3||process.argv.slice(2).includes(s.key));
 for(const s of specs){
  assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3,'Recovery floor');
  assert.equal(inspect(s.baseRef).Id,s.base);for(const name of s.containers)assert.equal(inspect(name).Image,s.base);
  const out=dir+'/curl/'+s.key;fs.mkdirSync(out+'/packages',{recursive:true});assert(!fs.existsSync(out+'/build.json'),'Preserve completed proof');
  const selected=new Set([...s.packages,'libnghttp3-9','libngtcp2-16']);
  if(s.packages.includes('libcurl4t64'))selected.add('libngtcp2-crypto-ossl0');
  if(s.packages.includes('libcurl3t64-gnutls')){selected.add('libcurl4-gnutls');selected.add('libngtcp2-crypto-gnutls8');}
  for(const p of selected){assert(packages.has(p),p);const a=packages.get(p);fs.copyFileSync(a.dir+'/'+a.file,out+'/packages/'+a.file);}
  fs.copyFileSync(here+'install-curl.sh',out+'/install-curl.sh');const before=inspect(s.base);
  docker(['build','--pull=false','--network=none','--memory','512m','--cpu-period','100000','--cpu-quota','100000','--build-arg','BASE='+s.baseRef,'--build-arg','RESTORE_USER='+(before.Config.User||'root'),'-f',here+'Dockerfile.curl','-t',s.candidate,out]);
  const after=inspect(s.candidate),norm=c=>({...c,User:['','root','0',undefined].includes(c.User)?'root':c.User});assert.deepEqual(norm(after.Config),norm(before.Config));
  const app='for d in /app /opt /usr/local /usr/src /usr/lib/python3 /usr/lib/postgresql /usr/share/postgresql /priviblur /upstream /grist; do if test -d "$d"; then find "$d" -type f -exec sha256sum {} +; fi; done | sort | sha256sum';
  const applicationSha256=imageRun(s.base,app);assert.equal(imageRun(s.candidate,app),applicationSha256);
  const cfg='find /etc -type f ! -name ld.so.cache -exec sha256sum {} + | sort | sha256sum';
  const etcSha256=imageRun(s.base,cfg);assert.equal(imageRun(s.candidate,cfg),etcSha256);
  const unchanged='find /usr/lib /lib -type f -name "*.so*" ! -name "libcurl*.so*" ! -name "libngtcp2*.so*" ! -name "libnghttp3*.so*" -exec sha256sum {} + | sort | sha256sum';
  const unrelatedLibrariesSha256=imageRun(s.base,unchanged);assert.equal(imageRun(s.candidate,unchanged),unrelatedLibrariesSha256);
  const libPaths=imageRun(s.base,'find /usr/lib/x86_64-linux-gnu -maxdepth 1 -type l \\( -name "libcurl*.so.[0-9]" -o -name "libngtcp2*.so.[0-9]*" -o -name "libnghttp3*.so.[0-9]*" \\) | sort').split('\n').filter(Boolean);
  assert(libPaths.some(p=>p.includes('libcurl')));
  const temp=fs.mkdtempSync('/dev/shm/utilibre-curl-abi-'),oldId=docker(['create','--entrypoint','true',s.base]),newId=docker(['create','--entrypoint','true',after.Id]),abi=[];
  try{for(const p of libPaths){
   const oldFile=temp+'/old-'+path.basename(p),newFile=temp+'/new-'+path.basename(p);docker(['cp','-L',oldId+':'+p,oldFile]);docker(['cp','-L',newId+':'+p,newFile]);
   const oldSymbols=symbols(oldFile),newSymbols=symbols(newFile);assert(oldSymbols.size>0);for(const name of oldSymbols)assert(newSymbols.has(name),'Lost ABI '+p+' '+name);
   abi.push({path:p,oldSha256:sha(fs.readFileSync(oldFile)),newSha256:sha(fs.readFileSync(newFile)),preservedSymbols:oldSymbols.size});
  }}finally{docker(['rm','-v',oldId,newId]);assert(temp.startsWith('/dev/shm/utilibre-curl-abi-'));fs.rmSync(temp,{recursive:true});}
  const native=[];
  for(const image of [s.base,after.Id])for(const lib of libPaths.filter(p=>p.includes('libcurl'))){
   const result=docker(['run','--rm',...limits,'--network','container:'+server,'--user','65534:65534','--mount','type=bind,src='+dir+'/curl-fixture/curl-native,dst=/curl-native,readonly','--mount','type=bind,src='+dir+'/curl-fixture/cert.pem,dst=/ca.pem,readonly','--entrypoint','/curl-native',image,lib,'/ca.pem']);
   assert(result.includes('CURL_NATIVE_GET_REDIRECT_GZIP_POST_TLS_TRUST_REJECTION_404_PASSED'));native.push({image,library:lib,checks:7,passed:true});
  }
  const features=[];
  if(s.packages.includes('curl')){
   const old=imageRun(s.base,'curl --version'),current=imageRun(s.candidate,'curl --version');
   features.push(...allowedCurlFeatureChanges(old,current));
   const cli=docker(['run','--rm',...limits,'--network','container:'+server,'--user','65534:65534','--mount','type=bind,src='+dir+'/curl-fixture/cert.pem,dst=/ca.pem,readonly','--entrypoint','curl',after.Id,'--silent','--show-error','--fail','--noproxy','*','--max-time','5','--cacert','/ca.pem','https://localhost:18443/']);
   assert.equal(cli,'fictional transfer');
  }
  let php=false;
  if(s.key==='curl-services-freshrss'){
   const result=docker(['run','--rm',...limits,'--network','container:'+server,'--user','65534:65534','--mount','type=bind,src='+dir+'/curl-fixture/cert.pem,dst=/ca.pem,readonly','--entrypoint','php',after.Id,'-r','$c=curl_init("https://localhost:18443/");curl_setopt_array($c,[CURLOPT_CAINFO=>"/ca.pem",CURLOPT_RETURNTRANSFER=>true,CURLOPT_NOPROXY=>"*"]);$b=curl_exec($c);if($b!=="fictional transfer\\n")exit(1);echo "PHP_CURL_NATIVE_TLS_PASSED";']);
   assert.equal(result,'PHP_CURL_NATIVE_TLS_PASSED');php=true;
  }
  const proof={date:new Date().toISOString(),...s,imageId:after.Id,version,passed:true,configurationUnchanged:true,applicationSha256,etcSha256,unrelatedLibrariesSha256,abi,features,packages:[...selected].map(name=>({name,...packages.get(name)})),deployed:false};
  fs.writeFileSync(out+'/build.json',JSON.stringify(proof,null,2)+'\n');
  fs.writeFileSync(out+'/native.json',JSON.stringify({date:new Date().toISOString(),imageId:after.Id,passed:true,nativeTransfers:native,abiPreserved:true,phpCurlTls:php,upstreamSuites:counts,limitations:'Synthetic loopback HTTP/TLS only; HTTP/3 feature presence is not a QUIC end-to-end test. Upstream removed RTMP and TLS-SRP; supported NTLM/SMB retained. No user traffic or production data.'},null,2)+'\n');
  console.log(s.key+': native transfers, ABI and unchanged app/config passed');
 }
}finally{docker(['rm','-f',server]);}
