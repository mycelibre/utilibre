"""Restore a native Vikunja dump into an empty isolated directory and reopen it."""
from pathlib import Path
import subprocess,json,hashlib,os,shutil,time
report=Path('/opt/utilibre/reports/new-services-20261009');backup=Path('/opt/utilibre/community-backups/vikunja-20261009T003550Z');data=report/'vikunja-restore'
# This fixed disposable-fixture snapshot is intentionally distinct from later clean backups.
for line in (backup/'SHA256SUMS').read_text().splitlines():
 digest,name=line.split();assert hashlib.sha256((backup/name).read_bytes()).hexdigest()==digest
assert not data.exists();data.mkdir(mode=0o700);os.chown(data,1000,1000)
image='vikunja/vikunja:2.7.0@sha256:e2204a1c1c6a81e833c2b3a5442be182ca2335b54c2e7e37578cc3fe12a27cfc'
args=['--network','none','--read-only','--user','1000:1000','--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','768m','--cpus','1.5','--pids-limit','128','--tmpfs','/tmp:rw,size=64m,mode=1777','-e','VIKUNJA_DATABASE_PATH=/data/vikunja.db','-e','VIKUNJA_SERVICE_SECRET_FILE=/run/secrets/session-secret','-e','VIKUNJA_AUTH_OPENID_PROVIDERS_UTILIBRE_CLIENTSECRET_FILE=/run/secrets/oidc-secret','-v',str(data)+':/data','-v','/home/ubuntu/freetools/deployment/community/vikunja/config.yml:/app/vikunja/config.yml:ro','-v','/opt/utilibre/community-private/vikunja-session-secret:/run/secrets/session-secret:ro','-v','/opt/utilibre/community-private/vikunja-oidc-secret:/run/secrets/oidc-secret:ro']
container='utilibre-vikunja-restore-check'
try:
 # Native confirmation is supplied ONLY to a new empty restore directory.
 with (report/'vikunja-restore.log').open('w') as log:
  subprocess.run(['docker','run','--rm','-i',*args,'-v',str(backup/'native-dump.zip')+':/native-dump.zip:ro',image,'restore','--preserve-config','/native-dump.zip'],input='Yes, I understand\n',text=True,stdout=log,stderr=log,check=True)
 subprocess.run(['docker','run','-d','--name',container,*args,image],check=True,stdout=subprocess.DEVNULL)
 for _ in range(30):
  r=subprocess.run(['docker','exec',container,'/app/vikunja/vikunja','healthcheck'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  if not r.returncode:break
  time.sleep(1)
 else:raise RuntimeError('Restored service failed health check')
 state=json.loads((report/'vikunja-browser-state.json').read_text());origin=next(x for x in state['origins'] if x['origin']=='https://tasks.utilibre.org');token=next(x['value'] for x in origin['localStorage'] if x['name']=='token')
 # Reuse an already-installed Python runtime solely as a network-isolated HTTP client.
 code="import requests; s=requests.Session();s.headers['Authorization']='Bearer '+"+repr(token)+";u='http://127.0.0.1:3456/api/v2';r=s.get(u+'/projects');assert r.status_code==200, (r.status_code,r.json().get('message'));ps=r.json()['items'];ps=[p for p in ps if p['title']=='Fictional deployment project'];assert len(ps)==2;\nfor p in ps:\n ts=s.get(u+'/projects/'+str(p['id'])+'/tasks').json()['items'];assert len(ts)==1 and ts[0]['done'];a=s.get(u+'/tasks/'+str(ts[0]['id'])+'/attachments').json()['items'];assert len(a)==1;assert s.get(u+'/tasks/'+str(ts[0]['id'])+'/attachments/'+str(a[0]['id'])).content==b'Fictional attachment content\\n'\nprint('Native restored tasks and attachment bytes verified.')"
 subprocess.run(['docker','run','--rm','-i','--network','container:'+container,'--read-only','--cap-drop','ALL','--memory','128m','--cpus','0.5','--entrypoint','python','sissbruecker/linkding:1.47.0@sha256:e35cb50e0581178f245125ffaa909c565416c94c9f22ace305a7d234a4345522','-'],input=code,text=True,check=True,stdout=subprocess.DEVNULL)
 (report/'vikunja-restore.json').write_text(json.dumps({'backup':str(backup),'checksums':True,'nativeDumpRestore':True,'nativeReopen':True,'fictionalTasksAndAttachmentBytes':True,'network':'none'},indent=2))
 print('Native Vikunja dump/restore/reopen and exact attachment verification passed without networking.')
finally:
 subprocess.run(['docker','rm','-f',container],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=False);shutil.rmtree(data)
