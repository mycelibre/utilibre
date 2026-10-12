import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,work,builder,version,oldVersion,sha,run,docker} from './common.mjs';
process.umask(0o077);
assert(!fs.existsSync(root+'/native.json'));
assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>=8*1024**3);
const build=fs.readFileSync(work+'/output/build.log','utf8');
const packaging=fs.readFileSync(work+'/output/package.log','utf8');
assert(packaging.includes('dpkg-genchanges: info: binary-only upload'));
const exception=JSON.parse(fs.readFileSync(root+'/upstream-exception.json'));
assert(exception.baselineAndCandidateSameFailure && exception.candidateFailures===1);
assert.equal(exception.originalBuildLogSha256,sha(Buffer.from(build)));
const inner=(...a)=>docker('exec',builder,...a);
assert.equal(inner('dpkg-query','-W','-f=${Version}','libmount1'),oldVersion);
const names=['libmount1','mount'].map(name=>`${name}_${version}_amd64.deb`);
fs.mkdirSync(root+'/output',{recursive:true});
const packages=[];
for(const name of names){
 const bytes=fs.readFileSync(work+'/'+name);fs.writeFileSync(root+'/output/'+name,bytes);
 packages.push({name,sha256:sha(bytes),bytes:bytes.length});
}
inner('mkdir','-p','/work/mount-acl-final/candidate');
for(const name of names)inner('dpkg-deb','-x','/work/mount-acl-final/'+name,'/work/mount-acl-final/candidate');
const lib='/work/mount-acl-final/candidate/usr/lib/x86_64-linux-gnu/libmount.so.1.1.0';
const old='/lib/x86_64-linux-gnu/libmount.so.1.1.0';
const exports=p=>inner('nm','-D','--defined-only',p).split('\n').map(l=>l.trim().split(/\s+/).slice(1).join(' ')).sort();
assert.deepEqual(exports(lib),exports(old));
const abi=p=>inner('readelf','-d',p).split('\n').filter(l=>/NEEDED|SONAME/.test(l)).map(l=>l.replace(/^.*?\(/,'('));
assert.deepEqual(abi(lib),abi(old));
assert(!/GLIBC_2\.(?:3[7-9]|[4-9][0-9])\b/.test(inner('readelf','--version-info',lib)));
const here=new URL('.',import.meta.url).pathname;
docker('cp',here+'mount-regression.c',builder+':/work/mount-acl-final/recipes/');
inner('cc','-Wall','-Wextra','-Werror','-O2','/work/mount-acl-final/recipes/mount-regression.c','-lmount','-Wl,--export-dynamic','-o','/work/mount-acl-final/output/mount-regression');
const checks=[];
for(const variant of ['old','fixed'])for(const mode of ['normal','ancestor-swap','target-swap','ancestor-link','target-link','unrestricted']){
 const env=variant==='fixed'?['env','LD_LIBRARY_PATH=/work/mount-acl-final/candidate/usr/lib/x86_64-linux-gnu']:[];
 checks.push({variant,mode,output:inner('runuser','-u','nobody','--',...env,'/work/mount-acl-final/output/mount-regression',variant,mode),passed:true});
}
const summary=build.split('\n').filter(l=>/tests? passed|tests? failed|tests? skipped|All [0-9]+ tests|PASS:|SKIP:|tests of .*FAILED/.test(l));
assert(summary.length>0,'Upstream test result lines required');
const out={schema:1,date:new Date().toISOString(),status:'passed',version,oldVersion,packages,libraryPath:'/lib/x86_64-linux-gnu/libmount.so.1.1.0',librarySha256:inner('sha256sum',lib).split(/\s/)[0],exactExportsPreserved:true,exports:exports(lib).length,sonameAndNeededPreserved:true,abi:abi(lib),bookwormLibcCompatible:true,upstreamSummary:summary,upstreamBuildLogSha256:sha(Buffer.from(build)),checks,fixtureSha256:sha(fs.readFileSync(here+'mount-regression.c')),limitations:'Synthetic syscall interception; no real mounts, capabilities, SUID or privilege escalation. Restricted mounts require openat2 and procfs. External mount helpers retain their separate upstream behavior.',productionChanged:false};
fs.writeFileSync(root+'/native.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({status:'passed',version,exports:out.exports,checks:checks.length,packages}));
