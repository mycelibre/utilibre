import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export function verifyV3BuildInput(lock, fixed) {
  const rows=lock.split('\n').filter(line=>line.trim().startsWith('github.com/go-jose/go-jose/v3 '));
  assert.equal(rows.length,1,'Missing or ambiguous JOSE v3 input');
  assert.match(rows[0].trim(),/^github\.com\/go-jose\/go-jose\/v3 v3\.0\.5(?: \/\/ indirect)?$/,'Unsupported JOSE v3 revision');
  assert.equal(createHash('sha256').update(fixed).digest('hex'),'7593d1576566ed8330ceb98c8f0d077a82e6ab2fa5801f60abd24533e1e9293b','Unreviewed JOSE v3 repair bytes');
  return true;
}
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
// Vendored builds retain module versions but omit module sums in build-info.
// The build separately verifies the module cache/locks before exact v3 patching.
export function verifyVendorModuleDelta(before, after, previous, sum) {
  assert(before.every(x=>x.startsWith('dep\t')) && after.every(x=>x.startsWith('dep\t')), 'Unexpected replacement');
  const normalize=rows=>rows.map(x=>x.split('\t').slice(0,3).join('\t')+'\t'+sum);
  verifyModuleDelta(normalize(before),normalize(after),previous,sum);
}
