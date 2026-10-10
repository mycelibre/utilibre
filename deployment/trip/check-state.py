"""Native HTTP checks using only the two marked TRIP test accounts and fictional data."""
from pathlib import Path
import urllib.request,urllib.error,json,time,base64,io,zipfile,hashlib
root=Path('/opt/utilibre/trip/private');out=Path('/opt/utilibre/reports/trip-20261009');base='http://127.0.0.1:3224'
sessions=[json.loads((root/f'session-{i}.json').read_text()) for i in range(2)]
checks=[]
def call(i,path,method='GET',data=None,raw=None,ctype=None):
 time.sleep(.22)
 h={}
 if i is not None:h['Authorization']='Bearer '+sessions[i]['token']
 if data is not None:raw=json.dumps(data).encode();ctype='application/json'
 if ctype:h['Content-Type']=ctype
 try:
  r=urllib.request.urlopen(urllib.request.Request(base+path,data=raw,headers=h,method=method),timeout=30);b=r.read();return r.status,json.loads(b) if 'application/json' in r.headers.get('content-type','') else b
 except urllib.error.HTTPError as e:return e.code,e.read().decode()
def ok(i,path,method='GET',**kw):
 code,x=call(i,path,method,**kw);assert code==200,(path,code,x);return x
def upload(i,path,name,body,kind):
 boundary='UtilibreFictionalMultipart10';b=('--'+boundary+'\r\nContent-Disposition: form-data; name="file"; filename="'+name+'"\r\nContent-Type: '+kind+'\r\n\r\n').encode()+body+('\r\n--'+boundary+'--\r\n').encode();return call(i,path,'POST',raw=b,ctype='multipart/form-data; boundary='+boundary)
png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aMXsAAAAASUVORK5CYII='
cat=[ok(i,'/api/categories')[0]['id'] for i in range(2)]
places=[ok(i,'/api/places','POST',data={'name':'Fictional lighthouse '+str(i),'place':'Fictional coast','lat':1.25,'lng':2.5,'category_id':cat[i],'image':png}) for i in range(2)]
trips=[ok(i,'/api/trips','POST',data={'name':'Fictional trip '+str(i),'image':png}) for i in range(2)]
for i in range(2):ok(i,'/api/trips/'+str(trips[i]['id']),'PUT',data={'place_ids':[places[i]['id']]})
for path in ['/api/trips/'+str(trips[0]['id']),'/api/places/'+str(places[0]['id'])]:
 assert call(1,path)[0] in (403,404);assert call(None,path)[0]==401
checks.append('Private trip/place direct reads reject unrelated and unauthenticated users')
assert all(t['id']!=trips[0]['id'] for t in ok(1,'/api/trips'));assert all(p['id']!=places[0]['id'] for p in ok(1,'/api/places'))
checks.append('Native list APIs separate account data')
code,leak=call(1,'/api/places','POST',data={'name':'Fictional cross-category check','place':'Fictional','lat':1,'lng':2,'category_id':cat[0]})
checks.append({'crossAccountCategoryStatus':code,'categoryDetailsReturned':code==200})
if code==200:ok(1,'/api/places/'+str(leak['id']),'DELETE')
# Only our owned URLs; no external server is requested.
for data in [{'map_provider':'google'},{'apprise_webhook_url':'http://127.0.0.1:9'},{'fetch_link_titles':True},{'tile_layer':'https://example.invalid/{z}/{x}/{y}'}]:assert call(0,'/api/settings','PUT',data=data)[0]==403
assert call(0,'/api/places','POST',data={'name':'Blocked remote image','place':'Fictional','lat':1,'lng':2,'category_id':cat[0],'image':'http://127.0.0.1:9/pilot'})[0]==403
checks.append('Provider overrides, notifications, title previews, arbitrary tile URLs and remote image fetch rejected')
# Secret image URLs are capabilities, not an authenticated storage endpoint.
assert call(None,places[0]['image'])[0]==200
checks.append('Uploaded place image is readable without login by its exact random URL')
# Native PDF attachment restrictions.
pdf=Path('/home/ubuntu/freetools/portal/public/examples/booklet-eight-pages.pdf')
if not pdf.exists():pdf=next(Path('/home/ubuntu/freetools/portal/public').rglob('*eight*.pdf'))
pdfbytes=pdf.read_bytes();code,attachment=upload(0,f"/api/trips/{trips[0]['id']}/attachments",'fictional-ticket.pdf',pdfbytes,'application/pdf');assert code==200,(code,attachment)
p=f"/api/trips/{trips[0]['id']}/attachments/{attachment['id']}/download";assert ok(0,p)==pdfbytes;assert call(1,p)[0]==404;assert call(None,p)[0]==401
code,x=upload(0,f"/api/trips/{trips[0]['id']}/attachments",'over-limit.pdf',b'%PDF-'+b'x'*2097152,'application/pdf');assert code==400
checks.append('PDF attachment byte match, unrelated/anonymous denial and 2MiB upload ceiling passed')
# Create an explicit collaboration. No email is sent by this native action.
ok(0,f"/api/trips/{trips[0]['id']}/members",'POST',data={'user':sessions[1]['user']['username']})
ok(1,f"/api/trips/{trips[0]['id']}/members/accept",'POST');assert ok(1,p)==pdfbytes
checks.append('Native invitation acceptance grants intended shared trip/attachment access')
# Native user export; includes owned trips, not merely memberships.
exports=[]
for i in range(2):
 record=ok(i,'/api/settings/backups','POST');bid=record['id']
 for attempt in range(30):
  records=ok(i,'/api/settings/backups');b=next(x for x in records if x['id']==bid)
  if b['status']=='completed':break
  assert b['status']!='failed',b;time.sleep(.5)
 assert b['status']=='completed'
 archive=ok(i,f'/api/settings/backups/{bid}/download');(root/f'user-{i}.zip').write_bytes(archive)
 assert call(1-i,f'/api/settings/backups/{bid}/download')[0]==404
 with zipfile.ZipFile(io.BytesIO(archive)) as z: data=json.loads(z.read('data.json'));names=z.namelist()
 assert {t['id'] for t in data['trips']}=={trips[i]['id']},data['trips']
 exports.append({'index':i,'bytes':len(archive),'files':names,'keys':list(data),'tripNames':[t['name'] for t in data['trips']]})
checks.append('Native user ZIP includes owned trips only; unrelated export download denied')
# A deliberately transferred fictional backup is imported by the second user.
code,x=upload(1,'/api/settings/backups/import','fictional-backup.zip',(root/'user-0.zip').read_bytes(),'application/zip');assert code==200,(code,x)
restored=[t for t in ok(1,'/api/trips') if t['name']=='Fictional trip 0' and t['id']!=trips[0]['id']];assert len(restored)==1,restored
restoredtrip=ok(1,'/api/trips/'+str(restored[0]['id']));assert len(restoredtrip['places'])==1;assert len(restoredtrip['attachments'])==1
ra=restoredtrip['attachments'][0];assert ok(1,f"/api/trips/{restoredtrip['id']}/attachments/{ra['id']}/download")==pdfbytes
assert call(0,'/api/trips/'+str(restoredtrip['id']))[0]==404
checks.append('User ZIP import remaps ownership and restores fictional trip/place/image/PDF; source user cannot read imported copy')
# Native revocation and item deletion do not delete the explicitly imported independent copy.
ok(0,f"/api/trips/{trips[0]['id']}/members/{sessions[1]['user']['username']}",'DELETE');assert call(1,p)[0]==404
oldimage=places[0]['image'];ok(0,'/api/places/'+str(places[0]['id']),'DELETE');assert call(None,oldimage)[0]==404
checks.append('Membership revocation blocks original attachment; deleting own place removes its image capability')
(root/'fixture-state.json').write_text(json.dumps({'trips':trips,'places':places,'attachment':attachment,'restored':restoredtrip}))
(out/'state-check.json').write_text(json.dumps({'date':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'checks':checks,'exports':exports},indent=2));print(json.dumps(checks))
