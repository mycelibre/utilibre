import { execFileSync } from 'node:child_process';
import { closeSync, openSync, realpathSync, writeFileSync } from 'node:fs';
const target = realpathSync(process.argv[2] || '');
if (!/^\/opt\/utilibre\/spliit\/backups\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/.test(target)) throw Error('Pass one exact Spliit snapshot directory');
execFileSync('sha256sum', ['--check', 'SHA256SUMS'], { cwd: target, stdio: 'inherit' });
const name = `maintenance-spliit-restore-${process.pid}`;
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
let created = false;
try {
  // Same repaired PostgreSQL image as production, never an older pulled image.
  docker('run', '-d', '--pull', 'never', '--name', name, '--network', 'none', '--log-driver', 'none', '--memory', '512m', '--cpus', '0.5', '--pids-limit', '96', '--security-opt', 'no-new-privileges:true', '--tmpfs', '/var/lib/postgresql/data:rw,nosuid,nodev,size=512m', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'sha256:34bce7234d7454085fd6131efd1471061e0e36e47e83baa4cd56ec9fbf1d63c3');
  created = true;
  let ready = false;
  for (let i = 0; i < 40; i++) {
    // The image's temporary bootstrap server accepts Unix sockets but not TCP.
    // Wait for the final server; a socket-only probe races bootstrap shutdown.
    try { docker('exec', name, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres'); ready = true; break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) throw Error('Isolated restore database did not become ready');
  docker('exec', name, 'createdb', '-h', '127.0.0.1', '-U', 'postgres', 'spliit');
  const fd = openSync(`${target}/spliit.dump`, 'r');
  try { execFileSync('docker', ['exec', '-i', name, 'pg_restore', '-h', '127.0.0.1', '-U', 'postgres', '-d', 'spliit', '--no-owner', '--no-acl', '--exit-on-error'], { stdio: [fd, 'pipe', 'pipe'] }); }
  finally { closeSync(fd); }
  const tables = docker('exec', name, 'psql', '-h', '127.0.0.1', '-U', 'postgres', '-d', 'spliit', '-Atc', "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('Group','Participant','Expense','ExpensePaidFor','Activity','_prisma_migrations')").trim();
  if (tables !== '6') throw Error('Expected native Spliit tables did not restore');
  const counts = docker('exec', name, 'psql', '-h', '127.0.0.1', '-U', 'postgres', '-d', 'spliit', '-Atc', 'SELECT json_build_object(\'groups\',(SELECT count(*) FROM "Group"),\'expenses\',(SELECT count(*) FROM "Expense"),\'participants\',(SELECT count(*) FROM "Participant"))').trim();
  writeFileSync(`${target}/RESTORE-VERIFIED.json`, JSON.stringify({ checkedAt: new Date().toISOString(), method: 'Native PostgreSQL restore to network-none disposable container; schema and counts read', counts: JSON.parse(counts), limit: '512 MiB temporary database; same-VM backup, not off-site recovery' }, null, 2)+'\n', { mode: 0o600 });
  console.log('Spliit PostgreSQL isolated restore passed; no production database was changed.');
} finally { if (created) docker('rm', '-f', name); }
