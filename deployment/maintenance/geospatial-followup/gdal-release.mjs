#!/usr/bin/env node
// Scoped Gathio native overlay, using existing health/namespace/rollback guards.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, statfsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gdalProbeCases } from './gdal-policy.mjs';
import { existingComposeArgs, checkExistingGroup, recreateExistingGroup, releaseGroup, namespaceDependents, replaceImagePins } from '../language-final/release.mjs';
process.umask(0o077);
const s = JSON.parse(readFileSync(new URL('spec.json', import.meta.url))), base = JSON.parse(readFileSync(new URL('gdal-base.json', import.meta.url))), dir = s.work;
const composeFile = '/home/ubuntu/freetools/deployment/calendar/compose.gathio.yaml', receipt = dir + '/gdal-release.json';
const sha = x => createHash('sha256').update(x).digest('hex'), read = path => JSON.parse(readFileSync(path));
function docker(...args) { try { return execFileSync('docker', args, { encoding: 'utf8', timeout: 120000, maxBuffer: 16e6, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, APP_BIND_IP: '10.10.1.43' } }); } catch { throw Error('Bounded Docker operation failed; configuration output withheld.'); } }
const inspect = name => JSON.parse(docker('inspect', name))[0];
const config = g => JSON.parse(docker(...existingComposeArgs(g), 'config', '--format', 'json')).services;
const normalized = row => { const { image, ...rest } = row; return sha(JSON.stringify(rest)); };
const native = () => docker('exec', s.targetContainer, 'psql', '-U', 'gathio', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atc', "SELECT current_setting('server_version')||'|'||postgis_lib_version()||'|'||(SELECT extversion FROM pg_extension WHERE extname='documentdb');").trim();
const http = async () => { const r = await fetch('http://10.10.1.43:3198/', { redirect: 'manual', signal: AbortSignal.timeout(10000) }); await r.body?.cancel(); return r.status; };
function artifacts() {
  const c = read(dir + '/gdal-candidate.json'), t = read(dir + '/gdal-checks.json');
  assert.equal(t.status, 'passed'); assert.equal(t.image, c.image); assert.equal(c.base, base.image); assert.equal(c.baseRef, base.ref);
  for (const key of ['onlyNativePackageChanged', 'upstreamFlatGeobuf', 'documentdbTypedData', 'nativeRasterExportImport', 'geometryProjection', 'readOnlyRoleAndDeniedDelete']) assert(t[key]);
  assert(t.library.nativeAbiUnchanged); assert(t.drivers.length > 100);
  assert.deepEqual(t.cases.map(x => [x.mode, x.status]), gdalProbeCases.map(mode => [mode, 0]));
  assert.equal(inspect(c.candidate).Id, c.image); assert.equal(inspect(base.ref).Id, base.image);
  assert(Date.now() - Date.parse(t.completedAt) < 86400000);
  return { c, sha256: sha(readFileSync(dir + '/gdal-checks.json')) };
}
const mode = process.argv[2]; assert(process.argv.length === 3 && ['prepare', 'pin', 'apply'].includes(mode));
if (mode === 'prepare') {
  const { c, sha256 } = artifacts(), live = inspect(s.targetContainer), labels = live.Config.Labels; assert.equal(live.Image, base.image);
  const g = { project: labels['com.docker.compose.project'], cwd: labels['com.docker.compose.project.working_dir'], files: labels['com.docker.compose.project.config_files'].split(','), rows: [], before: [], status: 'prepared' };
  assert.equal(g.project, 'utilibre-gathio'); assert.deepEqual(g.files, [composeFile]);
  const cfg = config(g), service = labels['com.docker.compose.service']; assert.equal(service, 'postgres'); assert.equal(cfg[service].image, base.ref);
  g.rows.push({ name: s.targetContainer, service, oldRef: base.ref, oldImage: base.image, newRef: c.candidate, newImage: c.image, configHash: normalized(cfg[service]), verification: dir + '/gdal-checks.json' });
  const all = JSON.parse(docker('inspect', ...docker('ps', '-q').trim().split('\n')));
  for (const { container: x, parent } of namespaceDependents(all, new Set([s.targetContainer]))) {
    assert.equal(x.Config.Labels['com.docker.compose.project'], g.project, 'Unreviewed cross-project namespace companion');
    const service = x.Config.Labels['com.docker.compose.service'], row = cfg[service]; assert.equal(inspect(row.image).Id, x.Image);
    g.rows.push({ name: x.Name.slice(1), service, oldRef: row.image, oldImage: x.Image, newRef: row.image, newImage: x.Image, namespaceParent: parent, configHash: normalized(row), verification: 'Exact same-image namespace companion' });
  }
  await checkExistingGroup(g, 'old'); assert.equal(await http(), 200);
  writeFileSync(receipt, JSON.stringify({ date: new Date().toISOString(), status: 'prepared', groups: [g], nativeBefore: native(), httpBefore: 200, checksSha256: sha256, files: { [composeFile]: { beforeSha256: sha(readFileSync(composeFile)) } } }, null, 2) + '\n');
  console.log('Exact Gathio GDAL release prepared; no live/config changes.');
} else {
  const r = read(receipt), g = r.groups[0]; assert.equal(r.groups.length, 1); assert.equal(g.project, 'utilibre-gathio'); assert.deepEqual(g.files, [composeFile]);
  assert(Date.now() - Date.parse(r.date) < 86400000); assert.equal(artifacts().sha256, r.checksSha256);
  const save = async () => writeFileSync(receipt, JSON.stringify(r, null, 2) + '\n');
  if (mode === 'pin') {
    assert.equal(r.status, 'prepared'); const text = readFileSync(composeFile, 'utf8'); assert.equal(sha(text), r.files[composeFile].beforeSha256); assert.equal(inspect(s.targetContainer).Image, base.image);
    const out = replaceImagePins(text, [{ from: base.ref, to: g.rows[0].newRef }]); assert.equal(out.replaced, 1); writeFileSync(composeFile, out.text); r.files[composeFile].pinnedSha256 = sha(out.text);
    const cfg = config(g); for (const row of g.rows) { assert.equal(cfg[row.service].image, row.newRef); assert.equal(normalized(cfg[row.service]), row.configHash); }
    r.status = 'pinned'; await save(); console.log('Only the reviewed GDAL image scalar changed; not restarted.');
  } else {
    assert.equal(r.status, 'pinned'); const space = statfsSync('/'); assert(space.bavail * space.bsize >= s.freeDiskFloorBytes);
    const validate = () => { assert.equal(sha(readFileSync(composeFile)), r.files[composeFile].pinnedSha256); const cfg = config(g); for (const row of g.rows) { assert.equal(cfg[row.service].image, row.newRef); assert.equal(normalized(cfg[row.service]), row.configHash); assert.equal(inspect(row.newRef).Id, row.newImage); assert.equal(inspect(row.oldRef).Id, row.oldImage); } };
    r.status = 'applying'; await save();
    await releaseGroup(g, { preflight: validate, save, recreate: () => recreateExistingGroup(g), gate: async version => {
      await checkExistingGroup(g, version); assert.equal(native(), r.nativeBefore, 'Engine/extension versions changed');
      let okay = false; for (let n = 0; n < 30; n++) { try { if (await http() === r.httpBefore) { okay = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 1000)); } assert(okay, 'Existing Gathio application did not recover');
    }, rollbackPins: async () => {
      validate(); const out = replaceImagePins(readFileSync(composeFile, 'utf8'), [{ from: g.rows[0].newRef, to: g.rows[0].oldRef }]); assert.equal(out.replaced, 1); writeFileSync(composeFile, out.text);
      const cfg = config(g); for (const row of g.rows) { assert.equal(cfg[row.service].image, row.oldRef); assert.equal(normalized(cfg[row.service]), row.configHash); }
    } });
    r.status = 'passed'; r.completedAt = new Date().toISOString(); g.completedAt = r.completedAt; await save(); console.log('Native GDAL repair live; existing application healthy, data/configuration preserved.');
  }
}
