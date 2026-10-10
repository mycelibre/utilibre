"""Restore only a known fictional TRIP backup into disconnected disposable state."""
from pathlib import Path
import sys,os,json,tarfile,subprocess,time,hashlib
assert os.environ.get('TRIP_DISPOSABLE_TEST')=='1'
archive=Path(sys.argv[1]).resolve();assert archive.is_relative_to('/opt/utilibre/trip/backups')
private=Path('/opt/utilibre/trip/private');fixture=json.loads((private/'fixture-state.json').read_text());users=json.loads((private/'qa-users.json').read_text());assert all(u['username'].startswith('trip-prod-1009-') for u in users)
out=private/('operator-restore-'+str(int(time.time())));out.mkdir(mode=0o700)
with tarfile.open(archive) as tar:tar.extractall(out,filter='data')
for p in [out/'data',*(out/'data').rglob('*')]:os.chown(p,1000,1000)
id=fixture['restored']['id']
script="""from fastapi.testclient import TestClient
from trip.main import app
from trip.security import create_access_token
from sqlmodel import Session,select
from trip.models.models import User
from trip.db.core import get_engine
import sqlite3,hashlib,json
with Session(get_engine()) as s:
 assert {u.username for u in s.exec(select(User))} <= {'trip-pilot-admin','trip-prod-1009-a','trip-prod-1009-b'}
with TestClient(app) as c:
 h={'Authorization':'Bearer '+create_access_token({'sub':'trip-prod-1009-b'})}
 r=c.get('/api/trips/TRIP_ID',headers=h);assert r.status_code==200,r.text
 t=r.json();assert t['name']=='Fictional trip 0';assert len(t['places'])==1 and len(t['attachments'])==1
 a=t['attachments'][0];r=c.get(f"/api/trips/TRIP_ID/attachments/{a['id']}/download",headers=h);assert r.status_code==200
 digest=hashlib.sha256(r.content).hexdigest();assert digest=='469bd7db6e552a96cd8e0d1b412ef100918ac9b7f68da64eb7f72964ee6b3e7a'
 assert c.get(t['image']).status_code==200
 with sqlite3.connect('storage/trip.sqlite') as db:assert db.execute('pragma integrity_check').fetchone()[0]=='ok'
 print(json.dumps({'nativeRestoredTrip':True,'image':True,'pdfSHA256':digest,'integrity':'ok'}))
""".replace('TRIP_ID',str(id))
r=subprocess.run(['docker','run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','512m','--cpus','1','--tmpfs','/tmp:rw,noexec,nosuid,nodev,size=16m,mode=1777','-v',str(out/'data')+':/app/storage','--entrypoint','python','utilibre-trip:1.50.1-p1','-c',script],capture_output=True,text=True)
report=Path('/opt/utilibre/reports/trip-20261009');(report/'operator-restore.log').write_text(r.stdout+r.stderr);assert r.returncode==0,r.stderr[-1200:]
result={'archiveSHA256':hashlib.sha256(archive.read_bytes()).hexdigest(),'bytes':archive.stat().st_size,'network':'none','result':json.loads(r.stdout.strip().splitlines()[-1])};(report/'operator-recovery.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
