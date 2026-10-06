// Consistent, private on-host snapshot. Run as root; this is not an off-site backup.
import { execFileSync } from 'node:child_process';
import { mkdirSync, openSync, closeSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const dir = fileURLToPath(new URL('.', import.meta.url));
const compose = ['compose', '--env-file', `${dir}.env`, '-f', `${dir}compose.yaml`];
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8' });
const services = ['resume', 'penpot-frontend', 'penpot-backend', 'penpot-admin-console', 'penpot-exporter', 'actual', 'wakapi'];
const running = docker(...compose, 'ps', '--status', 'running', '--services').trim().split('\n').filter(x => services.includes(x));
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const target = `/opt/utilibre/expanded-backups/${stamp}`;
mkdirSync('/opt/utilibre/expanded-backups', { recursive: true, mode: 0o700 });
mkdirSync(target, { mode: 0o700 });
function toFile(name, command, args) {
  const fd = openSync(`${target}/${name}`, 'wx', 0o600);
  try { execFileSync(command, args, { stdio: ['ignore', fd, 'pipe'] }); }
  finally { closeSync(fd); }
}
try {
  if (running.length) docker(...compose, 'stop', '-t', '30', ...running);
  for (const name of ['resume', 'penpot']) {
    toFile(`${name}.dump`, 'docker', [...compose, 'exec', '-T', `${name}-db`, 'pg_dump', '-U', name, '-d', name, '-Fc']);
  }
  toFile('files.tar.gz', 'tar', ['-C', '/opt/utilibre/expanded-data', '-czf', '-', 'actual', 'wakapi', 'resume', 'penpot-assets']);
  const privateFiles = ['deployment/expanded/.env'];
  if (existsSync(`${dir}.env.wakapi-config.yml`)) privateFiles.push('deployment/expanded/.env.wakapi-config.yml');
  if (existsSync(`${root}secrets/wakapi-admin.json`)) privateFiles.push('secrets/wakapi-admin.json');
  toFile('private-config.tar.gz', 'tar', ['-C', root, '-czf', '-', ...privateFiles]);
  const hashes = execFileSync('sha256sum', ['resume.dump', 'penpot.dump', 'files.tar.gz', 'private-config.tar.gz'], { cwd: target, encoding: 'utf8' });
  writeFileSync(`${target}/SHA256SUMS`, hashes, { flag: 'wx', mode: 0o600 });
  console.log(`Private snapshot: ${target}`);
} finally {
  if (running.length) docker(...compose, 'start', ...running);
}
console.log('Previously running account services restarted. Run verify-backup.mjs on this snapshot.');
