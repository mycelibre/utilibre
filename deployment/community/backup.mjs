// Online snapshots using PostgreSQL pg_dump and SQLite's backup API.
import { execFileSync } from 'node:child_process';
import { mkdirSync, openSync, closeSync, writeFileSync } from 'node:fs';
const target = `/opt/utilibre/community-backups/${new Date().toISOString().replace(/[:.]/g, '-')}`;
mkdirSync(target, { recursive: true, mode: 0o700 });
function capture(name, cmd, args) {
  const fd = openSync(`${target}/${name}`, 'wx', 0o600);
  try { execFileSync(cmd, args, { stdio: ['ignore', fd, 'pipe'] }); }
  finally { closeSync(fd); }
}
capture('rallly.dump', 'docker', ['exec', 'utilibre-community-rallly-db-1', 'pg_dump', '-U', 'rallly', '-d', 'rallly', '-Fc']);
execFileSync('python3', ['-c', `import sqlite3,sys,os
os.umask(0o077)
src=sqlite3.connect('file:/opt/utilibre/community-data/fmd-db/fmd.sqlite?mode=ro',uri=True)
dst=sqlite3.connect(sys.argv[1])
src.backup(dst)
assert dst.execute('PRAGMA integrity_check').fetchall()==[('ok',)]
dst.close();src.close()`, `${target}/fmd.sqlite`]);
capture('private-config.tar.gz', 'tar', ['-czf', '-', '-C', '/home/ubuntu/freetools', 'deployment/community/.env.rallly', '-C', '/opt/utilibre/community-data', 'fmd-private', 'degoog-private', 'degoog']);
const files = ['rallly.dump', 'fmd.sqlite', 'private-config.tar.gz'];
writeFileSync(`${target}/SHA256SUMS`, execFileSync('sha256sum', files, { cwd: target }), { mode: 0o600 });
console.log(target);
