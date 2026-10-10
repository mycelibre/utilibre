"""Consistent on-VM bytestash snapshot; no deletion/retention pruning.
Usage: python3 deployment/community/bytestash-backup.py
Preserves running state even on failure. Restore to a separate path first.
"""
from pathlib import Path
from datetime import datetime, timezone
import subprocess, tarfile, hashlib, json, os
root=Path(__file__).resolve().parents[2]
compose=['docker','compose','-f',str(root/'deployment/community/compose.bytestash.yaml')]
target=Path('/opt/utilibre/community-backups')/('bytestash-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
target.mkdir(parents=True,mode=0o700)
running=subprocess.check_output(compose+['ps','--status','running','--services'],text=True).split()
try:
 if 'bytestash' in running:subprocess.run(compose+['stop','-t','30','bytestash'],check=True,stdout=subprocess.DEVNULL)
 for name,paths in {'data.tar.gz':[(Path('/opt/utilibre/community-data/bytestash'),'bytestash')], 'config-private.tar.gz':[(root/'deployment/community/compose.bytestash.yaml','compose.bytestash.yaml'),(root/'deployment/community/bytestash','bytestash-config'),(Path('/opt/utilibre/community-private/bytestash.env'),'bytestash.env')]}.items():
  p=target/name
  with tarfile.open(p,'w:gz') as archive:
   for source,arcname in paths:archive.add(source,arcname=arcname)
  p.chmod(0o600)
 (target/'SHA256SUMS').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n' for p in sorted(target.glob('*.tar.gz'))))
 print(target)
finally:
 if 'bytestash' in running:subprocess.run(compose+['start','bytestash'],check=True,stdout=subprocess.DEVNULL)
