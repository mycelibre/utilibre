// Additive source offer for the exact completed cache/Apache/Bookworm batch.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
process.umask(0o077);
const zlib=process.argv.includes('--zlib-bookworm-20261109');
const november=zlib||process.argv.includes('--rsync-20261109');
const root='/var/lib/utilibre-maintenance/'+(november?'security-20261109':'closure-followup-20261012'),here=fileURLToPath(new URL('.',import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex'),read=f=>JSON.parse(fs.readFileSync(root+'/'+f));
assert(process.argv.slice(2).every(a=>['--publish','--rsync','--util-linux','--rsync-20261109','--zlib-bookworm-20261109'].includes(a)));
assert(!november||!process.argv.includes('--rsync'));
const rsync=process.argv.includes('--rsync')||process.argv.includes('--rsync-20261109');
assert(!zlib||(!rsync&&!process.argv.includes('--util-linux')));
const utilLinux=process.argv.includes('--util-linux');assert(!(rsync&&utilLinux));
const receipts=(zlib?['zlib-bookworm/release.json']:utilLinux?['util-linux-release.json']:november?['rsync/release.json']:rsync?['rsync-release.json']:['cache-release.json','apache-release.json','bookworm-release.json']).map(read);
const roles=[];
for(const r of receipts){assert.equal(r.status,'passed');for(const g of r.groups){assert.equal(g.status,'passed');for(const row of g.rows||[g]){
 assert.equal(cp.execFileSync('docker',['inspect',row.name,'--format','{{.Image}}'],{encoding:'utf8'}).trim(),row.newImage);
 roles.push({name:row.name,image:row.newRef,imageId:row.newImage});
}}}
const filename=zlib?'security-zlib-bookworm-20261109-source.tar.gz':utilLinux?'security-util-linux-followup-20261012-source.tar.gz':november?'security-rsync-20261109-source.tar.gz':rsync?'security-rsync-followup-20261012-source.tar.gz':'security-cache-xml-followup-20261012-source.tar.gz',temp=fs.mkdtempSync(root+'/library-source-'),manifest=[];
function copy(source,relative){assert(!relative.split('/').includes('..'));const dest=path.join(temp,relative);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest);manifest.push({path:relative,sha256:sha(fs.readFileSync(dest))});}
try{
 if(zlib){
  const spec=JSON.parse(fs.readFileSync(here+'../security-20261109/zlib-bookworm-source.json'));
  for(const [file,hash]of Object.entries(spec.files)){assert.equal(sha(fs.readFileSync(root+'/zlib-bookworm/input/'+file)),hash);copy(root+'/zlib-bookworm/input/'+file,'zlib/'+file);}
  for(const file of ['zlib_1.2.13.dfsg-1+utilibre1.debian.tar.xz','zlib_1.2.13.dfsg-1+utilibre1.dsc','build-packages.lock'])copy(root+'/zlib-bookworm/output/'+file,'zlib/'+file);
  for(const file of ['zlib-bookworm-source.json','zlib-bookworm.patch'])copy(here+'../security-20261109/'+file,'zlib/'+file);
  fs.writeFileSync(temp+'/BUILD.txt','Complete original zlib source, notices and native Debian source packaging are included. Unpack zlib/zlib_1.2.13.dfsg-1+utilibre1.dsc with dpkg-source -x, then build on Debian Bookworm with the source package Build-Depends and DEB_BUILD_PROFILES=nobiarch dpkg-buildpackage -b -uc -us. The Debian packaging retains its ordinary static, shared and 64-bit test suites. The upstream correction only resets compressor input state after a failed write. No byte-for-byte build reproducibility claim. Native build and deployment evidence is retained by the operator; no user content is included.\n');
 }else if(utilLinux){
  assert.equal(read('util-linux-host.json').status,'passed');
  for(const file of ['util-linux_2.41.5.orig.tar.xz','util-linux_2.41.5-0+deb13u1+utilibre2.debian.tar.xz','util-linux_2.41.5-0+deb13u1+utilibre2.dsc','build-packages.lock','SHA256SUMS'])copy(root+'/util-linux-trixie/'+file,'util-linux/'+file);
 }else if(november){
  const spec=JSON.parse(fs.readFileSync(here+'../security-20261109/rsync-source.json'));
  for(const [file,hash]of Object.entries(spec.files)){assert.equal(sha(fs.readFileSync(root+'/rsync/input/'+file)),hash);copy(root+'/rsync/input/'+file,'rsync/'+file);}
  for(const file of ['rsync_3.5.2+ds1-2~deb12u1+utilibre1.debian.tar.xz','rsync_3.5.2+ds1-2~deb12u1+utilibre1.dsc','build-packages.lock'])copy(root+'/rsync/output/'+file,'rsync/'+file);
  for(const file of ['rsync-source.json','rsync-followup-inputs.json','Dockerfile.rsync-builder','build-rsync.sh','rsync-policy.mjs','rsync-policy.test.mjs'])copy(here+'../security-20261109/'+file,'recipes/security-20261109/'+file);
 }else if(rsync){
  for(const file of ['rsync_3.5.1+ds1.orig.tar.xz','rsync_3.5.1+ds1-1~deb12u1+utilibre1.debian.tar.xz','rsync_3.5.1+ds1-1~deb12u1+utilibre1.dsc'])copy(root+'/rsync-bookworm/'+file,'rsync/'+file);
 }else{
 for(const file of ['libxml2_2.9.14+dfsg.orig.tar.xz','libxml2_2.9.14+dfsg-1.3~deb12u6+utilibre2.debian.tar.xz','libxml2_2.9.14+dfsg-1.3~deb12u6+utilibre2.dsc'])copy(root+'/bookworm-xml/'+file,'libxml2/'+file);
 const response=await fetch('https://registry.npmjs.org/http-cache-semantics/-/http-cache-semantics-4.3.0.tgz',{signal:AbortSignal.timeout(20000)});assert(response.ok);
 const bytes=Buffer.from(await response.arrayBuffer());assert.equal(sha(bytes),'d75e1e6a11587954da5e2f0e2b5c4b397a16d28cc2f7bdf64e9027fc2fe593ee');
 fs.writeFileSync(temp+'/http-cache-semantics-4.3.0.tgz',bytes);manifest.push({path:'http-cache-semantics-4.3.0.tgz',sha256:sha(bytes)});
 }
 if(!zlib)for(const sub of ['closure-followup','xml-final'])for(const file of fs.readdirSync(here+'../'+sub)){
  if(!fs.statSync(here+'../'+sub+'/'+file).isFile())continue;
  copy(here+'../'+sub+'/'+file,'recipes/'+sub+'/'+file);
 }
 fs.writeFileSync(temp+'/SOURCES.json',JSON.stringify({date:new Date().toISOString(),roles,files:manifest,instructions:zlib?'Complete zlib 1.2.13 source with original license and native Debian packaging containing the exact upstream error-state correction. See BUILD.txt; no user data or logs.':utilLinux?'Complete util-linux 2.41.5 source and original GPL/LGPL and component notices, native Debian source packaging with all patches, build dependency versions, fixtures and release recipes. Five unchanged upstream stable commits plus a compile-only header include and the DHI libblkid offset patch. Build scripts identify the original authenticated source inputs; the included modified dsc/debian archive can also be unpacked directly using dpkg-source. Shared helpers are in utilibre-integration.tar.gz. No secrets, logs or user data.':rsync?'Complete rsync 3.5.1 source, original GPL notices and modified native Bookworm Debian packaging. Upstream code is unchanged. Recipes use shared helpers in utilibre-integration.tar.gz. Other source offers/notices remain available. No secrets, logs or user content.':'Complete Bookworm libxml2 source plus its exact Debian patch/build packaging and original notices. Cache dependency archive includes its BSD license. Recipes use the shared helpers in utilibre-integration.tar.gz. Other application/dependency source offers and notices are retained. No secrets, logs or user content included.',limitations:'Native/production tests and remaining findings are documented in the recipes README. This is not a security clearance.'},null,2)+'\n');
 if(november&&!zlib){const p=temp+'/SOURCES.json',record=JSON.parse(fs.readFileSync(p));record.instructions='Complete authenticated rsync 3.5.2 source and GPL notices, native Bookworm Debian packaging, pinned source/compiler manifests and verification recipes. Upstream code is unchanged. The preserved compiler digest is the replay input; initial SDK acquisition is a separate networked step. Native builds and tests run without networking or user data. The upstream collision tests fail for their intended reason on 3.5.1 and pass on 3.5.2; 286 tests pass and 90 native/environment cases skip. Original package labels are retained and Debian scanner attribution can remain despite the native repair. Use the complete Utilibre integration source for shared helper imports. No build-byte reproducibility or complete security clearance is claimed.';fs.writeFileSync(p,JSON.stringify(record,null,2)+'\n');}
 const archive=root+'/'+filename;assert(!fs.existsSync(archive),'Immutable source offer already exists');cp.execFileSync('tar',['-czf',archive,'-C',temp,'.']);
 const receipt={date:new Date().toISOString(),filename,sha256:sha(fs.readFileSync(archive)),bytes:fs.statSync(archive).size,published:false};
 if(process.argv.includes('--publish')){
  for(const dir of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){const dest=dir+'/'+filename;assert(!fs.existsSync(dest));fs.copyFileSync(archive,dest+'.tmp');fs.chmodSync(dest+'.tmp',0o644);fs.renameSync(dest+'.tmp',dest);}
  receipt.published=true;
 }
 fs.writeFileSync(root+(zlib?'/zlib-bookworm/source-offer.json':utilLinux?'/util-linux-source-offer.json':rsync?'/rsync-source-offer.json':'/library-source-offer.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
}finally{assert(path.dirname(temp)===root&&path.basename(temp).startsWith('library-source-'));fs.rmSync(temp,{recursive:true});}
