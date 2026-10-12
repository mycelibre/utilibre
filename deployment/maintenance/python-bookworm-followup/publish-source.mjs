// Additive immutable corresponding-source offer. Never publish private state.
import fs from 'node:fs';
import cp from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
assert.deepEqual(process.argv.slice(2),['--publish']);
const root='/var/lib/utilibre-maintenance/python-bookworm-followup-20261012',here=new URL('.',import.meta.url).pathname;
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const release=read(root+'/release.json');
assert.equal(release.status,'passed');
assert.deepEqual(release.groups.filter(g=>g.status==='passed').flatMap(g=>g.rows.map(r=>r.key)).sort(),['gathio','kuma']);
cp.execFileSync(process.execPath,[here+'verify-source.mjs'],{stdio:'pipe'});
const sums=new Map(fs.readFileSync(root+'/build/SHA256SUMS','utf8').trim().split('\n').map(l=>[path.basename(l.slice(66)),l.slice(0,64)]));
const sdk=read(here+'sdk-sources.json');
assert.equal(sdk.length,9);
for(const p of sdk)assert.equal(sha(root+'/sdk-sources/'+p.file),p.sha256);
const temp=fs.mkdtempSync(root+'/source-offer-'),files=[];
const copy=(from,to)=>{
 assert(!to.split('/').includes('..')&&!path.isAbsolute(to));
 assert(fs.lstatSync(from).isFile(),'Only explicit regular files may be published');
 const dest=temp+'/'+to;fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(from,dest);files.push({path:to,sha256:sha(dest)});
};
try{
 for(const f of ['python3.11_3.11.2.orig.tar.gz','python3.11_3.11.2-6+deb12u9+utilibre1.dsc','python3.11_3.11.2-6+deb12u9+utilibre1.debian.tar.xz','expat_2.9.0.orig.tar.gz','expat_2.9.0-1~deb12u1+utilibre1.dsc','expat_2.9.0-1~deb12u1+utilibre1.debian.tar.xz']){
  assert.equal(sha(root+'/build/'+f),sums.get(f));copy(root+'/build/'+f,'native/'+f);
 }
 copy(root+'/build/build-packages.lock','native/build-packages.lock');
 for(const f of ['python3.11_3.11.2-6+deb12u9.dsc','python3.11_3.11.2-6+deb12u9.debian.tar.xz','expat_2.9.0-1.dsc','expat_2.9.0-1.debian.tar.xz','CVE-2026-7210.patch'])copy(root+'/sources/'+f,'inputs/'+f);
 for(const p of sdk)copy(root+'/sdk-sources/'+p.file,'sdk/'+p.file);
 for(const f of ['README.md','repair.json','specs.json','review.sources','verify-source.mjs','entropy.patch','build.sh','inner.sh','entropy-probe.c','native.py','tar-component-proof.mjs','stage.mjs','app-checks.mjs','sdk-packages.json','sdk-sources.json','acquire-sdk.mjs','sdk-native.py','release.mjs','review.mjs','publish-source.mjs'])copy(here+f,'recipes/maintenance/python-bookworm-followup/'+f);
 for(const f of ['bookworm-curl-followup/policy.mjs','xml-final/Dockerfile','sqlite-final/kuma-native.cjs','sqlite-final/kuma-jwt.py','language-final/release.mjs','go-final/release.mjs'])copy(here+'../'+f,'recipes/maintenance/'+f);
 fs.writeFileSync(temp+'/SHA256SUMS',files.map(f=>f.sha256+'  '+f.path).join('\n')+'\n');
 fs.writeFileSync(temp+'/SOURCES.json',JSON.stringify({date:new Date().toISOString(),versions:{python:'3.11.2-6+deb12u9+utilibre1',expat:'2.9.0-1~deb12u1+utilibre1',boto3:'1.40.72-1',botocore:'1.40.72+repack-1',s3transfer:'0.14.0-1'},files,reproduction:'Complete modified native Debian source packages, original source and licence notices, signed-index SDK corresponding sources, build lock, focused tests and release recipes. Extract native/*.dsc with dpkg-source -x and rebuild with the native Bookworm dependency lock; install the included Expat development build before Python. Read the included README for original-input reproduction, resource bounds, fresh loopback TLS fixture generation, observed tests and explicit limits. Original tarballs are in native/, matching source inputs in inputs/. Shared current maintenance/review helpers and later updates are also in the existing integration source offer. No native package binaries, operational logs, private configuration, fixture private keys or user data are included.'},null,2)+'\n');
 const filename='security-python-bookworm-followup-20261012-source.tar.gz',archive=root+'/'+filename;
 assert(!fs.existsSync(archive),'Immutable archive already exists');
 for(const base of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public'])assert(!fs.existsSync(base+'/'+filename),'Published archive already exists');
 cp.execFileSync('tar',['-czf',archive,'-C',temp,'.'],{timeout:120000});
 const proof={date:new Date().toISOString(),filename,bytes:fs.statSync(archive).size,sha256:sha(archive),published:true};
 for(const base of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){const dest=base+'/'+filename;fs.copyFileSync(archive,dest+'.tmp');fs.chmodSync(dest+'.tmp',0o644);fs.renameSync(dest+'.tmp',dest);}
 fs.writeFileSync(root+'/source-offer.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
}finally{
 assert(path.dirname(temp)===root&&path.basename(temp).startsWith('source-offer-'));fs.rmSync(temp,{recursive:true});
}
