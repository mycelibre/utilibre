#!/usr/bin/env python3
"""Reopen only the documented fictional shortener snapshot in a network-none app."""
from pathlib import Path
import subprocess,json,shutil,os,sqlite3,hashlib
report=Path('/opt/utilibre/reports/new-services-20261009')
snapshot=Path((report/'chhoto-backup-path.txt').read_text().strip())
fixture=json.loads((report/'chhoto-fixture.json').read_text());slug=fixture['slug']
assert slug.startswith('utilibre-qa-')
assert hashlib.sha256((snapshot/'urls.sqlite').read_bytes()).hexdigest()==(snapshot/'SHA256SUMS').read_text().split()[0]
restore=report/'chhoto-restore';restore.mkdir(mode=0o700,exist_ok=True)
shutil.copy2(snapshot/'urls.sqlite',restore/'urls.sqlite')
os.chown(restore,65534,65534);os.chown(restore/'urls.sqlite',65534,65534)
with sqlite3.connect(restore/'urls.sqlite') as db:
 assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
 row=db.execute('select long_url,hits from urls where short_url=?',(slug,)).fetchone();assert row==(fixture['dest'],0)
cmd=['docker','run','-d','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','256m','--cpus','1','--pids-limit','64','-v',str(restore)+':/data','--env-file','/opt/utilibre/chhoto-private/runtime.env','-e','CHHOTO_DB_URL=/data/urls.sqlite','-e','CHHOTO_HASH_ALGORITHM=Argon2','-e','CHHOTO_DISABLE_BACKUPS=True','-e','CHHOTO_REDIRECT_METHOD=TEMPORARY','-e','RUST_LOG=off','utilibre-chhoto:7.8.3-p1']
cid=subprocess.check_output(cmd,text=True).strip()
try:
 pid=json.loads(subprocess.check_output(['docker','inspect',cid],text=True))[0]['State']['Pid']
 result=subprocess.check_output(['nsenter','-t',str(pid),'-n','curl','--retry','5','--retry-connrefused','--retry-delay','1','-s','-D','-','-o','/dev/null','http://127.0.0.1:4567/'+slug],text=True)
 assert '307 Temporary Redirect' in result and 'location: '+fixture['dest'] in result.lower()
 print('Backup hash/integrity, owned record/zero-click count and native isolated307 restore passed.')
finally:subprocess.run(['docker','stop',cid],stdout=subprocess.DEVNULL,check=True)
