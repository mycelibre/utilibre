// Finite code-only source offer, following publish-native-sources.mjs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
process.umask(0o077);
assert.equal(process.argv.length,2);
const root='/var/lib/utilibre-maintenance/security-20261109/xnet-caddy';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const inputs=read(new URL('./xnet-caddy-inputs.json',import.meta.url));
const build=read(root+'/build.json'),native=read(root+'/native.json');
assert(build.passed&&native.passed&&build.rows.length===3);
for(const row of build.rows){
 const scan=read(root+'/'+row.key+'/scan-gate.json');
 assert(scan.passed&&scan.imageId===row.imageId&&scan.targetedFindingRemoved&&scan.newHighCritical===0);
 assert.equal(sha(new URL('./xnet-caddy.py',import.meta.url)),row.scopeCheckerSha256);
}
assert.equal(sha(root+'/input/source.tar.gz'),inputs.sourceArchiveSha256);
assert.equal(sha(root+'/compile-prepared.sh'),inputs.adapterSha256);
assert.equal(sha(root+'/source-scope-verified.json'),inputs.sourceScopeSha256);
const scope=read(root+'/source-scope-verified.json');assert(scope.passed);
for(const [file,hash]of Object.entries(scope.after))assert.equal(sha(root+'/source/'+file),hash);
const entries=cp.execFileSync('tar',['-tzf',root+'/input/source.tar.gz'],{encoding:'utf8',maxBuffer:4*1024**2,timeout:30000}).trim().split('\n');
assert(entries.length>1000&&entries.every(p=>!p.startsWith('/')&&!p.split('/').some(c=>['..','.git','.env','secrets'].includes(c))));
const filename='security-xnet-caddy-20261109-source.tar.gz',destination='/opt/utilibre/toolbox-public/'+filename;
assert(!fs.existsSync(destination)&&!fs.existsSync(root+'/source-offer.json'),'Preserve published source');
const stage=fs.mkdtempSync(root+'/public-source-');
try{
 fs.mkdirSync(stage+'/input');fs.mkdirSync(stage+'/recipe');
 fs.copyFileSync(root+'/input/source.tar.gz',stage+'/input/source.tar.gz');
 fs.copyFileSync(root+'/compile-prepared.sh',stage+'/recipe/compile.sh');
 fs.cpSync(root+'/artifact/notices',stage+'/notices',{recursive:true});
 fs.copyFileSync(new URL('./xnet-caddy-inputs.json',import.meta.url),stage+'/inputs.json');
 fs.writeFileSync(stage+'/REBUILD.txt',
  'Caddy 2.11.7 with Go 1.26.10 and x/net 0.62.0. The complete prepared source/vendor tree, exact module locks, licences and prior JOSE/compression corrections are in input/source.tar.gz. Verify its SHA-256 against inputs.json before extraction.\n'+
  'Use the pinned compiler image in inputs.json. Mount input at /input read-only, recipe/compile.sh read-only, empty output at /out and bounded disposable /work and /tmp. Run sh /compile.sh with EXPECTED_GO=1.26.10 CADDY_NET_REVIEW=0 UTILIBRE_CADDY_JOSE=0 UTILIBRE_CADDY_CODEC=0 and no network; the input already contains those earlier corrections. No package resolution occurs in this build.\n'+
  'The six explicit Go module updates are listed in inputs.json. Earlier JOSE v3 bounded-RSA source and JOSE v4/compression release fixes are preserved. Application files/configuration are unchanged; this archive covers the embedded Caddy binary. Full application source remains in the existing Wishlist/newsletters offers.\n'+
  'Native proxy, gzip, SSE, HTTP/2 and synthetic Wishlist/newsletter checks are retained in the Utilibre repository. No operator configuration, account data, diagnostic captures or secrets are included. Exact inputs and deterministic release decisions are recorded; byte-identical build output is not claimed.\n');
 const archive=root+'/'+filename;
 assert(!fs.existsSync(archive));
 cp.execFileSync('tar',['--sort=name','--mtime=@0','--owner=0','--group=0','--numeric-owner','-czf',archive,'-C',stage,'.'],{timeout:120000});
 fs.copyFileSync(archive,destination+'.tmp');fs.chmodSync(destination+'.tmp',0o644);fs.renameSync(destination+'.tmp',destination);
 const receipt={date:new Date().toISOString(),published:true,filename,sha256:sha(destination),bytes:fs.statSync(destination).size,images:build.rows.map(r=>r.imageId)};
 fs.writeFileSync(root+'/source-offer.json',JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify(receipt));
}finally{fs.rmSync(stage,{recursive:true});}
