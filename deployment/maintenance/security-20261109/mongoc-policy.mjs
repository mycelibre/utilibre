import assert from 'node:assert/strict';

export function proveMongocSource(input, s, build) {
  assert.equal(input.schemaVersion, 1);
  assert.equal(input.advisory, 'CVE-2026-120956');
  assert.deepEqual(input.cursor.pins.map(p => p.revision), [
    '9e5423f882089c2fbede5cafd5a1fee1bab58780',
    '4fdc5d553801fcde7bd5c86370917cc4ac704f54',
  ]);
  assert.deepEqual(input.cursor.files, ['src/libmongoc/src/mongoc/mongoc-cursor.c']);
  assert.equal(input.cursor.afterSha256, '12dde11bafadcb30ea25bdffb533863708fee29431d81fd2c757691a3a6870e8');
  assert.equal(build.base, s.base);
  assert.equal(build.candidate, s.candidate);
  assert(build.passed && build.configurationUnchanged && build.packageMetadataPreserved);
  assert.deepEqual(build.changedFiles, [input.library]);
  assert.match(build.imageId, /^sha256:[a-f0-9]{64}$/);
  const n = build.native;
  assert(n.passed && n.abiPreserved && n.neededPreserved);
  assert.equal(n.compiler, input.compiler);
  assert.equal(n.sourceTreeSha256, input.sourceTreeSha256);
  assert.equal(n.cursorSha256, input.cursor.afterSha256);
  assert.equal(n.previousLibrarySha256, input.previousLibrarySha256);
  assert.equal(n.librarySha256, build.librarySha256);
  assert.equal(n.excessiveInputReproduction, false);
  assert.equal(n.byteReproducibilityClaimed, false);
  assert.deepEqual(n.rows.map(r => r.state), ['before', 'after']);
  assert(n.rows.every(r => r.passed && r.ordinaryConsumer && r.network === 'none'));
  return true;
}

export function proveMongocRelease(input, s, build, inventory, application, scan) {
  proveMongocSource(input, s, build);
  assert.equal(s.approval, 'approved');
  assert(inventory.passed && inventory.imageId === build.imageId);
  assert.deepEqual(inventory.changedPaths, [input.library]);
  assert(application.passed && application.imageId === build.imageId);
  assert.equal(application.fixtureSha256, input.fixtures.relaySha256);
  assert(application.result.passed && application.result.image === build.imageId);
  assert(scan.passed && scan.imageId === build.imageId && scan.base === s.base);
  assert(scan.primarySourceFixVerified && scan.newHighCritical === 0);
  assert.deepEqual(scan.advisories, [input.advisory]);
  assert.match(scan.databaseSha256, /^[a-f0-9]{64}$/);
  return true;
}
