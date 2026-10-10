#!/usr/bin/env python3
"""Consistent SQLite snapshot, existing upload files and private operator configuration."""
import datetime,hashlib,json,os,pathlib,shutil,sqlite3,tarfile,tempfile
os.umask(0o077)
base=pathlib.Path('/opt/utilibre/wishlist')
if shutil.disk_usage(base).free < 5*1024**3: raise SystemExit('Less than 5 GiB free; backup refused')
out=base/'backups'/datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H-%M-%SZ');out.mkdir(mode=0o700)
with sqlite3.connect(f'file:{base}/data/prod.db?mode=ro',uri=True) as src, sqlite3.connect(out/'prod.db') as dest: src.backup(dest)
with tarfile.open(out/'files-and-private.tar.gz','w:gz') as archive:
 for item in ['uploads','private']:archive.add(base/item,arcname=item)
checks={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in out.iterdir()}
(out/'SHA256.json').write_text(json.dumps(checks,indent=2)+'\n')
# Disposable copy: no production table or live upload is written.
with tempfile.TemporaryDirectory(prefix='wishlist-restore-',dir='/opt/utilibre/reports') as restored:
 r=pathlib.Path(restored);shutil.copy2(out/'prod.db',r/'prod.db')
 with sqlite3.connect(r/'prod.db') as db:
  assert db.execute('PRAGMA integrity_check').fetchone()==('ok',)
  assert not db.execute('PRAGMA foreign_key_check').fetchall()
  counts={table:db.execute('SELECT COUNT(*) FROM "'+table+'"').fetchone()[0] for table in ['user','group','list','items','session','system_config']}
 with tarfile.open(out/'files-and-private.tar.gz') as archive:archive.extractall(r,filter='data')
 assert (r/'private/admin.json').is_file()
 (out/'RESTORE-VERIFIED.json').write_text(json.dumps({'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'isolated SQLite integrity/foreign keys plus file/config archive extraction; not a live public login','counts':counts},indent=2)+'\n')
print(out)
