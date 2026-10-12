import assert from 'node:assert/strict';
export const gdalProbeCases = ['--valid', '--netcdf-malformed', '--hdf-swath-malformed', '--hdf-grid-malformed'];

export function verifyGdalPackages(before, after) {
  const parse = input => {
    const rows = input.trim().split('\n').map(line => {
      const fields = line.split('\t');
      assert.equal(fields.length, 2); assert(fields.every(Boolean)); return fields;
    });
    const result = new Map(rows); assert.equal(result.size, rows.length, 'Duplicate package'); return result;
  };
  const a = parse(before), b = parse(after);
  assert.equal(a.get('libgdal32'), '3.6.2+dfsg-1+b2');
  assert.equal(a.size, b.size, 'Package added or removed');
  for (const [name, version] of a) assert.equal(b.get(name), name === 'libgdal32' ? '3.6.2+dfsg-1+utilibre1' : version, 'Unexpected native package change: ' + name);
  return true;
}

export function verifyGdalAbi(before, after) {
  assert(before.exports.length > 1000, 'Incomplete GDAL export inventory');
  assert.equal(before.soname, 'libgdal.so.32');
  for (const key of ['class', 'machine', 'soname', 'needed', 'exports']) assert.deepEqual(after[key], before[key], 'GDAL ABI/dependency change: ' + key);
  return true;
}

export function verifyDriverInventory(before, after) {
  const a = before.trim().split('\n').sort(), b = after.trim().split('\n').sort();
  assert(a.length > 100); assert.equal(a.length, new Set(a).size);
  for (const required of ['netCDF', 'HDF4', 'HDF4Image', 'GeoJSON', 'GTiff', 'PostgreSQL']) assert(a.includes(required), 'Required native driver absent: ' + required);
  assert.deepEqual(b, a, 'Native driver support changed');
  return a;
}
