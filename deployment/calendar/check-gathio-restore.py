"""Restore only a disposable snapshot in a fresh directory and network-none namespace."""
from pathlib import Path
import subprocess,json,hashlib,tarfile,os,time,shutil
r=Path('/opt/utilibre/reports/new-services-20261009');backup=Path('/opt/utilibre/calendar-backups/gathio-20261009T012059Z');root=r/'gathio-restore';assert not root.exists();root.mkdir(mode=0o700)
fixture=json.loads((r/'gathio-fixture.json').read_text());assert fixture.get('imported'), 'Complete native round trip before snapshot'
for line in (backup/'SHA256SUMS').read_text().splitlines():
 digest,name=line.split();assert hashlib.sha256((backup/name).read_bytes()).hexdigest()==digest
with tarfile.open(backup/'postgres-data.tar.gz') as archive:archive.extractall(root,filter='data')
for p in [root/'postgres',*(root/'postgres').rglob('*')]:os.chown(p,999,999)
with tarfile.open(backup/'images.tar.gz') as archive:archive.extractall(root,filter='data')
for p in [root/'images',*(root/'images').rglob('*')]:os.chown(p,1000,1000)
private=Path('/opt/utilibre/calendar-private');password=(private/'gathio-app-password').read_text()
(root/'ferret.env').write_text('FERRETDB_POSTGRESQL_URL=postgres://gathio:'+password+'@127.0.0.1:5432/postgres\nFERRETDB_TELEMETRY=disable\nFERRETDB_STATE_DIR=/state\nFERRETDB_LOG_LEVEL=warn\n')
(root/'app.env').write_text('GATHIO_MONGODB_URL=mongodb://gathio:'+password+'@127.0.0.1:27017/gathio\n')
containers=['utilibre-gathio-restore-pg','utilibre-gathio-restore-ferret','utilibre-gathio-restore-app'];common=['--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--pids-limit','128']
def run(args,**kw):return subprocess.run(args,check=True,**kw)
def wait(args):
 for _ in range(45):
  if subprocess.run(args,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0:return
  time.sleep(1)
 raise RuntimeError('Isolated service failed readiness')
try:
 run(['docker','run','-d','--name',containers[0],'--network','none',*common,'--user','999:999','--memory','768m','--cpus','1','--tmpfs','/tmp:size=32m,mode=1777','--tmpfs','/var/run/postgresql:size=4m,uid=999,gid=999,mode=0700','-e','POSTGRES_USER=gathio','-e','POSTGRES_DB=postgres','-e','POSTGRES_PASSWORD_FILE=/run/secrets/password','-v',str(private/'gathio-app-password')+':/run/secrets/password:ro','-v',str(root/'postgres')+':/var/lib/postgresql/data','utilibre-gathio-documentdb:17.11-0.107.0','postgres','-c','shared_buffers=128MB','-c','cron.log_run=off','-c','cron.log_statement=off'],stdout=subprocess.DEVNULL)
 wait(['docker','exec',containers[0],'pg_isready','-U','gathio','-d','postgres'])
 run(['docker','run','-d','--name',containers[1],'--network','container:'+containers[0],*common,'--memory','256m','--cpus','0.5','--tmpfs','/state:size=4m,mode=1777','--env-file',str(root/'ferret.env'),'ghcr.io/ferretdb/ferretdb:2.7.0@sha256:5706414241eb84f0515512c37b46db0f1b1eac9e5ceb7e4c2523211c184b1985'],stdout=subprocess.DEVNULL)
 run(['docker','run','-d','--name',containers[2],'--network','container:'+containers[0],*common,'--user','1000:1000','--memory','512m','--cpus','1','--tmpfs','/tmp:size=32m,mode=1777','--env-file',str(root/'app.env'),'-v','/home/ubuntu/freetools/deployment/calendar/gathio/config.toml:/srv/gathio/config/config.toml:ro','-v','/home/ubuntu/freetools/deployment/calendar/gathio/data-notes.md:/srv/gathio/static/data-notes.md:ro','-v',str(root/'images')+':/srv/gathio/public/events','utilibre-gathio:1.6.7-p1'],stdout=subprocess.DEVNULL)
 wait(['docker','exec',containers[2],'node','-e',"fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"])
 code="import assert from 'node:assert/strict';const fixture="+json.dumps(fixture)+";for(const id of [fixture.eventID,fixture.imported.eventID]){const r=await fetch('http://127.0.0.1:3000/'+id);assert.equal(r.status,200);assert((await r.text()).includes('Fictional revised deployment event'));}const img=await fetch('http://127.0.0.1:3000/events/'+fixture.eventID+'.jpg');assert.equal(img.status,200);assert((await img.arrayBuffer()).byteLength>20);"
 run(['docker','exec','-i',containers[2],'node','--input-type=module'],input=code,text=True,stdout=subprocess.DEVNULL)
 (r/'gathio-restore.json').write_text(json.dumps({'backup':str(backup),'checksums':True,'cleanPostgresFilesystemRestore':True,'nativeGathioReopen':True,'originalAndImportedEvents':True,'uploadedImage':True,'network':'none'},indent=2));print('Native Gathio restore reopened both fictional events and image without networking.')
finally:
 for name in reversed(containers):subprocess.run(['docker','rm','-f',name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 shutil.rmtree(root)
