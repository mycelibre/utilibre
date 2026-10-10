"""Native fictional task/attachment/export/import regression through the private gateway."""
from pathlib import Path
import requests,json,time,zipfile,io
root=Path('/opt/utilibre/reports/new-services-20261009');state=json.loads((root/'vikunja-browser-state.json').read_text());origin=next(x for x in state['origins'] if x['origin']=='https://tasks.utilibre.org');token=next(x['value'] for x in origin['localStorage'] if x['name']=='token')
s=requests.Session();s.headers.update({'Authorization':'Bearer '+token,'Host':'tasks.utilibre.org'})
base='http://10.10.1.43:3195/api/v2'
def call(method,path,body=None,status=200,**kw):
 r=s.request(method,base+path,json=body,**kw);assert r.status_code==status,(method,path,r.status_code,r.text[:200]);return r
me=call('GET','/user').json();assert me['username']=='utilibre-check-a'
project=call('POST','/projects',{'title':'Fictional deployment project','description':'Synthetic check only'},status=201).json()
(root/'vikunja-fixture.json').write_text(json.dumps({'userId':me['id'],'projectId':project['id']}));(root/'vikunja-fixture.json').chmod(0o600)
task=call('POST','/projects/'+str(project['id'])+'/tasks',{'title':'Fictional task','description':'<p>Fictional private task description</p>','priority':2},status=201).json()
assert requests.get(base+'/projects/'+str(project['id'])).status_code in [401,403]
call('PUT','/tasks/'+str(task['id']),{'title':'Fictional revised task','description':'<p>Fictional private task description</p>','priority':3,'done':True})
r=call('POST','/tasks/'+str(task['id'])+'/attachments',status=201,files={'files':('fictional.txt',b'Fictional attachment content\n','text/plain')})
call('POST','/user/export/request',{})
export=None
for _ in range(45):
 r=call('GET','/user/export').json()
 if r:
  export=call('POST','/user/export/download',{}).content;break
 time.sleep(1)
assert export,'Native export did not finish'
(root/'vikunja-fixture-export.zip').write_bytes(export)
z=zipfile.ZipFile(io.BytesIO(export));assert any(n.endswith('.json') for n in z.namelist());assert any(b'Fictional attachment content' in z.read(n) for n in z.namelist() if not n.endswith('/'))
call('POST','/migration/vikunja-file/migrate',status=200,files={'import':('fictional-export.zip',export,'application/zip')})
for _ in range(45):
 r=call('GET','/migration/vikunja-file/status').json()
 if r and r.get('finished_at'):break
 time.sleep(1)
else:raise RuntimeError('Native import did not finish; inspect private status')
projects=call('GET','/projects').json()
if isinstance(projects,dict):projects=projects.get('items',[])
matched=[p for p in projects if p['title']=='Fictional deployment project'];assert len(matched)==2, len(matched)
(root/'vikunja-fixture.json').write_text(json.dumps({'userId':me['id'],'projectIds':[p['id'] for p in matched]}))
(root/'vikunja-native.json').write_text(json.dumps({'version':'2.7.0','nativeOidc':True,'privateProjectDenied':True,'createEditCompleteTask':True,'attachmentExport':True,'nativeZipExportImport':True,'archiveEntries':z.namelist(),'importedProjects':len(matched)},indent=2))
print('Native private task/edit/attachment ZIP export/import passed; fixtures retained for isolated restore.')
