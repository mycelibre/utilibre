import { execFileSync } from 'node:child_process';
import { openSync, closeSync, realpathSync, writeFileSync, existsSync } from 'node:fs';
const target = realpathSync(process.argv[2] || '');
if (!/^\/opt\/utilibre\/community-backups\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/.test(target)) throw Error('Pass one exact community-backups snapshot directory');
execFileSync('sha256sum', ['--check', 'SHA256SUMS'], { cwd: target, stdio: 'inherit' });
if (existsSync(`${target}/binternet-onion-identity.tar.gz`)) {
  const names = execFileSync('tar', ['-tzf', `${target}/binternet-onion-identity.tar.gz`], { encoding: 'utf8' }).split('\n');
  for (const file of ['hostname', 'hs_ed25519_public_key', 'hs_ed25519_secret_key']) {
    if (!names.includes(`binternet/${file}`)) throw Error('Incomplete onion identity backup');
  }
  console.log('Onion identity archive structure verified; no key material printed.');
}
const name = `utilibre-community-restore-${process.pid}`;
if (existsSync(`${target}/additional-private-config.tar.gz`)) {
  const names = execFileSync('tar', ['-tzf', `${target}/additional-private-config.tar.gz`], { encoding: 'utf8' }).trim().split('\n');
  if (!names.length || names.some(file => !['mumble/runtime.env', 'kittygram/runtime.env'].includes(file))) throw Error('Unexpected additional private archive content');
  if (existsSync(`${target}/mumble.sqlite`) && !names.includes('mumble/runtime.env')) throw Error('Missing Mumble private configuration');
  console.log('Additional private configuration archive structure verified; no credentials printed.');
}
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8' });
let created = false;
try {
  docker('run', '-d', '--name', name, '--network', 'none', '--memory', '512m', '--cpus', '1', '--pids-limit', '128', '--security-opt', 'no-new-privileges:true', '--tmpfs', '/var/lib/postgresql/data:rw,nosuid,nodev,size=256m', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres@sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73');
  created = true;
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try { docker('exec', name, 'pg_isready', '-U', 'postgres'); ready = true; break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) throw Error('Restore container failed to become ready');
  docker('exec', name, 'createdb', '-U', 'postgres', 'rallly');
  const fd = openSync(`${target}/rallly.dump`, 'r');
  try { execFileSync('docker', ['exec', '-i', name, 'pg_restore', '-U', 'postgres', '-d', 'rallly', '--no-owner', '--no-acl', '--exit-on-error'], { stdio: [fd, 'pipe', 'pipe'] }); }
  finally { closeSync(fd); }
  const links = docker('exec', name, 'psql', '-U', 'postgres', '-d', 'rallly', '-Atc', 'SELECT jsonb_array_length(footer_links) FROM instance_settings WHERE id=1').trim();
  if (Number(links) < 2) throw Error('Native Rallly footer settings did not restore');
  if (existsSync(`${target}/pollaris.dump`)) {
    docker('exec', name, 'createdb', '-U', 'postgres', 'pollaris');
    const pollaris = openSync(`${target}/pollaris.dump`, 'r');
    try { execFileSync('docker', ['exec', '-i', name, 'pg_restore', '-U', 'postgres', '-d', 'pollaris', '--no-owner', '--no-acl', '--exit-on-error'], { stdio: [pollaris, 'pipe', 'pipe'] }); }
    finally { closeSync(pollaris); }
    const tables = docker('exec', name, 'psql', '-U', 'postgres', '-d', 'pollaris', '-Atc', "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('poll','vote','users')").trim();
    if (Number(tables) !== 3) throw Error('Pollaris application tables did not restore');
  }
  for (const filename of ['fmd.sqlite', 'kuma.sqlite', 'mumble.sqlite']) {
    if (filename !== 'fmd.sqlite' && !existsSync(`${target}/${filename}`)) continue;
    execFileSync('python3', ['-c', `import sqlite3,sys
c=sqlite3.connect('file:'+sys.argv[1]+'?mode=ro',uri=True)
assert c.execute('PRAGMA integrity_check').fetchall()==[('ok',)]
assert c.execute("SELECT count(*) FROM sqlite_master WHERE type='table'").fetchone()[0]>0
c.close()`, `${target}/${filename}`]);
  }
  writeFileSync(`${target}/RESTORE-VERIFIED.txt`, `${new Date().toISOString()}\nRallly PostgreSQL restore, Pollaris restore (when included), FMD SQLite integrity, Kuma and Mumble SQLite integrity (when included) passed. Private configuration archive structure checked. This is not a full Android, voice, monitoring or SSO workflow test. Backup remains on this VM, not off-site.\n`, { mode: 0o600 });
  console.log('Community PostgreSQL restore and SQLite backup integrity passed; private snapshot remains on-host.');
} finally {
  if (created) docker('rm', '-f', name);
}
