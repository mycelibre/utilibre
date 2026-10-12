// Additive source offer for the exact completed cache/Apache/Bookworm batch.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/closure-followup-20261012',here=fileURLToPath(new URL('.',import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex'),read=f=>JSON.parse(fs.readFileSync(root+'/'+f));
assert(process.argv.slice(2).every(a=>['--publish','--rsync','--util-linux'].includes(a)));
const rsync=process.argv.includes('--rsync');
const utilLinux=process.argv.includes('--util-linux');assert(!(rsync&&utilLinux));
const receipts=(utilLinux?['util-linux-release.json']:rsync?['rsync-release.json']:['cache-release.json','apache-release.json','bookworm-release.json']).map(read);
const roles=[];
for(const r of receipts){assert.equal(r.status,'passed');for(const g of r.groups){assert.equal(g.status,'passed');for(const row of g.rows||[g]){
 assert.equal(cp.execFileSync('docker',['inspect',row.name,'--format','{{.Image}}'],{encoding:'utf8'}).trim(),row.newImage);
 roles.push({name:row.name,image:row.newRef,imageId:row.newImage});
}}}
const filename=utilLinux?'security-util-linux-followup-20261012-source.tar.gz':rsync?'security-rsync-followup-20261012-source.tar.gz':'security-cache-xml-followup-20261012-source.tar.gz',temp=fs.mkdtempSync(root+'/library-source-'),manifest=[];
function copy(source,relative){assert(!relative.split('/').includes('..'));const dest=path.join(temp,relative);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest);manifest.push({path:relative,sha256:sha(fs.readFileSync(dest))});}
try{
 if(utilLinux){
  assert.equal(read('util-linux-host.json').status,'passed');
  for(const file of ['util-linux_2.41.5.orig.tar.xz','util-linux_2.41.5-0+deb13u1+utilibre2.debian.tar.xz','util-linux_2.41.5-0+deb13u1+utilibre2.dsc','build-packages.lock','SHA256SUMS'])copy(root+'/util-linux-trixie/'+file,'util-linux/'+file);
 }else if(rsync){
  for(const file of ['rsync_3.5.1+ds1.orig.tar.xz','rsync_3.5.1+ds1-1~deb12u1+utilibre1.debian.tar.xz','rsync_3.5.1+ds1-1~deb12u1+utilibre1.dsc'])copy(root+'/rsync-bookworm/'+file,'rsync/'+file);
 }else{
 for(const file of ['libxml2_2.9.14+dfsg.orig.tar.xz','libxml2_2.9.14+dfsg-1.3~deb12u6+utilibre2.debian.tar.xz','libxml2_2.9.14+dfsg-1.3~deb12u6+utilibre2.dsc'])copy(root+'/bookworm-xml/'+file,'libxml2/'+file);
 const response=await fetch('https://registry.npmjs.org/http-cache-semantics/-/http-cache-semantics-4.3.0.tgz',{signal:AbortSignal.timeout(20000)});assert(response.ok);
 const bytes=Buffer.from(await response.arrayBuffer());assert.equal(sha(bytes),'d75e1e6a11587954da5e2f0e2b5c4b397a16d28cc2f7bdf64e9027fc2fe593ee');
 fs.writeFileSync(temp+'/http-cache-semantics-4.3.0.tgz',bytes);manifest.push({path:'http-cache-semantics-4.3.0.tgz',sha256:sha(bytes)});
 }
 for(const sub of ['closure-followup','xml-final'])for(const file of fs.readdirSync(here+'../'+sub)){
  if(!fs.statSync(here+'../'+sub+'/'+file).isFile())continue;
  copy(here+'../'+sub+'/'+file,'recipes/'+sub+'/'+file);
 }
 fs.writeFileSync(temp+'/SOURCES.json',JSON.stringify({date:new Date().toISOString(),roles,files:manifest,instructions:utilLinux?'Complete util-linux 2.41.5 source and original GPL/LGPL and component notices, native Debian source packaging with all patches, build dependency versions, fixtures and release recipes. Five unchanged upstream stable commits plus a compile-only header include and the DHI libblkid offset patch. Build scripts identify the original authenticated source inputs; the included modified dsc/debian archive can also be unpacked directly using dpkg-source. Shared helpers are in utilibre-integration.tar.gz. No secrets, logs or user data.':rsync?'Complete rsync 3.5.1 source, original GPL notices and modified native Bookworm Debian packaging. Upstream code is unchanged. Recipes use shared helpers in utilibre-integration.tar.gz. Other source offers/notices remain available. No secrets, logs or user content.':'Complete Bookworm libxml2 source plus its exact Debian patch/build packaging and original notices. Cache dependency archive includes its BSD license. Recipes use the shared helpers in utilibre-integration.tar.gz. Other application/dependency source offers and notices are retained. No secrets, logs or user content included.',limitations:'Native/production tests and remaining findings are documented in the recipes README. This is not a security clearance.'},null,2)+'\n');
 const archive=root+'/'+filename;assert(!fs.existsSync(archive),'Immutable source offer already exists');cp.execFileSync('tar',['-czf',archive,'-C',temp,'.']);
 const receipt={date:new Date().toISOString(),filename,sha256:sha(fs.readFileSync(archive)),bytes:fs.statSync(archive).size,published:false};
 if(process.argv.includes('--publish')){
  for(const dir of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){const dest=dir+'/'+filename;assert(!fs.existsSync(dest));fs.copyFileSync(archive,dest+'.tmp');fs.chmodSync(dest+'.tmp',0o644);fs.renameSync(dest+'.tmp',dest);}
  receipt.published=true;
 }
 fs.writeFileSync(root+(utilLinux?'/util-linux-source-offer.json':rsync?'/rsync-source-offer.json':'/library-source-offer.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
}finally{assert(path.dirname(temp)===root&&path.basename(temp).startsWith('library-source-'));fs.rmSync(temp,{recursive:true});}
