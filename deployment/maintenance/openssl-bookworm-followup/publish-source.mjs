// Additive corresponding-source offer, after exact native releases pass.
import fs from 'node:fs';import cp from 'node:child_process';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);assert.deepEqual(process.argv.slice(2),['--publish']);
const root='/var/lib/utilibre-maintenance/openssl-bookworm-followup-20261012',here=new URL('.',import.meta.url).pathname;
const release=JSON.parse(fs.readFileSync('/var/lib/utilibre-maintenance/closure-followup-20261012/openssl-bookworm-release.json'));
assert.equal(release.status,'passed');assert.equal(release.groups.length,5);assert(release.groups.every(g=>g.status==='passed'));assert.equal(new Set(release.groups.flatMap(g=>g.rows.filter(r=>r.key!=='namespace-companion').map(r=>r.key))).size,5);
const sha=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex'),temp=fs.mkdtempSync(root+'/source-offer-'),files=[];
const copy=(from,to)=>{assert(!to.split('/').includes('..'));const dest=temp+'/'+to;fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(from,dest);files.push({path:to,sha256:sha(dest)});};
try{
 for(const f of ['openssl_3.0.22.orig.tar.gz','openssl_3.0.22.orig.tar.gz.asc','openssl_3.0.22-1~deb12u1+utilibre1.debian.tar.xz','openssl_3.0.22-1~deb12u1+utilibre1.dsc','build-packages.lock'])copy(root+'/build/'+f,'native/'+f);
 for(const family of ['bookworm','ubuntu'])for(const f of fs.readdirSync(root+'/'+family).filter(f=>/\.(dsc|tar\.(gz|xz)(\.asc)?)$/.test(f)))copy(root+'/'+family+'/'+f,'authenticated-inputs/'+family+'/'+f);
 for(const f of fs.readdirSync(here))if(fs.statSync(here+f).isFile())copy(here+f,'recipes/maintenance/openssl-bookworm-followup/'+f);
 for(const f of ['xml-final/Dockerfile','sqlite-final/kuma-native.cjs','closure-followup/curl-fixture-server.py','closure-followup/urllib3-native.py','bookworm-curl-followup/policy.mjs','bookworm-curl-followup/native.c','bookworm-curl-followup/impersonate-fixture.mjs','bookworm-curl-followup/impersonate-native.php','bookworm-curl-followup/impersonate-feed.php','python-bookworm-followup/sdk-native.py','language-final/release.mjs','go-final/release.mjs'])copy(here+'../'+f,'recipes/maintenance/'+f);
 fs.writeFileSync(temp+'/SHA256SUMS',files.map(f=>f.sha256+'  '+f.path).join('\n')+'\n');
 fs.writeFileSync(temp+'/SOURCES.json',JSON.stringify({date:new Date().toISOString(),version:'3.0.22-1~deb12u1+utilibre1',repair:'CVE-2026-84782',files,reproduction:'Extract the native modified dsc alongside its included orig tarball and Debian packaging; build with native Bookworm dependencies recorded in build-packages.lock. The original Ubuntu patch is in the included authenticated source packaging. Context-only refresh preserves all fix/test added and deleted bytes; no failed hunk is forced. build.sh provides the bounded offline compilation and full-suite path. Shared release helpers and dependency test fixtures are included; the full Utilibre integration tree provides browser test dependencies. No private logs, credentials, configuration or user content.'},null,2)+'\n');
 const filename='security-openssl-bookworm-followup-20261012-source.tar.gz',archive=root+'/'+filename;assert(!fs.existsSync(archive));cp.execFileSync('tar',['-czf',archive,'-C',temp,'.'],{timeout:120000});
 const proof={date:new Date().toISOString(),filename,bytes:fs.statSync(archive).size,sha256:sha(archive),published:true};
 for(const base of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){const dest=base+'/'+filename;assert(!fs.existsSync(dest));fs.copyFileSync(archive,dest+'.tmp');fs.chmodSync(dest+'.tmp',0o644);fs.renameSync(dest+'.tmp',dest);}
 fs.writeFileSync(root+'/source-offer.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
}finally{assert(path.dirname(temp)===root&&path.basename(temp).startsWith('source-offer-'));fs.rmSync(temp,{recursive:true});}
