#!/usr/bin/env node
// Local preparation only: no authentication, remote initialization or upload.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

if (process.getuid() !== 0) throw new Error('Run with sudo; credentials remain root-only.');
const base = '/opt/utilibre/storagebox/private';
const configPath = join(base, 'ssh_config');
let template;
if (!existsSync(configPath)) {
  const host = process.env.UTILIBRE_STORAGEBOX_HOST || '';
  const user = process.env.UTILIBRE_STORAGEBOX_USER || '';
  if (!/^u\d+(?:-sub\d+)?\.your-storagebox\.de$/.test(host) || !/^u\d+(?:-sub\d+)?$/.test(user)) {
    throw new Error('First setup requires UTILIBRE_STORAGEBOX_HOST and UTILIBRE_STORAGEBOX_USER. Keep actual values outside Git.');
  }
  template = readFileSync(new URL('./ssh_config', import.meta.url), 'utf8')
    .replace('__STORAGEBOX_HOST__', host).replace('__STORAGEBOX_USER__', user);
}
mkdirSync(base, { recursive: true, mode: 0o700 });
const stat = lstatSync(base);
if (!stat.isDirectory() || stat.uid !== 0 || (stat.mode & 0o077)) {
  throw new Error('Private directory must be root-owned, mode 0700, and not a symlink.');
}
function createOnce(name, value) {
  const path = join(base, name);
  try { writeFileSync(path, value, { mode: 0o600, flag: 'wx' }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  const item = lstatSync(path);
  if (!item.isFile() || !item.size || item.uid !== 0 || (item.mode & 0o077)) {
    throw new Error(`Unsafe private file: ${name}`);
  }
}
const key = join(base, 'id_ed25519');
if (!existsSync(key) && !existsSync(`${key}.pub`)) {
  execFileSync('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-C', 'utilibre-storage-backups', '-f', key]);
}
if (!existsSync(key) || !existsSync(`${key}.pub`)) throw new Error('Incomplete key pair; do not overwrite it.');
createOnce('id_ed25519', ''); // Validate permissions without replacing the key.
createOnce('restic-password', `${randomBytes(48).toString('base64')}\n`);
createOnce('repository', 'sftp:utilibre-storagebox:utilibre-app-backups\n');
createOnce('ssh_config', template || '');

// Resolve the existing private configuration without connecting or printing it.
const resolved = execFileSync('ssh', ['-G', '-F', configPath, 'utilibre-storagebox'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const host = /^hostname (.+)$/m.exec(resolved)?.[1];
if (!/^u\d+(?:-sub\d+)?\.your-storagebox\.de$/.test(host || '') || !/^port 23$/m.test(resolved)) {
  throw new Error('Unexpected private Storage Box host/port; inspect locally.');
}

// Candidate only. Never promote unauthenticated keyscan output to trusted keys.
const output = execFileSync('ssh-keyscan', ['-T', '8', '-p', '23', '-t', 'ed25519', host], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const scanned = `${[...new Set(output.split('\n').filter(line => line && !line.startsWith('#')))].join('\n')}\n`;
if (!scanned.startsWith(`[${host}]:23 `) || !/^\[[a-z0-9.-]+\]:23 ssh-ed25519 [A-Za-z0-9+/=]+\n$/.test(scanned)) {
  throw new Error('Unexpected host-key response; inspect independently.');
}
createOnce('known_hosts.candidate', scanned);
if (readFileSync(join(base, 'known_hosts.candidate'), 'utf8') !== scanned) {
  throw new Error('Candidate server key changed; verify independently. Neither candidate nor trusted keys were replaced.');
}
console.log('Prepared local configuration and a dedicated key. No remote files changed.');
console.log(`Public key: ${key}.pub`);
console.log('UNVERIFIED server fingerprint: compare with the Hetzner Console before trusting it.');
console.log(execFileSync('ssh-keygen', ['-lf', join(base, 'known_hosts.candidate'), '-E', 'sha256'], { encoding: 'utf8' }).trim());
console.log('Keep a separate secure recovery copy of restic-password before uploading backups.');
