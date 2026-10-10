#!/usr/bin/env python3
"""Consistent native-state snapshot; preserve every backup until operator policy changes."""
import datetime,hashlib,json,os,pathlib,shutil,sqlite3,subprocess,tarfile,tempfile
os.umask(0o077)
base=pathlib.Path('/opt/utilibre/donetick')
if shutil.disk_usage(base).free < 5*1024**3:raise SystemExit('Less than 5 GiB free; backup refused')
out=base/'backups'/datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H-%M-%SZ');out.mkdir(mode=0o700)
# Pause only this application briefly so SQLite and uploaded files share a point in time.
subprocess.run(['docker','pause','utilibre-donetick-app-1'],check=True,stdout=subprocess.DEVNULL)
try:
 for name in ['donetick.db','donetick.db-wal','donetick.db-shm','donetick.db-journal']:
  if (base/'data'/name).exists():shutil.copy2(base/'data'/name,out/name)
 with tarfile.open(out/'files-and-private.tar.gz','w:gz') as a:
  a.add(base/'data/storage',arcname='storage');a.add(base/'private/app.env',arcname='private/app.env')
finally:subprocess.run(['docker','unpause','utilibre-donetick-app-1'],check=True,stdout=subprocess.DEVNULL)
with tempfile.TemporaryDirectory(prefix='donetick-restore-',dir='/opt/utilibre/reports') as td:
 r=pathlib.Path(td)
 for dbfile in out.glob('donetick.db*'):shutil.copy2(dbfile,r/dbfile.name)
 with sqlite3.connect(r/'donetick.db') as db:
  assert db.execute('PRAGMA integrity_check').fetchone()==('ok',)
  assert not db.execute('PRAGMA foreign_key_check').fetchall()
  counts={t:db.execute('SELECT COUNT(*) FROM "'+t+'"').fetchone()[0]for t in ['users','circles','chores']}
 with tarfile.open(out/'files-and-private.tar.gz') as a:a.extractall(r,filter='data')
 assert (r/'private/app.env').is_file()
 (out/'RESTORE-VERIFIED.json').write_text(json.dumps({'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'isolated SQLite integrity/foreign keys and file/config extraction; native restored launch verified separately','counts':counts},indent=2)+'\n')
(out/'SHA256.json').write_text(json.dumps({p.name:hashlib.sha256(p.read_bytes()).hexdigest()for p in out.iterdir()},indent=2)+'\n')
print(out)
