"""Reopen a consistent fictional ByteStash snapshot with networking disabled."""
from pathlib import Path
import json,hashlib,subprocess,tarfile,shutil,os,time
r=Path('/opt/utilibre/reports/new-services-20261009');backup=Path('/opt/utilibre/community-backups/bytestash-20261009T005231Z');target=r/'bytestash-restore';assert not target.exists();target.mkdir(mode=0o700)
for line in (backup/'SHA256SUMS').read_text().splitlines():
 digest,name=line.split();assert hashlib.sha256((backup/name).read_bytes()).hexdigest()==digest
with tarfile.open(backup/'data.tar.gz') as archive:archive.extractall(target,filter='data')
data=target/'bytestash'
for p in [data,*data.rglob('*')]:os.chown(p,1000,1000)
container='utilibre-bytestash-restore-check'
try:
 subprocess.run(['docker','run','-d','--name',container,'--network','none','--read-only','--cap-drop','ALL','--user','1000:1000','--memory','512m','--cpus','1','--pids-limit','128','--tmpfs','/tmp:size=32m','-e','DEBUG=false','-e','DISABLE_INTERNAL_ACCOUNTS=true','-v',str(data)+':/data/snippets','utilibre-bytestash:1.5.14-p1'],check=True,stdout=subprocess.DEVNULL)
 for _ in range(20):
  q=subprocess.run(['docker','exec',container,'node','-e',"fetch('http://127.0.0.1:5000/api/auth/config').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  if not q.returncode:break
  time.sleep(1)
 else:raise RuntimeError('Isolated ByteStash failed to start')
 state=json.loads((r/'bytestash-browser-state.json').read_text());origin=next(x for x in state['origins'] if x['origin']=='https://snippets-library.utilibre.org');token=next(x['value'] for x in origin['localStorage'] if x['name']=='token')
 code="const r=await fetch('http://127.0.0.1:5000/api/snippets',{headers:{bytestashauth:'Bearer ' + "+json.dumps(token)+"}});if(!r.ok)throw Error('Native HTTP '+r.status);const j=await r.json();if(j.data.length!==2||j.data.some(s=>s.fragments[0].code!=='print(\"Fictional test\")\\n'))throw Error('Restored fictional contents mismatch');"
 subprocess.run(['docker','exec','-i',container,'node','--input-type=module'],input=code,text=True,check=True,stdout=subprocess.DEVNULL)
 (r/'bytestash-restore.json').write_text(json.dumps({'checksums':True,'nativeReopen':True,'jsonRoundTripCopies':2,'exactCodeBytes':True,'network':'none','backup':str(backup)},indent=2));print('ByteStash isolated native reopen and exact imported snippet bytes passed.')
finally:
 subprocess.run(['docker','rm','-f',container],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);shutil.rmtree(target)
