// Consistent on-host backup only. Off-site storage and scheduling are separate.
import { execFileSync } from 'node:child_process';
import { mkdirSync, openSync, closeSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const dir = fileURLToPath(new URL('.', import.meta.url));
const compose = ['compose', '--env-file', `${dir}.env`, '-f', `${dir}compose.yaml`];
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8' });
const running = docker(...compose, 'ps', '--status', 'running', '--services').trim().split('\n').filter(x => ['server', 'worker'].includes(x));
const target = `/opt/utilibre/identity-backups/${new Date().toISOString().replace(/[:.]/g, '-')}`;
mkdirSync('/opt/utilibre/identity-backups', { recursive: true, mode: 0o700 });
mkdirSync(target, { mode: 0o700 });
function save(name, command, args) {
  const fd = openSync(`${target}/${name}`, 'wx', 0o600);
  try { execFileSync(command, args, { stdio: ['ignore', fd, 'pipe'] }); }
  finally { closeSync(fd); }
}
try {
  if (running.length) docker(...compose, 'stop', '-t', '30', ...running);
  save('identity.dump', 'docker', [...compose, 'exec', '-T', 'postgresql', 'pg_dump', '-U', 'authentik', '-d', 'authentik', '-Fc']);
  save('data.tar.gz', 'tar', ['-C', '/opt/utilibre/identity-data', '-czf', '-', 'data']);
  save('private-config.tar.gz', 'tar', ['-C', root, '-czf', '-', 'deployment/identity/.env', 'secrets/authentik-admin.json']);
  writeFileSync(`${target}/SHA256SUMS`, execFileSync('sha256sum', ['identity.dump', 'data.tar.gz', 'private-config.tar.gz'], { cwd: target, encoding: 'utf8' }), { flag: 'wx', mode: 0o600 });
  console.log(`Private identity snapshot: ${target}`);
} finally {
  if (running.length) docker(...compose, 'start', ...running);
}
