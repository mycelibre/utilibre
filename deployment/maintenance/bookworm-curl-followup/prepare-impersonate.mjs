// Prepare a digest-pinned upstream runtime payload. No production mutation.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const oct28=process.argv.includes('--oct28');assert(process.argv.slice(2).every(a=>a==='--oct28'));
const root=oct28?'/var/lib/utilibre-maintenance/security-20261028/curl-bookworm':'/var/lib/utilibre-maintenance/bookworm-curl-followup-20261012',src=root+'/impersonate',out=root+'/images/rssbridge/impersonate-runtime';
const digest=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const version=oct28?'v2.3.1':'v2.2.3',commit=oct28?'98de20ee6b6ca6f755d59bc502f819079a3c94ac':'6e8f87760a4dd96771e96fc9d55440dcd8845243';
const original=oct28?'ea528358e878278e7e41243170d86bcb4cd30d61fdf9b9a1c2ae5e8a0b31de03':'bec91922e5f79213bf0e4a6dbb2b4410e6cc92cbee4a72759d6b387f14cad3e3',altered=oct28?'1d80e39a4691a7261a30c578b4b4497a604184826e9c9c1f96dab65196200bb0':'3e30f8c2978706f169c90faf061d5ee7ef6ea6bdd4e296d8de6df4aa478cff19';
const archive='libcurl-impersonate-'+version+'.x86_64-linux-gnu.tar.gz',expected=oct28?'2cee4e85a7e0ac713642fdbb1be87b0d40e60aca46db8a77335cba7e1b3828cd':'d5eb746c109be4d945cc5fcbe8a5c4940471041be4901439d50111cc3c83359d';
const release=JSON.parse(fs.readFileSync(src+'/release.json'));assert.equal(release.tag_name,version);assert.equal(release.immutable,true);
assert.equal(release.assets.find(a=>a.name===archive).digest,'sha256:'+expected);assert.equal(digest(src+'/'+archive),expected);
assert.equal(digest(src+'/source.tar.gz'),oct28?'3a159228fcde3925e6266373460b294d00b6ee9c7709b02d024a81ec1f41ebaf':'861dcba65752c3408b1ce23e4ac9861b330f544d67e77e3c9bc47f897839b129');
const patchRoot=oct28?'/var/lib/utilibre-maintenance/bookworm-curl-followup-20261012/impersonate':src;
assert.equal(digest(patchRoot+'/patchelf.deb'),'0364b90e81faabbb9569076063952c7bcbf07f83d954a2f2602a163d65be60e6');
fs.mkdirSync(out,{recursive:true});
cp.execFileSync('tar',['xzf',src+'/'+archive,'-C',out,'libcurl-impersonate.so.4.8.0']);
assert.equal(digest(out+'/libcurl-impersonate.so.4.8.0'),original);
cp.execFileSync(patchRoot+'/patchelf/usr/bin/patchelf',['--set-soname','libcurl.so.4',out+'/libcurl-impersonate.so.4.8.0']);
assert.equal(digest(out+'/libcurl-impersonate.so.4.8.0'),altered);
for(const name of ['libcurl-impersonate.so','libcurl-impersonate.so.4'])if(!fs.existsSync(out+'/'+name))fs.symlinkSync('libcurl-impersonate.so.4.8.0',out+'/'+name);
const notices=oct28?src+'/extracted':src;
for(const name of fs.readdirSync(notices).filter(n=>n==='LICENSE'||n.startsWith('LICENSE_'))){fs.copyFileSync(notices+'/'+name,out+'/'+name);fs.chmodSync(out+'/'+name,0o644);}
const cmake=fs.readFileSync(src+'/curl-impersonate-'+commit+'/CMakeLists.txt','utf8');
assert(cmake.includes(oct28?'set(CURL_VERSION "curl-8_23_0")':'set(CURL_VERSION "curl-8_22_0")'));if(oct28)assert(cmake.includes('set(BROTLI_VERSION "1.2.1")'));
fs.writeFileSync(src+'/payload.json',JSON.stringify({date:new Date().toISOString(),release:version,commit,archiveSha256:expected,upstreamLibrarySha256:original,patchedSonameSha256:digest(out+'/libcurl-impersonate.so.4.8.0'),sourceArchiveSha256:digest(src+'/source.tar.gz'),soname:'libcurl.so.4',method:'Identical SONAME adjustment used by official RSS-Bridge Dockerfile; no code changes.',source:'https://github.com/lexiforest/curl-impersonate/releases/tag/'+version},null,2)+'\n');
console.log('Digest-pinned impersonation runtime payload prepared.');
