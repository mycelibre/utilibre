#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gdalProbeCases } from './gdal-policy.mjs';
process.umask(0o077);
const s = JSON.parse(readFileSync(new URL('spec.json', import.meta.url))), w = s.work;
const image = 'sha256:c20d59a84f6e3921666e5aa4f26323673f79c1959911ea7c1577db182c4d3d6d';
const args = ['run', '--rm', '--network', 'none', '--read-only', '--cpus', '.5', '--memory', '256m', '--memory-swap', '256m', '--pids-limit', '32', '--log-driver', 'none', '--ulimit', 'core=0', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--tmpfs', '/tmp:rw,size=32m', '--mount', `type=bind,src=${w}/gdal-fixtures,dst=/fixtures,readonly`, '--entrypoint', '/fixtures/gdal-probe', image];
const cases = [];
for (const mode of gdalProbeCases) {
  const p = spawnSync('docker', [...args, mode, '/fixtures'], { encoding: 'utf8', timeout: 30000, maxBuffer: 1e6 });
  assert(!p.error && p.signal === null, 'Baseline must run, not timeout or fail orchestration');
  if (mode === '--valid') { assert.equal(p.status, 0); assert.match(p.stdout, /write-reopen passed/); }
  if (mode === '--netcdf-malformed') { assert([134, 139].includes(p.status)); assert.match(p.stderr, /stack smashing detected/); }
  cases.push({ mode, status: p.status, stdout: p.stdout, stderr: p.stderr });
}
const sha = b => createHash('sha256').update(b).digest('hex');
const fixtures = ['fictional.geojson', 'valid.nc', 'oversized-geometry.nc', 'oversized-layer-name.nc', 'issue_14356.he4', 'issue_14363.he4', 'gdal-probe'].map(file => ({ file, sha256: sha(readFileSync(w + '/gdal-fixtures/' + file)) }));
writeFileSync(w + '/gdal-baseline.json', JSON.stringify({ date: new Date().toISOString(), image, package: 'libgdal32', version: '3.6.2+dfsg-1+b2', actualPackageVersion: execFileSync('docker', ['run', '--rm', '--network', 'none', '--read-only', '--log-driver', 'none', '--entrypoint', 'dpkg-query', image, '-W', '-f=${Version}', 'libgdal32'], { encoding: 'utf8' }), cases, fixtures, limitation: 'Controlled synthetic fixture in isolated disposable containers, not production requests or user data. No claim that unsanitized HDF testing detects all memory violations.' }, null, 2) + '\n');
console.log('Isolated baseline recorded: valid workflows pass; oversized netCDF reproduces stack corruption.');
