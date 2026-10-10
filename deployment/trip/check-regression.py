"""Private fixture regression after the narrow category ownership correction."""
import urllib.request,urllib.error,json,time,subprocess
from pathlib import Path
base='http://127.0.0.1:3224';p=Path('/opt/utilibre/trip/private');out=Path('/opt/utilibre/reports/trip-20261009');users=json.loads((p/'qa-users.json').read_text())
def token(username):return subprocess.check_output(['docker','exec','utilibre-trip-app-1','python','-c',"from trip.security import create_access_token;print(create_access_token({'sub':"+repr(username)+"}))"],text=True).strip()
# Administrative fixture token creation is used only to isolate backend ownership regression.
# Real MFA/OIDC logins were independently tested by check-oidc.mjs.
tokens=[token(x['username'])for x in users]
def call(i,path,method='GET',data=None):
 time.sleep(.22);h={'Authorization':'Bearer '+tokens[i]}
 if data is not None:h['Content-Type']='application/json';data=json.dumps(data).encode()
 try:r=urllib.request.urlopen(urllib.request.Request(base+path,method=method,headers=h,data=data),timeout=20);return r.status,json.loads(r.read())
 except urllib.error.HTTPError as e:return e.code,e.read().decode()
ca=call(0,'/api/categories')[1][0]['id'];cb=call(1,'/api/categories')[1][0]['id'];payload={'name':'Fictional ownership regression','place':'Fictional','lat':1.25,'lng':2.5,'category_id':ca}
code,r=call(1,'/api/places','POST',payload);assert code==403,(code,r)
payload['category_id']=cb;code,place=call(1,'/api/places','POST',payload);assert code==200
code,r=call(1,'/api/places/'+str(place['id']),'PUT',{'category_id':ca});assert code==403
code,r=call(1,'/api/places/'+str(place['id']),'PUT',{'category_id':999999});assert code==404
code,r=call(1,'/api/places/'+str(place['id']),'PUT',{'name':'Own edit still works'});assert code==200
assert call(1,'/api/places/'+str(place['id']),'DELETE')[0]==200
(out/'ownership-regression.json').write_text(json.dumps({'crossCategoryCreate':403,'crossCategoryUpdate':403,'missingCategoryUpdate':404,'ownedCreateEditDelete':200},indent=2));print('Category ownership regression passed for fictional accounts.')
