// Offline, exact-input preparation; no package installs or service calls.
import fs from 'node:fs';import path from 'node:path';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);const [out]=process.argv.slice(2);assert(process.argv.length===3&&path.isAbsolute(out));assert(!fs.existsSync(out));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const source='/var/lib/utilibre-maintenance/ssh-server-followup-20261012/source-offer';
const inputs={
 'openssh_10.0p1-7+deb13u4+utilibre2.dsc':'e281e9436a9cab4020e4fd89dfa29af3d16fade7a7fa7bf2aed0da281c0f21cf',
 'openssh_10.0p1-7+deb13u4+utilibre2.debian.tar.xz':'65567e8f40d46f2d7a51c2904c520de762a1cb4382e832e40657a27672eedac8',
 'openssh_10.0p1.orig.tar.gz':'021a2e709a0edf4250b1256bd5a9e500411a90dddabea830ed59cef90eb9d85c',
 'openssh_10.0p1.orig.tar.gz.asc':'f71cf3240516ce59c2240532143982fcd97e2e286e6eb1eb6c3080a1ec012a04',
};
for(const [f,h]of Object.entries(inputs))assert.equal(sha(source+'/'+f),h);
fs.mkdirSync(out,{mode:0o700});for(const f of Object.keys(inputs))fs.copyFileSync(source+'/'+f,out+'/'+f);
const tree=out+'/openssh-10.0p1';cp.execFileSync('dpkg-source',['-x',out+'/'+Object.keys(inputs)[0],tree],{stdio:'pipe',timeout:30000});
const before=sha(tree+'/readconf.c');assert.equal(before,'768131422ef263dfc9c4061c447a11a0536137d9fffa700dc4c7f5368c1c4d45');
const patch=new URL('./username-106583.patch',import.meta.url).pathname;
assert.equal(sha(patch),'c2362c50531edbb4a8edc03cabb33552c83c7987ebd01979ecad602132aa0797');
cp.execFileSync('git',['apply','--check',patch],{cwd:tree,stdio:'pipe'});cp.execFileSync('git',['apply',patch],{cwd:tree,stdio:'pipe'});
const after=sha(tree+'/readconf.c');assert.equal(after,'3c3e6c0c6121027bcf8ed01c6c4ebe14dfdd8bb21d46ed5d754706eaa99fdca2');
const previous=JSON.parse(fs.readFileSync('/var/lib/utilibre-maintenance/ssh-server-followup-20261012/proposal.json'));
for(const [f,h]of Object.entries(previous.preservedClientSource))assert.equal(sha(tree+'/'+f),h);
for(const f of ['auth2-gss.c','serverloop.c','gss-serv.c','auth2.c','ssh-gss.h','monitor.c'])assert.equal(sha(tree+'/'+f),sha('/var/lib/utilibre-maintenance/ssh-server-followup-20261012/openssh-10.0p1/'+f));
const changelog=tree+'/debian/changelog';fs.writeFileSync(changelog,'openssh (1:10.0p1-7+deb13u4+utilibre3) trixie; urgency=medium\n\n  * Backport upstream CLI username validation (CVE-2026-106583).\n  * Retain previous client lifetime and server repairs unchanged.\n\n -- Utilibre Maintenance <maintenance@utilibre.local>  Fri, 16 Oct 2026 08:00:00 +0000\n\n'+fs.readFileSync(changelog,'utf8'));
fs.copyFileSync(patch,out+'/username-106583.patch');
fs.writeFileSync(out+'/preparation.json',JSON.stringify({date:new Date().toISOString(),status:'prepared-not-built',base:'1:10.0p1-7+deb13u4+utilibre2',candidate:'1:10.0p1-7+deb13u4+utilibre3',inputs,upstream:'0c4c9a7b320bd7ff61c4a2dc345cb2e27e9663b2',patchSha256:sha(patch),file:'readconf.c',before,after,earlierRepairsPreserved:true,serverSourcesUnchanged:true,productionChanged:false},null,2)+'\n');
console.log(JSON.stringify({out,status:'prepared-not-built',before,after,productionChanged:false}));
