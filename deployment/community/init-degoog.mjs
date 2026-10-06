import { mkdir, writeFile, chown, chmod, access } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
const base = '/opt/utilibre/community-data';
for (const dir of ['degoog', 'degoog-private']) {
  await mkdir(`${base}/${dir}`, { recursive: true, mode: 0o700 });
  await chown(`${base}/${dir}`, 1000, 1000);
  await chmod(`${base}/${dir}`, 0o700);
}
const file = `${base}/degoog-private/runtime.env`;
let exists = true;
try { await access(file); } catch { exists = false; }
if (!exists) {
  await writeFile(file, `DEGOOG_SETTINGS_PASSWORDS=${randomBytes(48).toString('base64url')}\n`, { mode: 0o600, flag: 'wx' });
  await chown(file, 1000, 1000);
}
console.log('DeGoog operator password configured privately; existing credentials preserved.');
