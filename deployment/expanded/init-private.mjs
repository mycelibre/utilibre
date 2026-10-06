// Generate private deployment credentials once; never print their values.
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync, chmodSync, chownSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const target = fileURLToPath(new URL('.env', import.meta.url));
const secret = () => randomBytes(48).toString('hex');
try {
  writeFileSync(target, [
    `WAKAPI_PASSWORD_SALT=${secret()}`,
    `RESUME_DB_PASSWORD=${secret()}`,
    `RESUME_AUTH_SECRET=${secret()}`,
    `PENPOT_DB_PASSWORD=${secret()}`,
    `PENPOT_SECRET_KEY=${randomBytes(64).toString('base64url')}`,
    '',
  ].join('\n'), { flag: 'wx', mode: 0o600 });
  console.log('Created private deployment credentials (values withheld).');
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log('Preserved existing private deployment credentials.');
}
chmodSync(target, 0o600);
for (const [name, uid, gid] of [
  ['wakapi', 65532, 65532], ['actual', 1000, 1000],
  ['resume', 1000, 1000], ['resume-db', 70, 70],
  ['penpot-assets', 1001, 1001], ['penpot-db', 70, 70],
]) {
  const path = `/opt/utilibre/expanded-data/${name}`;
  mkdirSync(path, { recursive: true, mode: 0o750 });
  chownSync(path, uid, gid);
}
