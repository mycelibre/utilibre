"""Consistent scoped Gathio/PostgreSQL snapshot, no automatic expiry or offsite claim."""
from pathlib import Path
from datetime import datetime,timezone
import subprocess,tarfile,hashlib
root=Path(__file__).resolve().parents[2];compose=['docker','compose','-f',str(root/'deployment/calendar/compose.gathio.yaml')];backup=Path('/opt/utilibre/calendar-backups')/('gathio-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'));backup.mkdir(parents=True,mode=0o700)
running=subprocess.check_output(compose+['ps','--status','running','--services'],text=True).split()
try:
 if 'gathio' in running:subprocess.run(compose+['stop','-t','30','gathio'],check=True,stdout=subprocess.DEVNULL)
 with (backup/'postgres.dump').open('wb') as out:subprocess.run(['docker','exec','utilibre-gathio-postgres-1','pg_dump','-U','gathio','-d','postgres','-Fc'],check=True,stdout=out,stderr=subprocess.PIPE)
 # Preserve a clean PostgreSQL cluster as well as the portable logical dump.
 subprocess.run(compose+['stop','-t','30','ferretdb','postgres'],check=True,stdout=subprocess.DEVNULL)
 with tarfile.open(backup/'postgres-data.tar.gz','w:gz') as archive:archive.add('/opt/utilibre/calendar-data/gathio-postgres',arcname='postgres')
 with tarfile.open(backup/'images.tar.gz','w:gz') as archive:archive.add('/opt/utilibre/calendar-data/gathio-images',arcname='images')
 with tarfile.open(backup/'config-private.tar.gz','w:gz') as archive:
  for p,name in [(root/'deployment/calendar/compose.gathio.yaml','compose.gathio.yaml'),(root/'deployment/calendar/gathio','config'),(Path('/opt/utilibre/calendar-private/gathio.env'),'gathio.env'),(Path('/opt/utilibre/calendar-private/gathio-ferretdb.env'),'ferretdb.env'),(Path('/opt/utilibre/calendar-private/gathio-app-password'),'app-password')]:archive.add(p,arcname=name)
 files=[backup/'postgres-data.tar.gz',backup/'postgres.dump',backup/'images.tar.gz',backup/'config-private.tar.gz']
 for p in files:p.chmod(0o600)
 (backup/'SHA256SUMS').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n' for p in files));print(backup)
finally:
 if running:subprocess.run(compose+['start',*running],check=True,stdout=subprocess.DEVNULL)
