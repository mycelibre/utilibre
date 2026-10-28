// Code-only corresponding library source; no configuration, credentials or data.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash}from'node:crypto';
process.umask(0o077);assert.equal(process.argv.length,2);
const here=new URL('.',import.meta.url).pathname,root='/var/lib/utilibre-maintenance/security-20261028/cfitsio';
const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
const source=read(here+'cfitsio-source.json'),inputs=read(here+'cfitsio-inputs.json'),replay=read(root+'/replay-verified.json');
assert(replay.prepared&&replay.libraryBytesIdentical&&replay.librarySha256===inputs.librarySha256);
assert.equal(sha(fs.readFileSync(here+'cfitsio-bounds.patch')),source.patchSha256);
const filename='security-cfitsio-20261028-source.tar.gz',archive=root+'/'+filename,destination='/opt/utilibre/toolbox-public/'+filename;
assert(!fs.existsSync(archive)&&!fs.existsSync(destination));
const temp=fs.mkdtempSync(root+'/source-offer-');
try{
 fs.mkdirSync(temp+'/input');fs.mkdirSync(temp+'/recipe');
 for(const [f,h]of Object.entries(source.sourceArchives)){assert.equal(sha(fs.readFileSync(root+'/acquire/'+f)),h);fs.copyFileSync(root+'/acquire/'+f,temp+'/input/'+f);}
 for(const f of ['cfitsio-source.json','cfitsio-inputs.json','cfitsio-bounds.patch','cfitsio-compile.sh','cfitsio-native.c','rebuild-cfitsio.mjs'])fs.copyFileSync(here+f,temp+'/recipe/'+f);
 fs.copyFileSync(root+'/build-deps/build-packages.txt',temp+'/build-packages.txt');
 fs.copyFileSync(root+'/source/cfitsio/License.txt',temp+'/License.txt');
 fs.writeFileSync(temp+'/REBUILD.txt',`Debian CFITSIO 4.2.0-3 source and packaging retain their original licences. Verify input SHA256 values in recipe/cfitsio-source.json. Extract with dpkg-source -x input/cfitsio_4.2.0-3.dsc source; verify getcols.c against beforeSha256, apply recipe/cfitsio-bounds.patch with patch --batch --fuzz=0 -p1 in source, then verify afterSha256. Only the upstream pre-read bounds hunk applies: this version lacks the later post-read guard removed by the full upstream patch.
Use the pinned compiler image in the manifest; its native package inventory is included. Compiler acquisition used authenticated Bookworm APT, including libcurl4-gnutls-dev, zlib1g-dev, libbz2-dev, gfortran and cfortran. Package inventory is not a promise that future mutable repositories reproduce that compiler. Mount source read-only at /source, recipe/cfitsio-compile.sh at /compile.sh, recipe/cfitsio-native.c at /native.c and an empty output directory at /out. Run sh /compile.sh with UTILIBRE_SECURITY_DISPOSABLE=yes, network disabled, read-only root, no production mounts or credentials, two CPUs, 2 GiB RAM and a 768 MiB executable temporary /tmp. No host daemon or production service is required. Native runtime tests additionally use this deployment's existing GDAL consumer.
The upstream testprog finished with Status = 0; expected numeric-overflow diagnostics remain in its output. Two clean offline builds produced identical library bytes; this does not establish reproducibility of the compiler, test executable, complete image or all future builds. Only libcfitsio.so.10.4.2.0 is replaced; native package version labels remain unchanged. Complete consumer/application source remains in its separate existing offers.
A separate 16384-byte variable-string test fails on both the original and candidate library. This repair rejects the advisory's oversized input but does not claim to fix that separate limitation or establish complete library security clearance.
`);
 fs.writeFileSync(temp+'/manifest.json',JSON.stringify({source,librarySha256:inputs.librarySha256,normalChecks:8,independentLibraryRebuildBytesIdentical:true},null,2)+'\n');
 cp.execFileSync('tar',['--sort=name','--mtime=2026-10-28T00:00:00Z','--owner=0','--group=0','--numeric-owner','-czf',archive,'-C',temp,'.'],{timeout:60000});
 fs.copyFileSync(archive,destination+'.tmp');fs.chmodSync(destination+'.tmp',0o644);fs.renameSync(destination+'.tmp',destination);
 const result={date:new Date().toISOString(),filename,archive,bytes:fs.statSync(archive).size,sha256:sha(fs.readFileSync(archive)),published:true};
 fs.writeFileSync(root+'/source-offer.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({filename,bytes:result.bytes,sha256:result.sha256,published:true}));
}finally{fs.rmSync(temp,{recursive:true});}
