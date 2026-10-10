"""Restore a native administrator ZIP in a disconnected disposable copy, fictional accounts only."""
import json,subprocess,urllib.request,urllib.error,time,zipfile,io,os,hashlib
from pathlib import Path
out=Path('/opt/utilibre/reports/trip-20261009');private=Path('/opt/utilibre/trip/private');restore=private/('restore-check-'+str(int(time.time())));restore.mkdir(mode=0o700,exist_ok=False)
# The private bootstrap admin is a marked fixture, not a real operator account.
code="from trip.security import create_access_token;print(create_access_token({'sub':'trip-pilot-admin'}))"
token=subprocess.check_output(['docker','exec','utilibre-trip-app-1','python','-c',code],text=True).strip()
def req(path,method='GET'):
 r=urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:3224'+path,method=method,headers={'Authorization':'Bearer '+token}),timeout=30);b=r.read();return json.loads(b) if 'application/json' in r.headers.get('content-type','') else b
record=req('/api/admin/backups','POST');bid=record['id']
for attempt in range(30):
 time.sleep(.5);row=next(x for x in req('/api/admin/backups') if x['id']==bid)
 if row['status']=='completed':break
 assert row['status']!='failed',row
assert row['status']=='completed'
archive=req(f'/api/admin/backups/{bid}/download');(private/'admin-backup.zip').write_bytes(archive)
with zipfile.ZipFile(io.BytesIO(archive)) as z:
 for info in z.infolist():
  p=Path(info.filename);assert not p.is_absolute() and '..' not in p.parts
 z.extractall(restore);files=z.namelist()
# Native admin ZIP intentionally excludes configuration/secrets. Preserve that separately.
(restore/'config.env').write_bytes(Path('/opt/utilibre/trip/data/config.env').read_bytes())
for p in [restore,*restore.rglob('*')]:os.chown(p,1000,1000)
fixture=json.loads((private/'fixture-state.json').read_text());expected=fixture['restored']['id']
probe='''from fastapi.testclient import TestClient
from trip.main import app
from trip.security import create_access_token
from trip.db.core import get_engine
from sqlmodel import Session,select
from trip.models.models import User
import hashlib,json,sqlite3
with TestClient(app) as c:
 token=create_access_token({'sub':'trip-prod-1009-b'})
 h={'Authorization':'Bearer '+token}
 r=c.get('/api/trips/REPLACE_ID',headers=h);assert r.status_code==200,r.text
 trip=r.json();assert trip['name']=='Fictional trip 0';assert len(trip['places'])==1 and len(trip['attachments'])==1
 att=trip['attachments'][0];data=c.get(f"/api/trips/{trip['id']}/attachments/{att['id']}/download",headers=h);assert data.status_code==200 and data.content.startswith(b'%PDF-')
 assert c.get(trip['image']).status_code==200
 with sqlite3.connect('storage/trip.sqlite') as db:assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
 print(json.dumps({'nativeRestoredTrip':True,'image':True,'pdfSHA256':hashlib.sha256(data.content).hexdigest(),'sqliteIntegrity':'ok'}))
'''.replace('REPLACE_ID',str(expected))
r=subprocess.run(['docker','run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','512m','--cpus','1','--tmpfs','/tmp:rw,noexec,nosuid,nodev,size=16m,mode=1777','-v',str(restore)+':/app/storage','--entrypoint','python','utilibre-trip:1.50.1-p1','-c',probe],capture_output=True,text=True)
(out/'restore-run.log').write_text(r.stdout+r.stderr);assert r.returncode==0,r.stderr[-1000:]
result={'date':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'backupBytes':len(archive),'nativeZipEntries':files,'configurationStoredSeparately':True,'network':'none','result':json.loads(r.stdout.strip().splitlines()[-1])};(out/'recovery.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
