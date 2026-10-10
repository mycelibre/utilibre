#!/usr/bin/env python3
"""Restore a fictional-data snapshot into a networkless native application."""
import json,os,pathlib,shutil,subprocess,tarfile,tempfile,time
out=pathlib.Path('/opt/utilibre/reports/donetick-20261009');backup=pathlib.Path((out/'backup-path.txt').read_text().strip());record=json.loads((out/'native-data-private.json').read_text());state=json.loads((out/'browser-state-0.json').read_text());token=next(x['value']for o in state['origins']if o['origin']=='https://chores.utilibre.org'for x in o['localStorage']if x['name']=='token')
with tempfile.TemporaryDirectory(prefix='donetick-native-restore-',dir='/opt/utilibre/reports') as td:
 r=pathlib.Path(td);r.chmod(0o755)
 for f in backup.glob('donetick.db*'):shutil.copy2(f,r/f.name)
 with tarfile.open(backup/'files-and-private.tar.gz') as a:a.extractall(r,filter='data')
 for d,dirs,files in os.walk(r):
  os.chown(d,1000,1000)
  for f in files:os.chown(pathlib.Path(d)/f,1000,1000)
 name='utilibre-donetick-restore-check'
 subprocess.run(['docker','run','-d','--rm','--name',name,'--network','none','--read-only','--cpus','1','--memory','640m','--pids-limit','64','--cap-drop','ALL','--security-opt','no-new-privileges','--tmpfs','/tmp:size=32m','--env-file',str(r/'private/app.env'),'-e','DT_ENV=selfhosted','-e','DT_SQLITE_PATH=/data/donetick.db','-e','GIN_MODE=release','-e','GOMEMLIMIT=450MiB','-v',str(r)+':/data','-v','/home/ubuntu/freetools/deployment/donetick/config.yaml:/config/selfhosted.yaml:ro','utilibre-donetick:0.1.80-p3'],check=True,stdout=subprocess.DEVNULL)
 try:
  pid=subprocess.check_output(['docker','inspect','--format','{{.State.Pid}}',name],text=True).strip()
  check='''import json,sys,time,urllib.request
r=json.load(sys.stdin);base='http://127.0.0.1:2021'
for attempt in range(30):
 try:
  h=json.load(urllib.request.urlopen(base+'/health',timeout=1));assert h['status']=='healthy';break
 except Exception:time.sleep(.3)
else:raise RuntimeError('Restored native server did not start')
q=urllib.request.Request(base+'/api/v1/chores/'+str(r['cid']),headers={'Authorization':'Bearer '+r['token']})
d=json.load(urllib.request.urlopen(q,timeout=3));assert d['res']['name']=='Fictional water the paper fern'
assert urllib.request.urlopen(base+'/api/v1/assets/'+r['asset'],timeout=3).read()==b'Fictional attachment for recovery.'
print('Native restored launch, authenticated fictional task and signed attachment passed.')
'''
  done=subprocess.run(['nsenter','-t',pid,'-n','python3','-c',check],input=json.dumps({'token':token,'cid':record['created']['res'],'asset':record['attachment']['sign']}),text=True,capture_output=True);assert done.returncode==0,done.stderr
  (out/'native-restore.json').write_text(json.dumps({'network':'none','nativeLaunch':True,'authenticatedTask':True,'signedAttachment':True,'productionWrites':False},indent=2));print(done.stdout.strip())
 finally:subprocess.run(['docker','stop',name],check=True,stdout=subprocess.DEVNULL)
