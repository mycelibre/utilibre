"""Fictional native Opengist fixture; secrets/results stay outside the repository."""
import json, re, subprocess, pathlib, urllib.parse, requests, zipfile, io
REPORT=pathlib.Path('/opt/utilibre/reports/new-services-20261009')
q=json.loads((REPORT/'opengist-qa.json').read_text())
ip=subprocess.check_output(['docker','inspect','-f','{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}','utilibre-opengist-opengist-1'],text=True).strip()
base='http://'+ip+':6157'
s=requests.Session()
def page(path):
 for cookie in s.cookies: cookie.secure=False # Test-only direct private HTTP transport.
 r=s.get(base+path);r.raise_for_status();return r
def csrf(html):
 m=re.search(r'name="_csrf"[^>]*value="([^"]+)"',html)
 if not m:m=re.search(r'value="([^"]+)"[^>]*name="_csrf"',html)
 assert m,'CSRF field missing';return m.group(1)
if 'token' not in q:
 r=page('/-/login')
 r=s.post(base+'/-/login',data={'username':q['username'],'password':q['password'],'_csrf':csrf(r.text)},allow_redirects=False)
 assert r.status_code==302,(r.status_code,r.text[:100])
 for key,value in [('disable-gravatar','1'),('require-login','0'),('allow-gists-without-login','0'),('disable-signup','0')]:
  r=page('/-/admin-panel/configuration')
  r=s.put(base+'/-/admin-panel/set-config',data={'key':key,'value':value,'_csrf':csrf(r.text)})
  assert r.status_code==200,(key,r.status_code)
 r=page('/-/settings/access-tokens')
 r=s.post(base+'/-/settings/access-tokens',data={'name':'Fictional deployment verification','scope_gist':'2','scope_user':'2','expires_at':'2026-10-10','_csrf':csrf(r.text)},allow_redirects=False)
 assert r.status_code==302
 r=page('/-/settings/access-tokens')
 m=re.search(r'og_[A-Za-z0-9_-]+',r.text)
 if not m:
  (REPORT/'opengist-token-page.html').write_text(r.text)
  raise RuntimeError('Inspect private token page format')
 q['token']=m.group(0)
 q['cookies']=s.cookies.get_dict()
 (REPORT/'opengist-qa.json').write_text(json.dumps(q))
else:s.cookies.update(q['cookies'])
headers={'Authorization':'Bearer '+q['token']}
def api(method,path,body=None,expected=200,auth=True):
 r=requests.request(method,base+'/api'+path,json=body,headers=headers if auth else {})
 assert r.status_code==expected,(method,path,r.status_code,r.text[:120]);return r
if 'gists' not in q:
 q['gists']=[]
 for visibility in ['public','unlisted','private']:
  g=api('POST','/gists',{'title':'Fictional '+visibility+' check','visibility':visibility,'files':{'example.txt':{'content':'Fictional example version one\n'}}},201).json()
  q['gists'].append(g)
  (REPORT/'opengist-qa.json').write_text(json.dumps(q))
for g in q['gists']:
 ident=g['id']
 api('GET','/gists/'+ident,auth=False,expected=404 if g['visibility']=='private' else 200)
 api('PATCH','/gists/'+ident,{'files':{'example.txt':{'content':'Fictional example version two\n'}}})
 commits=api('GET','/gists/'+ident+'/commits').json();assert len(commits)>=2
 archive=s.get(base+'/'+q['username']+'/'+ident+'/archive/HEAD')
 assert archive.status_code==200
 z=zipfile.ZipFile(io.BytesIO(archive.content));name=next(n for n in z.namelist() if n.endswith('example.txt'))
 assert z.read(name)==b'Fictional example version two\n'
report={'version':'1.15.2','native_create_edit_history_zip':True,'public_and_unlisted_anonymous_read':True,'private_anonymous_404':True,'fixture_count':3}
(REPORT/'opengist-native.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
