#!/usr/bin/env python3
"""Open a fictional native SQLite snapshot in a networkless restored application."""
import json,os,pathlib,shutil,subprocess,tarfile,tempfile
out=pathlib.Path('/opt/utilibre/reports/beaver-20261009');backup=pathlib.Path((out/'backup-path.txt').read_text().strip());qa=json.loads(pathlib.Path('/opt/utilibre/beaverhabits/private/qa.json').read_text())
with tempfile.TemporaryDirectory(prefix='beaver-native-restore-',dir='/opt/utilibre/reports') as td:
 r=pathlib.Path(td);r.chmod(0o755)
 for f in backup.glob('habits.db*'):shutil.copy2(f,r/f.name)
 with tarfile.open(backup/'files-and-private.tar.gz') as a:a.extractall(r,filter='data')
 for d,dirs,files in os.walk(r):
  os.chown(d,1000,1000)
  for f in files:os.chown(pathlib.Path(d)/f,1000,1000)
 name='utilibre-beaverhabits-restore-check'
 subprocess.run(['docker','run','-d','--rm','--name',name,'--network','none','--read-only','--cpus','1','--memory','768m','--pids-limit','64','--cap-drop','ALL','--security-opt','no-new-privileges','--tmpfs','/tmp:size=64m','--env-file',str(r/'private/app.env'),'-e','ENV=production','-e','HABITS_STORAGE=DATABASE','-e','DATABASE_URL=sqlite+aiosqlite:////app/.user/habits.db','-e','NICEGUI_STORAGE_PATH=/app/.user/.nicegui','-e','REQUIRE_ADMIN_FOR_REGISTRATION=true','-e','ENABLE_DAILY_BACKUP=false','-v',str(r)+':/app/.user','utilibre-beaverhabits:0.10.0-p7'],check=True,stdout=subprocess.DEVNULL)
 try:
  pid=subprocess.check_output(['docker','inspect','--format','{{.State.Pid}}',name],text=True).strip()
  check='''import json,sys,time,urllib.request,urllib.error
users=json.load(sys.stdin);q=users[0]
for attempt in range(50):
 try:
  req=urllib.request.Request('http://127.0.0.1:8080/api/v1/habits/export',headers={'Authorization':'Bearer '+q['token']});d=json.load(urllib.request.urlopen(req,timeout=2));break
 except Exception:time.sleep(.4)
else:raise RuntimeError('Restored native server did not start')
h=next(h for h in d['habits'] if h['name']=='Fictional read one page');assert any(r['done']for r in h['records']);assert h['tags']==['fictional']
# Imported habits may share IDs, so verify user scoping rather than expecting a missing ID.
base='http://127.0.0.1:8080'
def call(method,path,token=None,data=None,extra=None):
 headers=extra or {}
 if token:headers['Authorization']='Bearer '+token
 if data is not None:headers['Content-Type']='application/json'
 req=urllib.request.Request(base+path,headers=headers,method=method,data=json.dumps(data).encode() if data is not None else None)
 try:
  with urllib.request.urlopen(req,timeout=3)as r:return r.status,r.read()
 except urllib.error.HTTPError as e:return e.code,e.read()
b=users[1];code,payload=call('GET','/api/v1/habits/export',b['token']);assert code==200
bh=json.loads(payload)['habits'][0];assert bh['name']=='Fictional read one page (imported)'
assert call('DELETE','/api/v1/habits/'+bh['id'],b['token'])[0]==200
assert call('GET','/api/v1/habits/'+q['habitId'],q['token'])[0]==200
assert call('GET','/api/v1/habits/export',extra={'Remote-User':q['email'],'X-Forwarded-Email':q['email']})[0]==401
fixture={'email':'not-approved@example.com','password':'fictional-denied-password'}
assert call('POST','/auth/register',data=fixture)[0]==401
assert call('POST','/auth/register',b['token'],fixture)[0]==401
print('Restored native launch, habit/completion, independent imported copy, header and registration boundaries passed.')
'''
  done=subprocess.run(['nsenter','-t',pid,'-n','python3','-c',check],input=json.dumps(qa),text=True,capture_output=True);assert done.returncode==0,done.stderr
  subprocess.run(['nsenter','-t',pid,'-n','node','/home/ubuntu/freetools/deployment/beaverhabits/check-export-copy.mjs'],env={**os.environ,'BASE_URL':'http://127.0.0.1:8080'},check=True)
  (out/'native-restore.json').write_text(json.dumps({'network':'none','nativeLaunch':True,'authenticatedHabit':True,'completionAndTags':True,'importedCopyIndependent':True,'forgedHeadersDenied':True,'anonymousAndOrdinaryRegistrationDenied':True,'productionWrites':False},indent=2));print(done.stdout.strip())
 finally:subprocess.run(['docker','stop',name],check=True,stdout=subprocess.DEVNULL)
