// Finite signed-vendor-package gate; approval is independent of scan results.
import assert from 'node:assert/strict';

export function proveLibraries(inputs, spec, proof, now = Date.now()) {
  const {build: b, scope, consumer: c, scan} = proof;
  assert.equal(inputs.schemaVersion, 1);
  assert.equal(spec.releaseApproval, 'approved');
  assert(!spec.ownerHold);
  assert(['static-nginx', 'node-runtime'].includes(spec.consumerProfile));
  assert(/^sha256:[a-f0-9]{64}$/.test(b.imageId));
  for (const p of [b, scope, c, scan]) {
    assert.equal(p.passed, true);
    assert.equal(p.base, spec.base);
    assert.equal(p.imageId, b.imageId);
  }
  assert.equal(b.candidate, spec.candidate);
  assert(b.configurationUnchanged && b.unrelatedPackagesUnchanged && b.applicationBytesUnchanged);
  assert(scope.allUnrelatedImageFilesUnchanged && scope.unrelatedApkRecordsUnchanged);
  assert(scope.muslUnchanged && scope.zlibAbiPreserved && scope.baselineExportedSymbols >= 80);
  const names = Object.keys(spec.packages).sort();
  assert.deepEqual(names, spec.consumerProfile === 'static-nginx' ? ['libxpm', 'zlib'] : ['zlib']);
  assert.deepEqual([...scope.packages].sort(), names);
  assert.deepEqual(b.pins, Object.keys(spec.packages).map(n => inputs.packages[n === 'zlib' ? spec.branch : spec.branch + '-' + n]));
  assert.equal(inputs.packages[spec.branch].version, '1.4-r0');
  assert.deepEqual(b.nativeFixture, inputs.nativeFixture);
  assert.deepEqual(b.nativeRows.map(r => r.imageId), [spec.base, b.imageId]);
  assert(b.nativeRows.every(r => r.passed && r.checks === 7));
  assert.deepEqual(c.nativeRows, b.nativeRows);
  assert.equal(c.profile, spec.consumerProfile);
  assert.deepEqual(c.rows.map(r => r.imageId), [spec.base, b.imageId]);
  assert(c.rows.every(r => r.passed && r.checks === (spec.consumerProfile === 'static-nginx' ? 9 : 11)));
  assert.deepEqual(c.rows.map(({imageId, ...r}) => r)[0], c.rows.map(({imageId, ...r}) => r)[1]);
  if (spec.consumerProfile === 'static-nginx') {
    assert.equal(inputs.packages[spec.branch + '-libxpm'].version, '3.5.20-r0');
    assert(scope.xpmAbi?.preserved);
    assert.deepEqual(c.xpmRows.map(r => r.imageId), [spec.base, b.imageId]);
    assert(c.xpmRows.every(r => r.passed));
  }
  assert(scan.nativeApkInventoryComplete && scan.targetedFindingRemoved);
  assert.equal(scan.newHighCritical, 0);
  assert.equal(scan.remainingHigh, 0);
  assert.equal(scan.remainingCritical, 0);
  assert.equal(scan.databaseSha256, inputs.databaseSha256);
  assert.equal(scan.baselineScanSha256, inputs.baselineScanSha256);
  assert(scan.baselineTargets.length > 0);
  const age = now - Date.parse(scan.advisoryUpdatedAt);
  assert(Number.isFinite(age) && age >= 0 && age < inputs.maximumDatabaseAgeHours * 3600000, 'Advisory snapshot is not current enough for release');
}
