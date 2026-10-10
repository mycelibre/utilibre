"""Native fictional snippet/share/API verification; only this QA user's data."""
from pathlib import Path
import requests,json
r=Path('/opt/utilibre/reports/new-services-20261009');state=json.loads((r/'bytestash-browser-state.json').read_text());origin=next(x for x in state['origins'] if x['origin']=='https://snippets-library.utilibre.org');token=next(x['value'] for x in origin['localStorage'] if x['name']=='token')
s=requests.Session();s.headers.update({'bytestashauth':'Bearer '+token,'Host':'snippets-library.utilibre.org'});base='http://10.10.1.43:3204/api'
def call(m,p,body=None,status=200):
 response=s.request(m,base+p,json=body);assert response.status_code==status,(m,p,response.status_code,response.text[:160]);return response
me=call('GET','/auth/verify').json()['user'];assert me['username']=='utilibrechecka' and not me['is_admin']
assert requests.get(base+'/snippets').status_code==401
assert requests.get(base+'/auth/oidc/callback?state=fictional').status_code==400
call('POST','/auth/register',{'username':'fictional-denied','password':'fictional'},status=403)
body={'title':'Fictional native snippet','description':'Synthetic code only','categories':['fixture'],'fragments':[{'file_name':'fictional.py','language':'python','code':'print("Fictional test")\n','position':0}],'is_public':False}
a=call('POST','/snippets',body,status=201).json();body['title']='Fictional revised snippet';call('PUT','/snippets/'+str(a['id']),body)
assert requests.get(base+'/public/snippets/'+str(a['id'])).status_code==404
share=call('POST','/share',{'snippetId':a['id'],'requiresAuth':False,'expiresIn':3600},status=201).json();sid=share.get('id',share.get('share_id'));assert sid,share
assert requests.get(base+'/share/'+sid).status_code==200
protected=call('POST','/share',{'snippetId':a['id'],'requiresAuth':True,'expiresIn':3600},status=201).json();pid=protected.get('id',protected.get('share_id'));assert requests.get(base+'/share/'+pid).status_code==401
call('DELETE','/share/'+sid);assert requests.get(base+'/share/'+sid).status_code==404
call('DELETE','/share/'+pid)
call('PATCH','/snippets/'+str(a['id'])+'/recycle');call('PATCH','/snippets/'+str(a['id'])+'/restore')
(r/'bytestash-fixture.json').write_text(json.dumps({'userId':me['id'],'snippetIds':[a['id']]}));(r/'bytestash-fixture.json').chmod(0o600)
(r/'bytestash-native.json').write_text(json.dumps({'version':'1.5.14-p1','nativeOidc':True,'localSignupDenied':True,'callbackRequiresBrowserState':True,'privateAnonymousDenied':True,'createEditRecycleRestore':True,'publicAndAuthenticatedShares':True,'shareRevocation':True},indent=2));print('Native ByteStash private snippet and share controls passed.')
