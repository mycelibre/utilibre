#!/usr/bin/env node
// Explicit bounded rehearsal of the most recent successful native snapshot copy.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, writeFile, mkdtemp, statfs, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
process.umask(0o077);
if (process.getuid() !== 0) throw Error('Run with sudo');
const candidate = process.argv[2] === '--candidate-subaccount';
assert(process.argv.length <= 3 && (!process.argv[2] || candidate), 'Use verify-download.mjs [--candidate-subaccount]');
const status = JSON.parse(await readFile('/opt/utilibre/storagebox/private/last-success.json', 'utf8'));
assert.match(status.snapshot, /^[a-f0-9]{64}$/);
assert.match(status.report, /^\/opt\/utilibre\/reports\/storagebox-native-[A-Za-z0-9]+$/);
const plan = JSON.parse(await readFile(join(status.report, 'selection.json'), 'utf8'));
assert(Number.isSafeInteger(plan.bytes) && plan.bytes >= 0);
const disk = await statfs('/opt/utilibre');
assert(disk.bavail * disk.bsize > plan.bytes + 5 * 1024 ** 3, 'Restore would cross the 5 GiB free-space floor');
const target = await mkdtemp('/opt/utilibre/reports/storagebox-restore-');
const wrapper = fileURLToPath(new URL('./restic.sh', import.meta.url));
const run = (program, args) => execFileSync(program, args, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1024 ** 2 });
const digest = async path => {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
};
let stage = 'download';
try {
  const restoreArgs = ['restore', status.snapshot, '--quiet', '--target', target, '--verify'];
  if (candidate) {
    run('restic', ['--repo', 'sftp:utilibre-storagebox:.', '--password-file', '/opt/utilibre/storagebox/private/restic-password',
      '--no-cache', '--retry-lock', '1m', '--limit-upload', '4096', '--limit-download', '4096', '-o', 'sftp.connections=2',
      '-o', 'sftp.command=ssh -F /opt/utilibre/storagebox-admin/candidate-ssh_config utilibre-storagebox -s sftp', ...restoreArgs]);
  } else run('sh', [wrapper, ...restoreArgs]);
  stage = 'checksum comparison';
  const paths = [...plan.snapshots.flatMap(snapshot => snapshot.files), ...plan.keyFiles];
  for (const path of paths) {
    assert(path.startsWith('/opt/utilibre/') && resolve(path) === path);
    assert.equal(await digest(`${target}${path}`), await digest(path), 'Downloaded backup differs from its verified local source');
  }
  const identity = plan.snapshots.find(snapshot => snapshot.id === 'identity');
  assert(identity);
  stage = 'isolated identity restore';
  run(process.execPath, [fileURLToPath(new URL('../identity/verify-backup.mjs', import.meta.url)), `${target}${identity.directory}`]);
  const result = {
    date: new Date().toISOString(), snapshot: status.snapshot,
    downloadedFileChecksums: 'all matched', checkedFiles: paths.length,
    sources: plan.snapshots.length, identityDatabaseRestore: 'passed in networkless disposable PostgreSQL',
    otherApplications: 'archive bytes verified; no fresh functional restore of every application',
    liveDataChanged: false, temporaryDownloadedCopiesRemoved: true,
    connection: candidate ? 'restricted subaccount candidate; active connection unchanged' : 'active backup connection',
  };
  await writeFile(join(target, 'result.json'), JSON.stringify(result, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ ...result, evidence: join(target, 'result.json') }, null, 2));
} catch {
  await writeFile(join(target, 'result.json'), JSON.stringify({ date: new Date().toISOString(), status: 'failed', stage }), { mode: 0o600 });
  console.error(`Off-host restore verification failed during ${stage}; no live data overwritten.`);
  process.exitCode = 1;
} finally {
  // Only this invocation's fresh mkdtemp target; remote/original backups remain.
  await rm(join(target, 'opt'), { recursive: true, force: true });
}
