// Allowlisted code-only source offer. Publication requires the verified release.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);const [mode]=process.argv.slice(2);assert(['bundle','publish'].includes(mode)&&process.argv.length===3);
const root='/var/lib/utilibre-maintenance/security-20261103/ssh-gssapi',file='openssh-gssapi-utilibre-20261104-source.tar.gz';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
if(mode==='bundle'){
 assert(read(root+'/checks/gssapi.json').passed);assert(read(root+'/checks/native.json').passed);assert(read(root+'/source-check.json').signedDebianSource);assert(!fs.existsSync(root+'/'+file));
 const temp=fs.mkdtempSync(root+'/public-source-'),files=[];
 function copy(from,to){const data=fs.readFileSync(from);fs.mkdirSync(temp+'/'+to.substring(0,to.lastIndexOf('/')),{recursive:true});fs.writeFileSync(temp+'/'+to,data,{mode:0o644});files.push({file:to,sha256:sha(from),bytes:data.length});}
 try{
  for(const f of ['openssh_10.3p1-1~bpo13+1+utilibre2.dsc','openssh_10.3p1-1~bpo13+1+utilibre2.debian.tar.xz','openssh_10.3p1.orig.tar.gz','openssh_10.3p1.orig.tar.gz.asc','build-packages.lock'])copy(root+'/output/'+f,'source/'+f);
  for(const f of ['gssapi-inputs.json','gssapi-106553-106555.patch','gssapi-prepare.mjs','gssapi-source-check.mjs','gssapi-native.c','gssapi-state-check.sh','username-run.mjs','backports103-build.sh','username-check.mjs','username-native.py','native.py','username-preflight.mjs','username-release.mjs','username-review.mjs','gssapi-source.mjs','README.md'])copy(new URL('./'+f,import.meta.url),'recipes/'+f);
  fs.writeFileSync(temp+'/SOURCES.json',JSON.stringify({version:'1:10.3p1-1~bpo13+1+utilibre2',files,reproduction:'Extract source/*.dsc with dpkg-source -x, install the recorded Debian build dependencies, and use dpkg-buildpackage -us -uc -b with DEB_BUILD_OPTIONS=parallel=2. The source includes every prior patch and upstream license. This preserves inputs; byte-identical binaries are not claimed.',scope:'Code and build-input inventory only. No host keys, runtime configurations, fixture credentials, package binaries, user content or operational logs.'},null,2)+'\n');
  cp.execFileSync('tar',['-czf',root+'/'+file,'-C',temp,'.'],{stdio:'pipe',timeout:30000});
  fs.writeFileSync(root+'/source-bundle.json',JSON.stringify({file,sha256:sha(root+'/'+file),bytes:fs.statSync(root+'/'+file).size,files:files.length+1,published:false},null,2)+'\n');
 }finally{fs.rmSync(temp,{recursive:true});}
 console.log('Code-only source bundle prepared; not published.');
}else{
 const bundle=read(root+'/source-bundle.json'),release=read(root+'/checks/release.json');assert.equal(release.status,'passed');assert.equal(release.next,'1:10.3p1-1~bpo13+1+utilibre2');assert.equal(bundle.file,file);assert.equal(sha(root+'/'+file),bundle.sha256);
 const dest='/opt/utilibre/toolbox-public/'+file;if(fs.existsSync(dest))assert.equal(sha(dest),bundle.sha256);else fs.writeFileSync(dest,fs.readFileSync(root+'/'+file),{flag:'wx',mode:0o644});fs.chmodSync(dest,0o644);
 const url='https://tools.utilibre.org/utilibre-source/'+file,response=await fetch(url,{signal:AbortSignal.timeout(30000)});assert.equal(response.status,200);assert.equal(createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'),bundle.sha256);
 fs.writeFileSync(root+'/source-offer.json',JSON.stringify({...bundle,published:true,date:new Date().toISOString(),url},null,2)+'\n');console.log('Verified SSH source offer published.');
}
