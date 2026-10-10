#!/usr/bin/env python3
"""Online SQLite snapshot; same VM, no automatic expiry. No user exports backend."""
from pathlib import Path
from datetime import datetime,timezone
import sqlite3,hashlib,shutil,os,json
os.umask(0o077)
target=Path('/opt/utilibre/chhoto-backups')/datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
target.mkdir(parents=True,mode=0o700)
with sqlite3.connect('file:/opt/utilibre/chhoto-data/urls.sqlite?mode=ro',uri=True) as src, sqlite3.connect(target/'urls.sqlite') as dst:
 src.backup(dst)
 assert dst.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
shutil.copytree('/opt/utilibre/chhoto-private',target/'private')
(target/'SHA256SUMS').write_text(hashlib.sha256((target/'urls.sqlite').read_bytes()).hexdigest()+'  urls.sqlite\n')
(target/'metadata.json').write_text(json.dumps({'image':'utilibre-chhoto:7.8.3-p3','method':'SQLite online backup','retention':'no automatic expiry','offsite':False}))
print(target)
