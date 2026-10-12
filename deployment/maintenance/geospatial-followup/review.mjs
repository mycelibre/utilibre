#!/usr/bin/env node
// Fresh-scan, exact-payload proposals only. Does not mutate the decision ledger.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { freshScan, overlayRows } from '../review-native-backports.mjs';
import { additionalOverlayReceipts } from '../followup-overlays.mjs';
import { validateDecision } from '../triage.mjs';
import { reviewedRepair, excludedDocumentation } from './review-policy.mjs';
import { gdalProbeCases } from './gdal-policy.mjs';
process.umask(0o077);
const root = '/var/lib/utilibre-maintenance', w = root + '/geospatial-followup-20261012';
const read = path => JSON.parse(fs.readFileSync(path));
const hash = data => createHash('sha256').update(data).digest('hex'), sha = path => hash(fs.readFileSync(path));
const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', timeout: 60000, maxBuffer: 32e6, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const scan = read(root + '/security.json'), queue = read(root + '/security-queue.json');
freshScan(queue, scan); assert.equal(scan.status, 'checked');
const receipts = [...new Set([...additionalOverlayReceipts, 'geospatial-followup-20261012/gdal-release.json'])];
const overlays = receipts.filter(p => fs.existsSync(root + '/' + p)).flatMap(p => overlayRows(read(root + '/' + p)).map(row => ({ ...row, receipt: p })));
const checked = new Map(), decisions = [], proofs = [];
function walk(dir, prefix = '') { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(dir + '/' + e.name, prefix + '/' + e.name) : e.isFile() ? [prefix + '/' + e.name] : []); }
function proof(spec, item) {
  const prefix = spec.kind === 'gdal' ? 'gdal-' : '';
  const release = read(w + '/' + prefix + 'release.json'), c = read(w + '/' + prefix + 'candidate.json'), t = read(w + '/' + prefix + 'checks.json');
  assert.equal(release.status, 'passed'); assert.equal(t.status, 'passed'); assert.equal(t.image, c.image); assert(t.onlyNativePackageChanged);
  const row = overlayRows(release).find(r => r.name === item.containers[0] && r.newImage === c.image); assert(row);
  const reachable = new Map([[row.newImage, { released: Date.parse(row.completedAt), chain: [prefix + 'release.json'] }]]);
  for (let n = 0; n < overlays.length; ++n) for (const next of overlays) {
    const previous = reachable.get(next.oldImage);
    if (previous && next.name === item.containers[0] && next.newImage !== next.oldImage && !reachable.has(next.newImage)) reachable.set(next.newImage, { released: Math.max(previous.released, Date.parse(next.completedAt)), chain: [...previous.chain, next.receipt] });
  }
  const lineage = reachable.get(item.artifact); assert(lineage, 'No exact completed release chain for the scanned role');
  assert(Number.isFinite(lineage.released) && lineage.released <= Date.parse(scan.date), 'Scan predates this deployment');
  assert.equal(scan.images.find(i => i.id === item.artifact)?.status, 'checked');
  assert.equal(run('docker', ['inspect', item.containers[0], '--format', '{{.Image}}']), item.artifact);
  const sourceDir = spec.kind === 'gdal' ? 'gdal-source' : 'source';
  assert.equal(sha(w + '/' + sourceDir + '/authenticated.json'), c.sourceReceiptSha256);
  assert.equal(sha(w + '/' + sourceDir + '/applied-provenance.json'), c.patchReceiptSha256);
  const output = spec.kind === 'gdal' ? 'gdal-out' : 'out', deb = w + '/' + output + '/' + spec.package + '_' + spec.version + '_amd64.deb';
  assert.equal(sha(deb), c.debSha256);
  if (spec.kind === 'gdal') {
    assert.equal(sha(w + '/gdal-source/dependency-config.json'), c.dependencyReceiptSha256);
    assert.equal(sha(w + '/gdal-source/hdf-prerequisites.json'), c.hdfPrerequisitesSha256);
    assert.equal(t.hdfPrerequisitesSha256, c.hdfPrerequisitesSha256);
    assert(t.library.nativeAbiUnchanged && t.nativeRasterExportImport && t.documentdbTypedData && t.readOnlyRoleAndDeniedDelete && t.geometryProjection && t.upstreamFlatGeobuf);
    assert(t.drivers.length > 100 && t.drivers.includes('netCDF') && t.drivers.includes('HDF4'));
    assert.deepEqual(t.cases.map(x => [x.mode, x.status]), gdalProbeCases.map(mode => [mode, 0]));
    assert.equal(sha(w + '/gdal-baseline.json'), t.baselineSha256);
    assert(fs.readFileSync(w + '/gdal-build.log', 'utf8').endsWith('GDAL_COMPILED\n'));
  } else {
    assert(t.upstreamRegressionWithDumpRestore && t.documentdbTypedData && t.readOnlyRoleAndDeniedDelete && t.geometryProjection);
    assert.equal(t.libraries.length, 5); assert(t.libraries.every(x => x.nativeAbiUnchanged));
    assert.match(fs.readFileSync(w + '/upstream-native-flatgeobuf.log', 'utf8'), /Run tests: 2\nFailed: 0\n/);
  }
  const temp = fs.mkdtempSync('/dev/shm/utilibre-spatial-review-');
  let payload, excluded;
  try {
    run('dpkg-deb', ['-x', deb, temp]);
    const configPath = '/etc/dpkg/dpkg.cfg.d/docker';
    const config = run('docker', ['exec', item.containers[0], 'cat', configPath]);
    const testedConfig = run('docker', ['run', '--rm', '--network', 'none', '--read-only', '--memory', '128m', '--pids-limit', '16', '--log-driver', 'none', '--entrypoint', 'cat', c.image, configPath]);
    assert.equal(config, testedConfig, 'Native packaging exclusions changed since candidate testing');
    const all = walk(temp).map(path => ({ path, sha256: sha(temp + path) }));
    excluded = all.filter(f => excludedDocumentation(f.path, spec.package, config));
    for (const file of excluded) run('docker', ['exec', item.containers[0], 'test', '!', '-e', file.path]);
    payload = all.filter(f => !excludedDocumentation(f.path, spec.package, config)); assert(payload.length > 1);
    assert.equal(run('docker', ['exec', item.containers[0], 'dpkg-query', '-W', '-f=${Version}', spec.package]), spec.version);
    const actual = run('docker', ['exec', item.containers[0], 'sha256sum', ...payload.map(f => f.path)]).split('\n');
    assert.equal(actual.length, payload.length);
    actual.forEach((line, i) => assert.equal(line, payload[i].sha256 + '  ' + payload[i].path, 'Installed native package differs from passed tested build'));
  } finally { fs.rmSync(temp, { recursive: true }); }
  assert.equal(run('docker', ['inspect', item.containers[0], '--format', '{{.Image}}']), item.artifact);
  return { kind: spec.kind, artifact: item.artifact, testedImage: c.image, package: spec.package, installed: spec.version, lineage, packageSha256: c.debSha256, payloadFiles: payload.length, payloadSha256: hash(JSON.stringify(payload)), excludedDocumentation: excluded, checksSha256: sha(w + '/' + prefix + 'checks.json') };
}
for (const item of queue.items) {
  const spec = reviewedRepair(item); if (!spec) continue;
  const key = spec.kind + ':' + item.artifact;
  if (!checked.has(key)) checked.set(key, proof(spec, item));
  let reason;
  if (spec.kind === 'postgis') reason = 'Native PostGIS 3.6 stable FlatGeobuf fix 53e273faeb440176eee83f76319b48afb0b86834, including its five reviewed stable prerequisites, backported into the exact PG17/Bookworm package. All seven resulting runtime/regression source files match final upstream bytes. Complete upstream tests, exact malformed/valid FlatGeobuf and dump/restore, unchanged five-module native ABI, DocumentDB/role/projection checks passed. https://git.osgeo.org/gitea/postgis/postgis/commit/767fa40644253281f6d4e8b06811489b0a0f9b0d';
  else reason = 'Real native libgdal32 repair, not driver removal: upstream netCDF c49254dc6380af2f02ff43ca79e3cf7c1bc82f01 and HDF4-EOS 9491e794f1757f08063ea2f7a274ad2994afa636 / 184f77dbcc74118c062c05e464c88161d3c37b9b applied to signed Debian 3.6.2 source. netCDF needs four context-only and two equivalent C++11 mutable-string adaptations. The isolated original library crashes on malformed netCDF and HDF4-swath fixtures; the repaired library survives those exact inputs. The HDF4-grid fixture does not crash the unsanitized original, so its passing candidate result is compatibility evidence plus the complete source repair, not independent memory-failure reproduction. The candidate retains all drivers/exports/dependencies and passes normal GeoJSON/netCDF/GeoTIFF plus PostGIS raster/import/export and synthetic restore. https://github.com/OSGeo/gdal/commit/' + ({ 'CVE-2026-49014': 'c49254dc6380af2f02ff43ca79e3cf7c1bc82f01', 'CVE-2026-8086': '9491e794f1757f08063ea2f7a274ad2994afa636', 'CVE-2026-8087': '184f77dbcc74118c062c05e464c88161d3c37b9b' }[item.id]);
  if(spec.kind==='gdal')reason='Native GDAL 3.6.2 repair: upstream netCDF c49254dc and HDF4 9491e794/184f77db plus EHmetagroup prerequisites 950cd2a0/4cfbcf82/f1911cfc. Complete patch hashes/source are in geospatial-followup/README.md and the matching public source offer. HDF hunks are anchored to their named functions; netCDF has context/C++11 adaptations only. Old netCDF/swath fixtures crash; identical final inputs pass. This proves the combined fix chain, not each CVE independently. Grid fixture did not crash the baseline: source plus compatibility evidence only. All 210 drivers/5935 exports retained; raster, projection, roles, DocumentDB and synthetic restore passed. https://security-tracker.debian.org/tracker/'+item.id;
  reason += '. Exact installed package payload rehashed against retained tested binary package, current role/image and completed release ancestry verified after fresh scan. Evidence: geospatial-followup-20261012/native-reviews.json. Only this named finding is mitigated; raw scanner finding and unrelated CVEs remain.';
  decisions.push(validateDecision({ key: item.key, status: 'mitigated', reason, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() }));
  proofs.push({ key: item.key, id: item.id, ...checked.get(key) });
}
assert.equal(read(root + '/security.json').completedAt, scan.completedAt, 'Concurrent scan changed');
fs.writeFileSync(w + '/native-reviews.json', JSON.stringify({ date: new Date().toISOString(), scanDate: scan.completedAt, applied: false, decisions, proofs }, null, 2) + '\n');
console.log(JSON.stringify({ decisions: decisions.length, payloadGroups: checked.size, applied: false }));
