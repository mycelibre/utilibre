// Same native pg_dump/private-directory convention as the existing community stack.
import { execFileSync } from 'node:child_process';
import { closeSync, mkdirSync, openSync, statfsSync, writeFileSync } from 'node:fs';
const base = '/opt/utilibre/spliit/backups';
const disk = statfsSync(base);
if (disk.bavail * disk.bsize < 5 * 1024 ** 3) throw Error('Less than 5 GiB free for a Spliit snapshot');
const target = `${base}/${new Date().toISOString().replace(/[:.]/g, '-')}`;
mkdirSync(target, { mode: 0o700 });
function capture(file, executable, args) {
  const fd = openSync(`${target}/${file}`, 'wx', 0o600);
  try { execFileSync(executable, args, { stdio: ['ignore', fd, 'pipe'] }); }
  finally { closeSync(fd); }
}
capture('spliit.dump', 'docker', ['exec', 'utilibre-spliit-db-1', 'pg_dump', '-U', 'spliit', '-d', 'spliit', '-Fc']);
capture('private-config.tar.gz', 'tar', ['-czf', '-', '-C', '/opt/utilibre/spliit', 'private']);
writeFileSync(`${target}/SHA256SUMS`, execFileSync('sha256sum', ['spliit.dump', 'private-config.tar.gz'], { cwd: target }), { mode: 0o600 });
console.log(target);
