// Candidate-only package overlay, ABI and byte-preservation gates. No live pins.
import fs from 'node:fs';
import cp from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {exportedSymbols} from '../bookworm-curl-followup/policy.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/xlib-followup-20261012',here=new URL('.',import.meta.url).pathname;
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(cmd,args,o={})=>cp.execFileSync(cmd,args,{encoding:'utf8',timeout:300000,maxBuffer:24*1024**2,stdio:['ignore','pipe','pipe'],...o}).trim();
const docker=args=>run('docker',args,{env:{...process.env,DOCKER_BUILDKIT:'0'}}),inspect=n=>JSON.parse(docker(['inspect',n]))[0];
const prepared=JSON.parse(fs.readFileSync(root+'/prepared.json'));
const roles=JSON.parse(fs.readFileSync(here+'roles.json')).filter(s=>process.argv.length<3||process.argv.slice(2).includes(s.key));
const limits=['--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','512m','--pids-limit','96','--log-driver','none','--ulimit','core=0','--hostname','utilibre-xlib-fixture','--tmpfs','/tmp:rw,size=64m,mode=1777'];
const script=(image,text)=>docker(['run',...limits,'--user','0','--entrypoint','sh',image,'-ec',text]);
const inventory=image=>new Map(script(image,"dpkg-query -W -f='${binary:Package}\t${Version}\n'").split('\n').map(s=>s.split('\t')));
const needed=f=>[...run('readelf',['-d',f]).matchAll(/\(NEEDED\).*\[([^\]]+)\]/g)].map(m=>m[1]).sort();
for(const role of roles){
 assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3,'8 GiB recovery floor');
 assert.equal(inspect(role.container).Image,role.base,'Reconcile intervening live releases before stage');
 const out=root+'/images/'+role.key;fs.mkdirSync(out+'/packages',{recursive:true});assert(!fs.existsSync(out+'/build.json'),'Retain completed evidence');
 const build=root+'/build/'+(role.suite==='dhi'?'trixie':role.suite),packages=[];
 assert(fs.existsSync(build+'/'+role.suite));
 for(const name of role.packages){
  const file=fs.readdirSync(build+'/'+role.suite).find(f=>f.startsWith(name+'_')&&f.endsWith('.deb'));assert(file);
  const archive=build+'/'+role.suite+'/'+file,version=run('dpkg-deb',['-f',archive,'Version']);assert(version.endsWith('+utilibre1'));
  const sourcePackage=name.startsWith('libx11')?'libx11':name==='libxrender1'?'libxrender':'libxtst';
  assert.equal(version,prepared.trees.find(t=>t.suite===role.suite&&t.package===sourcePackage).version);
  assert.match(fs.readFileSync(build+'/'+role.suite+'-'+sourcePackage+'-build.log','utf8'),/dpkg-genchanges/);
  fs.copyFileSync(archive,out+'/packages/'+file);packages.push({name,file,version,sha256:sha(archive)});
 }
 const before=inspect(role.base),oldPackages=inventory(role.base);
 docker(['build','--pull=false','--network=none','--memory','512m','--cpu-period','100000','--cpu-quota','100000','--build-arg','BASE='+role.base,'--build-arg','RESTORE_USER='+(before.Config.User||'root'),'--build-arg','PRIVATE_COPIES='+(role.privateCopies?'1':'0'),'-f',here+'Dockerfile','-t',role.candidate,out]);
 const after=inspect(role.candidate),norm=c=>({...c,User:['','0','root',undefined].includes(c.User)?'root':c.User});assert.deepEqual(norm(after.Config),norm(before.Config));
 const nextPackages=inventory(after.Id);assert.equal(nextPackages.size,oldPackages.size);
 for(const [name,version]of oldPackages){const selected=packages.find(p=>p.name===name.replace(/:amd64$/,''));assert.equal(nextPackages.get(name),selected?.version||version,name);}
 const app="for p in /app /opt /usr/local /usr/src; do if test -d \"$p\"; then find \"$p\" -type f ! -path /opt/imagick/lib/deps/libX11.so.6 ! -path /opt/imagick/lib/deps/libXrender.so.1 -exec sha256sum {} +; fi; done | sort | sha256sum";
 const config='find /etc -type f ! -path /etc/ld.so.cache ! -path /etc/hostname ! -path /etc/hosts ! -path /etc/resolv.conf -exec sha256sum {} + | sort | sha256sum';
 const libs='find /usr/lib /lib -type f ! -name "libX11.so*" ! -name "libX11-xcb.so*" ! -name "libXrender.so*" ! -name "libXtst.so*" -exec sha256sum {} + | sort | sha256sum';
 const preservation={};for(const [name,cmd]of Object.entries({application:app,configuration:config,unrelatedLibraries:libs})){preservation[name]=script(role.base,cmd);assert.equal(script(after.Id,cmd),preservation[name],name);}
 const temp=fs.mkdtempSync('/tmp/utilibre-xlib-abi-'),oldId=docker(['create','--entrypoint','true',role.base]),newId=docker(['create','--entrypoint','true',after.Id]),abi=[];
 try{
  const paths=['/usr/lib/x86_64-linux-gnu/libX11.so.6'];
  if(role.packages.includes('libx11-xcb1'))paths.push('/usr/lib/x86_64-linux-gnu/libX11-xcb.so.1');
  if(role.packages.includes('libxrender1'))paths.push('/usr/lib/x86_64-linux-gnu/libXrender.so.1');
  if(role.packages.includes('libxtst6'))paths.push('/usr/lib/x86_64-linux-gnu/libXtst.so.6');
  if(role.privateCopies)paths.push('/opt/imagick/lib/deps/libX11.so.6','/opt/imagick/lib/deps/libXrender.so.1');
  for(const [n,lib]of paths.entries()){
   const old=temp+'/'+n+'-old',next=temp+'/'+n+'-new';docker(['cp','-L',oldId+':'+lib,old]);docker(['cp','-L',newId+':'+lib,next]);
   const oldSymbols=exportedSymbols(run('readelf',['--dyn-syms','--wide',old])),newSymbols=exportedSymbols(run('readelf',['--dyn-syms','--wide',next]));assert(oldSymbols.size>0);for(const symbol of oldSymbols)assert(newSymbols.has(symbol),'Lost ABI '+symbol);
   assert.deepEqual(needed(next),needed(old),'Changed dependency set');
   const soname=f=>run('readelf',['-d',f]).match(/\(SONAME\).*\[([^\]]+)\]/)[1];assert.equal(soname(old),soname(next));
   const programs=f=>run('readelf',['-W','-l',f]);assert.match(programs(next),/GNU_RELRO/);assert(!/GNU_STACK.*RWE/.test(programs(next)));
   assert(!script(after.Id,'ldd '+lib).includes('not found'));abi.push({path:lib,oldSha256:sha(old),newSha256:sha(next),preservedSymbols:oldSymbols.size,sameNativeDependencies:true,sameSONAME:true});
  }
 }finally{docker(['rm','-v',oldId,newId]);assert(path.dirname(temp)==='/tmp'&&path.basename(temp).startsWith('utilibre-xlib-abi-'));fs.rmSync(temp,{recursive:true});}
 assert.equal(inspect(role.container).Image,role.base,'Concurrent deployment');
 fs.writeFileSync(out+'/build.json',JSON.stringify({date:new Date().toISOString(),...role,imageId:after.Id,packages,abi,preservation,status:'staged',configurationUnchanged:true,deployed:false,limitations:'Native ABI/source gates only; application compatibility checks remain required.'},null,2)+'\n');
 console.log(JSON.stringify({role:role.key,imageId:after.Id,abiLibraries:abi.length,status:'staged',deployed:false}));
}
