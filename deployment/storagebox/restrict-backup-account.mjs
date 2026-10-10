#!/usr/bin/env node
// One-purpose migration using Hetzner's native API and SFTP. No public apps,
// box-wide settings, snapshot policy or existing repository data are changed.
import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync, copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const base = '/opt/utilibre/storagebox/private';
const admin = '/opt/utilibre/storagebox-admin';
const name = 'utilibre-backups';
const folder = 'utilibre-app-backups';
const settings = {reachable_externally: false, readonly: false, samba_enabled: false, ssh_enabled: true, webdav_enabled: false};
const stage = process.argv[2];
assert(['--inspect', '--prepare'].includes(stage), 'Use --inspect or --prepare; activation is a separate reviewed step.');
assert.equal(process.getuid(), 0, 'Run with sudo');
process.umask(0o077);

function privateFile(path) {
  const s = lstatSync(path);
  assert(s.isFile() && !s.isSymbolicLink() && s.uid === 0 && !(s.mode & 0o077), 'Unsafe private file');
  return readFileSync(path, 'utf8');
}
function run(program, args, input) {
  try { return execFileSync(program, args, {encoding: 'utf8', input, timeout: 30000, maxBuffer: 2 * 1024 ** 2, stdio: ['pipe', 'pipe', 'pipe']}); }
  catch { throw Error(`${program} failed; no command output or secrets logged`); }
}
function save(path, value) { writeFileSync(path, value, {mode: 0o600, flag: 'wx'}); }
const token = privateFile(`${base}/hetzner-api-token`).trim();
assert(/^[A-Za-z0-9_-]{32,256}$/.test(token), 'Unexpected token format');
async function api(path, data) {
  assert(/^\/storage_boxes(?:[/?]|$)/.test(path) && !path.includes('..'));
  const response = await fetch(`https://api.hetzner.com/v1${path}`, {
    method: data ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(20000),
    headers: {Authorization: `Bearer ${token}`, ...(data ? {'Content-Type': 'application/json'} : {})},
    ...(data ? {body: JSON.stringify(data)} : {}),
  });
  if (!response.ok) throw Error(`Hetzner API returned HTTP ${response.status}; no body logged`);
  return response.json();
}
const original = existsSync(`${admin}/previous-main/ssh_config`)
  ? privateFile(`${admin}/previous-main/ssh_config`) : privateFile(`${base}/ssh_config`);
const username = /^\s*User\s+(\S+)/m.exec(original)?.[1];
assert(/^u\d+$/.test(username || ''), 'Must start from the reviewed main account');
const boxes = [];
for (let page = 1; page <= 100; page++) {
  const result = await api(`/storage_boxes?per_page=50&page=${page}`);
  boxes.push(...result.storage_boxes);
  if (!result.meta?.pagination?.next_page) break;
  assert.equal(result.meta.pagination.next_page, page + 1);
  assert(page < 100, 'Unbounded box list rejected');
}
const matches = boxes.filter(b => b.username === username);
assert.equal(matches.length, 1, 'Exactly one matching Storage Box is required');
const box = matches[0];
assert.equal(box.status, 'active');
const subaccounts = (await api(`/storage_boxes/${box.id}/subaccounts`)).subaccounts;
assert(Array.isArray(subaccounts));
let found = subaccounts.filter(s => s.name === name || s.home_directory.replace(/^\//, '') === folder);
assert(found.length <= 1, 'Conflicting subaccounts; do not modify them');
if (stage === '--inspect') {
  console.log(JSON.stringify({matchingBox: true, existingSubaccounts: subaccounts.length, backupSubaccountPresent: found.length === 1, proposedDirectory: folder, proposedAccess: settings}));
  process.exit(0);
}
mkdirSync(admin, {recursive: true, mode: 0o700});
const st = lstatSync(admin);
assert(st.isDirectory() && st.uid === 0 && !(st.mode & 0o077), 'Unsafe admin directory');
if (!existsSync(`${admin}/previous-main`)) {
  mkdirSync(`${admin}/previous-main`, {mode: 0o700});
  for (const f of ['ssh_config', 'known_hosts', 'repository', 'id_ed25519', 'id_ed25519.pub']) {
    copyFileSync(`${base}/${f}`, `${admin}/previous-main/${f}`);
  }
  save(`${admin}/main-ssh_config`, original
    .replace(`${base}/id_ed25519`, `${admin}/previous-main/id_ed25519`)
    .replace(`${base}/known_hosts`, `${admin}/previous-main/known_hosts`));
}
const mainArgs = ['-F', `${admin}/main-ssh_config`, 'utilibre-storagebox'];
// Repository must already exist. Never initialize, rename or replace it.
const repositoryConfig = run('ssh', [...mainArgs, 'cat', `${folder}/config`]);
assert(repositoryConfig.length > 100, 'Existing repository config missing');
const key = `${admin}/backup_id_ed25519`;
if (!existsSync(key) && !existsSync(`${key}.pub`)) {
  run('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-C', 'utilibre-restricted-backups', '-f', key]);
}
assert(existsSync(key) && existsSync(`${key}.pub`), 'Incomplete key pair preserved');
privateFile(key);
const publicKey = readFileSync(`${key}.pub`, 'utf8').trim();
assert(/^ssh-ed25519 [A-Za-z0-9+/=]+ utilibre-restricted-backups$/.test(publicKey));
if (!found.length) {
  assert(!existsSync(`${admin}/created-subaccount.json`), 'Inspect prior creation before retrying');
  if (!existsSync(`${admin}/subaccount-password`)) save(`${admin}/subaccount-password`, `${randomBytes(48).toString('base64url')}Aa1!\n`);
  const result = await api(`/storage_boxes/${box.id}/subaccounts`, {
    name, home_directory: folder, password: privateFile(`${admin}/subaccount-password`).trim(),
    description: 'Utilibre native encrypted backups only', access_settings: settings,
    labels: {purpose: 'utilibre-backups'},
  });
  save(`${admin}/created-subaccount.json`, JSON.stringify({box: box.id, ...result}, null, 2));
  assert(Number.isSafeInteger(result.subaccount?.id));
  // Bounded read-only polling; never retry a timed-out account-creation POST.
  for (let i = 0; i < 15; i++) {
    try {
      const current = await api(`/storage_boxes/${box.id}/subaccounts/${result.subaccount.id}`);
      if (current.subaccount?.server) { found = [current.subaccount]; break; }
    } catch { /* creation may not yet be visible */ }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}
assert.equal(found.length, 1, 'Creation not yet visible; old backup connection untouched');
const sub = found[0];
assert.equal(sub.name, name);
assert.equal(sub.home_directory.replace(/^\//, ''), folder);
assert.deepEqual(sub.access_settings, settings);
assert(new RegExp(`^${username}-sub[0-9]+$`).test(sub.username));
assert.equal(sub.server, `${sub.username}.your-storagebox.de`);
writeFileSync(`${admin}/verified-subaccount.json`, JSON.stringify({box: box.id, subaccount: sub, checkedAt: new Date().toISOString()}, null, 2), {mode: 0o600});

const existing = spawnSync('ssh', [...mainArgs, 'cat', `${folder}/.ssh/authorized_keys`], {encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'pipe']});
if (existing.status === 0) {
  assert(existing.stdout.trim().split('\n').includes(publicKey), 'Existing different SSH keys preserved; inspect before adding');
} else {
  assert(existing.status !== 255 && /No such file or directory/.test(existing.stderr), 'Uncertain SSH key state; no overwrite');
  run('sftp', ['-F', `${admin}/main-ssh_config`, '-b', '-', 'utilibre-storagebox'],
    `-mkdir ${folder}/.ssh\nchmod 700 ${folder}/.ssh\nput ${key}.pub ${folder}/.ssh/authorized_keys\nchmod 600 ${folder}/.ssh/authorized_keys\n`);
}
const trusted = privateFile(`${admin}/previous-main/known_hosts`).trim().split('\n')
  .filter(l => l && !l.startsWith('#')).map(l => l.trim().split(/\s+/).slice(1, 3).join(' '));
const scanned = run('ssh-keyscan', ['-T', '8', '-p', '23', '-t', 'ed25519', sub.server]).trim().split('\n')
  .filter(l => l && !l.startsWith('#'));
assert(scanned.length > 0 && scanned.every(l => l.split(/\s+/)[0] === `[${sub.server}]:23` && trusted.includes(l.split(/\s+/).slice(1, 3).join(' '))), 'Subaccount host key must match the previously trusted box key');
writeFileSync(`${admin}/candidate-known_hosts`, [...new Set(scanned)].join('\n') + '\n', {mode: 0o600});
const template = readFileSync(fileURLToPath(new URL('./ssh_config', import.meta.url)), 'utf8');
const cfg = template.replace('__STORAGEBOX_HOST__', sub.server).replace('__STORAGEBOX_USER__', sub.username)
  .replace(`${base}/id_ed25519`, key).replace(`${base}/known_hosts`, `${admin}/candidate-known_hosts`);
writeFileSync(`${admin}/candidate-ssh_config`, cfg, {mode: 0o600});
const content = run('ssh', ['-F', `${admin}/candidate-ssh_config`, 'utilibre-storagebox', 'cat', 'config']);
assert.equal(content, repositoryConfig, 'Subaccount must see the same existing repository');
console.log(JSON.stringify({createdOrVerified: true, restrictedDirectory: folder, sshKeyAccess: 'passed', sameRepository: true, activeBackupConnectionChanged: false, privateEvidenceDirectory: admin}));
