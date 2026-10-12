// Allowlisted source-only bundle; never copy the fixture tree or receipts.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/ssh-server-followup-20261012';
const source=root+'/source-offer',temp=fs.mkdtempSync(root+'/public-source-');
const files=[];
function copy(from,to){
 const data=fs.readFileSync(from),path=temp+'/'+to;
 fs.mkdirSync(path.slice(0,path.lastIndexOf('/')),{recursive:true});
 fs.writeFileSync(path,data,{mode:0o644});
 files.push({file:to,sha256:createHash('sha256').update(data).digest('hex'),bytes:data.length});
}
for(const name of ['openssh_10.0p1-7+deb13u4+utilibre2.dsc','openssh_10.0p1-7+deb13u4+utilibre2.debian.tar.xz','openssh_10.0p1.orig.tar.gz','openssh_10.0p1.orig.tar.gz.asc','SHA256SUMS','build-packages.lock'])copy(source+'/'+name,'native/'+name);
for(const name of ['openssh_10.0p1-7+deb13u4.dsc','openssh_10.0p1-7+deb13u4.debian.tar.xz'])copy(root+'/'+name,'inputs/'+name);
for(const name of ['prepare.mjs','build.sh','native.py','check-host.mjs','release.mjs','review.mjs','source.sh','bundle-source.mjs','openssh-server-backport.patch','README.md'])copy(new URL('./'+name,import.meta.url),'recipes/'+name);
for(const name of ['openssh-client-lifetime.patch','debian-source.sources'])copy(new URL('../closure-review/'+name,import.meta.url),'recipes/'+name);
fs.writeFileSync(temp+'/SOURCES.json',JSON.stringify({date:new Date().toISOString(),version:'1:10.0p1-7+deb13u4+utilibre2',files,
 reproduction:'Extract native/openssh_10.0p1-7+deb13u4+utilibre2.dsc using dpkg-source -x, then build using Debian stable dependencies and dpkg-buildpackage -us -uc -b with DEB_BUILD_OPTIONS=parallel=2. The complete modified source retains upstream notices and Debian patches. Original authenticated packaging inputs and all repair/test/release recipes are included. Recipe staging paths are deployment-specific; README describes the bounded environment and test mounts.',
 scope:'Preserved client lifetime repair and two server backports only; no claim of addressing unrelated OpenSSH advisories. No operational log, private configuration, key, credential, package binary or user content is included.'},null,2)+'\n',{mode:0o644});
const output=root+'/utilibre-openssh-server-followup-20261012.tar.gz';
assert(!fs.existsSync(output),'Do not overwrite a published source offer');
cp.execFileSync('tar',['-czf',output,'-C',temp,'.'],{stdio:'pipe'});
console.log(JSON.stringify({archive:output,bytes:fs.statSync(output).size,sha256:createHash('sha256').update(fs.readFileSync(output)).digest('hex'),files:files.length+1,sourceOnly:true}));
