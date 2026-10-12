#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const s = JSON.parse(readFileSync(new URL('spec.json', import.meta.url))), w = s.work, tree = w + '/gdal-tree';
const fixes = [
  { file: 'gdal-sw', id: 'CVE-2026-8086', commit: '9491e794f1757f08063ea2f7a274ad2994afa636', sha256: '808e143ed48d576d39783e2b25d15cb62d11c2aaf42eaee1908741c1da74d053', paths: ['frmts/hdf4/hdf-eos/SWapi.c'] },
  { file: 'gdal-gd', id: 'CVE-2026-8087', commit: '184f77dbcc74118c062c05e464c88161d3c37b9b', sha256: '18608c18a907d20a6d716fc69c8284ced5121ac318fcc4025a19d9cde85bdb8e', paths: ['frmts/hdf4/hdf-eos/GDapi.c'] },
  { file: 'gdal-netcdf', id: 'CVE-2026-49014', commit: 'c49254dc6380af2f02ff43ca79e3cf7c1bc82f01', sha256: '3268e82995799b4b1b7cd4abbc4a678e10ad999026393ff6b15eebae3cc0114f', paths: ['frmts/netcdf/netcdfdataset.cpp', 'frmts/netcdf/netcdfdataset.h', 'frmts/netcdf/netcdfsg.cpp'] },
];
const hash = x => createHash('sha256').update(x).digest('hex');
function once(text, from, to) { assert.equal(text.split(from).length, 2, 'Unique reviewed context required: ' + from.slice(0, 65)); return text.replace(from, to); }
let series = readFileSync(tree + '/debian/patches/series', 'utf8');
assert(!series.includes('CVE-2026-'));
for (const f of fixes) {
  const response = await fetch(`https://github.com/OSGeo/gdal/commit/${f.commit}.patch`); assert(response.ok);
  const original = Buffer.from(await response.arrayBuffer()); assert.equal(hash(original), f.sha256);
  writeFileSync(w + '/gdal-source/' + f.file + '-upstream.patch', original);
  let patch = original.toString().split(/(?=^diff --git )/m).slice(1).filter(x => f.paths.some(p => x.startsWith('diff --git a/' + p + ' '))).join('');
  assert.equal((patch.match(/^diff --git /gm) || []).length, f.paths.length);
  if (f.file === 'gdal-netcdf') {
    // Four context-only differences between 3.6.2 and the upstream fix. Keep
    // the installed branch's expressions unchanged. No hunk is discarded.
    patch = once(patch, '                 if (val != pszValue)', '                 if (val != oParam.valueStr)');
    patch = once(patch, '@@ -8459,22 +8437,12 @@ GDALDataset *netCDFDataset::Open(GDALOpenInfo *poOpenInfo)\n         }\n     }', '@@ -8459,22 +8437,12 @@ GDALDataset *netCDFDataset::Open(GDALOpenInfo *poOpenInfo)\n         poDS->bSGSupport = false;\n     }');
    patch = once(patch, '     bool bYXBandOrder = false;\n     if (nd == 3)', '     if (nd >= 2 && bCheckDims)\n     {');
    patch = once(patch, '@@ -19,36 +19,6 @@\n \n namespace nccfdriver', '@@ -19,36 +19,6 @@\n #include "netcdfsg.h"\n namespace nccfdriver');
    // GDAL 3.6.2 uses C++11: mutable string::data() is C++17-only. The strings
    // retain upstream's checked size/type allocation and identical contents.
    patch = once(patch, '+                                      osValue.data()) != NC_NOERR;', '+                                      &osValue[0]) != NC_NOERR;');
    patch = once(patch, '+                if (nc_inq_varname(this->nc, curr, property_name.data()) !=', '+                if (nc_inq_varname(this->nc, curr, &property_name[0]) !=');
  }
  const name = f.id + '.patch'; writeFileSync(tree + '/debian/patches/' + name, patch);
  const dry = execFileSync('docker', ['exec', 'maintenance-postgis-native-20261012', 'patch', '--batch', '--fuzz=0', '-p1', '-d', '/work/gdal-tree', '-i', '/work/gdal-tree/debian/patches/' + name, '--dry-run'], { encoding: 'utf8' });
  assert(!/FAILED|fuzz|malformed/.test(dry));
  writeFileSync(w + '/gdal-source/' + f.id + '-dry-run.log', dry);
  f.appliedSha256 = hash(patch); series = series.trimEnd() + '\n' + name + '\n';
}
writeFileSync(tree + '/debian/patches/series', series);
const prefix = `gdal (3.6.2+dfsg-1+utilibre1) bookworm; urgency=high\n\n  * Backport upstream netCDF attribute validation and HDF4-EOS bounds fixes\n    for CVE-2026-49014, CVE-2026-8086 and CVE-2026-8087.\n  * Preserve libgdal32 ABI and Debian build settings.\n\n -- Utilibre maintenance <admin@utilibre.org>  Mon, 12 Oct 2026 13:20:00 +0000\n\n`;
writeFileSync(tree + '/debian/changelog', prefix + readFileSync(tree + '/debian/changelog', 'utf8'));
execFileSync('docker', ['exec', '-w', '/work/gdal-tree', 'maintenance-postgis-native-20261012', 'dpkg-source', '--before-build', '.'], { encoding: 'utf8' });
writeFileSync(w + '/gdal-source/applied-provenance.json', JSON.stringify({ date: new Date().toISOString(), fixes, adaptations: 'netCDF: four exact context-only adaptations plus two equivalent C++11 mutable-string bindings; no driver or security hunk omitted.' }, null, 2) + '\n');
console.log('Three native driver backports applied with zero fuzz; no drivers disabled.');
