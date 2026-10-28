// Exact compiled RSA backport; no waiver for other JOSE uses or image descendants.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {additionalOverlayReceipts} from '../followup-overlays.mjs';
import {compressionRebuildHash, zodPreservesBinary} from './jose-rebuild-proof.mjs';
import {freshScan,overlayRows} from '../review-native-backports.mjs';import {validateDecision} from '../triage.mjs';
process.umask(0o077);
const leaf=process.argv[2]==='--leaf';assert(!process.argv[2]||leaf);
const profile=leaf?'jose-leaf':'jose-caddy',root='/var/lib/utilibre-maintenance',dir=root+'/security-20261028/'+profile,read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const inputs=read(new URL('./'+profile+'-inputs.json',import.meta.url)),spec=read(new URL('./jose-v3-inputs.json',import.meta.url));
const scan=read(root+'/security.json'),queue=read(root+'/security-queue.json');freshScan(queue,scan);assert.equal(scan.status,'checked');
const release=read(dir+'/release.json');assert.equal(release.status,'passed');const roles=overlayRows(release),decisions=[];
assert.equal(sha(fs.readFileSync(new URL('./jose-v3-rsa.patch',import.meta.url))),spec.patchSha256);
assert.equal(sha(fs.readFileSync(leaf?root+'/security-20261028/jose/regression/v3-fixed/jwk.go':dir+'/input/jose-v3-jwk.go')),spec.afterSha256);
const regression=read(root+'/security-20261028/jose/v3-regression.json');assert(regression.passed&&regression.patchSha256===spec.patchSha256);assert.equal(regression.rows[0].modulusBoundaryRejected,false);assert.equal(regression.rows[1].modulusBoundaryRejected,true);assert(regression.rows.every(r=>r.passedTests===262));
const docker=(...a)=>cp.execFileSync('docker',a,{encoding:'utf8',timeout:20000,stdio:['ignore','pipe','pipe']}).trim();
// Distroless consumers intentionally contain no shell or checksum utility.
// Read the live binary without adding tools or changing the container.
function liveHash(name,binary){const temporary=fs.mkdtempSync(dir+'/live-binary-read-');try{docker('cp',name+':'+binary,temporary+'/binary');return sha(fs.readFileSync(temporary+'/binary'));}finally{fs.rmSync(temporary,{recursive:true});}}
for(const s of inputs.rows){
 const b=read(dir+'/'+s.key+'/build.json'),v=read(dir+'/'+s.key+'/inventory.json'),g=read(dir+'/'+s.key+'/scan-gate.json');assert(b.passed&&b.configurationUnchanged&&b.joseV3Backport&&(leaf?b.dependencyUpdate.to==='v4.1.6':b.joseV4Release==='v4.1.6')&&b.native.passed);assert(v.passed&&g.passed&&g.newHighCritical===0&&g.targetedFindingRemoved);assert.equal(v.imageId,b.imageId);assert.equal(g.imageId,b.imageId);assert.equal(b.base,s.base);assert.deepEqual(v.changedPaths,b.changedFiles);
 if(!leaf){const native=read(dir+'/'+(s.key==='caddy-wishlist'?'wishlist-stage':'newsletters-stage')+'.json');if(s.key==='caddy-wishlist')assert(native.imageId===b.imageId&&native.nativeAccountCreated&&native.anonymousListDenied);else assert(native.status==='passed'&&[native.webImage,native.smtpImage].includes(b.imageId)&&native.isolatedSmtpAccepted);}else{assert(b.joseV3Evidence.passed&&b.joseV3Evidence.patchSha256===spec.patchSha256);if(s.key==='oauth2-proxy')assert(b.native.networkIsolated&&b.native.nativeDiscoveryAuthorizationCodePkceAndSignedIdToken);else assert(s.key==='wakapi'&&b.native.passed);}
 const descendants=additionalOverlayReceipts.filter(f=>fs.existsSync(root+'/'+f)).flatMap(f=>overlayRows(read(root+'/'+f))).filter(r=>s.containers.includes(r.name)).sort((a,b)=>Date.parse(a.completedAt)-Date.parse(b.completedAt));
 // Follow each role independently; shared SMTP/jobs must end at the same exact
 // artifact. Every role still requires its own successful release and live hash.
 const artifacts=s.containers.map(name=>{let current=b.imageId;for(const r of descendants.filter(r=>r.name===name))if(r.oldImage===current&&r.oldImage!==r.newImage){assert(Date.parse(r.completedAt)<=Date.parse(scan.date));current=r.newImage;}return current;});
 assert.equal(new Set(artifacts).size,1,'Shared roles diverged');const artifact=artifacts[0];
 let hash=b.binaries.find(x=>x.path===s.binary).binarySha256,proofProfile=profile;
 if(!leaf){
  const next=read(new URL('./codec-caddy-inputs.json',import.meta.url)).rows.find(row=>row.key===s.key),nextDir=root+'/security-20261028/codec-caddy';
  if(next&&fs.existsSync(nextDir+'/'+s.key+'/build.json')){
   const rebuilt=read(nextDir+'/'+s.key+'/build.json');
   let preservedZod=false;
   if(rebuilt.imageId!==artifact && s.key==='caddy-wishlist'){
    const z=read(new URL('./zod-inputs.json',import.meta.url)).rows.find(row=>row.key==='wishlist'),zd=root+'/security-20261028/zod/wishlist';
    if(z&&z.base===rebuilt.imageId&&fs.existsSync(zd+'/build.json')){
     const zb=read(zd+'/build.json');
     if(zb.imageId===artifact)preservedZod=zodPreservesBinary({expected:z,artifact,build:zb,inventory:read(zd+'/inventory.json'),gate:read(zd+'/scan-gate.json'),binary:s.binary});
    }
   }
   if(rebuilt.imageId===artifact||preservedZod){
    const source={patchSha256:sha(fs.readFileSync(nextDir+'/input/jose-v3.patch')),afterSha256:sha(fs.readFileSync(nextDir+'/input/jose-v3-jwk.go')),noticePatchSha256:sha(fs.readFileSync(nextDir+'/artifact/notices/jose-v3.patch')),compilerOutputSha256:sha(fs.readFileSync(nextDir+'/artifact/caddy'))};
    hash=compressionRebuildHash({expected:next,artifact:rebuilt.imageId,build:rebuilt,inventory:read(nextDir+'/'+s.key+'/inventory.json'),gate:read(nextDir+'/'+s.key+'/scan-gate.json'),source,spec});
    const currentRelease=read(nextDir+'/release.json');assert.equal(currentRelease.status,'passed');
    for(const name of s.containers)assert(overlayRows(currentRelease).some(row=>row.name===name&&row.oldImage===next.base&&row.newImage===rebuilt.imageId&&Date.parse(row.completedAt)<=Date.parse(scan.date)));
    const native=read(nextDir+'/'+(s.key==='caddy-wishlist'?'wishlist-stage':'newsletters-stage')+'.json');
    if(s.key==='caddy-wishlist')assert(native.imageId===rebuilt.imageId&&native.nativeAccountCreated&&native.anonymousListDenied);
    else assert(native.status==='passed'&&[native.webImage,native.smtpImage].includes(rebuilt.imageId)&&native.isolatedSmtpAccepted);
    proofProfile=preservedZod?'zod/wishlist (unchanged Caddy); codec-caddy':'codec-caddy';
   }
  }
 }
 for(const name of s.containers){const r=roles.find(r=>r.name===name);assert(r&&r.newImage===b.imageId&&r.oldImage===s.base&&Date.parse(r.completedAt)<=Date.parse(scan.completedAt));assert.equal(docker('inspect','--format','{{.Image}}',name),artifact);assert.equal(liveHash(name,s.binary),hash);}
 for(const item of queue.items.filter(i=>i.status==='needs-review'&&i.scope==='runtime-image'&&i.id==='CVE-2026-116587'&&i.type==='gobinary'&&i.package==='github.com/go-jose/go-jose/v3'&&i.installed==='v3.0.5'&&i.artifact===artifact&&'/'+i.target.replace(/^\/+/, '')===s.binary)){
  assert.deepEqual([...item.containers].sort(),[...s.containers].sort());decisions.push(validateDecision({key:item.key,status:'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:`Exact upstream RSA modulus and prime-product bounds from a0111f82742fa92bceec9ede40845e73319e6230 backported to go-jose/v3 3.0.5 jwk.go. Patch SHA-256 ${spec.patchSha256}; pre/post source identity checked before offline ${leaf?s.key:"Caddy"} compilation. Full v3 native suites (262 checks each), bounded missing-limit baseline and fixed rejection, unchanged modules except reviewed v4.1.6, isolated ${leaf?s.key+" native account/authorization":"proxy/TLS/HTTP2 and application workflow"} checks passed. Whole-image changed-file scope, complete release and live binary SHA-256 ${hash} verified in every declared role. Version metadata remains 3.0.5, so raw scanner finding is retained. Only this advisory, binary and exact image; no exception for v3 in other consumers. Evidence: security-20261028/${profile}/${s.key}/ and security-20261028/${proofProfile}/${s.key}/.`}));
 }
}
fs.writeFileSync(dir+'/review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions},null,2)+'\n');console.log(JSON.stringify({prepared:decisions.length,applied:false}));
