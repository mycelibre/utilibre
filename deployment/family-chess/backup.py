#!/usr/bin/env python3
"""Consistent native SQLite snapshot; no automatic backup expiry."""
import datetime,hashlib,json,os,pathlib,shutil,sqlite3
os.umask(0o077)
base=pathlib.Path('/opt/utilibre/family-chess')
if shutil.disk_usage(base).free < 5*1024**3:raise SystemExit('Less than 5 GiB free; backup refused')
out=base/'backups'/datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H-%M-%SZ');out.mkdir(parents=True,mode=0o700)
with sqlite3.connect(f'file:{base}/data/chess.sqlite3?mode=ro',uri=True) as src,sqlite3.connect(out/'chess.sqlite3') as dst:
 src.backup(dst)
 assert dst.execute('PRAGMA integrity_check').fetchone()==('ok',)
 assert not dst.execute('PRAGMA foreign_key_check').fetchall()
shutil.copytree(base/'private',out/'private')
(out/'SHA256.json').write_text(json.dumps({str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest() for p in out.rglob('*') if p.is_file()},indent=2)+'\n')
print(out)
