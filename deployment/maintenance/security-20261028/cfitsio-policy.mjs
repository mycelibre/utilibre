import assert from 'node:assert/strict';

// A finite upstream bounds repair, not clearance of the entire FITS library.
export function proveCfitsio(inputs,source,s,b,v,a,replay,limitation) {
 assert(b.passed&&b.configurationUnchanged&&b.packageMetadataPreserved);
 assert.equal(b.base,s.base);assert.equal(b.candidate,s.candidate);
 assert.equal(b.librarySha256,inputs.librarySha256);
 assert.equal(b.fixtureSha256,inputs.fixtureSha256);
 assert.deepEqual(b.source,source);assert.equal(b.abiSymbols,1808);
 assert.deepEqual(b.changedFiles,[inputs.library]);
 assert(v.passed&&v.imageId===b.imageId);assert.deepEqual(v.changedPaths,b.changedFiles);
 assert(b.native.passed&&b.native.syntheticFilesOnly&&b.native.network===false);
 assert.deepEqual(b.native.rows.map(r=>r.imageId),[s.base,b.imageId]);
 assert(b.native.rows.every(r=>r.normal.passed&&r.normal.normalChecks===8&&r.normal.gdalFitsConsumer&&r.normal.fixedWidthBoundaryAccepted===28799));
 const [old,fixed]=b.native.rows;
 assert(!old.regression.passed&&!old.regression.oversizedRejected&&old.regression.exitCode===139);
 assert(fixed.regression.passed&&fixed.regression.oversizedRejected&&fixed.regression.status===108);
 assert(a.passed&&a.imageId===b.imageId&&a.network==='none'&&a.fictionalDataOnly&&a.nativeTypedDataAndIsolation&&a.logicalRestore);
 assert(replay.prepared&&replay.network===false&&replay.productionChanged===false);
 assert.deepEqual(replay.source,source);assert.equal(replay.nativeFixtureSourceSha256,inputs.sourceFixtureSha256);
 assert.equal(replay.librarySha256,inputs.librarySha256);assert(replay.libraryBytesIdentical);
 // Preserve this observed baseline failure explicitly; no silent acceptance
 // of a new regression or claim that the targeted patch repairs this path.
 assert(limitation.unresolved&&limitation.notIntroducedByPatch&&limitation.network===false);
 assert.deepEqual(limitation.rows.map(r=>r.imageId),[s.base,b.imageId]);
 assert(limitation.rows.every(r=>r.passed===false&&r.exit===139&&r.stderr==='Fictional string mismatch: requested=16384 returned=5752\n'));
}
