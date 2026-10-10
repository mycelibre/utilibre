#!/usr/bin/env python3
"""Delete only recorded disposable fixtures via native APIs, then test logout."""
import datetime,json,pathlib,requests
root=pathlib.Path('/opt/utilibre/projects');fixtures=json.loads((root/'private/native-fixtures.json').read_text());base='http://127.0.0.1:3217';checks=[]
for i,f in enumerate(fixtures):
 d=json.loads((root/f'private/qa-session-{i}.json').read_text());assert d['user']['email']==f'utilibre-projects-check-{chr(97+i)}@utilibre.org'
 s=requests.Session();s.headers['Authorization']='Bearer '+d['token'];s.headers['Cookie']='; '.join(c['name']+'='+c['value'] for c in d['cookies'])
 assert s.delete(base+'/api/attachments/'+f['attachment']['id'],timeout=20).ok
 assert s.get(base+f['download'],timeout=10).status_code==404
 assert s.delete(base+'/api/projects/'+f['project']['id'],timeout=20).ok
 assert s.get(base+'/api/projects/'+f['project']['id'],timeout=10).status_code==404
 assert s.delete(base+'/api/access-tokens/me',timeout=10).ok
 assert s.get(base+'/api/projects',timeout=10).status_code==401
 checks.append(f'QA {i}: explicit attachment and project deletion returned404; native logout token returned401')
assert not list((root/'data/attachments').rglob('fictional.txt'))
report={'date':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':checks,'nativeArchives':'Retained; native deletion is not physical erasure of every historical record'}
pathlib.Path('/opt/utilibre/reports/projects-launch-20261009/cleanup.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
