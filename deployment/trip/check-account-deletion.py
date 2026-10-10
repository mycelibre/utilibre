"""Delete only the two known fictional TRIP accounts through its native admin API."""
from pathlib import Path
import subprocess,json,time,urllib.request,urllib.error
p=Path('/opt/utilibre/trip/private');out=Path('/opt/utilibre/reports/trip-20261009');users=json.loads((p/'qa-users.json').read_text());assert {u['username'] for u in users}=={'trip-prod-1009-a','trip-prod-1009-b'}
admin=subprocess.check_output(['docker','exec','utilibre-trip-app-1','python','-c',"from trip.security import create_access_token;print(create_access_token({'sub':'trip-pilot-admin'}))"],text=True).strip()
base='http://127.0.0.1:3224';result=[]
for index,u in enumerate(users):
 time.sleep(.3);req=urllib.request.Request(base+'/api/admin/users/'+u['username'],method='DELETE',headers={'Authorization':'Bearer '+admin});r=urllib.request.urlopen(req);assert r.status==200
 token=json.loads((p/f'session-{index}.json').read_text())['token'];time.sleep(.3)
 try:urllib.request.urlopen(urllib.request.Request(base+'/api/settings',headers={'Authorization':'Bearer '+token}));raise AssertionError('Deleted user accepted')
 except urllib.error.HTTPError as e:assert e.code==401,e.code
 result.append({'fictionalAccountIndex':index,'nativeDeletion':200,'oldJWT':401})
probe="""from sqlmodel import Session,select
from trip.db.core import get_engine
from trip.models.models import User,Trip,Place,Image,Backup,TripAttachment
from pathlib import Path
import json
with Session(get_engine()) as s:
 counts={m.__name__:len(s.exec(select(m)).all()) for m in [Trip,Place,Image,TripAttachment]};assert all(v==0 for v in counts.values()),counts
 users=[u.username for u in s.exec(select(User))];assert users==['trip-pilot-admin'],users
 assert not list(Path('storage/assets').glob('*'))
 assert not [p for p in Path('storage/attachments').rglob('*') if p.is_file()]
 print(json.dumps({'remainingUsers':'fixture admin only','activeContentCounts':counts,'imageAndAttachmentFilesRemoved':True,'administratorBackupsRemainSeparate':len(list(Path('storage/backups').glob('*')))}))
"""
x=json.loads(subprocess.check_output(['docker','exec','utilibre-trip-app-1','python','-c',probe],text=True).strip());(out/'deletion.json').write_text(json.dumps({'accounts':result,'activeState':x},indent=2));print(json.dumps(x))
