// Additive, immutable corresponding-source offer. Never include private state.
import fs from 'node:fs';import cp from 'node:child_process';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);assert.deepEqual(process.argv.slice(2),['--publish']);
const root='/var/lib/utilibre-maintenance/bookworm-curl-followup-20261012',prior='/var/lib/utilibre-maintenance/closure-followup-20261012',here=new URL('.',import.meta.url).pathname;
const read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
assert.equal(read(prior+'/bookworm-curl-release.json').status,'passed');assert.equal(read(prior+'/rssbridge-curl-release.json').status,'passed');
const vendorManifest=read(root+'/impersonate/corresponding-sources/manifest.json');assert.equal(vendorManifest.records.length,10);
const temp=fs.mkdtempSync(root+'/source-offer-'),files=[];
const copy=(from,to)=>{assert(!to.split('/').includes('..'));const dest=temp+'/'+to;fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(from,dest);files.push({path:to,sha256:sha(dest)});};
try{
 for(const f of ['curl_8.22.0.orig.tar.xz','curl_8.22.0-1~deb12u1+utilibre1.debian.tar.xz','curl_8.22.0-1~deb12u1+utilibre1.dsc','build-packages.lock'])copy(root+'/build/'+f,'curl/'+f);
 for(const f of ['curl-8.22.0.tar.xz.asc','curl_8.22.0-1.debian.tar.xz'])copy(prior+'/sources/'+f,'inputs/'+f);
 copy(prior+'/sources/curl-8.14.1/debian/upstream/signing-key.asc','inputs/curl-signing-key.asc');
 copy(root+'/impersonate/source.tar.gz','impersonate/curl-impersonate-6e8f87760a4dd96771e96fc9d55440dcd8845243.tar.gz');
 for(const r of vendorManifest.records){assert.equal(sha(root+'/impersonate/corresponding-sources/'+r.file),r.sha256);copy(root+'/impersonate/corresponding-sources/'+r.file,'impersonate/dependencies/'+r.file);}
 copy(root+'/impersonate/corresponding-sources/manifest.json','impersonate/dependencies/manifest.json');
 copy(root+'/impersonate/payload.json','impersonate/payload.json');
 for(const f of fs.readdirSync(root+'/impersonate').filter(f=>f==='LICENSE'||f.startsWith('LICENSE_')))copy(root+'/impersonate/'+f,'impersonate/licenses/'+f);
 for(const f of fs.readdirSync(here))if(fs.statSync(here+f).isFile())copy(here+f,'recipes/maintenance/bookworm-curl-followup/'+f);
 for(const f of ['closure-followup/curl-preserve-features.patch','closure-followup/curl-policy.mjs','closure-followup/curl-fixture-server.py','xml-final/Dockerfile','sqlite-final/kuma-native.cjs','check-rallly-libraries.mjs','language-final/release.mjs','go-final/release.mjs'])copy(here+'../'+f,'recipes/maintenance/'+f);
 fs.writeFileSync(temp+'/SHA256SUMS',files.map(f=>f.sha256+'  '+f.path).join('\n')+'\n');
 fs.writeFileSync(temp+'/SOURCES.json',JSON.stringify({date:new Date().toISOString(),nativeVersion:'8.22.0-1~deb12u1+utilibre1',vendorVersion:'v2.2.3',files,reproduction:'Native source: dpkg-source -x curl/*.dsc, then build against the included native Bookworm dependency lock; build.sh snapshots recipes and disconnects compilation/tests. Copy the original tarball to the inputs path expected by build.sh, alongside the detached signature and matching Debian packaging; preserve the included public signing key path. The impersonation release uses upstream source commit6e8f877 with ten dependency archives, upstream patches and complete build instructions, plus original licence notices. Its only deployed ELF modification is the upstream-supported SONAME adjustment. Vendor default NTLM/SMB removal is approved solely for the verified HTTP(S)-only RSS-Bridge configuration; see README. Shared framework and subsequent maintenance recipes are also in the Utilibre integration source offer. No private logs, runtime settings, fixture private keys or user data.'},null,2)+'\n');
 const filename='security-bookworm-curl-followup-20261012-source.tar.gz',archive=root+'/'+filename;assert(!fs.existsSync(archive));cp.execFileSync('tar',['-czf',archive,'-C',temp,'.'],{timeout:120000});
 const proof={date:new Date().toISOString(),filename,bytes:fs.statSync(archive).size,sha256:sha(archive),published:true};
 for(const base of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){const dest=base+'/'+filename;assert(!fs.existsSync(dest));fs.copyFileSync(archive,dest+'.tmp');fs.chmodSync(dest+'.tmp',0o644);fs.renameSync(dest+'.tmp',dest);}
 fs.writeFileSync(root+'/source-offer.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
}finally{assert(path.dirname(temp)===root&&path.basename(temp).startsWith('source-offer-'));fs.rmSync(temp,{recursive:true});}
