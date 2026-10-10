import runpy,sys,json
sys.argv=['check-data.py','load']
src=open('/home/ubuntu/freetools/deployment/donetick/check-public-data.py').read();src=src[:src.index("if sys.argv[1]=='prepare':")];g={};exec(src,g)
s,t=g['sessions'];req=g['req'];record=g['record'];out=g['out'];d=json.loads(record.read_text());cid=d['created']['res']
circle=req(s,'GET','/api/v1/circles/').json()['res'][0]
req(t,'POST','/api/v1/circles/join',params={'invite_code':circle['invite_code']})
r=t.get(g['base']+f'/api/v1/chores/{cid}',timeout=15);assert r.status_code!=200
pending=req(s,'GET','/api/v1/circles/members/requests').json()['res'];assert len(pending)==1
req(s,'PUT','/api/v1/circles/members/requests/accept',params={'requestId':pending[0]['id']})
assert req(t,'GET',f'/api/v1/chores/{cid}').json()['res']['name']=='Fictional public water the paper fern'
req(t,'DELETE','/api/v1/circles/leave',params={'circle_id':circle['id']})
r=t.get(g['base']+f'/api/v1/chores/{cid}',timeout=15);assert r.status_code!=200
(out/'native-circle-sharing.json').write_text(json.dumps({'joinRequestAloneDenied':True,'adminAcceptanceGrantedVisibility':True,'leaveRevokedTaskVisibility':True},indent=2))
print('Native invitation request, administrator acceptance, shared task and leave/revocation passed.')
