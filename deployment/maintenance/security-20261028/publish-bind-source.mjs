// Explicit code-only source offer; no host configuration, secrets or user data.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);assert.equal(process.argv.length,2);
const root='/var/lib/utilibre-maintenance/security-20261028/bind',here=new URL('.',import.meta.url).pathname;
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
const spec=read(here+'bind-inputs.json'),release=read(root+'/bind-release.json');assert.equal(release.status,'passed');assert.equal(release.version,spec.version);
const filename='security-bind-20261028-source.tar.gz',archive=root+'/'+filename,destination='/opt/utilibre/toolbox-public/'+filename;
assert(!fs.existsSync(archive)&&!fs.existsSync(destination));const stage=fs.mkdtempSync(root+'/source-offer-');
try{
 fs.mkdirSync(stage+'/input');fs.mkdirSync(stage+'/recipe');
 for(const [file,hash]of Object.entries(spec.archives)){assert.equal(sha(root+'/'+file),hash);fs.copyFileSync(root+'/'+file,stage+'/input/'+file);}
 assert.equal(sha(root+'/builder-packages.lock'),spec.builderPackagesSha256);fs.copyFileSync(root+'/builder-packages.lock',stage+'/builder-packages.lock');
 fs.copyFileSync(here+'bind-inputs.json',stage+'/recipe/bind-inputs.json');
 for(const file of ['build-bind.sh','check-bind.py'])fs.copyFileSync(here+'../closure-followup/'+file,stage+'/recipe/'+file);
 fs.writeFileSync(stage+'/REBUILD.txt','BIND 9.20.30 Debian source and packaging, with original licenses. Use the exact builder recorded in recipe/bind-inputs.json; its package inventory is included. Extract input/bind9_9.20.30-1~deb13u1.dsc with dpkg-source -x into an empty work directory, bind-mounted as /build. Mount recipe read-only at /recipe. Run sh /recipe/build-bind.sh --oct28 with no network, two CPUs and 3 GiB memory. The finite native configuration preserves --without-lmdb and omits the unused server-only LMDB converter from packaging. Only bind9-host and bind9-libs are installed on Utilibre, not the DNS server. The original no-LMDB repair and exact prior packages are retained. Native synthetic UDP A/AAAA/NXDOMAIN and TCP A tests pass before and after installation; this is client compatibility evidence, not reproduction of all upstream server vulnerabilities. Compiler package acquisition is separate from offline compilation. Complete upstream/packaging archives and recipe are provided; byte-identical rebuilds are not claimed.\n');
 cp.execFileSync('tar',['--sort=name','--mtime=2026-10-28T00:00:00Z','--owner=0','--group=0','--numeric-owner','-czf',archive,'-C',stage,'.'],{timeout:60000});
 fs.copyFileSync(archive,destination+'.tmp');fs.chmodSync(destination+'.tmp',0o644);fs.renameSync(destination+'.tmp',destination);
 const receipt={date:new Date().toISOString(),filename,sha256:sha(archive),bytes:fs.statSync(archive).size,published:true};fs.writeFileSync(root+'/source-offer.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
}finally{fs.rmSync(stage,{recursive:true});}
