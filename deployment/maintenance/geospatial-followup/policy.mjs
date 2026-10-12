import assert from 'node:assert/strict';
export const allowedPackage = 'postgresql-17-postgis-3';
export function verifyPackageDelta(before, after, expectedVersion) {
  const parse = s => new Map(s.trim().split('\n').map(line => {
    const row = line.split('\t'); assert.equal(row.length, 2); assert(row.every(Boolean)); return row;
  }));
  const a = parse(before), b = parse(after);
  assert(a.has(allowedPackage) && b.has(allowedPackage));
  assert.equal(a.size, b.size, 'Package added or removed');
  for (const [name, version] of a) assert.equal(b.get(name), name === allowedPackage ? expectedVersion : version, 'Unexpected package change: ' + name);
  assert.notEqual(a.get(allowedPackage), expectedVersion, 'No actual native package upgrade');
  return true;
}
export function verifyAbi(before, after) {
  assert(before.exports.length > 100, 'Empty/incomplete ELF inspection');
  assert.deepEqual(after.exports, before.exports, 'Native SQL-export ABI changed');
  assert.deepEqual(after.needed, before.needed, 'Native runtime dependency boundary changed');
  assert.equal(after.machine, before.machine, 'Machine architecture changed');
  assert.equal(after.class, before.class, 'ELF class changed');
  return true;
}
