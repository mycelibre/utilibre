import { randomBytes } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const dir = fileURLToPath(new URL('.', import.meta.url));
const credentialsFile = fileURLToPath(new URL('../../secrets/wakapi-admin.json', import.meta.url));
const compose = ['compose', '--env-file', `${dir}.env`, '-f', `${dir}compose.yaml`];
const sql = (query) => execFileSync('python3', ['-c', 'import sqlite3,sys,json; c=sqlite3.connect("file:/opt/utilibre/expanded-data/wakapi/wakapi.db?mode=ro",uri=True); print(json.dumps(c.execute(sys.argv[1]).fetchall()))', query], { encoding: 'utf8' });
const users = JSON.parse(sql('SELECT count(*) FROM users'))[0][0];
if (users && !existsSync(credentialsFile)) throw Error('Existing accounts found; refusing to claim or alter them.');
mkdirSync(fileURLToPath(new URL('../../secrets/', import.meta.url)), { recursive: true, mode: 0o700 });
const credentials = existsSync(credentialsFile) ? JSON.parse(readFileSync(credentialsFile, 'utf8')) : { username: 'utilibre-admin', password: randomBytes(32).toString('base64url') };
if (!existsSync(credentialsFile)) writeFileSync(credentialsFile, JSON.stringify(credentials) + '\n', { flag: 'wx', mode: 0o600 });
if (!users) {
  try {
    execFileSync('docker', [...compose, '-f', `${dir}compose.wakapi-bootstrap.yaml`, 'up', '-d', '--no-deps', 'wakapi'], { stdio: 'inherit' });
    let ready = false;
    for (let i = 0; i < 30; i++) {
      try { if ((await fetch('http://127.0.0.1:3136/')).ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!ready) throw Error('Wakapi did not start');
    const response = await fetch('http://127.0.0.1:3136/signup', {
      method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: credentials.username, password: credentials.password, password_repeat: credentials.password, email: '', location: 'America/Guatemala' }),
    });
    if (![302, 303].includes(response.status)) throw Error(`Wakapi account bootstrap returned ${response.status}`);
    const admin = JSON.parse(sql("SELECT is_admin FROM users WHERE id='utilibre-admin'"));
    if (!admin[0]?.[0]) throw Error('Owner administrator flag not set');
    console.log('Wakapi owner created without an email address; credentials stored privately.');
  } finally {
    execFileSync('docker', [...compose, 'up', '-d', '--no-deps', 'wakapi'], { stdio: 'inherit' });
  }
} else console.log('Preserved existing Wakapi owner.');
