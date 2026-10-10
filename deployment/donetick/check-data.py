#!/usr/bin/env python3
"""Native API checks using only the two explicitly marked fictional OIDC accounts."""
import datetime,json,pathlib,secrets,sys,requests
out=pathlib.Path('/opt/utilibre/reports/donetick-20261009');base='http://127.0.0.1:3215'
sessions=[]
for i in range(2):
 state=json.loads((out/f'browser-state-{i}.json').read_text());origin=next(x for x in state['origins']if x['origin']=='https://chores.utilibre.org');token=next(x['value']for x in origin['localStorage']if x['name']=='token');s=requests.Session();s.headers.update({'Authorization':'Bearer '+token,'Host':'chores.utilibre.org'});sessions.append(s)
def req(s,method,path,expected=200,**kw):
 r=s.request(method,base+path,timeout=15,**kw);assert r.status_code==expected,(path,r.status_code,r.text[:300]);return r
profiles=[req(s,'GET','/api/v1/users/profile').json()['res']for s in sessions]
assert all('utilibre-donetick-qa-20261009-'in p['username']for p in profiles)
assert profiles[0]['circleID']!=profiles[1]['circleID']
record=out/'native-data-private.json'
if sys.argv[1]=='prepare':
 assert not record.exists();s,t=sessions
 r=req(s,'POST','/api/v1/chores/',json={'name':'Fictional water the paper fern','frequencyType':'daily','frequency':1,'assignStrategy':'no_assignee','isPrivate':False,'description':'<p>Fictional shared-circle chore</p>'}).json()
 record.write_text(json.dumps({'created':r,'passwords':[secrets.token_urlsafe(24)for _ in range(2)]}));record.chmod(0o600)
 print('Created fictional chore; inspect response fields in private fixture before further checks.')
elif sys.argv[1]=='verify':
 d=json.loads(record.read_text());s,t=sessions;cid=d['created']['res'];path=f'/api/v1/chores/{cid}'
 req(s,'GET',path)
 for method in ['GET','DELETE']:
  r=t.request(method,base+path,timeout=15);assert r.status_code in [400,403,404,500] and 'Fictional water the paper fern' not in r.text,(method,r.status_code)
 req(s,'GET',path)
 assert all(c['id']!=cid for c in req(t,'GET','/api/v1/chores/').json()['res'])
 attachment=req(s,'POST','/api/v1/assets/chore',data={'entityType':'chore_attachment','entityId':str(cid)},files={'file':('fictional.txt',b'Fictional attachment for recovery.','text/plain')}).json()
 d['attachment']=attachment;record.write_text(json.dumps(d))
 req(s,'GET','/api/v1/chores/'+str(cid)+'/attachments')
 r=t.get(base+'/api/v1/files/sign',params={'path':attachment['path']},timeout=15);assert r.status_code in [403,404]
 raw='/api/v1/assets/'+attachment['path'];req(requests.Session(),'GET',raw,expected=403)
 signed='/api/v1/assets/'+attachment['sign'];r=req(requests.Session(),'GET',signed);assert r.content==b'Fictional attachment for recovery.'
 assert r.headers['Content-Security-Policy'].startswith('sandbox;')
 assert r.headers['Cache-Control']=='private, max-age=600'
 public={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'twoDistinctCircles':True,'crossCircleReadDeleteListDenied':True,'nativeAttachmentUploaded':True,'crossCircleSigningDenied':True,'unsignedAttachmentDenied':True,'signedLinkReadableWithoutAccount':True,'attachmentSandbox':True,'privateTenMinuteBrowserCache':True,'nativeUserExport':'No implemented general export/import endpoint or UI found in pinned release; not claimed tested.'}
 (out/'native-data.json').write_text(json.dumps(public,indent=2))
 print('Two-circle task and attachment boundaries, signed sharing and response isolation passed.')
elif sys.argv[1]=='cleanup':
 d=json.loads(record.read_text())
 for s,password in zip(sessions,d['passwords']):
  req(s,'PUT','/api/v1/users/change_password',json={'password':password})
  req(s,'POST','/api/v1/users/delete/check',json={'password':password})
  req(s,'DELETE','/api/v1/users/delete',json={'password':password,'confirmation':'DELETE'})
  r=s.get(base+'/api/v1/users/profile',timeout=15);assert r.status_code in [401,403,404]
 print('Both fictional Donetick accounts deleted through the native password/check/DELETE flow; old sessions rejected.')
else:raise SystemExit('prepare or cleanup')
