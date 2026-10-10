#!/usr/bin/env python3
"""Fictional native account and habit API checks. No mail or production records."""
import datetime,json,pathlib,secrets,requests
base='http://127.0.0.1:3216';private=pathlib.Path('/opt/utilibre/beaverhabits/private');out=pathlib.Path('/opt/utilibre/reports/beaver-20261009')
def req(s,method,path,expected=200,**kw):
 r=s.request(method,base+path,timeout=15,**kw);assert r.status_code==expected,(path,r.status_code,r.text[:250]);return r
admin=json.loads((private/'admin.json').read_text());a=requests.Session();login=req(a,'POST','/auth/login',data={'username':admin['email'],'password':admin['password']}).json();a.headers['Authorization']='Bearer '+login['access_token']
record=private/'qa.json';assert not record.exists(),'Do not overwrite an unfinished native fixture'
qa=[]
for suffix in ['a','b']:
 u={'email':'utilibre-habits-qa-20261009-'+suffix+'@example.com','password':secrets.token_urlsafe(26)}
 r=req(a,'POST','/auth/register',expected=201,json=u).json();u['id']=r['id'];s=requests.Session();login=req(s,'POST','/auth/login',data={'username':u['email'],'password':u['password']}).json();u['token']=login['access_token'];qa.append(u)
 record.write_text(json.dumps(qa));record.chmod(0o600)
s,t=[requests.Session(),requests.Session()]
for x,u in zip([s,t],qa):x.headers['Authorization']='Bearer '+u['token']
h=req(s,'POST','/api/v1/habits',json={'name':'Fictional read one page'}).json();qa[0]['habitId']=h['id'];record.write_text(json.dumps(qa))
req(s,'POST',f"/api/v1/habits/{h['id']}/completions",json={'date':'09-10-2026','done':True,'text':'Fictional completion note'})
req(s,'PUT',f"/api/v1/habits/{h['id']}",json={'tags':['fictional'],'star':True})
for method in ['GET','DELETE']:
 r=t.request(method,base+f"/api/v1/habits/{h['id']}",timeout=15);assert r.status_code in [400,403,404,500] and 'Fictional read one page' not in r.text
assert not req(t,'GET','/api/v1/habits/export').json()['habits']
snapshot=req(s,'GET','/api/v1/habits/export').json();assert snapshot['habits'][0]['records'];(out/'fictional-export.json').write_text(json.dumps(snapshot,indent=2))
u=requests.Session();assert u.post(base+'/auth/register',json={'email':'not-approved@example.com','password':'fictional-denied-password'},timeout=15).status_code==401
assert t.post(base+'/auth/register',json={'email':'not-approved@example.com','password':'fictional-denied-password'},timeout=15).status_code in [401,429]
r=u.get(base+'/api/v1/habits/export',headers={'Remote-User':qa[0]['email'],'X-Forwarded-Email':qa[0]['email']},timeout=15);assert r.status_code==401
(out/'native-api.json').write_text(json.dumps({'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'twoNativeAccounts':True,'crossAccountReadDeleteDenied':True,'nativeSnapshotExport':True,'anonymousAndOrdinaryUserRegistrationDenied':True,'forgedIdentityHeadersDenied':True,'externalMessagesSent':0},indent=2))
print('Two native accounts, habit boundaries, snapshot export and registration/header restrictions passed.')
