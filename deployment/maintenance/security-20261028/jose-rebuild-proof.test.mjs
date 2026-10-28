import test from 'node:test';
import assert from 'node:assert/strict';
import {compressionRebuildHash} from './jose-rebuild-proof.mjs';
const fixture = () => ({
  expected: {base: 'sha256:old', binary: '/usr/bin/caddy'}, artifact: 'sha256:new',
  build: {base: 'sha256:old', imageId: 'sha256:new', passed: true,
    configurationUnchanged: true, joseV3Backport: true, joseV4Release: 'v4.1.6',
    unrelatedDependenciesUnchanged: true,
    dependencyUpdate: {dependency: 'github.com/klauspost/compress', from: 'v1.20.1', to: 'v1.20.2'},
    native: {passed: true, nativeProxy: true, http2: true, imageId: 'sha256:new'},
    changedFiles: ['/usr/bin/caddy'], binaries: [{path: '/usr/bin/caddy', binarySha256: 'a'.repeat(64)}]},
  inventory: {passed: true, imageId: 'sha256:new', changedPaths: ['/usr/bin/caddy']},
  gate: {passed: true, primarySourceFixVerified: true, newHighCritical: 0, base: 'sha256:old', imageId: 'sha256:new'},
  source: {patchSha256: 'patch', afterSha256: 'fixed', noticePatchSha256: 'patch', compilerOutputSha256: 'a'.repeat(64)},
  spec: {patchSha256: 'patch', afterSha256: 'fixed'},
});
test('exact compression rebuild retains the compiled JOSE patch proof', () => {
  assert.equal(compressionRebuildHash(fixture()), 'a'.repeat(64));
});
test('unreviewed descendant, changed source, scope, dependency or failed gate is rejected', () => {
  for (const change of [
    r => r.artifact = 'sha256:other', r => r.expected.base = 'sha256:other',
    r => r.source.afterSha256 = 'unpatched', r => r.source.noticePatchSha256 = 'other', r => r.source.compilerOutputSha256 = 'b'.repeat(64),
    r => r.build.joseV3Backport = false, r => r.build.dependencyUpdate.to = 'v1.21.0',
    r => r.inventory.changedPaths.push('/app/unrelated'), r => r.gate.passed = false,
    r => r.gate.newHighCritical = 1, r => r.build.native.http2 = false,
    r => r.build.binaries.push({...r.build.binaries[0]}),
  ]) {const r = fixture(); change(r); assert.throws(() => compressionRebuildHash(r));}
});
