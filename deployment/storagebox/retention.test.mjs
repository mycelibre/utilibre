import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyRetention, retentionArgs, validatePlan } from './retention.mjs';

const snapshot = digit => ({ id: digit.repeat(64), hostname: 'utilibre-vm', tags: ['native-app-snapshots'] });
const group = () => ({ host: 'utilibre-vm', tags: ['native-app-snapshots'], keep: [snapshot('a')], remove: [snapshot('b')] });
test('retention is restricted to the approved host, tag and day/week counts', () => {
  assert.deepEqual(retentionArgs, ['forget', '--json', '--host', 'utilibre-vm', '--tag', 'native-app-snapshots',
    '--group-by', 'host,tags', '--keep-daily', '7', '--keep-weekly', '4']);
  assert.deepEqual(validatePlan(JSON.stringify([group()]), 'aaaaaaaa'), { keep: ['a'.repeat(64)], remove: ['b'.repeat(64)] });
});
test('malformed plans, broad scope and removal of the fresh backup fail closed', () => {
  const valid = group();
  for (const plan of [null, [], [valid, valid], [{ ...valid, host: 'other' }], [{ ...valid, tags: ['other'] }],
    [{ ...valid, keep: [] }], [{ ...valid, remove: [snapshot('a')] }],
    [{ ...valid, remove: [{ ...snapshot('b'), hostname: 'other' }] }]]) {
    assert.throws(() => validatePlan(JSON.stringify(plan), 'aaaaaaaa'));
  }
  assert.throws(() => validatePlan(JSON.stringify([valid]), 'bbbbbbbb'));
  assert.throws(() => validatePlan('not json', 'aaaaaaaa'));
});
test('preview precedes expiry; bounded prune and check precede success', () => {
  const calls = [];
  const run = args => { calls.push(args); return args[0] === 'forget' ? JSON.stringify([group()]) : ''; };
  const result = applyRetention(run, 'aaaaaaaa');
  assert.deepEqual(calls, [[...retentionArgs, '--dry-run'], retentionArgs,
    ['prune', '--quiet', '--max-repack-size', '256M', '--max-unused', '5%'], ['check', '--quiet']]);
  assert.equal(result.kept, 1);
  assert.deepEqual(result.removed, ['b'.repeat(64)]);
});
test('native Restic rehearsal retains daily/weekly copies and unrelated snapshots, then restores', () => {
  const dir = mkdtempSync(join(tmpdir(), 'utilibre-retention-test-'));
  try {
    const password = join(dir, 'password'), file = join(dir, 'fictional.txt');
    writeFileSync(password, 'fictional-test-password-not-a-production-secret', { mode: 0o600 });
    writeFileSync(file, 'Fictional backup retention fixture.\n');
    const run = args => execFileSync('restic', ['--repo', join(dir, 'repo'), '--password-file', password,
      '--no-cache', ...args], { encoding: 'utf8', env: { ...process.env, GOMAXPROCS: '2', TZ: 'UTC' },
      stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 });
    run(['init', '--quiet']);
    const now = new Date(); now.setUTCHours(12, 0, 0, 0);
    const times = [0, 1, 2, 3, 4, 5, 6, 7, 8, 14, 21, 28, 35, 42];
    const ids = [];
    for (const days of times) {
      const time = new Date(now.getTime() - (days + 1) * 86400000).toISOString().slice(0, 19).replace('T', ' ');
      const summary = run(['backup', '--json', '--quiet', '--host', 'utilibre-vm', '--tag', 'native-app-snapshots',
        '--time', time, file]).trim().split('\n').map(JSON.parse).find(x => x.message_type === 'summary');
      ids.push(summary.snapshot_id);
    }
    run(['backup', '--quiet', '--host', 'unrelated-test', '--tag', 'other', file]);
    const before = JSON.parse(run(['snapshots', '--json']));
    const unrelated = before.find(s => s.hostname === 'unrelated-test').id;
    const preview = validatePlan(run([...retentionArgs, '--dry-run']), ids[0]);
    assert(preview.remove.length > 0);
    assert(preview.keep.length >= 7 && preview.keep.length <= 11);
    for (const id of ids.slice(0, 7)) assert(preview.keep.some(kept => kept.startsWith(id)));
    const result = applyRetention(run, ids[0]);
    const after = JSON.parse(run(['snapshots', '--json']));
    assert(after.some(s => s.id === unrelated));
    assert.equal(before.length - after.length, result.removed.length);
    assert(result.removed.every(id => !after.some(s => s.id === id)));
    run(['restore', ids[0], '--target', join(dir, 'restored'), '--verify', '--quiet']);
    run(['check', '--read-data', '--quiet']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
