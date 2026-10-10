"""Native consistent Vikunja dump plus private config; only this service is paused."""
from pathlib import Path
from datetime import datetime,timezone
import subprocess,tarfile,hashlib,os
root=Path(__file__).resolve().parents[2];compose=['docker','compose','-f',str(root/'deployment/community/compose.vikunja.yaml')]
target=Path('/opt/utilibre/community-backups')/('vikunja-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'));target.mkdir(parents=True,mode=0o700)
running='vikunja' in subprocess.check_output(compose+['ps','--status','running','--services'],text=True).split()
native=Path('/opt/utilibre/community-data/vikunja/deployment-native-backup.zip');assert not native.exists()
try:
 if running:subprocess.run(compose+['stop','-t','30','vikunja'],check=True,stdout=subprocess.DEVNULL)
 subprocess.run(compose+['run','--rm','--no-deps','-T','vikunja','dump','--path','/data','--filename',native.name],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
 native.rename(target/'native-dump.zip');(target/'native-dump.zip').chmod(0o600)
 with tarfile.open(target/'config-private.tar.gz','w:gz') as t:
  for path,name in [(root/'deployment/community/compose.vikunja.yaml','compose.vikunja.yaml'),(root/'deployment/community/vikunja','vikunja-config'),(Path('/opt/utilibre/community-private/vikunja-session-secret'),'session-secret'),(Path('/opt/utilibre/community-private/vikunja-oidc-secret'),'oidc-secret')]:t.add(path,arcname=name)
 (target/'config-private.tar.gz').chmod(0o600)
 (target/'SHA256SUMS').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n' for p in [target/'native-dump.zip',target/'config-private.tar.gz']))
 print(target)
finally:
 if running:subprocess.run(compose+['start','vikunja'],check=True,stdout=subprocess.DEVNULL)
