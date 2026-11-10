// Exact stable-suite vendor overlays. No source patches, package resolution,
// service configuration changes, or automatic acceptance of scanner findings.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const file=p=>sha(fs.readFileSync(new URL(p,import.meta.url)));
export function proveDhiPayload(inputs,s,b,p){
 assert(['apt-penpot-frontend','apt-penpot-exporter'].includes(s.key));assert.equal(s.acquisition,'dhi');
 assert.equal(p.fixtureSha256,file('check-vendor-dhi.py'));assert.equal(p.imageId,b.imageId);assert.equal(p.base,s.base);
 assert(p.passed&&p.metadataPreserved&&!p.productionChanged&&p.network==='none');
 assert.deepEqual(p.rows.map(r=>r.package),['apt','libapt-pkg7.0']);
 for(const r of p.rows){
  const pin=inputs.packages[s.packages[r.package].package];assert.equal(r.archiveSha256,pin.sha256);assert.equal(r.version,'3.0.4+dhi0');
  assert(r.payloadExact&&r.files.length>10&&new Set(r.files.map(f=>f.path)).size===r.files.length);
  assert(r.files.every(f=>/^\/[A-Za-z0-9/_.+@:-]+$/.test(f.path)&&['file','symlink'].includes(f.type)));
  assert.equal(r.residual.path,'/var/lib/dpkg/status.d/'+r.package);assert.deepEqual(r.residual,s.residual[r.package]);
 }
 return true;
}
export function proveVendorDebian(inputs,s,b,c,scan,acquired,root){
 assert.equal(s.approval,'approved');
 assert.equal(b.base,s.base);assert.equal(b.candidate,s.candidate);
 assert(b.passed&&b.configurationUnchanged&&b.unrelatedPackagesUnchanged);
 const distroless=(s.evidenceKey||s.key)==='community-yopass';
 if(distroless){assert.equal(s.base,'sha256:b651453a70b02a6018788f6d71ccb6eb7fb4911b640346ab539ba0eff1c93d1b');assert.deepEqual(Object.keys(s.packages),['zlib1g']);}
 assert.equal(b.fixtureSha256,file(distroless?'vendor-yopass.py':'vendor-debian.mjs'));
 if(s.abiFixtureRevision){
  assert(!distroless);assert.equal(s.abiFixtureRevision,'21c74566a0fb3adc8148067b66add60d056dc891');
  const original=cp.execFileSync('git',['show',s.abiFixtureRevision+':deployment/maintenance/security-20261109/check-vendor-abi.py'],{cwd:new URL('../../../',import.meta.url),timeout:10000,maxBuffer:65536});
  assert.equal(c.fixtureSha256,sha(original));
 }else assert.equal(c.fixtureSha256,file(distroless?'vendor-yopass.py':'check-vendor-abi.py'));
 if(s.acquisition){
  assert(['ubuntu','dhi'].includes(s.acquisition));
  assert.equal(sha(fs.readFileSync(root+'/'+s.acquisition+'-acquisition/authenticated.json')),s.acquisitionSha256);
  if(s.acquisition==='ubuntu'){
   assert(['noble','jammy'].includes(s.suite));assert.equal(acquired.keySha256,'80a36b0a6de2f69f49d2df75ef473ccde121e9e190b9ea01d20a4f63778d5c31');
   assert(acquired.indexes.some(i=>i.distribution===s.suite+'-security'&&i.url.startsWith('https://security.ubuntu.com/ubuntu/')));
  }else{
   assert.equal(s.suite,'trixie');assert.equal(acquired.keySha256,'6f3fec0bd867abb05443bf0487f27426815ce2fa5d75e1136021560518ce78f3');
   assert(acquired.indexes.some(i=>i.distribution==='trixie'&&i.url==='https://dhi.io/deb/debian/main/dists/trixie/InRelease'));
   proveDhiPayload(inputs,s,b,JSON.parse(fs.readFileSync(root+'/vendor-debian/'+s.key+'/dhi-payload.json')));
  }
 }
 assert(c.passed&&c.abiPreserved&&c.neededPreserved&&c.network==='none');
 assert.equal(c.base,b.base);assert.equal(c.imageId,b.imageId);
 assert.deepEqual(c.nativeRows,b.nativeRows);
 const checks=(s.packages.apt?4:Object.keys(s.packages).some(p=>p.startsWith('libapt-'))?1:0)+(s.packages.zlib1g?7:0);
 assert.deepEqual(b.nativeRows.map(r=>r.imageId),[b.base,b.imageId]);
 assert(b.nativeRows.every(r=>r.passed&&r.checks===checks));
 const pins=Object.values(s.packages).map(p=>inputs.packages[p.package]);
 assert.deepEqual(b.pins,pins);
 for(const p of Object.values(s.packages)){
  const pin=inputs.packages[p.package];assert.deepEqual(pin,acquired.packages[p.package]);
  assert.equal(sha(fs.readFileSync(root+'/debian-acquisition/'+pin.file)),pin.sha256);
 }
 for(const path of new Set(c.abi.map(r=>r.path))){
  const rows=c.abi.filter(r=>r.path===path);assert.equal(rows.length,2);
  assert.deepEqual(rows.map(r=>r.imageId),[b.base,b.imageId]);
  assert(rows[0].symbols.length>50&&rows[0].symbols.every(s=>rows[1].symbols.includes(s)));
  assert.deepEqual(rows[0].needed,rows[1].needed);
 }
 assert(c.abi.length>=2);
 assert.equal(file('zlib-native.c'),inputs.fixture.sourceSha256);
 assert(scan.passed&&scan.newHighCritical===0);
 if(s.acquisition==='dhi'){
  assert(scan.primarySourceFixVerified);assert.equal(scan.payloadSha256,sha(fs.readFileSync(root+'/vendor-debian/'+s.key+'/dhi-payload.json')));
  assert.equal(scan.remainingTargetFindings.length,2);
  assert(scan.remainingTargetFindings.every(f=>f.id==='CVE-2026-109518'&&f.installed===s.residual[f.package]?.version));
 }else assert(scan.targetedFindingRemoved);
 assert.equal(scan.base,b.base);assert.equal(scan.imageId,b.imageId);
 assert.deepEqual(scan.advisories,inputs.advisories);
 assert(scan.baselineTargets.length>0&&scan.baselineTargets.every(t=>Object.hasOwn(s.packages,t.package)&&inputs.advisories.includes(t.id)));
}
