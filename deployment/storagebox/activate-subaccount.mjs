#!/usr/bin/env node
// Switch only the backup client's credentials, under the two existing job locks.
// Existing remote data and the Restic encryption password are never changed.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash, randomBytes} from 'node:crypto';
import {readFileSync, writeFileSync, renameSync, unlinkSync, existsSync, lstatSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

assert.equal(process.getuid(), 0, 'Run with sudo');
process.umask(0o077);
const [mode, isolationFile, restoreFile] = process.argv.slice(2);
assert(mode === '--activate' || mode === '--rollback', 'Use --activate ISOLATION_RESULT RESTORE_RESULT, or --rollback');
assert.equal(process.argv.length, mode === '--activate' ? 5 : 3);
const base = '/opt/utilibre/storagebox/private';
const admin = '/opt/utilibre/storagebox-admin';
function run(program, args, timeout = 120000) {
  try { return execFileSync(program, args, {encoding: 'utf8', timeout, maxBuffer: 4 * 1024 ** 2, stdio: ['ignore', 'pipe', 'pipe']}); }
  catch { throw Error(`${program} failed; output redacted`); }
}
if (process.env.UTILIBRE_STORAGE_SWITCH_LOCKED !== '1') {
  const output = execFileSync('flock', ['-n', '/run/lock/utilibre-storagebox-job.lock',
    'flock', '-n', '/run/lock/utilibre-storagebox.lock', process.execPath,
    fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    encoding: 'utf8', timeout: 300000, stdio: ['ignore', 'pipe', 'pipe'],
    env: {...process.env, UTILIBRE_STORAGE_SWITCH_LOCKED: '1'},
  });
  process.stdout.write(output);
  process.exit(0);
}
function read(path) {
  const s = lstatSync(path);
  assert(s.isFile() && !s.isSymbolicLink() && s.uid === 0 && !(s.mode & 0o022), 'Unsafe input file');
  return readFileSync(path);
}
const sshConfig = mode === '--activate' ? `${admin}/candidate-ssh_config` : `${admin}/main-ssh_config`;
const repository = mode === '--activate' ? 'sftp:utilibre-storagebox:.\n' : read(`${admin}/previous-main/repository`).toString();
if (mode === '--activate') {
  assert.match(isolationFile, /^\/opt\/utilibre\/reports\/storagebox-isolation-[A-Za-z0-9]+\/result\.json$/);
  assert.match(restoreFile, /^\/opt\/utilibre\/reports\/storagebox-restore-[A-Za-z0-9]+\/result\.json$/);
  const isolation = JSON.parse(read(isolationFile));
  const restore = JSON.parse(read(restoreFile));
  assert(isolation.sameRepositoryConfig && isolation.siblingReadsDenied === 4 && isolation.ownDirectoryWriteReadDelete);
  assert.equal(restore.connection, 'restricted subaccount candidate; active connection unchanged');
  assert.equal(restore.downloadedFileChecksums, 'all matched');
  assert.equal(restore.identityDatabaseRestore, 'passed in networkless disposable PostgreSQL');
  assert.equal(restore.snapshot, JSON.parse(read(`${base}/last-success.json`)).snapshot);
  for (const report of [isolation, restore]) {
    const age = Date.now() - Date.parse(report.date);
    assert(Number.isFinite(age) && age >= 0 && age < 3600000, 'Fresh verification required');
  }
}
const expected = run('ssh', ['-F', sshConfig, 'utilibre-storagebox', 'cat', mode === '--activate' ? 'config' : 'utilibre-app-backups/config']);
const replacements = mode === '--activate' ? {
  id_ed25519: read(`${admin}/backup_id_ed25519`),
  'id_ed25519.pub': read(`${admin}/backup_id_ed25519.pub`),
  known_hosts: read(`${admin}/candidate-known_hosts`),
  ssh_config: read(sshConfig).toString().replace(`${admin}/backup_id_ed25519`, `${base}/id_ed25519`)
    .replace(`${admin}/candidate-known_hosts`, `${base}/known_hosts`),
  repository,
} : Object.fromEntries(['id_ed25519', 'id_ed25519.pub', 'known_hosts', 'ssh_config', 'repository']
  .map(name => [name, read(`${admin}/previous-main/${name}`)]));
replacements['known_hosts.candidate'] = replacements.known_hosts;
const before = Object.fromEntries(Object.keys(replacements).map(name => [name, existsSync(`${base}/${name}`) ? read(`${base}/${name}`) : null]));
const passwordHash = () => createHash('sha256').update(read(`${base}/restic-password`)).digest('hex');
const initialPasswordHash = passwordHash();
function replace(name, content) {
  const path = `${base}/${name}`;
  const temporary = `${path}.switch-${randomBytes(8).toString('hex')}`;
  try {
    writeFileSync(temporary, content, {mode: 0o600, flag: 'wx'});
    renameSync(temporary, path);
  } finally { if (existsSync(temporary)) unlinkSync(temporary); }
}
try {
  for (const [name, content] of Object.entries(replacements)) replace(name, content);
  assert.equal(passwordHash(), initialPasswordHash);
  assert.equal(run('ssh', ['-F', `${base}/ssh_config`, 'utilibre-storagebox', 'cat', mode === '--activate' ? 'config' : 'utilibre-app-backups/config']), expected);
  const snapshots = JSON.parse(run('restic', ['--repository-file', `${base}/repository`, '--password-file', `${base}/restic-password`,
    '--no-cache', '--retry-lock', '1m', '-o', 'sftp.connections=2',
    '-o', `sftp.command=ssh -F ${base}/ssh_config utilibre-storagebox -s sftp`, 'snapshots', '--json']));
  const latest = JSON.parse(read(`${base}/last-success.json`)).snapshot;
  assert(snapshots.some(snapshot => snapshot.id === latest), 'Latest successful snapshot must remain accessible');
  writeFileSync(`${admin}/connection-switch.json`, JSON.stringify({date: new Date().toISOString(), mode,
    latestSnapshotAccessible: true, encryptionPasswordUnchanged: true, remoteDataChanged: false}, null, 2), {mode: 0o600});
  console.log(JSON.stringify({connection: mode === '--activate' ? 'restricted subaccount' : 'previous main account',
    latestSnapshotAccessible: true, encryptionPasswordUnchanged: true, remoteDataChanged: false}));
} catch (error) {
  for (const [name, content] of Object.entries(before)) {
    if (content === null) { if (existsSync(`${base}/${name}`)) unlinkSync(`${base}/${name}`); }
    else replace(name, content);
  }
  throw Error('Connection verification failed; previous client files restored', {cause: error});
}
