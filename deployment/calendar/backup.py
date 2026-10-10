#!/usr/bin/env python3
"""Consistent local calendar snapshot using Radicale's native filesystem lock.
No pruning: retention has no configured expiry; this is not an offsite backup.
"""
from pathlib import Path
from datetime import datetime, timezone
import fcntl,tarfile,hashlib,os
root=Path(__file__).resolve().parents[2]
os.umask(0o077)
base=Path('/opt/utilibre/calendar-data')
target=Path('/opt/utilibre/calendar-backups')/datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
target.mkdir(parents=True,mode=0o700)
with (base/'collections/.Radicale.lock').open('a') as lock:
 fcntl.flock(lock,fcntl.LOCK_SH)
 with tarfile.open(target/'state.tar.gz','w:gz') as tar:tar.add(base,arcname='data')
with tarfile.open(target/'private-config.tar.gz','w:gz') as tar:
 tar.add('/opt/utilibre/calendar-private',arcname='private')
 tar.add(root/'deployment/calendar',arcname='deployment')
(target/'SHA256SUMS').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n' for p in sorted(target.glob('*.tar.gz'))))
print(target)
