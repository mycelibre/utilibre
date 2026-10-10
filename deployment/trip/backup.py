#!/usr/bin/env python3
"""Private consistent on-host TRIP backup. No pruning; no external transfer."""
from pathlib import Path
import subprocess,shutil,os,datetime,hashlib,json
base=Path('/opt/utilibre/trip');backup_root=base/'backups';backup_root.mkdir(mode=0o700,exist_ok=True)
required_free = 5*1024**3 + shutil.disk_usage(base/'data').used + 64*1024**2
if shutil.disk_usage(base).free < required_free:raise SystemExit('Backup deferred: snapshot estimate would cross the established 5GiB free-space floor')
assert subprocess.check_output(['findmnt','-n','-o','FSTYPE','--target',str(base/'data')],text=True).strip()=='ext4'
out=backup_root/datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ');out.mkdir(mode=0o700)
active=subprocess.run(['systemctl','is-active','--quiet','utilibre-trip.service']).returncode==0
try:
 if active:subprocess.run(['systemctl','stop','utilibre-trip.service'],check=True)
 target=out/'trip-state.tar.gz'
 with target.open('xb') as f:subprocess.run(['tar','-C',str(base),'-czf','-','data','private/runtime.env'],stdout=f,check=True)
 target.chmod(0o600)
 (out/'manifest.json').write_text(json.dumps({'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'scope':'Native SQLite, assets, attachments, native backup files and private runtime environment/configuration','retention':'No automatic pruning; on-host only'},indent=2));(out/'manifest.json').chmod(0o600)
 print('Private TRIP backup completed:',out)
finally:
 if active:subprocess.run(['systemctl','start','utilibre-trip.service'],check=True)
