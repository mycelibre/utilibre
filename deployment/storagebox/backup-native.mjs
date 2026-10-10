#!/usr/bin/env node
// Select completed native snapshots; Restic provides encryption and transport.
// No live-database copying or snapshot generation; native retention follows a successful upload/check.
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readdir, readFile, realpath, mkdir, mkdtemp, writeFile, statfs, rename } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyRetention } from './retention.mjs';

const iso = /^\d{4}-\d{2}-\d{2}T[\d-]+Z$/;
const compact = /^\d{8}T\d{6}Z$/;
const source = (id, root, pattern, marker = 'SHA256SUMS', complete = false) => ({ id, root, pattern, marker, complete });
export const sources = [
  source('core', '/opt/utilibre/data/backups', /^daily-\d{8}-\d{6}$/),
  ...['identity', 'expanded', 'community'].map(id => source(id, `/opt/utilibre/${id}-backups`, iso)),
  source('pack', '/opt/utilibre/pack-backups', iso, 'SHA256SUMS', true),
  source('calendar', '/opt/utilibre/calendar-backups', compact),
  ...['gathio', 'razzia'].map(id => source(id, '/opt/utilibre/calendar-backups', new RegExp(`^${id}-\\d{8}T\\d{6}Z$`))),
  ...['opengist', 'linkding', 'vikunja', 'bytestash'].map(id => source(id, '/opt/utilibre/community-backups', new RegExp(`^${id}-\\d{8}T\\d{6}Z$`))),
  source('trip', '/opt/utilibre/trip/backups', compact, 'manifest.json'),
  source('spliit', '/opt/utilibre/spliit/backups', iso),
  ...['donetick', 'beaverhabits', 'family-chess', 'wishlist', 'kitchenowl', 'newsletters', 'addy', 'simplelogin'].map(id => source(id, `/opt/utilibre/${id}/backups`, iso, 'SHA256.json')),
  source('projects', '/opt/utilibre/projects/backups', compact, 'SHA256.json'),
  source('chhoto', '/opt/utilibre/chhoto-backups', compact),
];

export function parseManifest(marker, text) {
  let entries;
  if (marker === 'SHA256SUMS') {
    entries = text.trim().split('\n').map(line => {
      const match = /^([a-f0-9]{64}) [ *](.+)$/.exec(line);
      if (!match) throw Error('Invalid SHA256SUMS line');
      return [match[2], match[1]];
    });
  } else {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error('Invalid manifest');
    entries = marker === 'manifest.json' ? [['trip-state.tar.gz', parsed.sha256]] : Object.entries(parsed);
  }
  if (!entries.length || entries.length > 10000) throw Error('Invalid manifest entry count');
  const names = new Set();
  for (const [name, hash] of entries) {
    if (!/^[a-zA-Z0-9_.\/-]+$/.test(name) || name.split('/').some(part => !part || part === '.' || part === '..') ||
        typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash) || names.has(name)) throw Error('Unsafe manifest entry');
    names.add(name);
  }
  return entries;
}

async function regularFile(path) {
  const stat = await lstat(path);
  if (!stat.isFile() || await realpath(path) !== resolve(path)) throw Error('Non-regular or redirected backup file');
  return stat;
}
async function hashFile(path) {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  return digest.digest('hex');
}
export async function inspectSnapshot(spec, now = Date.now()) {
  const candidates = [];
  for (const item of await readdir(spec.root, { withFileTypes: true })) {
    if (!item.isDirectory() || !spec.pattern.test(item.name)) continue;
    const path = join(spec.root, item.name);
    try {
      const stat = await regularFile(join(path, spec.marker));
      if (spec.complete) await regularFile(join(path, 'COMPLETE'));
      candidates.push({ path, stat });
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  candidates.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
  const latest = candidates[0];
  if (!latest) throw Error('No completed native snapshot');
  if (now - latest.stat.mtimeMs > 36 * 3600_000 || latest.stat.mtimeMs > now + 300_000) throw Error('Snapshot stale or clock mismatch');
  if (latest.stat.size > 1024 * 1024) throw Error('Manifest unexpectedly large');
  const manifest = join(latest.path, spec.marker);
  const entries = parseManifest(spec.marker, await readFile(manifest, 'utf8'));
  const files = [manifest];
  let bytes = latest.stat.size;
  for (const [name, expected] of entries) {
    const path = join(latest.path, name);
    const before = await regularFile(path);
    if (await hashFile(path) !== expected) throw Error('Snapshot checksum mismatch');
    const after = await regularFile(path);
    if (after.size !== before.size || after.mtimeMs !== before.mtimeMs) throw Error('Snapshot changed during verification');
    bytes += after.size;
    files.push(path);
  }
  const after = await regularFile(manifest);
  if (after.size !== latest.stat.size || after.mtimeMs !== latest.stat.mtimeMs) throw Error('Manifest changed during verification');
  if (spec.complete) files.push(join(latest.path, 'COMPLETE'));
  return { id: spec.id, directory: latest.path, completedAt: new Date(latest.stat.mtimeMs).toISOString(), bytes, files };
}

async function main() {
  if (process.getuid() !== 0) throw Error('Run with sudo');
  if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--apply')) throw Error('Use backup-native.mjs [--apply]');
  process.umask(0o077);
  const snapshots = [], problems = [];
  for (const spec of sources) {
    try { snapshots.push(await inspectSnapshot(spec)); }
    catch (error) { problems.push({ source: spec.id, reason: error.code || error.message }); }
  }
  if (problems.length) {
    // Scope names/validation results only, never database contents or secrets.
    console.error(JSON.stringify({ status: 'blocked', problems }));
    process.exitCode = 1;
    return;
  }
  const keyFiles = ['/opt/utilibre/pack-backup-key/private.pem', '/opt/utilibre/pack-backup-key/certificate.pem'];
  for (const path of keyFiles) await regularFile(path);
  const bytes = snapshots.reduce((total, snapshot) => total + snapshot.bytes, 0);
  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify({ status: 'validated-dry-run', sources: snapshots.map(({ files, ...summary }) => summary), bytes }, null, 2));
    return;
  }
  const disk = await statfs('/opt/utilibre');
  if (disk.bavail * disk.bsize < 5 * 1024 ** 3) throw Error('Less than 5 GiB free; upload deferred');
  const reports = '/opt/utilibre/reports';
  await mkdir(reports, { recursive: true, mode: 0o700 });
  const report = await mkdtemp(join(reports, 'storagebox-native-'));
  await writeFile(join(report, 'selection.json'), JSON.stringify({ date: new Date().toISOString(), snapshots, keyFiles, bytes }, null, 2), { mode: 0o600 });
  const files = [...new Set([...snapshots.flatMap(snapshot => snapshot.files), ...keyFiles, join(report, 'selection.json')])];
  await writeFile(join(report, 'files.list'), `${files.join('\0')}\0`, { mode: 0o600 });
  const wrapper = fileURLToPath(new URL('./restic.sh', import.meta.url));
  const run = args => execFileSync('sh', [wrapper, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 4 * 1024 ** 2 });
  const output = run(['backup', '--json', '--quiet', '--host', 'utilibre-vm', '--tag', 'native-app-snapshots', '--group-by', 'host,tags', '--files-from-raw', join(report, 'files.list')]);
  const summary = output.trim().split('\n').map(line => JSON.parse(line)).find(item => item.message_type === 'summary');
  if (!/^[a-f0-9]{8,64}$/.test(summary?.snapshot_id ?? '')) throw Error('Missing snapshot confirmation');
  run(['check', '--quiet']);
  const retention = applyRetention(run, summary.snapshot_id);
  const result = { date: new Date().toISOString(), status: 'uploaded-and-metadata-checked', snapshot: summary.snapshot_id, sourceCount: snapshots.length, bytes, dataAdded: summary.data_added, retention, report };
  await writeFile(join(report, 'result.json'), JSON.stringify(result, null, 2), { mode: 0o600 });
  const status = '/opt/utilibre/storagebox/private/last-success.json';
  await writeFile(`${status}.tmp`, JSON.stringify(result, null, 2), { mode: 0o600 });
  await rename(`${status}.tmp`, status);
  console.log(JSON.stringify(result, null, 2));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(`Off-host backup/retention failed (${error.code || 'operation error'}); inspect private reports before retrying.`); process.exitCode = 1; });
}
