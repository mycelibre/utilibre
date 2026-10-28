import assert from 'node:assert/strict';

// APK rewrites header order, explicit empty dependencies and octal padding.
// Compare those representations semantically; retain file order/checksums.
export function packageRecord(block) {
 const lines=block.split('\n'),start=lines.findIndex(l=>l.startsWith('F:'));
 assert(start>=0,'Missing APK file inventory');
 const headers=lines.slice(0,start).filter(l=>!['D:','p:','k:0'].includes(l)).sort();
 const files=lines.slice(start).map(l=>l.replace(/^([aM]:\d+:\d+:)0+([0-7]+)$/, '$1$2'));
 return {headers,files};
}
export function unchangedPackages(before,after) {
 assert.deepEqual(Object.keys(before).sort(),Object.keys(after).sort());
 for(const name of Object.keys(before))if(name!=='ca-certificates-bundle')assert.deepEqual(packageRecord(before[name]),packageRecord(after[name]),'Unrelated package changed: '+name);
}
export function proveTrust(s,b,n,v,a,old,inputs,fixtureSha256) {
 assert(b.passed&&b.configurationUnchanged&&b.unrelatedPackagesUnchanged&&b.signedIndexVerified&&b.nativeApkInstall);
 assert.equal(b.base,s.base);assert.equal(b.version,inputs.version);assert.equal(b.bundleSha256,inputs.bundleSha256);
 assert.deepEqual(b.changedFiles,['/etc/apk/world','/etc/ssl/certs/ca-certificates.crt','/lib/apk/db/installed','/var/lib/db/sbom/ca-certificates-bundle-'+inputs.version+'.spdx.json']);
 assert(v.passed&&v.imageId===b.imageId);assert.deepEqual(v.changedPaths,b.changedFiles.map(p=>p==='/lib/apk/db/installed'?'/usr/lib/apk/db/installed':p).sort());
 assert(n.passed&&n.imageId===b.imageId);assert.equal(n.fixture.sourceSha256,fixtureSha256);assert.equal(n.fixture.compiler,inputs.compiler);
 assert.deepEqual(n.rows.map(r=>r.imageId),[s.base,b.imageId]);
 assert(n.rows.every(r=>r.passed&&r.ordinaryTrustedRootPassed&&r.reviewedRemovedRoots===3&&r.network===false));
 assert.deepEqual(n.rows.map(r=>r.removedRootsStillPresent),[3,0]);
 assert(a.passed&&a.imageId===b.imageId);
 if(s.key==='anubis') {
  assert(old.passed&&old.imageId===s.base);
  for(const r of [old,a])assert(r.nativeAllowAndDeny&&r.twoIndependentBrowserPowChallenges&&r.authenticatedReload&&r.externalBrowserCalls===0);
 }else{
  assert.equal(s.key,'mezzo');assert.deepEqual(a.checks.map(r=>r.imageId),[s.base,b.imageId]);
  assert(a.checks.every(r=>r.unsupportedProxyRejected&&Object.keys(r.staticAssets).length>0));
  assert.deepEqual(a.checks[0].staticAssets,a.checks[1].staticAssets);assert.equal(a.checks[0].version,a.checks[1].version);
 }
}
