import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {command} from './inventory.mjs';
import {rsshubFix, rsshubRevision, runtimePolicy} from './runtime-policy.mjs';
import {validateDecision} from '../triage.mjs';

process.umask(0o077);
const root = '/var/lib/utilibre-maintenance';
const output = root + '/component-followup-20261012';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const scan = read(root + '/security.json'), queue = read(root + '/security-queue.json');
assert.equal(scan.status, 'checked');
assert.equal(queue.scanDate, scan.completedAt);
assert(Date.now() - Date.parse(scan.completedAt) < 86400000);
const spec = [
  {mode: 'rsshub', container: 'utilibre-services-rsshub-1', id: 'CVE-2021-21278', package: 'rsshub'},
  {mode: 'tracker', container: 'utilibre-chitchatter-tracker-1', id: 'CVE-2024-29415', package: 'ip'},
];
const evidence = [], decisions = [], skipped = [];
const inspector = fileURLToPath(new URL('./runtime-inspector.mjs', import.meta.url));
fs.mkdirSync(output, {recursive: true, mode: 0o700});
for (const s of spec) {
  const item = queue.items.find(i => i.status === 'needs-review' && i.scope === 'runtime-image' && i.id === s.id && i.package === s.package && i.containers.includes(s.container));
  if (!item) continue;
  const testName = 'maintenance-component-' + s.mode;
  let started = false;
  try {
    const live = JSON.parse(command('docker', ['inspect', s.container]))[0];
    assert.equal(live.Image, item.artifact);
    assert.equal(scan.images.find(i => i.id === item.artifact)?.status, 'checked');
    assert(!live.Mounts.some(m => m.Destination === '/app' || m.Destination.startsWith('/app/') && m.Destination !== '/app/logs'), 'Application bind mount changes this exact-image proof');
    if (s.mode === 'tracker') assert.deepEqual(live.Config.Cmd, ['node', 'tracker.mjs']);
    assert.equal(command('docker', ['ps', '-aq', '--filter', 'name=^/' + testName + '$']), '', 'Test name already exists');
    started = true;
    const proof = JSON.parse(command('docker', ['run', '--rm', '--name', testName,
      '--label', 'utilibre.component-review=true', '--network', 'none', '--read-only', '--cap-drop', 'ALL',
      '--security-opt', 'no-new-privileges', '--memory', '192m', '--memory-swap', '192m', '--cpus', '0.5', '--pids-limit', '32',
      '--log-driver', 'none', '--entrypoint', 'node', '--mount', `type=bind,src=${inspector},dst=/review/runtime-inspector.mjs,readonly`,
      item.artifact, '/review/runtime-inspector.mjs', s.mode]));
    started = false;
    proof.imageId = item.artifact;
    if (s.mode === 'rsshub') {
      proof.ancestry = JSON.parse(command('gh', ['api', `repos/DIYgod/RSSHub/compare/${rsshubFix}...${rsshubRevision}`,
        '--jq', '{status: .status, ahead_by: .ahead_by, behind_by: .behind_by, merge_base_commit: {sha: .merge_base_commit.sha}}']));
    }
    assert.equal(command('docker', ['inspect', '--format', '{{.Image}}', s.container]), item.artifact, 'Live deployment changed during review');
    const reason = runtimePolicy(item, proof);
    assert(reason, 'Runtime proof does not match exact reviewed component');
    evidence.push({container: s.container, id: s.id, ...proof});
    decisions.push(validateDecision({key: item.key, status: 'not-affected', reason: reason + ' No production change; unrelated advisories remain open.', expiresAt: new Date(Date.now() + 7 * 86400000).toISOString()}));
  } catch (error) {
    skipped.push({container: s.container, id: s.id, reason: error.message.split('\n')[0]});
  } finally {
    if (started) {
      try {
        const label = command('docker', ['inspect', '--format', '{{index .Config.Labels "utilibre.component-review"}}', testName]);
        if (label === 'true') command('docker', ['rm', '-f', testName]);
      } catch { /* --rm may already have removed this synthetic test container. */ }
    }
  }
}
assert.equal(read(root + '/security.json').completedAt, scan.completedAt);
const result = {date: new Date().toISOString(), scanDate: scan.completedAt, applied: false, decisions, skipped, evidence};
fs.writeFileSync(output + '/runtime-reviews.json', JSON.stringify(result, null, 2) + '\n', {mode: 0o600});
console.log(JSON.stringify({decisions: decisions.length, skipped, applied: false}));
