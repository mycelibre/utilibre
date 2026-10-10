#!/usr/bin/env python3
"""Native API checks using only the two disposable OIDC accounts. Keep fixtures for CSV/recovery checks."""
import datetime,json,os,pathlib,requests
os.umask(0o077)
root=pathlib.Path('/opt/utilibre/projects');report={'date':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':[]};base='http://127.0.0.1:3217'
clients=[];users=[]
for i in range(2):
 data=json.loads((root/f'private/qa-session-{i}.json').read_text());assert data['user']['email']==f'utilibre-projects-check-{chr(97+i)}@utilibre.org';assert not data['user']['isAdmin']
 s=requests.Session();s.headers['Authorization']='Bearer '+data['token'];s.headers['Cookie']='; '.join(c['name']+'='+c['value'] for c in data['cookies']);clients.append(s);users.append(data['user'])
def call(s,method,path,body=None,**kwargs):
 r=s.request(method,base+path,json=body,timeout=20,**kwargs);assert r.ok,f'{method} {path}: HTTP {r.status_code}';return r.json()['item']
assert requests.get(base+'/api/projects',timeout=10).status_code==401
assert requests.post(base+'/api/access-tokens',json={'emailOrUsername':'nobody@example.invalid','password':'fictional'},timeout=10).status_code==403
report['checks'].append('Anonymous API denied; password sign-in disabled by native OIDC enforcement')
fixtures=[]
for i,s in enumerate(clients):
 project=call(s,'POST','/api/projects',{'name':f'Fictional Projects launch {i}'})
 board=call(s,'POST',f"/api/projects/{project['id']}/boards",{'name':f'Fictional board {i}'})
 todo=call(s,'POST',f"/api/boards/{board['id']}/lists",{'name':'Fictional To do','position':65536})
 done=call(s,'POST',f"/api/boards/{board['id']}/lists",{'name':'Fictional Done','position':131072})
 card=call(s,'POST',f"/api/lists/{todo['id']}/cards",{'name':f'Fictional card {i}','description':'Fictional, quoted "description" only.\nSecond line.','position':65536})
 moved=call(s,'PATCH',f"/api/cards/{card['id']}",{'listId':done['id'],'position':65536});assert moved['listId']==done['id']
 task=call(s,'POST',f"/api/cards/{card['id']}/tasks",{'name':'Fictional task text omitted from CSV','position':65536})
 comment=call(s,'POST',f"/api/cards/{card['id']}/comment-actions",{'text':'Fictional comment omitted from CSV'})
 attachment=call(s,'POST',f"/api/cards/{card['id']}/attachments",files={'file':('fictional.txt',b'Fictional Projects recovery attachment.\n','text/plain')})
 path=f"/attachments/{attachment['id']}/download/fictional.txt";assert s.get(base+path,timeout=10).content==b'Fictional Projects recovery attachment.\n'
 other=clients[1-i]
 for p in [f"/api/projects/{project['id']}",f"/api/boards/{board['id']}",f"/api/cards/{card['id']}",path]:assert other.get(base+p,timeout=10).status_code==404
 assert other.patch(base+f"/api/cards/{card['id']}",json={'name':'Unauthorized fictional change'},timeout=10).status_code==404
 fixtures.append({'project':project,'board':board,'card':card,'attachment':attachment,'download':path,'user':users[i]})
 report['checks'].append(f'QA {i}: native create/move/task/comment/attachment and bidirectional other-user read/write/download isolation passed')
(root/'private/native-fixtures.json').write_text(json.dumps(fixtures))
pathlib.Path('/opt/utilibre/reports/projects-launch-20261009/native-check.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
