#!/usr/bin/env node
// Fictional-data rehearsal: local by default; --remote uses the configured SFTP repository.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const remote = process.argv[2] === '--remote';
const maintenance = process.argv[3] === '--maintenance';
if (process.argv.length > 4 || (process.argv[2] && !remote) || (process.argv[3] && !maintenance)) throw new Error('Use test-restic.mjs [--remote [--maintenance]]');
const reports = process.env.UTILIBRE_RESTORE_REPORT_ROOT || '/opt/utilibre/reports';
mkdirSync(reports, { recursive: true, mode: 0o700 });
const root = mkdtempSync(join(reports, `storagebox-${remote ? 'remote' : 'local'}-restore-`));
const input = join(root, 'fictional-input');
mkdirSync(input, { mode: 0o700 });
const text = 'Fictional Utilibre backup exercise; no account or user document.\n';
writeFileSync(join(input, 'example.txt'), text, { mode: 0o600 });
const password = join(root, 'password');
writeFileSync(password, randomBytes(48).toString('base64'), { mode: 0o600 });
const args = ['--repo', join(root, 'repository'), '--password-file', password, '--no-cache', '--quiet'];
const wrapper = fileURLToPath(new URL('./restic.sh', import.meta.url));
const program = remote ? 'sh' : 'restic';
const prefix = remote ? [wrapper] : args;
const run = (...extra) => execFileSync(program, [...prefix, ...extra], { cwd: root, encoding: 'utf8', env: { ...process.env, GOMAXPROCS: '2' }, stdio: ['ignore', 'pipe', 'pipe'] });
if (!remote) run('init', '--repository-version', '2');
const backup = run('backup', '--quiet', '--json', '--host', 'utilibre-synthetic-test', '--tag', `${remote ? 'remote' : 'local'}-rehearsal`, 'fictional-input');
const snapshot = backup.trim().split('\n').map(line => JSON.parse(line)).find(item => item.message_type === 'summary')?.snapshot_id;
assert.match(snapshot ?? '', /^[a-f0-9]{8,64}$/);
// A routine remote smoke test must not reread the entire growing repository.
run('check', ...(remote ? [] : ['--read-data']));
const destination = join(root, 'restored');
run('restore', snapshot, '--target', destination, '--verify');
assert.equal(readFileSync(join(destination, 'fictional-input', 'example.txt'), 'utf8'), text);
const wrongPassword = join(root, 'wrong-password');
writeFileSync(wrongPassword, randomBytes(48).toString('base64'), { mode: 0o600 });
const refused = spawnSync(program, [...prefix, 'snapshots', '--password-file', wrongPassword], { encoding: 'utf8' });
assert.equal(refused.status, 12, 'Wrong repository password must be rejected.');
const result = {
  date: new Date().toISOString(), version: execFileSync('restic', ['version'], { encoding: 'utf8' }).trim(),
  scope: remote ? 'SFTP repository and fictional text; not a live application or whole-VM restore.' : 'Local filesystem repository and fictional text; no SFTP or live application restore.',
  init: remote ? 'previously initialized' : 'passed', backup: 'passed', metadataCheck: 'passed',
  fullDataCheck: remote ? 'not repeated; exact fictional snapshot restored and verified' : 'passed',
  snapshot, restoreBytes: 'matched', wrongPassword: 'rejected',
  remoteConnection: remote ? 'passed' : 'not tested', remoteBackup: remote ? 'fictional file only' : 'not performed',
};
writeFileSync(join(root, 'result.json'), `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify(result, null, 2));
console.log(`Private evidence: ${root}/result.json`);
// Forget only the exact fictional snapshot created by this successful exercise.
// Never expire other snapshots or prune here; normal backup policy is unchanged.
if (maintenance) run('forget', snapshot);
