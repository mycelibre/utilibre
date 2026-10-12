// Immutable corresponding source and build inputs; never include private logs/keys.
import fs from 'node:fs';import cp from 'node:child_process';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012',here=new URL('.',import.meta.url).pathname;
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const release=JSON.parse(fs.readFileSync(dir+'/curl-release.json'));assert.equal(release.status,'passed');
const roles=[];for(const group of release.groups){assert.equal(group.status,'passed');for(const row of group.rows){assert.equal(cp.execFileSync('docker',['inspect',row.name,'--format','{{.Image}}'],{encoding:'utf8'}).trim(),row.newImage);roles.push({name:row.name,image:row.newRef,imageId:row.newImage});}}
const temp=fs.mkdtempSync(dir+'/curl-source-'),manifest=[];
const copy=(from,to)=>{assert(!to.split('/').includes('..'));const dest=temp+'/'+to;fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(from,dest);manifest.push({path:to,sha256:sha(dest)});};
try{
 for(const f of ['curl_8.22.0.orig.tar.xz','curl_8.22.0-1~deb13u1+utilibre1.debian.tar.xz','curl_8.22.0-1~deb13u1+utilibre1.dsc','build-packages.lock','source-authentication.json','SHA256SUMS'])copy(dir+'/curl-trixie/'+f,'curl/'+f);
 for(const f of ['curl-8.22.0.tar.xz','curl-8.22.0.tar.xz.asc','curl_8.21.0-2.dsc','curl_8.21.0.orig.tar.gz','curl_8.21.0-2.debian.tar.xz','curl_8.22.0-1.dsc','curl_8.22.0.orig.tar.gz','curl_8.22.0-1.debian.tar.xz'])copy(dir+'/sources/'+f,'inputs/'+f);
 copy(dir+'/sources/curl-8.14.1/debian/upstream/signing-key.asc','inputs/curl-signing-key.asc');
 for(const f of fs.readdirSync(here).filter(f=>/curl|^cache-release\.mjs$|^README\.md$/.test(f)))copy(here+f,'recipes/closure-followup/'+f);
 fs.writeFileSync(temp+'/SOURCES.json',JSON.stringify({date:new Date().toISOString(),roles,files:manifest,reproduction:'Signed curl 8.22.0 upstream and matching Debian packaging. The complete modified native source package can be unpacked using dpkg-source. The isolated builder bootstraps identical requirements from the included 8.21 packaging, then enforces 8.22 build dependencies. Copy input archives to the recipes source directory and put the included public signing key at curl-8.14.1/debian/upstream/signing-key.asc. Run build-curl.mjs; native suites must pass. Build-time dependencies and runtime companion pins are recorded. Shared release helpers are in utilibre-integration.tar.gz. Original curl and Debian notices are retained. No logs, production secrets, fixture private keys or user data.',runtimeCompanions:[{source:'https://github.com/ngtcp2/ngtcp2',version:'1.22.1-1~bpo13+1',license:'MIT'},{source:'https://github.com/ngtcp2/nghttp3',version:'1.15.0-1~bpo13+1',license:'MIT'}]},null,2)+'\n');
 const filename='security-curl-followup-20261012-source.tar.gz',archive=dir+'/'+filename;assert(!fs.existsSync(archive));cp.execFileSync('tar',['-czf',archive,'-C',temp,'.']);
 const receipt={date:new Date().toISOString(),filename,sha256:sha(archive),bytes:fs.statSync(archive).size,published:false};
 if(process.argv.includes('--publish')){for(const out of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){const dest=out+'/'+filename;assert(!fs.existsSync(dest));fs.copyFileSync(archive,dest+'.tmp');fs.chmodSync(dest+'.tmp',0o644);fs.renameSync(dest+'.tmp',dest);}receipt.published=true;}
 fs.writeFileSync(dir+'/curl-source-offer.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
}finally{assert(path.dirname(temp)===dir&&path.basename(temp).startsWith('curl-source-'));fs.rmSync(temp,{recursive:true});}
