// Finite code-only source supplement; never includes runtime configuration/data.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import{createHash}from'node:crypto';
process.umask(0o077);assert.equal(process.argv.length,2);
const dir='/var/lib/utilibre-maintenance/security-20261104/mongocrypt',read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const spec=read(new URL('./mongocrypt-inputs.json',import.meta.url)),n=read(dir+'/native.json'),stage=read(dir+'/stage.json'),app=read(dir+'/application.json'),g=read(dir+'/scan-gate.json');
for(const r of [n,stage,app,g])assert.equal(r.status,'passed');assert.equal(app.image,stage.image);assert.equal(g.image,stage.image);assert.equal(n.version,spec.version);
const filename='security-coturn-mongocrypt-20261104-source.tar.gz',archive=dir+'/'+filename,receipt=dir+'/source-offer.json';
if(fs.existsSync(receipt)){const r=read(receipt);assert.equal(sha(archive),r.sha256);for(const target of ['/opt/utilibre/toolbox-public/','/opt/utilibre/records/public/'])assert.equal(sha(target+filename),r.sha256);console.log('Existing source offer verified.');process.exit(0);}
const temp=fs.mkdtempSync(dir+'/offer-');
try{
 fs.mkdirSync(temp+'/source');fs.mkdirSync(temp+'/recipe');
 const files=[];
 for(const p of [...spec.sourceArchives,...spec.patches]){assert.equal(sha(dir+'/source/'+p.file),p.sha256);fs.copyFileSync(dir+'/source/'+p.file,temp+'/source/'+p.file);files.push(p);}
 for(const[file,hash]of Object.entries(n.sourcePins)){assert.equal(sha(dir+'/output/'+file),hash);fs.copyFileSync(dir+'/output/'+file,temp+'/source/'+file);files.push({file,sha256:hash});}
 for(const f of ['mongocrypt-inputs.json','build-mongocrypt.sh','mongocrypt-native.mjs','scan-mongocrypt.mjs','mongocrypt-policy.mjs'])fs.copyFileSync(new URL('./'+f,import.meta.url),temp+'/recipe/'+f);
 fs.copyFileSync(dir+'/output/build-packages.lock',temp+'/build-packages.lock');
 fs.writeFileSync(temp+'/manifest.json',JSON.stringify({version:spec.version,license:spec.license,source:spec.sourceOrigin,files,vendorPatchesPreserved:n.vendorPatchesPreserved,changed:n.changed,package:n.packages,library:n.libraries,unitCases:n.unitCases,skips:n.skipped},null,2)+'\n');
 fs.writeFileSync(temp+'/REBUILD.txt',`libmongocrypt 1.13.2 (Apache-2.0) with Debian's CVE-2026-81523 patch preserved and exact upstream commits 556bcb7 and 8bc580e. The two commits fix duplicate masterKey acceptance and committing an invalid partially parsed key-encryption-key state. This changes libmongocrypt, not libmongoc/libbson or TURN credentials/configuration. All prior complete source offers remain available separately.
Verify source file hashes against recipe/mongocrypt-inputs.json. Use the pinned Trixie compiler base and the exact acquired .deb hashes in that manifest; install those compiler dependencies in an isolated environment, never the running service. Compare its package inventory with build-packages.lock. Put the source archives and both upstream .patch files in /work, the build script at /work/build.sh, and an empty /output; both directories belong to uid 65534. With network disabled, two CPUs/two GiB and a finite timeout, run sh /work/build.sh as uid 65534. The result is a Debian package and complete patched source package. Native checks in the repository compare original and repaired source, every ABI export/NEEDED, two failing-before/passing-after upstream regressions, 330 passing native tests and three documented skips. Repository-native relay tests separately verify ordinary authenticated UDP/TCP/TLS, exact transferred bytes, invalid credentials, private-peer rejection and bounded quotas. This is not public throughput/device coverage or byte-reproducible compilation.
No production configuration, credentials, content, logs or receipts are included. Activation requires the existing guarded image-only release procedure, a same-database candidate scan and two zero-allocation checks per relay. Preserve the recorded old image for rollback; no data migration is included.
`);
 cp.execFileSync('tar',['--sort=name','--mtime=2026-11-04T00:00:00Z','--owner=0','--group=0','--numeric-owner','-czf',archive,'-C',temp,'.'],{timeout:60000});
 for(const destination of ['/opt/utilibre/toolbox-public/','/opt/utilibre/records/public/']){assert(!fs.existsSync(destination+filename));fs.copyFileSync(archive,destination+filename+'.tmp');fs.chmodSync(destination+filename+'.tmp',0o644);fs.renameSync(destination+filename+'.tmp',destination+filename);}
 const r={date:new Date().toISOString(),filename,archive,sha256:sha(archive),bytes:fs.statSync(archive).size,published:true};fs.writeFileSync(receipt,JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r));
}finally{fs.rmSync(temp,{recursive:true});}
