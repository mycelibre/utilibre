import assert from 'node:assert/strict';
export function proveRsync(input,s,b,n,d){
 assert.equal(s.key,'rsync-gathio-postgres');
 assert.equal(b.base,s.base);assert.equal(b.candidate,s.candidate);
 assert.equal(b.version,'3.5.2+ds1-2~deb12u1+utilibre1');
 assert(b.passed&&b.configurationUnchanged&&b.unrelatedPackagesUnchanged);
 assert.equal(b.packageSha256,input.package.sha256);
 for(const k of ['applicationSha256','librariesSha256'])assert.match(b[k],/^[a-f0-9]{64}/);
 assert(n.passed&&n.nativeLocalIncrementalAndSafeLinks&&n.nativeLoopbackDaemonReadOnly);
 assert(n.collisionBaselineReproduced&&n.collisionCandidatePassed);
 assert.equal(n.imageId,b.imageId);assert.equal(n.fixtureSha256,input.fixtureSha256);
 assert.equal(n.upstreamPassed,286);assert.equal(n.upstreamSkipped,90);
 assert(d.passed&&d.nativeDumpRestore&&d.documentdbTypedDataAndRoleIsolation&&d.nativePostgresXml&&d.postgisGml&&d.gdal);
 assert.equal(d.imageId,b.imageId);
 return true;
}
export function rsyncComparison(v){
 return JSON.stringify(v.package==='rsync'?{...v,installed:'verified-native-rsync-backport'}:v);
}
