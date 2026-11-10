import assert from'node:assert/strict';
export function proveZlibBookworm(inputs,s,b,n,source){
 assert.equal(s.installed,'1:1.2.13.dfsg-1');assert.equal(s.version,'1:1.2.13.dfsg-1+utilibre1');
 assert.deepEqual(s.packages,{'zlib1g':s.installed});assert.equal(b.base,s.base);assert.equal(b.candidate,s.candidate);
 assert(b.passed&&b.configurationUnchanged&&b.unrelatedPackagesUnchanged&&b.applicationSha256);
 assert.equal(b.sourceReceiptSha256,inputs.sourceReceiptSha256);assert.deepEqual(b.package,source.packages.zlib1g);
 assert(source.passed&&source.nativePackagingUnchanged&&source.baselineWriteStateFailure&&source.candidateSanitizersPassed&&source.gzVacateAbsent);
 assert(source.baselineSanitizerFailure.includes('gz_write:222'));
 assert.deepEqual(source.upstreamSuites,['static','shared','64-bit']);
 assert(n.passed&&n.abiPreserved&&n.neededPreserved&&n.network==='none');assert.equal(n.base,b.base);assert.equal(n.imageId,b.imageId);
 assert.deepEqual(n.fixtures,source.fixtures);assert.equal(n.rows.length,2);assert.deepEqual(n.rows.map(r=>r.imageId),[b.base,b.imageId]);
 assert(n.rows.every(r=>r.passed&&r.normalChecks===7));assert.equal(n.sourceRegressionEvidence,'retained native build receipt; not rerun in each application');
 assert(b.fullImageScopeVerified);assert.match(b.scopeSha256,/^[a-f0-9]{64}$/);
 assert.equal(n.abi[1].sha256,b.librarySha256);assert.deepEqual(n.abi[0].symbols,n.abi[1].symbols);assert.deepEqual(n.abi[0].needed,n.abi[1].needed);
 return true;
}
export function zlibBookwormComparison(v){return JSON.stringify(v.package==='zlib1g'?{...v,installed:'verified-native-zlib-bookworm'}:v);}
export function zlibBookwormRelease(inputs,s,b,scan,scope,identities){
 assert.equal(s.releaseApproval,'approved');assert.equal(s.dataMigration,false);
 assert.equal(s.releaseScope,'system-zlib-library-only');
 assert.equal(identities.source,inputs.sourceReceiptSha256);
 for(const k of ['preparer','scopeChecker','exporter'])assert.equal(identities[k],inputs.verification[k]);
 assert.equal(identities.scope,b.scopeSha256);
 assert(scope.passed&&scope.allUnrelatedImageFilesUnchanged&&scope.unrelatedDpkgRecordsUnchanged);
 assert.equal(scope.base,s.base);assert.equal(scope.imageId,b.imageId);
 assert.equal(scope.fixtureSha256,inputs.verification.scopeChecker);
 assert.equal(scope.exporterSha256,inputs.verification.exporter);
 assert(scan.passed&&scan.primarySourceFixVerified&&scan.newHighCritical===0);
 assert.equal(scan.base,b.base);assert.equal(scan.imageId,b.imageId);
 assert.deepEqual(scan.advisories,inputs.advisories);
 return true;
}
