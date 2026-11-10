// Recheck deployed files for this one advisory; no ledger mutation or network.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import{createHash}from'node:crypto';
import{freshScan,overlayRows}from'../review-native-backports.mjs';import{validateDecision}from'../triage.mjs';import{proveOauthDebian}from'./oauth-debian-policy.mjs';
import{additionalOverlayReceipts}from'../followup-overlays.mjs';import{expatDescendant}from'./expat-policy.mjs';
const deviceAbsence=process.argv.includes('--device-absence-nov9');
process.umask(0o077);assert(deviceAbsence?process.argv.length===3:process.argv.length===2);
const root='/var/lib/utilibre-maintenance',dir=root+'/security-20261103/oauth-debian',read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const inputs=read(new URL('./oauth-debian-inputs.json',import.meta.url)),s=inputs.rows[0],b=read(dir+'/kuma/build.json'),scan=read(root+'/security.json'),q=read(root+'/security-queue.json');freshScan(q,scan);assert.equal(scan.status,'checked');
proveOauthDebian(s,b,read(dir+'/kuma/application.json'));
const host=read(dir+'/host/release.json'),release=read(dir+'/release.json');assert.equal(host.status,'passed');assert.equal(release.status,'passed');
assert(Date.parse(host.completedAt)<=Date.parse(scan.date));const g=release.groups.find(g=>g.key==='kuma');assert(g&&g.status==='passed');assert.equal(g.rows.length,1);assert.equal(g.rows[0].newImage,b.imageId);assert.equal(g.rows[0].oldImage,s.base);assert(Date.parse(g.completedAt)<=Date.parse(scan.date));
const source=read(dir+'/source-offer.json');assert(source.published&&source.publicHashVerified);assert.equal(sha(dir+'/'+source.filename),source.sha256);
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:15000,maxBuffer:2*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const overlays=additionalOverlayReceipts.filter(p=>fs.existsSync(root+'/'+p)).flatMap(p=>overlayRows(read(root+'/'+p)));
const artifact=expatDescendant(s.containers[0],b.imageId,g.completedAt,scan.completedAt,overlays);
assert.equal(scan.images.find(i=>i.id===artifact)?.status,'checked');
assert.equal(run('docker',['inspect',s.containers[0],'--format','{{.Image}}']),artifact);
assert.equal(run('dpkg-query',['-W','-f=${Version}',inputs.host.package]),inputs.host.version);
assert.equal(run('docker',['exec',s.containers[0],'dpkg-query','-W','-f=${Version}','python3-oauthlib']),'3.2.2-1');
for(const [i,f]of s.files.entries()){
 assert.equal(sha(s.site+'/'+f.path),f.afterSha256);assert.equal(sha(dir+'/host/original-'+i+'.py'),f.beforeSha256);
 assert.equal(run('docker',['exec',s.containers[0],'sha256sum',s.site+'/'+f.path]).split(/\s/)[0],f.afterSha256);
}
const decisions=[];
if(deviceAbsence){
 const input=read(new URL('../security-20261109/oauth-inputs.json',import.meta.url)).debianComponentReview;
 const advisoryPath=root+'/security-20261109/'+input.snapshot;
 assert.equal(sha(advisoryPath),input.snapshotSha256);
 const advisory=read(advisoryPath);assert.equal(advisory.ghsa_id,'GHSA-3jp2-3mrg-2vxc');assert.equal(advisory.cve_id,'CVE-2026-49272');
 assert.equal(advisory.vulnerabilities.length,1);assert.equal(advisory.vulnerabilities[0].package.name,'oauthlib');assert.equal(advisory.vulnerabilities[0].vulnerable_version_range,'>=3.3.0');assert.equal(advisory.vulnerabilities[0].patched_versions,'4.0.1');
 const fixture=new URL('../security-20261109/oauth-debian-component.py',import.meta.url);assert.equal(sha(fixture),input.fixtureSha256);
 const code=fs.readFileSync(fixture,'utf8'),proofs=[];
 for(const where of ['host','kuma']){
  const result=JSON.parse(where==='host'?run('python3',['-I','-B','-c',code]):run('docker',['exec',s.containers[0],'python3','-I','-B','-c',code]));
  assert(result.passed&&result.version==='3.2.2'&&result.serverGrantAbsent&&result.serverEndpointsAbsent&&result.normalClientPreparation&&result.completePackagedSource&&Object.keys(result.files).length>0);
  proofs.push({where,artifact:where==='host'?'host-dpkg':artifact,...result});
 }
 for(const i of q.items.filter(i=>i.status==='needs-review'&&i.id==='CVE-2026-49272'&&i.type==='debian'&&i.package==='python3-oauthlib')){
  if(i.scope==='host-os'){assert.equal(i.artifact,'host-dpkg');assert.equal(i.installed,inputs.host.version);assert.equal(i.containers.length,0);}
  else if(i.scope==='runtime-image'){if(i.artifact!==artifact)continue;assert.equal(i.installed,'3.2.2-1');assert.deepEqual(i.containers,s.containers);}
  else continue;
  decisions.push(validateDecision({key:i.key,status:'not-affected',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:'Upstream GHSA-3jp2-3mrg-2vxc identifies affected OAuthlib >=3.3.0 and a server DeviceCodeGrant implementation. This exact Debian 3.2.2 runtime has the device client only: complete installed Python source inventory contains no DeviceCodeGrant class, and its server grant/endpoints modules are not importable. Native client request preparation passes offline. The prior, separate client-identity security backport remains byte-verified. Debian still labels the source package vulnerable; that raw finding is retained. This is a precise component applicability review, not an upgrade or an OAuthlib-wide exception. Evidence: security-20261109/oauth/debian-component-review.json; '+input.source}));
 }
 assert.equal(read(root+'/security.json').completedAt,scan.completedAt);
 fs.writeFileSync(root+'/security-20261109/oauth/debian-component-review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,proofs,advisorySnapshotSha256:input.snapshotSha256,fixtureSha256:input.fixtureSha256,productionChanged:false},null,2)+'\n');
 console.log(JSON.stringify({prepared:decisions.length,applied:false}));
}else{
for(const i of q.items.filter(i=>i.status==='needs-review'&&i.id===inputs.advisory&&i.type==='debian'&&i.package==='python3-oauthlib')){
 if(i.scope==='host-os'){assert.equal(i.artifact,'host-dpkg');assert.equal(i.installed,inputs.host.version);assert.equal(i.containers.length,0);assert(host.native.passed&&host.native.identityMismatchRejected&&host.cloudInit==='native cloud-init OAuth1 signing passed');}
 else if(i.scope==='runtime-image'){if(i.artifact!==artifact)continue;assert.equal(i.installed,'3.2.2-1');assert.deepEqual(i.containers,s.containers);}
 else continue;
 decisions.push(validateDecision({key:i.key,status:'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:`Exact OAuthlib 3.2.2 two-file source backport of upstream c951a1d09f99f14e3240973fa83c4f4287d4753d client identity guard. Both baseline token grants reproduce authenticated low-client/high-scope confusion; fixed code rejects before grant/scope authorization. Thirteen offline grant/signature checks preserve legitimate clients, omitted client IDs and public password flow. Native Kuma account/data and crypto/Apprise consumers, plus the actual host cloud-init OAuth1 signing function, passed. Current live files equal pinned patched hashes; completed scoped releases and code-only source offer verified. Debian version labels remain unchanged, so raw finding remains. Only this advisory/artifact is covered; no JSONP or device-code fix claimed. Evidence: security-20261103/oauth-debian; https://security-tracker.debian.org/tracker/CVE-2026-118669`}));
}
assert.equal(read(root+'/security.json').completedAt,scan.completedAt);
fs.writeFileSync(dir+'/review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,originalImage:b.imageId,artifact,sourceSha256:source.sha256,files:s.files},null,2)+'\n');console.log(JSON.stringify({prepared:decisions.length,applied:false}));

}
