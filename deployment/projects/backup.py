#!/usr/bin/env python3
"""Consistent native PostgreSQL + uploads/private-config backup. No automatic expiry."""
import datetime,hashlib,json,os,pathlib,shutil,subprocess,tarfile
os.umask(0o077)
repo=pathlib.Path(__file__).resolve().parents[2];root=pathlib.Path('/opt/utilibre/projects')
if shutil.disk_usage(root).free<5*1024**3:raise SystemExit('Projects backup deferred: less than 5 GiB free; existing backups preserved.')
compose=['docker','compose','-f',str(repo/'deployment/projects/compose.yaml')]
out=root/'backups'/datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ');out.mkdir(mode=0o700)
running='app' in subprocess.check_output(compose+['ps','--status','running','--services'],text=True).split()
try:
 if running:subprocess.run(compose+['stop','-t','30','app'],stdout=subprocess.DEVNULL,check=True)
 with (out/'projects.dump').open('wb') as target:subprocess.run(compose+['exec','-T','db','pg_dump','-U','projects','-d','projects','-Fc'],stdout=target,check=True)
 with tarfile.open(out/'uploads-and-private.tar.gz','w:gz') as archive:
  for name in ['data','private']:archive.add(root/name,arcname=name)
  archive.add(repo/'deployment/projects',arcname='deployment/projects')
 (out/'SHA256.json').write_text(json.dumps({p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in out.iterdir()},indent=2)+'\n')
 print(out)
finally:
 if running:subprocess.run(compose+['start','app'],stdout=subprocess.DEVNULL,check=True)
