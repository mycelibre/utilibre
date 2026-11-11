// Package-only activation using existing Compose transactions. No new supervisor.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {proveLibraries} from './libraries-policy.mjs';
import {acquireReleaseLock} from '../security-20261103/release-lock.mjs';
import {replaceImagePins, namespaceDependents, existingComposeArgs, checkExistingGroup, recreateExistingGroup, releaseGroup} from '../language-final/release.mjs';

process.umask(0o077);
const repo = fileURLToPath(new URL('../../../', import.meta.url));
const root = '/var/lib/utilibre-maintenance/libraries-20261111';
const read = p => JSON.parse(fs.readFileSync(p));
const hash = b => createHash('sha256').update(b).digest('hex');
const fileHash = p => hash(fs.readFileSync(p));
const inputs = read(new URL('./libraries-inputs.json', import.meta.url));
// Reuse this deployment's protected bind setting; never publish it in recipes.
const bindAddress = process.env.APP_BIND_IP || process.env.PRIVATE_BIND_IP || fs.readFileSync(repo + '.env', 'utf8').match(/^PRIVATE_BIND_IP=([^\r\n]+)$/m)?.[1];
assert(bindAddress && /^[a-fA-F0-9.:]+$/.test(bindAddress));
const [mode, ...keys] = process.argv.slice(2);
assert(['prepare', 'apply', 'rollback'].includes(mode));
assert(keys.length && new Set(keys).size === keys.length && keys.every(k => inputs.rows.some(s => s.key === k)));
const command = args => {
  try { return execFileSync(args[0], args.slice(1), {cwd: repo, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 ** 2, stdio: ['ignore', 'pipe', 'pipe'], env: {...process.env, APP_BIND_IP: bindAddress}}); }
  catch (e) { fs.writeFileSync(root + '/command-error-' + Date.now() + '.log', String(e.stderr || e.message)); throw Error('Bounded command failed; private diagnostics retained'); }
};
const inspect = n => JSON.parse(command(['docker', 'inspect', n]))[0];
const config = g => JSON.parse(command(['docker', ...existingComposeArgs(g), 'config', '--format', 'json'])).services;
const configHash = s => { const {image, ...rest} = s; return hash(JSON.stringify(rest)); };
const reportFile = root + '/release.json';
const report = fs.existsSync(reportFile) ? read(reportFile) : {date: new Date().toISOString(), groups: []};
const save = () => fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');

function proof(s) {
  const dir = root + '/' + s.key;
  const p = Object.fromEntries(['build', 'scope', 'consumer'].map(n => [n, read(dir + '/' + n + '.json')]));
  p.scan = read(dir + '/scan-gate.json');
  proveLibraries(inputs, s, p);
  for (const [path, sha] of Object.entries(inputs.verificationHashes)) assert.equal(fileHash(repo + path), sha, 'Verification source changed: ' + path);
  assert.equal(fileHash(root + '/baseline-scan.json'), inputs.baselineScanSha256);
  assert.equal(fileHash(root + '/scan-cache/db/trivy.db'), inputs.databaseSha256);
  assert.equal(fileHash(dir + '/scope.json'), p.build.scopeSha256);
  assert.equal(fileHash(dir + '/consumer.json'), p.scan.consumerSha256);
  assert.equal(fileHash(dir + '/after-scan.json'), p.scan.rawCandidateScanSha256);
  for (const [name, value] of Object.entries(s.reviewedEvidence)) assert.equal(fileHash(dir + '/' + name), value, 'Reviewed evidence changed');
  assert.equal(fileHash(root + '/fixture/native'), inputs.nativeFixture.binarySha256);
  if (s.consumerProfile === 'static-nginx') assert.equal(fileHash(root + '/fixture/xpm-native'), inputs.xpmFixture.binarySha256);
  if (p.consumer.adapter) assert.equal(fileHash(p.consumer.adapter.path), p.consumer.adapter.sha256);
  assert.equal(inspect(s.candidate).Id, p.build.imageId);
  assert.equal(inspect(s.oldRef).Id, s.base);
  return p;
}

function pins(g, version) {
  const r = g.rows[0], from = r[version === 'new' ? 'oldRef' : 'newRef'], to = r[version + 'Ref'];
  const file = g.pinFile, before = fs.readFileSync(file, 'utf8');
  let after;
  if (g.project === 'public-utility') {
    assert.equal(file, repo + '.env');
    assert.equal(before.split('\n').filter(l => l.startsWith('PORTAL_IMAGE=')).length, 1);
    assert(before.includes('PORTAL_IMAGE=' + from + '\n'));
    after = before.replace('PORTAL_IMAGE=' + from + '\n', 'PORTAL_IMAGE=' + to + '\n');
  } else {
    assert(g.files.includes(file) && file.startsWith(repo + 'deployment/'));
    const change = replaceImagePins(before, [{from, to}]);
    assert.equal(change.replaced, 1, 'Ambiguous image replacement'); after = change.text;
  }
  fs.writeFileSync(file, after);
}

async function home(s) {
  if (!s.publicHome) return null;
  const response = await fetch(s.publicHome, {redirect: 'manual', signal: AbortSignal.timeout(10000)});
  await response.body?.cancel(); return response.status;
}
function validate(g, version) {
  const cfg = config(g), r = g.rows[0];
  assert.equal(cfg[r.service].image, r[version + 'Ref']);
  assert.equal(configHash(cfg[r.service]), r.configHash, 'Unrelated service configuration changed');
  assert.equal(inspect(r.newRef).Id, r.newImage); assert.equal(inspect(r.oldRef).Id, r.oldImage);
}

const unlock = acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock');
try {
  if (mode !== 'rollback') assert.equal(fileHash(root + '/scan-cache/java-db/trivy-java.db'), inputs.javaExtractionDatabase.sha256);
  for (const key of keys) {
    const s = inputs.rows.find(x => x.key === key);
    // Rollback may be needed after advisory freshness expires. It uses the
    // recorded, retained predecessor; it never builds or resolves an image.
    const p = mode === 'rollback' ? null : proof(s);
    let g = report.groups.find(x => x.key === key);
    if (mode === 'prepare') {
      assert(!g, 'Preserve existing release receipt'); assert.equal(s.containers.length, 1);
      const live = inspect(s.containers[0]), l = live.Config.Labels;
      assert.equal(live.Image, s.base); assert.equal(live.Config.Image, s.oldRef);
      const all = JSON.parse(command(['docker', 'inspect', ...command(['docker', 'ps', '-q']).trim().split('\n')]));
      assert.deepEqual(namespaceDependents(all, new Set(s.containers)), [], 'Unreviewed namespace companion');
      assert(!live.HostConfig.NetworkMode.startsWith('container:'));
      g = {key, project: l['com.docker.compose.project'], cwd: l['com.docker.compose.project.working_dir'], files: l['com.docker.compose.project.config_files'].split(','), rows: [], before: [], status: 'prepared'};
      assert(inputs.projects.includes(g.project)); assert.equal(g.files.length, 1);
      const service = l['com.docker.compose.service'], cfg = config(g)[service];
      assert.equal(cfg.image, s.oldRef);
      g.pinFile = key === 'public-utility-portal' ? repo + '.env' : g.files[0];
      g.rows.push({name: s.containers[0], service, oldContainerId: live.Id, oldRestartCount: live.RestartCount, oldRef: s.oldRef, newRef: s.candidate, oldImage: s.base, newImage: p.build.imageId, configHash: configHash(cfg)});
      await checkExistingGroup(g, 'old'); g.publicBefore = await home(s);
      assert(g.publicBefore === null || g.publicBefore >= 200 && g.publicBefore < 400, 'Public baseline unavailable');
      report.groups.push(g); save(); console.log(key + ': prepared; production unchanged'); continue;
    }
    assert(g && g.rows.length === 1 && g.rows[0].oldImage === s.base && g.rows[0].newRef === s.candidate);
    if (mode === 'rollback') {
      assert.equal(g.status, 'passed'); validate(g, 'new'); await checkExistingGroup(g, 'new');
      assert.equal(inspect(s.oldRef).Id, s.base); pins(g, 'old'); validate(g, 'old');
      await recreateExistingGroup(g); await checkExistingGroup(g, 'old'); assert.equal(await home(s), g.publicBefore); g.status = 'rolled-back'; save(); continue;
    }
    assert.equal(g.rows[0].newImage, p.build.imageId);
    if (g.status === 'passed') { validate(g, 'new'); await checkExistingGroup(g, 'new'); console.log(key + ': already deployed; no restart'); continue; }
    assert.equal(g.status, 'prepared');
    const disk = fs.statfsSync(root); assert(disk.bavail * disk.bsize >= inputs.minimumFreeBytes);
    let reverting = false;
    await releaseGroup(g, {
      preflight: async () => { validate(g, 'old'); await checkExistingGroup(g, 'old'); }, save,
      recreate: async () => { if (!reverting) pins(g, 'new'); validate(g, reverting ? 'old' : 'new'); await recreateExistingGroup(g); },
      gate: async version => { await checkExistingGroup(g, version); assert.equal(await home(s), g.publicBefore); },
      rollbackPins: async () => { reverting = true; pins(g, 'old'); validate(g, 'old'); },
    });
    g.completedAt = new Date().toISOString(); save(); console.log(key + ': deployed; exact image, configuration, health and home checks passed');
  }
} finally { unlock(); }
