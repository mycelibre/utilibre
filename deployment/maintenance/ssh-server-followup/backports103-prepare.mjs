// Restore the reviewed fixes on the operator's now-installed Debian 10.3 branch.
// Does not downgrade to 10.0 or install packages. Exact authenticated inputs only.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import path from 'node:path';import {createHash} from 'node:crypto';
process.umask(0o077);
const [input,out]=process.argv.slice(2);assert(process.argv.length===4&&path.isAbsolute(input)&&path.isAbsolute(out)&&!fs.existsSync(out));
const sha=b=>createHash('sha256').update(b).digest('hex');
const archives={
 'openssh_10.3p1-1~bpo13+1.dsc':'70895e6c01a101f50e6c3e88a993ae50192f482c6bf0c439c1b4d3a961e27484',
 'openssh_10.3p1-1~bpo13+1.debian.tar.xz':'709e7c358fd110c7ef0d77589a99aa020eda02e78798f8ca444a96cfc6b7342e',
 'openssh_10.3p1.orig.tar.gz':'56682a36bb92dcf4b4f016fd8ec8e74059b79a8de25c15d670d731e7d18e45f4',
 'openssh_10.3p1.orig.tar.gz.asc':'d9cb0783c637211b03dfcd9d1e41cf721e0080855b273c56b795fa37988b70c4',
};
for(const [f,h] of Object.entries(archives))assert.equal(sha(fs.readFileSync(input+'/'+f)),h);
fs.mkdirSync(out,{mode:0o700});for(const f of Object.keys(archives))fs.copyFileSync(input+'/'+f,out+'/'+f);
const tree=out+'/openssh-10.3p1';cp.execFileSync('dpkg-source',['-x',out+'/'+Object.keys(archives)[0],tree],{stdio:'pipe',timeout:30000});
const specs=[
 ['../closure-review/openssh-client-lifetime.patch','564772341b5b2bdf71715f002d4efb5cacbf5e845b3f5116139e24f05bd525fb'],
 ['./openssh-server-backport.patch','f60edd29acef1ea6c41a950c2c3bc04c649f62010eff75f0a3c16d5cbe74955d'],
 ['./username-106583.patch','c2362c50531edbb4a8edc03cabb33552c83c7987ebd01979ecad602132aa0797'],
];
const files=['ssh.c','sshconnect.c','sshconnect.h','sshconnect2.c','auth2-gss.c','serverloop.c','readconf.c'];
const before=Object.fromEntries(files.map(f=>[f,sha(fs.readFileSync(tree+'/'+f))]));
const patches=[];
for(const [file,hash] of specs){
 const original=fs.readFileSync(new URL(file,import.meta.url),'utf8');assert.equal(sha(original),hash);
 // 10.3 uses upstream's uint32_t; this changes hunk context only, not added code.
 const patch=file==='./openssh-server-backport.patch'?original.replace('input_gssapi_errtok(int type, u_int32_t plen, struct ssh *ssh)','input_gssapi_errtok(int type, uint32_t plen, struct ssh *ssh)'):original;
 cp.execFileSync('git',['apply','--check','-'],{cwd:tree,input:patch,stdio:'pipe'});
 cp.execFileSync('git',['apply','-'],{cwd:tree,input:patch,stdio:'pipe'});
 patches.push({file,inputSha256:hash,appliedSha256:sha(patch)});
}
const after=Object.fromEntries(files.map(f=>[f,sha(fs.readFileSync(tree+'/'+f))]));for(const f of files)assert.notEqual(before[f],after[f]);
const changelog=tree+'/debian/changelog';fs.writeFileSync(changelog,'openssh (1:10.3p1-1~bpo13+1+utilibre1) trixie-backports; urgency=high\n\n  * Restore reviewed client rekey lifetime, tunnel restriction, GSSAPI\n    failure accounting and CLI username security fixes on Debian 10.3.\n  * Preserve Debian packaging and GSSAPI integration; no major upgrade.\n\n -- Utilibre Maintenance <maintenance@utilibre.local>  Wed, 21 Oct 2026 06:00:00 +0000\n\n'+fs.readFileSync(changelog,'utf8'));
fs.writeFileSync(out+'/preparation.json',JSON.stringify({date:new Date().toISOString(),status:'prepared-not-built',base:'1:10.3p1-1~bpo13+1',candidate:'1:10.3p1-1~bpo13+1+utilibre1',archives,patches,before,after,productionChanged:false,remainingLimit:'No claim to fix CVE-2026-106553/106555 in Debian GSSAPI extensions.'},null,2)+'\n');
console.log('Debian 10.3 candidate prepared with all four previously reviewed repairs; not installed');
