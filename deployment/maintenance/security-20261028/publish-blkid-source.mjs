// Complete code-only library offer; explicit inputs, no operational configuration.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/security-20261028/blkid',here=new URL('.',import.meta.url).pathname;
const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
const source=read(here+'blkid-source.json'),native=read(dir+'/native.json');assert(native.nativePassed);assert.equal(native.patchSha256,source.patchSha256);
assert(process.argv.slice(2).every(a=>a==='--revision=2'));const revision2=process.argv.includes('--revision=2');
const filename='security-blkid-20261028-source'+(revision2?'-r2':'')+'.tar.gz',archive=dir+'/'+filename;assert(!fs.existsSync(archive));
const temp=fs.mkdtempSync(dir+'/source-offer-');
try{
 fs.mkdirSync(temp+'/input');fs.mkdirSync(temp+'/recipe');
 for(const [file,hash]of Object.entries(source.sourceArchives)){assert.equal(sha(fs.readFileSync(dir+'/input/'+file)),hash);fs.copyFileSync(dir+'/input/'+file,temp+'/input/'+file);}
 for(const file of ['blkid-source.json','blkid-builder.Dockerfile','build-blkid.sh','blkid-ebr.patch','check-blkid.py','check-blkid.c'])fs.copyFileSync(here+file,temp+'/recipe/'+file);
 fs.copyFileSync(dir+'/output-verified/build-packages.lock',temp+'/build-packages.lock');
 fs.writeFileSync(temp+'/REBUILD.txt','Complete Debian util-linux 2.38.1 source and Debian patches retain the upstream licenses. The only additional source change is the exact EBR bounds backport in recipe/blkid-ebr.patch, with pre/postimage hashes in blkid-source.json. Use the Bookworm compiler image identity recorded in the manifest, with the included package inventory; the Dockerfile documents acquisition, not a claim that mutable package indexes recreate identical build bytes. Mount the input directory read-only at /source and the recipe directory read-only at /recipe. Run /recipe/build-blkid.sh as UID/GID 65534, no network, with /work temporary storage and an empty writable /out. Two CPU and 2 GiB memory were used. The script builds baseline and candidate libraries, runs 14 synthetic regular-file cases each, and the restricted upstream suite (225 reported cases, 213 skips, no failures). No host block devices, mounts, production data or credentials are needed. Only libblkid.so.1.1.0 is replaced in consumers; other util-linux libraries retain their previous repairs. The full corresponding upstream/consumer application source remains in its existing separate offers. Byte-reproducible output is not claimed.\n');
 fs.writeFileSync(temp+'/manifest.json',JSON.stringify({source,compilerImage:native.compilerImage||native.compiler,librarySha256:native.librarySha256,nativeChecks:14,upstreamReported:225,upstreamSkipped:213},null,2)+'\n');
 cp.execFileSync('tar',['--sort=name','--mtime=2026-10-28T00:00:00Z','--owner=0','--group=0','--numeric-owner','-czf',archive,'-C',temp,'.'],{timeout:60000});
 const receipt={date:new Date().toISOString(),filename,archive,bytes:fs.statSync(archive).size,sha256:sha(fs.readFileSync(archive)),published:true};
 const destination='/opt/utilibre/toolbox-public/'+filename;assert(!fs.existsSync(destination));fs.copyFileSync(archive,destination+'.tmp');fs.chmodSync(destination+'.tmp',0o644);fs.renameSync(destination+'.tmp',destination);fs.writeFileSync(dir+'/source-offer'+(revision2?'-r2':'')+'.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
}finally{fs.rmSync(temp,{recursive:true});}
