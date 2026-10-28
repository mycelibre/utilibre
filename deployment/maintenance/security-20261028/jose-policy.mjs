import assert from 'node:assert/strict';
// This adapter approves one named module at known versions, never a major update.
export function verifyModuleDelta(before, after, previous, sum) {
  assert(['v4.1.4', 'v4.1.5'].includes(previous), 'Unsupported baseline');
  assert(/^h1:[A-Za-z0-9+/]{43}=$/.test(sum), 'Missing module checksum');
  const prefix = 'dep\tgithub.com/go-jose/go-jose/v4\t';
  const selected = before.filter(line => line.startsWith(prefix));
  assert(selected.length <= 1, 'Ambiguous module inventory');
  if (selected.length) assert(selected[0].startsWith(prefix + previous + '\t'), 'Unexpected installed version');
  const expected = before.map(line => line.startsWith(prefix) ? prefix + 'v4.1.6\t' + sum : line).sort();
  assert.deepEqual([...after].sort(), expected, 'Unreviewed dependency drift');
}
