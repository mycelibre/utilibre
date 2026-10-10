#!/usr/bin/env python3
"""SQLite backup and bounded isolated recovery verification; secrets remain private."""
import datetime,hashlib,json,os,pathlib,shutil,sqlite3,tarfile,tempfile
os.umask(0o077);base=pathlib.Path('/opt/utilibre/kitchenowl')
if shutil.disk_usage(base).free < 5*1024**3:raise SystemExit('Less than 5 GiB free; backup refused')
out=base/'backups'/datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H-%M-%SZ');out.mkdir(mode=0o700)
with sqlite3.connect(f'file:{base}/data/database.db?mode=ro',uri=True) as src,sqlite3.connect(out/'database.db') as dst:src.backup(dst)
with tarfile.open(out/'files-and-private.tar.gz','w:gz') as a:
 a.add(base/'data/upload',arcname='upload');a.add(base/'private',arcname='private')
(out/'SHA256.json').write_text(json.dumps({p.name:hashlib.sha256(p.read_bytes()).hexdigest()for p in out.iterdir()},indent=2)+'\n')
with tempfile.TemporaryDirectory(prefix='kitchenowl-restore-',dir='/opt/utilibre/reports') as restored:
 r=pathlib.Path(restored);shutil.copy2(out/'database.db',r/'database.db')
 with sqlite3.connect(r/'database.db') as db:
  assert db.execute('PRAGMA integrity_check').fetchone()==('ok',)
  assert not db.execute('PRAGMA foreign_key_check').fetchall()
  counts={t:db.execute('SELECT COUNT(*) FROM "'+t+'"').fetchone()[0]for t in ['user','household','recipe','item']}
 with tarfile.open(out/'files-and-private.tar.gz') as a:a.extractall(r,filter='data')
 assert (r/'private/app.env').is_file()
 (out/'RESTORE-VERIFIED.json').write_text(json.dumps({'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'isolated SQLite integrity/foreign keys and upload/config archive extraction; no production writes','counts':counts},indent=2)+'\n')
print(out)
