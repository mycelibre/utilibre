import test from 'node:test';
import assert from 'node:assert/strict';
import {compressionRebuildHash, zodPreservesBinary} from './jose-rebuild-proof.mjs';
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
const overlay = () => ({expected:{base:'sha256:codec', paths:{zod:['/app/zod']}},
  artifact:'sha256:zod', binary:'/usr/bin/caddy',
  build:{base:'sha256:codec',imageId:'sha256:zod',passed:true,configurationUnchanged:true,
    unchangedOtherAppFiles:20,changedFiles:1,packages:[{name:'zod',version:'4.6.6',paths:['/app/zod']}]},
  inventory:{passed:true,imageId:'sha256:zod',changedPaths:['/app/zod/index.js']},
  gate:{passed:true,targetedFindingRemoved:true,newHighCritical:0,base:'sha256:codec',imageId:'sha256:zod'}});
test('exact Zod overlay can preserve the previously proven binary', () => {
  assert(zodPreservesBinary(overlay()));
});
test('binary changes, unrelated edits and incomplete overlay proof fail closed', () => {
  for (const change of [r=>r.inventory.changedPaths[0]='/usr/bin/caddy',
    r=>r.inventory.changedPaths[0]='/app/zod-lookalike/index.js',
    r=>r.inventory.imageId='wrong',r=>r.build.base='wrong',r=>r.build.packages[0].version='4.7.0',
    r=>r.gate.passed=false,r=>r.gate.newHighCritical=1,r=>r.build.changedFiles=2]) {
    const r=overlay();change(r);assert.throws(()=>zodPreservesBinary(r));
  }
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
