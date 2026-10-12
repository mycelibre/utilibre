// Prepare a digest-pinned upstream runtime payload. No production mutation.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/bookworm-curl-followup-20261012',src=root+'/impersonate',out=root+'/images/rssbridge/impersonate-runtime';
const digest=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const archive='libcurl-impersonate-v2.2.3.x86_64-linux-gnu.tar.gz',expected='d5eb746c109be4d945cc5fcbe8a5c4940471041be4901439d50111cc3c83359d';
const release=JSON.parse(fs.readFileSync(src+'/release.json'));assert.equal(release.tag_name,'v2.2.3');assert.equal(release.immutable,true);
assert.equal(release.assets.find(a=>a.name===archive).digest,'sha256:'+expected);assert.equal(digest(src+'/'+archive),expected);
assert.equal(digest(src+'/source.tar.gz'),'861dcba65752c3408b1ce23e4ac9861b330f544d67e77e3c9bc47f897839b129');
assert.equal(digest(src+'/patchelf.deb'),'0364b90e81faabbb9569076063952c7bcbf07f83d954a2f2602a163d65be60e6');
fs.mkdirSync(out,{recursive:true});
cp.execFileSync('tar',['xzf',src+'/'+archive,'-C',out,'libcurl-impersonate.so.4.8.0']);
assert.equal(digest(out+'/libcurl-impersonate.so.4.8.0'),'bec91922e5f79213bf0e4a6dbb2b4410e6cc92cbee4a72759d6b387f14cad3e3');
cp.execFileSync(src+'/patchelf/usr/bin/patchelf',['--set-soname','libcurl.so.4',out+'/libcurl-impersonate.so.4.8.0']);
assert.equal(digest(out+'/libcurl-impersonate.so.4.8.0'),'3e30f8c2978706f169c90faf061d5ee7ef6ea6bdd4e296d8de6df4aa478cff19');
for(const name of ['libcurl-impersonate.so','libcurl-impersonate.so.4'])if(!fs.existsSync(out+'/'+name))fs.symlinkSync('libcurl-impersonate.so.4.8.0',out+'/'+name);
for(const name of fs.readdirSync(src).filter(n=>n==='LICENSE'||n.startsWith('LICENSE_'))){fs.copyFileSync(src+'/'+name,out+'/'+name);fs.chmodSync(out+'/'+name,0o644);}
const cmake=fs.readFileSync(src+'/curl-impersonate-6e8f87760a4dd96771e96fc9d55440dcd8845243/CMakeLists.txt','utf8');
assert(cmake.includes('set(CURL_VERSION "curl-8_22_0")'));
fs.writeFileSync(src+'/payload.json',JSON.stringify({date:new Date().toISOString(),release:'v2.2.3',commit:'6e8f87760a4dd96771e96fc9d55440dcd8845243',archiveSha256:expected,upstreamLibrarySha256:'bec91922e5f79213bf0e4a6dbb2b4410e6cc92cbee4a72759d6b387f14cad3e3',patchedSonameSha256:digest(out+'/libcurl-impersonate.so.4.8.0'),sourceArchiveSha256:digest(src+'/source.tar.gz'),soname:'libcurl.so.4',method:'Identical SONAME adjustment used by official RSS-Bridge Dockerfile; no code changes.',source:'https://github.com/lexiforest/curl-impersonate/releases/tag/v2.2.3'},null,2)+'\n');
console.log('Digest-pinned impersonation runtime payload prepared.');
