import { mkdir, writeFile, chmod, chown, access } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
const base = '/opt/utilibre/community-data';
for (const dir of ['fmd-db', 'fmd-private']) {
  await mkdir(`${base}/${dir}`, { recursive: true, mode: 0o700 });
  await chown(`${base}/${dir}`, 1000, 1000);
  await chmod(`${base}/${dir}`, 0o700);
}
const file = `${base}/fmd-private/config.yml`;
let exists = true;
try { await access(file); } catch { exists = false; }
if (!exists) {
  // Native registration token: do not print, commit, or publish it.
  const token = randomBytes(32).toString('base64url');
  await writeFile(file, `PortInsecure: "8080"\nPortSecure: ""\nMaxSavedLoc: 300\nMaxSavedPic: 5\nRegistrationToken: "${token}"\nRemoteIpHeader: "X-Real-IP"\nMetricsAddrPort: "127.0.0.1:9100"\n`, { mode: 0o600, flag: 'wx' });
  await chown(file, 1000, 1000);
}
console.log('FMD private configuration ready; existing token preserved, registration invitation-only.');
