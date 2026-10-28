// Retain exact upstream dependency sources/licences for the prebuilt library.
// This downloads source archives only, never executes upstream build scripts.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const oct28=process.argv.includes('--oct28');assert(process.argv.slice(2).every(a=>a==='--oct28'));
const root=oct28?'/var/lib/utilibre-maintenance/security-20261028/curl-bookworm/impersonate':'/var/lib/utilibre-maintenance/bookworm-curl-followup-20261012/impersonate';
const version=oct28?'v2.3.1':'v2.2.3',commit=oct28?'98de20ee6b6ca6f755d59bc502f819079a3c94ac':'6e8f87760a4dd96771e96fc9d55440dcd8845243';
const repo=root+'/curl-impersonate-'+commit;
const cmake=fs.readFileSync(repo+'/CMakeLists.txt','utf8'),variables=new Map([...cmake.matchAll(/^set\((\w+) "([^"\n]+)"\)/gm)].map(m=>[m[1],m[2]]));
const names=['ZLIB','ZSTD','BROTLI','BORINGSSL','NGHTTP2','NGTCP2','NGHTTP3','CARES','CURL'];
const records=names.map(name=>{let url=variables.get(name+'_URL');assert(url);url=url.replace(/\$\{(\w+)\}/g,(_,key)=>{assert(variables.has(key));return variables.get(key);});return{name,url,expectedSha256:variables.get(name+'_URL_HASH').replace('SHA256=','')};});
if(oct28){const script=fs.readFileSync(repo+'/scripts/build-libidn2.sh','utf8');assert(script.includes('libidn2_version="2.3.7"')&&script.includes('libidn2_sha256="4c21a791b610b9519b9d0e12b8097bf2f359b12f8dd92647611a929e6bfd7d64"'));}
records.push({name:'LIBIDN2',url:'https://ftp.gnu.org/gnu/libidn/libidn2-2.3.7.tar.gz',expectedSha256:oct28?'4c21a791b610b9519b9d0e12b8097bf2f359b12f8dd92647611a929e6bfd7d64':null});
const dest=root+'/corresponding-sources';fs.mkdirSync(dest,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const r of records){
 const file=r.name.toLowerCase()+'-'+path.basename(new URL(r.url).pathname),target=dest+'/'+file;
 const b=fs.existsSync(target)?fs.readFileSync(target):Buffer.from(await(await fetch(r.url,{signal:AbortSignal.timeout(120000)})).arrayBuffer());
 assert(b.length>5000&&b.length<100*1024**2);const actual=sha(b);if(r.expectedSha256)assert.equal(actual,r.expectedSha256,r.name+' source hash');
 if(!fs.existsSync(target))fs.writeFileSync(target,b);
 r.file=file;r.sha256=actual;r.bytes=b.length;r.verification=r.expectedSha256?'Matches exact upstream '+version+' CMake source hash':'Upstream pinned 2.3.7 version; official GNU HTTPS source; checksum recorded, no signature claim';
 console.log(r.name+': source retained, '+b.length+' bytes');
}
fs.writeFileSync(dest+'/manifest.json',JSON.stringify({date:new Date().toISOString(),upstreamRelease:version,commit,records},null,2)+'\n');
