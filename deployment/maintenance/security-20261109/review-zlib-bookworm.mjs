// Draft exact, expiring reviews only. No scan suppression or queue mutation.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import{createHash}from'node:crypto';
import{freshScan,overlayRows}from'../review-native-backports.mjs';
import{additionalOverlayReceipts}from'../followup-overlays.mjs';
import{expatDescendant}from'../security-20261103/expat-policy.mjs';
import{validateDecision}from'../triage.mjs';
import{proveZlibBookworm,zlibBookwormRelease}from'./zlib-bookworm-policy.mjs';
import{checkerIdentity}from'../releases-20261111/recorded-checkers.mjs';
process.umask(0o077);assert.equal(process.argv.length,2);
const root='/var/lib/utilibre-maintenance',dir=root+'/security-20261109/zlib-bookworm',read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const spec=read(new URL('./zlib-bookworm-inputs.json',import.meta.url)),sourceSpec=read(new URL('./zlib-bookworm-source.json',import.meta.url)),source=read(dir+'/output/build.json'),release=read(dir+'/release.json'),offer=read(dir+'/source-offer.json'),scan=read(root+'/security.json'),queue=read(root+'/security-queue.json');
freshScan(queue,scan);assert.equal(scan.status,'checked');assert.equal(release.status,'passed');assert.equal(release.groups.length,spec.rows.length);assert(offer.published);
assert.equal(sha(root+'/security-20261109/'+offer.filename),offer.sha256);
assert.equal(sha(dir+'/output/build.json'),spec.sourceReceiptSha256);
for(const [file,hash]of Object.entries(sourceSpec.files))assert.equal(sha(dir+'/input/'+file),hash);
assert.equal(sha(new URL('./zlib-bookworm.patch',import.meta.url)),sourceSpec.patchSha256);
for(const [file,hash]of Object.entries(source.evidence))assert.equal(sha(dir+'/output/'+file),hash);
assert(source.gzVacateAbsent);
const releases=overlayRows(release),proofs=[],decisions=[];
const descendants=additionalOverlayReceipts.filter(f=>fs.existsSync(root+'/'+f)).flatMap(f=>overlayRows(read(root+'/'+f)));
const run=args=>cp.execFileSync('docker',args,{encoding:'utf8',timeout:30000,maxBuffer:1024**2,stdio:['ignore','pipe','pipe']}).trim();
for(const s of spec.rows){
 const p=dir+'/'+s.key,b=read(p+'/build.json'),n=read(p+'/native.json'),gate=read(p+'/scan-gate.json'),scope=read(p+'/scope.json');
 proveZlibBookworm(spec,s,b,n,source);
 zlibBookwormRelease(spec,s,b,gate,scope,{source:sha(dir+'/output/build.json'),scope:sha(p+'/scope.json'),preparer:sha(new URL('./zlib-bookworm.mjs',import.meta.url)),scopeChecker:sha(new URL('./zlib-bookworm-scope.py',import.meta.url)),exporter:checkerIdentity('deployment/maintenance/security-20261109/zlib-check.py',spec.verification.exporter,b.imageId)});
 const artifacts=s.containers.map(name=>expatDescendant(name,b.imageId,'1970-01-01T00:00:00Z',scan.date,descendants));
 assert.equal(new Set(artifacts).size,1,'Shared zlib roles diverged');const artifact=artifacts[0];
 assert.equal(scan.images.find(i=>i.id===artifact)?.status,'checked');
 const componentFiles=[];
 for(const name of s.containers){
  const r=releases.find(r=>r.name===name&&r.oldImage===s.base&&r.newImage===b.imageId);assert(r&&Date.parse(r.completedAt)<Date.parse(scan.date));
  assert.equal(run(['inspect','--format','{{.Image}}',name]),artifact);
  assert.equal(run(['exec',name,'dpkg-query','-W','-f=${Version}','zlib1g']),s.version);
  assert.equal(run(['exec',name,'sha256sum','/usr/lib/x86_64-linux-gnu/libz.so.1']).split(/\s+/)[0],b.librarySha256);
  const files=run(['exec',name,'dpkg-query','-L','zlib1g']);
  assert(files.includes('libz.so.1'));assert(!/minizip/i.test(files));
  componentFiles.push({container:name,sha256:createHash('sha256').update(files).digest('hex')});
 }
 for(const i of queue.items.filter(i=>i.status==='needs-review'&&i.scope==='runtime-image'&&i.artifact===artifact&&i.type==='debian'&&i.package==='zlib1g'&&i.installed===s.version&&spec.advisories.includes(i.id))){
  assert.deepEqual([...i.containers].sort(),[...s.containers].sort());
  const absent=i.id==='CVE-2026-85091';
  const reason=absent?'Exact authenticated Bookworm zlib 1.2.13 branch does not contain gz_vacate, the later component affected by this advisory. Source receipt and installed library bytes verified; this is a component-specific finding assessment, not a claim that newer zlib code was incorporated.':'Native Bookworm zlib 1.2.13 includes upstream df84af25dc1942490e1d1c899a07619152a46148 input-state reset after failed writes, with only the required older-branch context adjustment. Exact package/source hashes, retained native build checks and actual running library bytes verified.';
  decisions.push(validateDecision({key:i.key,status:absent?'not-affected':'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:reason+' Ordinary compression round-trips and ABI checks pass on old/new artifacts; full-image comparison permits only the zlib payload and exact package/loader bookkeeping. Application/configuration and unrelated packages are unchanged. Completed scoped release and same-database assessment verified. Raw finding retained; other advisories remain separate. Evidence: security-20261109/zlib-bookworm/review.json. https://security-tracker.debian.org/tracker/'+i.id}));
  proofs.push({key:i.key,image:artifact,librarySha256:b.librarySha256,sourceReceiptSha256:spec.sourceReceiptSha256,scopeSha256:b.scopeSha256});
 }
 // A source-package attribution must not turn into a blanket exemption for
 // separately installed MiniZip packages. Bind only these eight proven native
 // libz artifacts, whose complete package files were inspected above.
 for(const i of queue.items.filter(i=>i.status==='needs-review'&&i.scope==='runtime-image'&&i.artifact===artifact&&i.type==='debian'&&i.package==='zlib1g'&&i.installed===s.version&&i.id==='CVE-2023-45853')){
  assert.deepEqual([...i.containers].sort(),[...s.containers].sort());
  decisions.push(validateDecision({key:i.key,status:'not-affected',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:'Debian Bookworm zlib 1:1.2.13.dfsg-1 does not build the affected contrib/minizip code. This exact native rebuild retains its authenticated packaging; the installed zlib1g file lists contain libz and no MiniZip, and the library hashes match the reviewed build. Complete image-scope and release proofs bind this assessment to this artifact. Does not exempt libminizip, pyminizip, source/build inputs or another advisory. Raw finding retained. Evidence: security-20261109/zlib-bookworm/review.json. https://security-tracker.debian.org/tracker/CVE-2023-45853'}));
  proofs.push({key:i.key,image:artifact,librarySha256:b.librarySha256,sourceReceiptSha256:spec.sourceReceiptSha256,scopeSha256:b.scopeSha256,componentFiles});
 }
}
assert.equal(read(root+'/security.json').completedAt,scan.completedAt);
fs.writeFileSync(dir+'/review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,proofs},null,2)+'\n');
console.log(JSON.stringify({prepared:decisions.length,applied:false}));
