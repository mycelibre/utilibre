// Exact stable-suite vendor overlays. No source patches, package resolution,
// service configuration changes, or automatic acceptance of scanner findings.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const file=p=>sha(fs.readFileSync(new URL(p,import.meta.url)));
export function proveVendorDebian(inputs,s,b,c,scan,acquired,root){
 assert.equal(s.approval,'approved');
 assert.equal(b.base,s.base);assert.equal(b.candidate,s.candidate);
 assert(b.passed&&b.configurationUnchanged&&b.unrelatedPackagesUnchanged);
 const distroless=(s.evidenceKey||s.key)==='community-yopass';
 if(distroless){assert.equal(s.base,'sha256:b651453a70b02a6018788f6d71ccb6eb7fb4911b640346ab539ba0eff1c93d1b');assert.deepEqual(Object.keys(s.packages),['zlib1g']);}
 assert.equal(b.fixtureSha256,file(distroless?'vendor-yopass.py':'vendor-debian.mjs'));
 assert.equal(c.fixtureSha256,file(distroless?'vendor-yopass.py':'check-vendor-abi.py'));
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
 assert(scan.passed&&scan.targetedFindingRemoved&&scan.newHighCritical===0);
 assert.equal(scan.base,b.base);assert.equal(scan.imageId,b.imageId);
 assert.deepEqual(scan.advisories,inputs.advisories);
 assert(scan.baselineTargets.length>0&&scan.baselineTargets.every(t=>Object.hasOwn(s.packages,t.package)&&inputs.advisories.includes(t.id)));
}
