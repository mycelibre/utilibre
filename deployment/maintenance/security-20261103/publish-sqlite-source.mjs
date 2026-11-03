// Code-only supplement using the existing source-offer directory. No user data.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash}from'node:crypto';
process.umask(0o077);assert.equal(process.argv.length,2);
const root='/var/lib/utilibre-maintenance/security-20261103',here=new URL('.',import.meta.url).pathname,read=f=>JSON.parse(fs.readFileSync(f)),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(read(root+'/sqlite/release.json').status,'passed');
const filename='security-sqlite-20261103-source.tar.gz',archive=root+'/'+filename,destination='/opt/utilibre/toolbox-public/'+filename;assert(!fs.existsSync(archive)&&!fs.existsSync(destination));
const sources=read(here+'sqlite-source.json'),inputs=read(here+'sqlite-inputs.json'),stage=fs.mkdtempSync(root+'/sqlite-source-offer-');
try{
 for(const suite of ['bookworm','trixie']){const dir=root+'/sqlite/'+suite,s=sources.suites[suite],to=stage+'/'+suite;fs.mkdirSync(to);assert.equal(sha(fs.readFileSync(dir+'/output/build.json')),inputs.packages[suite].receiptSha256);
  for(const f of s.files){const b=fs.readFileSync(dir+'/input/'+f.file);assert.equal(sha(b),f.sha256);fs.writeFileSync(to+'/'+f.file,b);}
  for(const suffix of ['.dsc','.debian.tar.xz'])fs.copyFileSync(dir+'/output/sqlite3_'+s.version+suffix,to+'/sqlite3_'+s.version+suffix);
  fs.copyFileSync(dir+'/output/build-packages.lock',to+'/build-packages.lock');
  fs.mkdirSync(to+'/fixtures');for(const file of fs.readdirSync(dir+'/fixture'))if(/\.(?:c|sql|db)$/.test(file))fs.copyFileSync(dir+'/fixture/'+file,to+'/fixtures/'+file);
 }
 fs.mkdirSync(stage+'/recipe');
 for(const f of ['sqlite-source.json','sqlite-inputs.json','sqlite-rowid.patch','sqlite-rowid-bookworm.patch','sqlite-trixie-prerequisite.patch','sqlite-source.mjs','build-sqlite.sh','sqlite-rowid.c','sqlite.mjs','sqlite-policy.mjs','sqlite-policy.test.mjs','review-sqlite.mjs','batch.mjs','release-lock.mjs'])fs.copyFileSync(here+f,stage+'/recipe/'+f);
 fs.mkdirSync(stage+'/recipe/existing');for(const f of ['scan-brotli.mjs','release-brotli.mjs'])fs.copyFileSync(here+'../security-20261028/'+f,stage+'/recipe/existing/'+f);
 fs.writeFileSync(stage+'/REBUILD.txt',`SQLite source and Debian packaging with original notices, exact source inputs, maintained earlier patches and the new negative-rowid correction. Sources use their original licenses. This is a supplement to the existing complete application and integration offers, not a standalone replacement for them.
Use the full Utilibre repository for helper imports. Verify sqlite-source.json and sqlite-inputs.json hashes, restore the matching input directory under the recipe's private work root, and use the exact retained compiler image recorded in sqlite-source.json. The per-suite compiler-package inventory is included; it does not guarantee that future mutable package repositories reconstruct that image. Run sqlite-source.mjs build SUITE then finalize SUITE in a clean disposable environment. Network is disabled during compilation and tests. No production mounts, secrets, database or container-management socket belongs inside a build container. Candidate preparation uses SQLite's Debian package installation, exact image identities, unchanged app/configuration checks, previous corruption regressions, ABI checks and synthetic backup/restore. Production activation is separate.
Both sanitizer baselines reproduced signed overflow and both fixed builds passed. Bookworm: 18 prefix, 87 DISTINCT and 6 integrity tests; Trixie: 30 prefix, 87 DISTINCT and 6 integrity tests. The Bookworm integrity suite was also run as a separate bounded follow-up before finalization; the final checked-in build script runs all suites together on future replay. No byte-for-byte reproducible-build claim. No claim that all SQLite or application findings are resolved.
`);
 const manifest={};function walk(d,p=''){for(const n of fs.readdirSync(d).sort()){const q=p+n,f=d+'/'+n;if(fs.statSync(f).isDirectory())walk(f,q+'/');else manifest[q]=sha(fs.readFileSync(f));}}walk(stage);fs.writeFileSync(stage+'/SHA256.json',JSON.stringify(manifest,null,2)+'\n');
 cp.execFileSync('tar',['--sort=name','--mtime=@0','--owner=0','--group=0','--numeric-owner','-czf',archive,'-C',stage,'.'],{timeout:90000});fs.copyFileSync(archive,destination+'.tmp');fs.chmodSync(destination+'.tmp',0o644);fs.renameSync(destination+'.tmp',destination);
 const r={date:new Date().toISOString(),published:true,filename,bytes:fs.statSync(archive).size,sha256:sha(fs.readFileSync(archive))};fs.writeFileSync(root+'/sqlite/source-offer.json',JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r));
}finally{fs.rmSync(stage,{recursive:true});}
