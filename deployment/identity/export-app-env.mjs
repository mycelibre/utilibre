// Copy generated client credentials to the existing private Compose env file.
// No values go to stdout or the public source archive.
import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
const clients = JSON.parse(readFileSync('/opt/utilibre/identity-data/data/private/oidc-clients.json', 'utf8'));
const destination = new URL('../expanded/.env', import.meta.url);
let contents = readFileSync(destination, 'utf8');
for (const [app, values] of Object.entries(clients)) {
  for (const key of ['client_id', 'client_secret']) {
    const name = `${app.toUpperCase()}_OIDC_${key.toUpperCase()}`;
    const value = values[key];
    if (!/^[A-Za-z0-9_-]+$/.test(value)) throw Error('Unexpected credential format');
    const pattern = new RegExp(`^${name}=.*$`, 'm');
    contents = pattern.test(contents) ? contents.replace(pattern, `${name}=${value}`) : `${contents.trimEnd()}\n${name}=${value}\n`;
  }
}
writeFileSync(destination, contents, {mode: 0o600});
chmodSync(destination, 0o600);
console.log('Four client credentials saved to private expanded/.env; values withheld.');
