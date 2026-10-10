"""Consistent on-VM Opengist snapshot; no deletion/retention pruning.
Usage: python3 deployment/community/opengist-backup.py
Preserves running state even on failure. Restore to a separate path first.
"""
from pathlib import Path
from datetime import datetime, timezone
import subprocess, tarfile, hashlib, json, os
root=Path(__file__).resolve().parents[2]
compose=['docker','compose','-f',str(root/'deployment/community/compose.opengist.yaml')]
target=Path('/opt/utilibre/community-backups')/('opengist-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
target.mkdir(parents=True,mode=0o700)
running=subprocess.check_output(compose+['ps','--status','running','--services'],text=True).split()
try:
 if 'opengist' in running:subprocess.run(compose+['stop','-t','30','opengist'],check=True,stdout=subprocess.DEVNULL)
 for name,paths in {'data.tar.gz':[(Path('/opt/utilibre/community-data/opengist'),'opengist')], 'config-private.tar.gz':[(root/'deployment/community/compose.opengist.yaml','compose.opengist.yaml'),(root/'deployment/community/opengist','opengist-config'),(Path('/opt/utilibre/community-private/opengist-secrets'),'opengist-secrets')]}.items():
  p=target/name
  with tarfile.open(p,'w:gz') as archive:
   for source,arcname in paths:archive.add(source,arcname=arcname)
  p.chmod(0o600)
 (target/'SHA256SUMS').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n' for p in sorted(target.glob('*.tar.gz'))))
 print(target)
finally:
 if 'opengist' in running:subprocess.run(compose+['start','opengist'],check=True,stdout=subprocess.DEVNULL)
