import test from 'node:test';
import assert from 'node:assert/strict';
import { oldEnough, retirableDangling, disposableCache } from './cleanup-selection.mjs';
const now = Date.parse('2026-10-28T00:00:00Z');
const image = () => ({ Id: 'sha256:' + 'a'.repeat(64), RepoTags: [], RepoDigests: [], Created: '2026-10-10T00:00:00Z' });
test('dangling retirement preserves references and recent or ambiguous images', () => {
  assert(retirableDangling(image(), new Set(), now));
  assert(!retirableDangling(image(), new Set([image().Id]), now));
  for (const changed of [{ RepoTags: ['rollback:pinned'] }, { RepoDigests: ['upstream@sha256:abc'] },
    { RepoTags: undefined }, { RepoDigests: undefined }, { Created: 'unknown' },
    { Created: '2026-10-29T00:00:00Z' }, { Created: '2026-10-22T00:00:00Z' }, { Id: 'abc' }]) {
    assert(!retirableDangling({ ...image(), ...changed }, new Set(), now), JSON.stringify(changed));
  }
});
test('unknown ages and zero-length units never establish old cache', () => {
  for (const age of ['unknown', 'yesterday', '0 months ago', '0 weeks ago', '11 hours ago']) assert(!oldEnough(age, 12));
  assert(oldEnough('12 hours ago', 12));
  assert(!oldEnough('6 days ago', 168)); assert(oldEnough('1 week ago', 168));
});
test('normal cleanup remains limited to large unshared reclaimable build records', () => {
  const row = { Reclaimable: true, Shared: false, Type: 'regular', LastUsedAt: '2 days ago' };
  assert(disposableCache(row, false, 60 * 1024 ** 2));
  assert(!disposableCache(row, false, 1024));
  for (const change of [{ Reclaimable: false }, { Shared: true }, { Type: 'source.local' }, { LastUsedAt: '1 hour ago' }])
    assert(!disposableCache({ ...row, ...change }, false, 60 * 1024 ** 2));
});
test('older build cleanup excludes active, recent, mutable cache mounts and helper records', () => {
  const row = { Reclaimable: true, Shared: true, Type: 'regular', LastUsedAt: '2 weeks ago' };
  assert(disposableCache(row, true, 1));
  assert(disposableCache({ ...row, Type: 'source.local' }, true, 1));
  for (const change of [{ Reclaimable: false }, { LastUsedAt: '6 days ago' },
    ...['exec.cachemount', 'frontend', 'internal', 'source.git.checkout', 'unknown'].map(Type => ({ Type }))])
    assert(!disposableCache({ ...row, ...change }, true, 1));
});
