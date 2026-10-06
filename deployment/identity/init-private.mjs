// Generate once. Values stay in ignored, owner-readable files, never stdout.
import { randomBytes, pbkdf2Sync } from 'node:crypto';
import { mkdirSync, writeFileSync, chmodSync, chownSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const envPath = fileURLToPath(new URL('.env', import.meta.url));
const secretsDir = fileURLToPath(new URL('../../secrets/', import.meta.url));
const ownerPath = `${secretsDir}authentik-admin.json`;
if (existsSync(envPath) !== existsSync(ownerPath)) {
  throw new Error('Incomplete existing identity credentials; preserve and inspect them before continuing.');
}
if (!existsSync(envPath)) {
  mkdirSync(secretsDir, { recursive: true, mode: 0o700 });
  const password = randomBytes(36).toString('base64url');
  const salt = randomBytes(16).toString('hex');
  const digest = pbkdf2Sync(password, salt, 1000000, 32, 'sha256').toString('base64');
  const hash = `pbkdf2_sha256$1000000$${salt}$${digest}`;
  writeFileSync(ownerPath, `${JSON.stringify({
    username: 'akadmin', email: 'admin@utilibre.org', password,
    intendedLoginUrl: 'https://auth.utilibre.org/',
    publicAccess: 'Requires the separate Caddy route and verified HTTPS.',
  }, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  writeFileSync(envPath, [
    `PG_PASS=${randomBytes(48).toString('hex')}`,
    `AUTHENTIK_SECRET_KEY=${randomBytes(60).toString('base64url')}`,
    `AUTHENTIK_BOOTSTRAP_PASSWORD_HASH='${hash}'`,
    'SMTP_RELAY_HOST=mx.mailgt.dev', '',
  ].join('\n'), { flag: 'wx', mode: 0o600 });
  console.log('Generated identity credentials; values withheld.');
} else console.log('Preserved existing identity credentials.');
chmodSync(envPath, 0o600);
chmodSync(ownerPath, 0o600);
for (const [name, uid] of [['data', 1000], ['postgresql', 70]]) {
  const path = `/opt/utilibre/identity-data/${name}`;
  mkdirSync(path, { recursive: true, mode: 0o750 });
  chownSync(path, uid, uid);
}
