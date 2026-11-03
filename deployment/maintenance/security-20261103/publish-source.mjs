// Code-only supplement through the existing public source directory.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
assert.equal(process.argv.length,2);
const root='/var/lib/utilibre-maintenance/security-20261103',pub='/opt/utilibre/toolbox-public';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
for(const p of ['expat','expat-debian','pyasn1','redirects'])assert.equal(read(root+'/'+p+'/release.json').status,'passed');
const filename='security-libraries-20261103-source.tar.gz',destination=pub+'/'+filename;
assert(!fs.existsSync(destination),'Preserve an already published source offer');
const stage=fs.mkdtempSync(root+'/source-offer-');
try{
 fs.mkdirSync(stage+'/input');fs.mkdirSync(stage+'/recipe');
 const source=read(new URL('./expat-bookworm-source.json',import.meta.url));
 for(const p of source.sources.files){const b=fs.readFileSync(root+'/packages/debian/'+p.file);assert.equal(sha(b),p.sha256);fs.writeFileSync(stage+'/input/'+p.file,b);}
 const py=read(new URL('./pyasn1-inputs.json',import.meta.url));
 for(const [file,hash] of [['pyasn1-0.6.5.tar.gz',py.sourceArchiveSha256],[py.wheel.file,py.wheel.sha256]]){const b=fs.readFileSync(root+'/pyasn1/'+file);assert.equal(sha(b),hash);fs.writeFileSync(stage+'/input/'+file,b);}
 const red=read(new URL('./redirects-inputs.json',import.meta.url)),meta=read(root+'/redirects/actual/build.json').packages[0];
 const response=await fetch(meta.tarball,{redirect:'error',signal:AbortSignal.timeout(30000)});assert(response.ok);
 const bytes=Buffer.from(await response.arrayBuffer());assert(bytes.length<1024**2);assert.equal('sha512-'+createHash('sha512').update(bytes).digest('base64'),red.packages['follow-redirects'].integrity);
 fs.writeFileSync(stage+'/input/follow-redirects-1.16.2.tgz',bytes);
 for(const f of fs.readdirSync(new URL('.',import.meta.url)))if(/\.(?:mjs|cjs|json|py|c|sh|md)$/.test(f))fs.copyFileSync(new URL('./'+f,import.meta.url),stage+'/recipe/'+f);
 fs.mkdirSync(stage+'/recipe/existing-builders');
 for(const f of ['alpine.mjs','brotli.mjs','dnspython.mjs','scan-brotli.mjs','release-brotli.mjs'])fs.copyFileSync(new URL('../security-20261028/'+f,import.meta.url),stage+'/recipe/existing-builders/'+f);
 fs.copyFileSync(new URL('../js-closure/build.mjs',import.meta.url),stage+'/recipe/existing-builders/js-packages.mjs');
 fs.mkdirSync(stage+'/dockerfiles');
 for(const profile of ['expat','expat-debian','pyasn1','redirects']){
  const inputs=read(new URL('./'+profile+'-inputs.json',import.meta.url));
  for(const row of inputs.rows){const file=root+'/'+profile+'/'+row.key+'/Dockerfile';if(fs.existsSync(file))fs.copyFileSync(file,stage+'/dockerfiles/'+profile+'-'+row.key);else assert(['expat','expat-debian'].includes(profile),'Missing retained app-package recipe');}
 }
 fs.copyFileSync(root+'/expat-bookworm/output/build-packages.lock',stage+'/bookworm-compiler-packages.lock');
 fs.writeFileSync(stage+'/REBUILD.txt','Source supplement for the existing Utilibre application source offers. Expat 2.10.0, pyasn1 0.6.5 and follow-redirects 1.16.2 are included with their original licenses. No application code, account data, private configuration or credentials were extracted. The Expat Bookworm build changes native Debian packaging version only; build-expat-bookworm.sh captures the exact operation. Existing app source offers and earlier repairs remain required. The checked-in input manifests and Dockerfiles describe exact retained predecessor images, package hashes, changed paths and native checks; they are not recipes for arbitrary newer upstream images. Run them in the full Utilibre repository to retain their established helper imports. No byte-identical build claim. The pinned regression suites run in bounded disposable containers with network disabled. See recipe/README.md and https://github.com/mycelibre/utilibre for the integration and release procedure.\n');
 const archive=root+'/'+filename;
 cp.execFileSync('tar',['--sort=name','--mtime=@0','--owner=0','--group=0','--numeric-owner','-czf',archive,'-C',stage,'.'],{timeout:60000});
 fs.copyFileSync(archive,destination+'.tmp');fs.chmodSync(destination+'.tmp',0o644);fs.renameSync(destination+'.tmp',destination);
 const receipt={date:new Date().toISOString(),published:true,filename,sha256:sha(fs.readFileSync(archive)),bytes:fs.statSync(archive).size};
 fs.writeFileSync(root+'/source-offer.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
}finally{fs.rmSync(stage,{recursive:true});}
