import fs from 'node:fs';import assert from 'node:assert/strict';
import {root,builder,version,vendorVersion,sha,read,docker} from './ubuntu-common.mjs';
process.umask(0o077);assert(!fs.existsSync(root+'/ubuntu-native.json'));
assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>=8*1024**3);
const exception=read(root+'/ubuntu-upstream-exception.json');assert(exception.baselineAndCandidateSameFailure&&exception.candidateFailures===2&&exception.targetedTests===17);
const packaging=fs.readFileSync(root+'/ubuntu-output/package.log','utf8');assert(packaging.includes('dpkg-genchanges: info: binary-only upload'));
const inner=(...a)=>docker('exec',builder,...a),output=root+'/ubuntu-output';
assert.equal(inner('dpkg-query','-W','-f=${Version}','libmount1'),vendorVersion);
const packages=[];
for(const pkg of ['mount','libmount1']){
 const name=pkg+'_'+version+'_amd64.deb';docker('cp',builder+':/build/'+name,output+'/'+name);
 const bytes=fs.readFileSync(output+'/'+name);packages.push({name,sha256:sha(bytes),bytes:bytes.length});
 inner('dpkg-deb','-x','/build/'+name,'/build/candidate');
}
const lib='/build/candidate/usr/lib/x86_64-linux-gnu/libmount.so.1.1.0',old='/usr/lib/x86_64-linux-gnu/libmount.so.1.1.0';
const exports=p=>inner('nm','-D','--defined-only',p).split('\n').map(l=>l.trim().split(/\s+/).slice(1).join(' ')).sort();
assert.deepEqual(exports(lib),exports(old));
const abi=p=>inner('readelf','-d',p).split('\n').filter(l=>/NEEDED|SONAME/.test(l)).map(l=>l.replace(/^.*?\(/,'('));
assert.deepEqual(abi(lib),abi(old));assert(!/GLIBC_2\.(?:[4-9][0-9])\b/.test(inner('readelf','--version-info',lib)));
inner('cc','-Wall','-Wextra','-Werror','-O2','-I/build/source/debian/libmount-dev/usr/include','/recipe/mount-regression.c','-l:libmount.so.1','-Wl,--export-dynamic','-o','/build/mount-regression');
const checks=[];
for(const variant of ['old','fixed'])for(const mode of ['normal','ancestor-swap','target-swap','ancestor-link','target-link','unrestricted']){
 const env=variant==='fixed'?['LD_LIBRARY_PATH=/build/candidate/usr/lib/x86_64-linux-gnu']:[];
 checks.push({variant,mode,output:inner('runuser','-u','nobody','--','env','LIBMOUNT_FORCE_MOUNT2=always',...env,'/build/mount-regression',variant,mode),passed:true});
}
docker('cp',builder+':/build/mount-regression',output+'/mount-regression');
for(const name of [`util-linux_${version}.dsc`,`util-linux_${version}.debian.tar.xz`])docker('cp',builder+':/build/'+name,output+'/'+name);
const result={schema:1,date:new Date().toISOString(),status:'passed',version,vendorVersion,packages,checks,libraryPath:'/usr/lib/x86_64-linux-gnu/libmount.so.1.1.0',librarySha256:inner('sha256sum',lib).split(/\s/)[0],exports:exports(lib),sonameAndNeeded:abi(lib),exactExportsPreserved:true,sonameAndNeededPreserved:true,nobleLibcCompatible:true,fullSuiteExceptionSha256:sha(fs.readFileSync(root+'/ubuntu-upstream-exception.json')),packageLogSha256:sha(packaging),sourceAuthenticationSha256:sha(fs.readFileSync(root+'/ubuntu-input/source-authentication.json')),limitations:'Unprivileged intercepted classic mount syscall only; no real kernel mounts, SUID or escalation. Vendor new-mount API retained and native targeted suite passes. Two lsfd environmental failures reproduce on official unmodified Ubuntu binary. No external helper security claim.',productionChanged:false};
fs.writeFileSync(root+'/ubuntu-native.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:true,exports:result.exports.length,checks:checks.length,version}));
