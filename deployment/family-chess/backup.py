#!/usr/bin/env python3
"""Configuration-only recovery: expiring guest games/sessions are not backed up."""
import datetime,hashlib,json,os,pathlib,shutil
os.umask(0o077)
base=pathlib.Path('/opt/utilibre/family-chess')
if shutil.disk_usage(base).free < 5*1024**3:raise SystemExit('Less than 5 GiB free; backup refused')
out=base/'backups'/datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H-%M-%SZ');out.mkdir(parents=True,mode=0o700)
# Do not open/copy the live database. This guest-only deployment has no saved
# accounts; its entire database consists of expiring games, sessions and schema.
shutil.copytree(base/'private',out/'private')
(out/'SHA256.json').write_text(json.dumps({str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest() for p in out.rglob('*') if p.is_file()},indent=2)+'\n')
print(out)
