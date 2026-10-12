import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyPackageDelta, verifyAbi } from './policy.mjs';
const before = 'libc6\t2.36\nlibxml2\tpatched\nlibsqlite3-0\tpatched\npostgresql-17-postgis-3\t3.6.0\npostgresql-17-postgis-3-scripts\t3.6.0\n';
const after = before.replace('postgis-3\t3.6.0', 'postgis-3\t3.6.0+utilibre1');
test('one native package allowed; untouched patched siblings preserved', () => assert(verifyPackageDelta(before, after, '3.6.0+utilibre1')));
test('dependency downgrade, scripts update and removals rejected', () => {
  for (const s of [after.replace('libxml2\tpatched', 'libxml2\told'), after.replace('scripts\t3.6.0', 'scripts\t3.6.4'), after.replace('libc6\t2.36\n', ''), after + 'unexpected\t1\n']) assert.throws(() => verifyPackageDelta(before, s, '3.6.0+utilibre1'));
});
const abi = { exports: Array.from({ length: 101 }, (_, i) => 'sql_export_' + i), needed: ['libc.so.6', 'libproj.so.25'], machine: 'X86-64', class: 'ELF64' };
test('ABI requires exact exported SQL functions and dependency names', () => {
  assert(verifyAbi(abi, structuredClone(abi)));
  assert.throws(() => verifyAbi(abi, { ...abi, needed: [...abi.needed, 'libgdal39.so'] }));
  assert.throws(() => verifyAbi(abi, { ...abi, exports: abi.exports.slice(1) }));
  assert.throws(() => verifyAbi({ ...abi, exports: [] }, { ...abi, exports: [] }));
});
