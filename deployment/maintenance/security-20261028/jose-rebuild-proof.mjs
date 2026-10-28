// Only the declared compression rebuild may replace an already-reviewed JOSE
// binary. An arbitrary descendant receipt is not evidence of patch preservation.
import assert from 'node:assert/strict';

export function compressionRebuildHash({expected, artifact, build, inventory, gate, source, spec}) {
  assert.equal(build.base, expected.base);
  assert.equal(build.imageId, artifact);
  assert(build.passed && build.configurationUnchanged && build.joseV3Backport);
  assert.equal(build.joseV4Release, 'v4.1.6');
  assert(build.unrelatedDependenciesUnchanged);
  assert.deepEqual(build.dependencyUpdate, {
    dependency: 'github.com/klauspost/compress', from: 'v1.20.1', to: 'v1.20.2',
  });
  assert(build.native.passed && build.native.nativeProxy && build.native.http2);
  assert.equal(build.native.imageId, artifact);
  assert(inventory.passed && gate.passed && gate.primarySourceFixVerified);
  assert.equal(gate.newHighCritical, 0);
  assert.equal(gate.base, expected.base);
  assert.equal(gate.imageId, artifact);
  assert.equal(inventory.imageId, artifact);
  assert.deepEqual(inventory.changedPaths, build.changedFiles);
  assert.equal(source.patchSha256, spec.patchSha256);
  assert.equal(source.afterSha256, spec.afterSha256);
  assert.equal(source.noticePatchSha256, spec.patchSha256);
  const binaries = build.binaries.filter(row => row.path === expected.binary);
  assert.equal(binaries.length, 1);
  assert.match(binaries[0].binarySha256, /^[a-f0-9]{64}$/);
  assert.equal(source.compilerOutputSha256, binaries[0].binarySha256);
  return binaries[0].binarySha256;
}

export function zodPreservesBinary({expected, artifact, build, inventory, gate, binary}) {
  assert.equal(build.base, expected.base);
  assert.equal(build.imageId, artifact);
  assert(build.passed && build.configurationUnchanged && build.unchangedOtherAppFiles > 0);
  assert.equal(build.packages.length, 1);
  assert.equal(build.packages[0].name, 'zod');
  assert.equal(build.packages[0].version, '4.6.6');
  assert.deepEqual(build.packages[0].paths, expected.paths.zod);
  assert(inventory.passed && gate.passed && gate.targetedFindingRemoved);
  assert.equal(inventory.imageId, artifact);
  assert.equal(gate.imageId, artifact);
  assert.equal(gate.base, expected.base);
  assert.equal(gate.newHighCritical, 0);
  assert.equal(inventory.changedPaths.length, build.changedFiles);
  assert(inventory.changedPaths.length > 0);
  for (const path of inventory.changedPaths) {
    assert.notEqual(path, binary);
    assert(expected.paths.zod.some(root => path.startsWith(root + '/')));
  }
  return true;
}
