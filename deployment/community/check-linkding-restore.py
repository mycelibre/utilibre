"""Restore only a copied linkding snapshot with no network access."""
from pathlib import Path
import subprocess,tarfile,hashlib,sqlite3,shutil,time,json
report=Path('/opt/utilibre/reports/new-services-20261009');backup=max(Path('/opt/utilibre/community-backups').glob('linkding-*'));restore=report/'linkding-restore'
restore.mkdir(mode=0o700,exist_ok=False)
for line in (backup/'SHA256SUMS').read_text().splitlines():
 digest,name=line.split();assert hashlib.sha256((backup/name).read_bytes()).hexdigest()==digest
with tarfile.open(backup/'data.tar.gz') as t:t.extractall(restore,filter='data')
data=restore/'linkding';subprocess.run(['chown','-R','33:33',str(data)],check=True)
c=sqlite3.connect(data/'db.sqlite3');assert c.execute('pragma integrity_check').fetchone()[0]=='ok';c.close()
container='utilibre-linkding-restore-check'
try:
 subprocess.run(['docker','run','-d','--name',container,'--network','none','--read-only','--user','33:33','--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','512m','--cpus','1','--pids-limit','128','--tmpfs','/tmp:rw,size=32m,mode=1777','-e','LD_DISABLE_BACKGROUND_TASKS=True','-e','LD_ENABLE_SNAPSHOTS=False','-v',str(data)+':/etc/linkding/data','sissbruecker/linkding:1.47.0@sha256:e35cb50e0581178f245125ffaa909c565416c94c9f22ace305a7d234a4345522'],check=True,stdout=subprocess.DEVNULL)
 for _ in range(40):
  r=subprocess.run(['docker','exec',container,'curl','-fsS','http://127.0.0.1:9090/health'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  if r.returncode==0:break
  time.sleep(1)
 else:raise RuntimeError('Restore did not become healthy')
 code="from bookmarks.models import Bookmark; from django.contrib.auth.models import User; a=Bookmark.objects.get(owner__username='linkding-fixture-a');b=Bookmark.objects.get(owner__username='linkding-fixture-b');assert a.url==b.url and a.notes==b.notes and a.is_archived and b.is_archived;assert set(a.tag_names)==set(b.tag_names);print('Native restored bookmark and import scope verified.')"
 subprocess.run(['docker','exec',container,'python','manage.py','shell','-c',code],check=True,stdout=subprocess.DEVNULL)
 (report/'linkding-restore.json').write_text(json.dumps({'backup':str(backup),'checksums':True,'sqliteIntegrity':True,'nativeReopen':True,'fixtureCount':2,'network':'none'},indent=2))
 print('linkding checksums, SQLite integrity and isolated native reopen passed.')
finally:
 subprocess.run(['docker','rm','-f',container],stdout=subprocess.DEVNULL,check=False);shutil.rmtree(restore)
