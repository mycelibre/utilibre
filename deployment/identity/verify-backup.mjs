// Restore only into a disposable, networkless PostgreSQL container. Never production.
import { execFileSync, spawnSync } from 'node:child_process';
import { realpathSync, openSync, closeSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
const target = realpathSync(process.argv[2] || '');
if (!/^\/opt\/utilibre\/identity-backups\/[0-9TZ-]+$/.test(target)) throw new Error('Provide an exact identity snapshot directory.');
execFileSync('sha256sum', ['-c', 'SHA256SUMS'], { cwd: target, stdio: 'inherit' });
for (const name of ['data.tar.gz', 'private-config.tar.gz']) execFileSync('tar', ['-tzf', `${target}/${name}`], { stdio: 'ignore' });
const name = `utilibre-identity-restore-${randomBytes(6).toString('hex')}`;
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
let started = false;
try {
  docker('run', '-d', '--rm', '--name', name, '--network', 'none', '--memory', '512m', '--cpus', '1', '--pids-limit', '128',
    '--tmpfs', '/var/lib/postgresql/data:rw,nosuid,nodev,size=384m', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust',
    '-e', 'POSTGRES_USER=authentik', '-e', 'POSTGRES_DB=authentik',
    'postgres:16-alpine@sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea');
  started = true;
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    // The initdb temporary server listens on Unix sockets before restarting;
    // TCP becomes ready only when the final server is running.
    if (spawnSync('docker', ['exec', name, 'pg_isready', '-h', '127.0.0.1', '-U', 'authentik', '-d', 'authentik'], { stdio: 'ignore' }).status === 0) { ready = true; break; }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (!ready) throw new Error('Temporary restore database did not become ready.');
  const fd = openSync(`${target}/identity.dump`, 'r');
  try { execFileSync('docker', ['exec', '-i', name, 'pg_restore', '--exit-on-error', '--no-owner', '-U', 'authentik', '-d', 'authentik'], { stdio: [fd, 'ignore', 'pipe'] }); }
  finally { closeSync(fd); }
  const ownerCount = docker('exec', name, 'psql', '-U', 'authentik', '-d', 'authentik', '-Atc', "SELECT count(*) FROM authentik_core_user WHERE username='akadmin' AND email='admin@utilibre.org' AND is_active;").trim();
  if (ownerCount !== '1') throw new Error('Restored owner record did not match.');
  writeFileSync(`${target}/RESTORE-VERIFIED.txt`,`${new Date().toISOString()}\nIsolated database restore, owner record and archive checks passed.\n`,{mode:0o600});
  console.log('Identity database restored successfully; owner record verified; archive checks passed.');
} finally {
  if (started) docker('stop', '-t', '5', name);
}
