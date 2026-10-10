"""Consistent on-VM linkding snapshot; no deletion/retention pruning.
Usage: python3 deployment/community/linkding-backup.py
Preserves running state even on failure. Restore to a separate path first.
"""
from pathlib import Path
from datetime import datetime, timezone
import subprocess, tarfile, hashlib, json, os
root=Path(__file__).resolve().parents[2]
compose=['docker','compose','-f',str(root/'deployment/community/compose.linkding.yaml')]
target=Path('/opt/utilibre/community-backups')/('linkding-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
target.mkdir(parents=True,mode=0o700)
running=subprocess.check_output(compose+['ps','--status','running','--services'],text=True).split()
try:
 if 'linkding' in running:subprocess.run(compose+['stop','-t','30','linkding'],check=True,stdout=subprocess.DEVNULL)
 for name,paths in {'data.tar.gz':[(Path('/opt/utilibre/community-data/linkding'),'linkding')], 'config-private.tar.gz':[(root/'deployment/community/compose.linkding.yaml','compose.linkding.yaml'),(root/'deployment/community/linkding','linkding-config'),(Path('/opt/utilibre/community-private/linkding.env'),'linkding.env')]}.items():
  p=target/name
  with tarfile.open(p,'w:gz') as archive:
   for source,arcname in paths:archive.add(source,arcname=arcname)
  p.chmod(0o600)
 (target/'SHA256SUMS').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n' for p in sorted(target.glob('*.tar.gz'))))
 print(target)
finally:
 if 'linkding' in running:subprocess.run(compose+['start','linkding'],check=True,stdout=subprocess.DEVNULL)
