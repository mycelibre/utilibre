import { mkdir, writeFile, chmod, chown, access } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
const base = '/opt/utilibre/community-data';
for (const [directory, uid] of [['pollaris-private', 0], ['pollaris-db', 70], ['pollaris-var', 82], ['pollaris-var/sessions', 82], ['pollaris-var/share', 82]]) {
  const path = `${base}/${directory}`;
  await mkdir(path, { recursive: true, mode: 0o700 });
  await chown(path, uid, uid);
  await chmod(path, 0o700);
}
const file = `${base}/pollaris-private/application.env`;
try {
  await access(file);
  await access(`${base}/pollaris-private/database.env`);
  console.log('Existing Pollaris configuration preserved.');
} catch {
  const password = randomBytes(32).toString('hex');
  await writeFile(`${base}/pollaris-private/database.env`, `POSTGRES_USER=pollaris\nPOSTGRES_DB=pollaris\nPOSTGRES_PASSWORD=${password}\n`, { mode: 0o600, flag: 'wx' });
  await writeFile(file, [
    'APP_ENV=prod', 'APP_DEBUG=0', `APP_SECRET=${randomBytes(64).toString('hex')}`,
    'APP_BASE_URL=https://pollaris.utilibre.org', 'APP_NAME=Pollaris · Utilibre',
    'APP_REQUIRE_EMAILS=false', 'APP_TIMEZONE=UTC', 'APP_SHARE_DIR=var/share',
    'POLL_EXPIRES_COMPLETED=6 months', 'POLL_EXPIRES_INCOMPLETE=7 days',
    `DATABASE_URL=postgresql://pollaris:${password}@pollaris-db:5432/pollaris?serverVersion=17&charset=utf8`,
    'MAILER_DSN=smtp://mx.mailgt.dev:26?require_tls=true&max_per_second=1',
    'MAILER_FROM=no-reply@utilibre.org', 'MAILER_FROM_NAME=Utilibre',
    'MESSENGER_TRANSPORT_DSN=doctrine://default?auto_setup=0&check_delayed_interval=30000',
    '',
  ].join('\n'), { mode: 0o600, flag: 'wx' });
  console.log('Pollaris private configuration created; no credentials printed.');
}
