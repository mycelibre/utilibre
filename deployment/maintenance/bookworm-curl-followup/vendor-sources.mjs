// Retain exact upstream dependency sources/licences for the prebuilt library.
// This downloads source archives only, never executes upstream build scripts.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/bookworm-curl-followup-20261012/impersonate';
const repo=root+'/curl-impersonate-6e8f87760a4dd96771e96fc9d55440dcd8845243';
const cmake=fs.readFileSync(repo+'/CMakeLists.txt','utf8'),variables=new Map([...cmake.matchAll(/^set\((\w+) "([^"\n]+)"\)/gm)].map(m=>[m[1],m[2]]));
const names=['ZLIB','ZSTD','BROTLI','BORINGSSL','NGHTTP2','NGTCP2','NGHTTP3','CARES','CURL'];
const records=names.map(name=>{let url=variables.get(name+'_URL');assert(url);url=url.replace(/\$\{(\w+)\}/g,(_,key)=>{assert(variables.has(key));return variables.get(key);});return{name,url,expectedSha256:variables.get(name+'_URL_HASH').replace('SHA256=','')};});
records.push({name:'LIBIDN2',url:'https://ftp.gnu.org/gnu/libidn/libidn2-2.3.7.tar.gz',expectedSha256:null});
const dest=root+'/corresponding-sources';fs.mkdirSync(dest,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const r of records){
 const file=r.name.toLowerCase()+'-'+path.basename(new URL(r.url).pathname),target=dest+'/'+file;
 const b=fs.existsSync(target)?fs.readFileSync(target):Buffer.from(await(await fetch(r.url,{signal:AbortSignal.timeout(120000)})).arrayBuffer());
 assert(b.length>5000&&b.length<100*1024**2);const actual=sha(b);if(r.expectedSha256)assert.equal(actual,r.expectedSha256,r.name+' source hash');
 if(!fs.existsSync(target))fs.writeFileSync(target,b);
 r.file=file;r.sha256=actual;r.bytes=b.length;r.verification=r.expectedSha256?'Matches exact upstream v2.2.3 CMake source hash':'Upstream pinned 2.3.7 version; official GNU HTTPS source; checksum recorded, no signature claim';
 console.log(r.name+': source retained, '+b.length+' bytes');
}
fs.writeFileSync(dest+'/manifest.json',JSON.stringify({date:new Date().toISOString(),upstreamRelease:'v2.2.3',commit:'6e8f87760a4dd96771e96fc9d55440dcd8845243',records},null,2)+'\n');
