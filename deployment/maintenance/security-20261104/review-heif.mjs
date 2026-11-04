// New HEIF release review, never reuse old absent-component claims for 1.23.7.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import{createHash}from'node:crypto';
import{freshScan}from'../review-native-backports.mjs';import{validateDecision}from'../triage.mjs';import{proveNative}from'./heif-policy.mjs';
process.umask(0o077);assert.equal(process.argv.length,2);
const root='/var/lib/utilibre-maintenance',dir=root+'/security-20261104/heif-upgrade',read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const spec=read(new URL('./heif-inputs.json',import.meta.url)),basis=read(new URL('./heif-reviewed-advisories.json',import.meta.url)),n=read(dir+'/native.json'),stage=read(dir+'/stage.json'),gate=read(dir+'/scan-gate.json'),release=read(dir+'/release.json'),offer=read(dir+'/source-offer.json'),app=read(dir+'/application.json'),q=read(root+'/security-queue.json'),scan=read(root+'/security.json');
freshScan(q,scan);assert.equal(scan.status,'checked');proveNative(n,spec);
for(const r of [stage,gate,release,app])assert.equal(r.status,'passed');
assert(Date.parse(release.completedAt)<Date.parse(scan.date));assert.equal(scan.images.find(i=>i.id===stage.image)?.status,'checked');assert.equal(app.image,stage.image);assert(app.gdalHeicRead&&app.gdalAvifRead&&app.syntheticDumpRestoreSha256);assert.equal(gate.newHighCritical,0);
for(const[file,h]of Object.entries(release.proofs))assert.equal(sha(dir+'/'+file+'.json'),h);
assert(offer.published);assert.equal(sha(offer.archive),offer.sha256);
for(const destination of ['/opt/utilibre/toolbox-public/','/opt/utilibre/records/public/'])assert.equal(sha(destination+offer.filename),offer.sha256);
assert.equal(sha(dir+'/upstream-advisories.json'),basis.sourceFileSha256);
const advisories=read(dir+'/upstream-advisories.json');
for(const b of basis.advisories){const actual=advisories.find(a=>a.ghsa_id===b.ghsa);assert(actual);assert.equal(actual.html_url,b.url);assert.equal(actual.vulnerabilities[0].patched_versions,b.fixed);assert.equal(actual.cve_id,b.id==='CVE-2026-120208'?null:b.id);}
const run=args=>cp.execFileSync('docker',args,{encoding:'utf8',timeout:15000,maxBuffer:1024**2,stdio:['ignore','pipe','pipe']}).trim();
assert.equal(run(['inspect','--format','{{.Image}}',spec.target]),stage.image);assert.equal(run(['exec',spec.target,'dpkg-query','-W','-f=${Version}',spec.package]),spec.version);assert.equal(run(['exec',spec.target,'sha256sum',spec.library]).split(/\s+/)[0],n.librarySha256);
const decisions=[];
for(const item of q.items.filter(i=>i.status==='needs-review'&&i.package===spec.package&&i.installed===spec.version&&i.artifact===stage.image&&i.scope==='runtime-image'&&i.type==='debian'&&i.containers.length===1&&i.containers[0]===spec.target)){
 const b=basis.advisories.find(a=>a.id===item.id);if(!b)continue;
 decisions.push(validateDecision({key:item.key,status:'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:`Exact upstream 1.23.7 source archive and published asset digest verified; upstream identifies ${b.fixed} as fixed for ${b.id}: ${b.url}. All five prior vendor/local fixes are ancestors of this release. One narrowly scoped legacy-XMP compatibility correction retains upstream memory/work limits; the intended upstream-only baseline fails metadata decoding, while old/new writer round trips, raw DEFLATE and corrupt-data/limit rejection pass. 38 upstream programs pass, 12 optional/configuration skips remain explicit. All 167 old public C exports and native dependencies are preserved, not a universal experimental ABI claim. Existing GDAL HEIC/AVIF, 210 drivers, PostGIS/DocumentDB, synthetic dump/restore and account permissions pass. Exact package/library/source-scope, candidate scan and completed Gathio release verified. Raw Debian version-based finding retained; only this advisory/package/image/role reviewed. Evidence: security-20261104/heif-upgrade/{native,source-scope,application,scan-gate,release}.json.`}));
}
fs.writeFileSync(dir+'/review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,image:stage.image,advisoryEvidenceSha256:basis.sourceFileSha256,decisions},null,2)+'\n');console.log(JSON.stringify({prepared:decisions.length,applied:false}));
