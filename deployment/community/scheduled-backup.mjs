// Online community snapshots; no application stop or automatic backup deletion.
import { execFileSync } from 'node:child_process';
import { statfsSync } from 'node:fs';
const disk = statfsSync('/opt/utilibre/community-backups');
try {
  if (disk.bavail * disk.bsize < 5 * 1024 ** 3) throw Error('Less than 5 GiB free for backups');
  const snapshot = execFileSync(process.execPath, [new URL('./backup.mjs', import.meta.url).pathname], { encoding: 'utf8' }).trim();
  if (!/^\/opt\/utilibre\/community-backups\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/.test(snapshot)) throw Error('Unexpected snapshot path');
  execFileSync(process.execPath, [new URL('./verify-backup.mjs', import.meta.url).pathname, snapshot], { stdio: 'inherit' });
  console.log(`Verified community snapshot: ${snapshot}`);
} catch (error) {
  // Only a generic alert leaves the host: never email database errors/secrets.
  try { execFileSync('python3', ['-c', `import smtplib,ssl
from email.message import EmailMessage
m=EmailMessage();m['From']='no-reply@utilibre.org';m['To']='admin@utilibre.org';m['Subject']='Utilibre community backup failed'
m.set_content('The scheduled Rallly, FMD and Pollaris backup or restore check failed. Inspect utilibre-community-backup.service on the application VM. Existing backups were not removed.')
with smtplib.SMTP('mx.mailgt.dev',26,timeout=15) as s:
 s.starttls(context=ssl.create_default_context());s.send_message(m)
`], { stdio: ['ignore', 'ignore', 'pipe'] }); } catch { console.error('Backup alert could not be delivered.'); }
  throw error;
}
