import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyGdalPackages, verifyGdalAbi, verifyDriverInventory } from './gdal-policy.mjs';
const old = 'libgdal32\t3.6.2+dfsg-1+b2\nlibc6\t2.36\npostgresql-17-postgis-3\tpatched\n';
const next = old.replace('3.6.2+dfsg-1+b2', '3.6.2+dfsg-1+utilibre1');
test('only the precise native library repair is permitted', () => {
  assert(verifyGdalPackages(old, next));
  for (const changed of [old, next.replace('2.36', '2.37'), next + 'extra\t1\n', next.replace('libc6\t2.36\n', ''), next + 'libc6\t2.36\n']) assert.throws(() => verifyGdalPackages(old, changed));
});
test('GDAL soname, dependencies, and exported ABI cannot change silently', () => {
  const a = { class: 'ELF64', machine: 'AMD x86-64', soname: 'libgdal.so.32', needed: ['libc.so.6'], exports: Array.from({ length: 1100 }, (_, i) => 'native_' + i) };
  assert(verifyGdalAbi(a, structuredClone(a)));
  for (const key of ['class', 'machine', 'soname', 'needed', 'exports']) assert.throws(() => verifyGdalAbi(a, { ...a, [key]: [] }));
  assert.throws(() => verifyGdalAbi({ ...a, exports: [] }, { ...a, exports: [] }));
});
test('a driver must be repaired, not disabled to hide a vulnerability', () => {
  const drivers = [...Array.from({ length: 110 }, (_, i) => 'Driver' + i), 'netCDF', 'HDF4', 'HDF4Image', 'GeoJSON', 'GTiff', 'PostgreSQL'].join('\n');
  assert.equal(verifyDriverInventory(drivers, drivers).length, 116);
  assert.throws(() => verifyDriverInventory(drivers, drivers.replace('HDF4\n', '')));
  assert.throws(() => verifyDriverInventory('netCDF', 'netCDF'));
});
