"""Reopen only an isolated copy of an Opengist snapshot; never production data."""
import pathlib,tarfile,subprocess,json,time,sqlite3,shutil,hashlib
report=pathlib.Path('/opt/utilibre/reports/new-services-20261009')
backup=max(pathlib.Path('/opt/utilibre/community-backups').glob('opengist-*'))
for line in (backup/'SHA256SUMS').read_text().splitlines():
 digest,name=line.split();assert hashlib.sha256((backup/name).read_bytes()).hexdigest()==digest
restore=report/'opengist-restore';restore.mkdir(mode=0o700,exist_ok=True)
with tarfile.open(backup/'data.tar.gz') as t:t.extractall(restore,members=[m for m in t if m.name not in {'opengist/symlinks/config.yml','opengist/symlinks/opengist'}],filter='data')
data=restore/'opengist'
c=sqlite3.connect(data/'opengist.db');assert c.execute('PRAGMA integrity_check').fetchone()[0]=='ok';assert c.execute('select count(*) from gists').fetchone()[0]==3;c.close()
subprocess.run(['chown','-R','1000:1000',str(data)],check=True)
container='utilibre-opengist-restore-check'
try:
 subprocess.run(['docker','run','-d','--name',container,'--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--user','1000:1000','--memory','512m','--cpus','1','--pids-limit','128','--tmpfs','/tmp:rw,size=64m,mode=1777','-v',str(data)+':/opengist','-v','/home/ubuntu/freetools/deployment/community/opengist/config.yml:/config.yml:ro','-v','/opt/utilibre/community-private/opengist-secrets:/run/secrets/opengist_secrets:ro','ghcr.io/thomiceli/opengist:1.15.2@sha256:7edc91273ee7d10a17406da8a08c803158baaff984c39b789c1313473d068f21'],check=True,stdout=subprocess.DEVNULL)
 for _ in range(30):
  r=subprocess.run(['docker','exec',container,'curl','-fsS','http://127.0.0.1:6157/healthcheck'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  if r.returncode==0:break
  time.sleep(1)
 else:raise RuntimeError('Restored app did not become healthy')
 q=json.loads((report/'opengist-qa.json').read_text())
 for gist in q['gists']:
  result=subprocess.check_output(['docker','exec','-i',container,'curl','--config','-'],input='silent\nfail\nheader = "Authorization: Bearer '+q['token']+'"\nurl = "http://127.0.0.1:6157/api/gists/'+gist['id']+'"\n',text=True)
  restored=json.loads(result);assert restored['id']==gist['id'];assert 'Fictional' in restored['files']['example.txt']['content']
  commits=subprocess.check_output(['docker','exec','-i',container,'curl','--config','-'],input='silent\nfail\nheader = "Authorization: Bearer '+q['token']+'"\nurl = "http://127.0.0.1:6157/api/gists/'+gist['id']+'/commits"\n',text=True)
  assert len(json.loads(commits))>=2
 (report/'opengist-restore.json').write_text(json.dumps({'backup':str(backup),'checksum':True,'sqliteIntegrity':True,'nativeReopen':True,'fictionalGists':3,'gitHistory':True,'network':'none'},indent=2))
 print('Snapshot checksums, SQLite integrity and network-isolated native reopen/history passed.')
finally:
 subprocess.run(['docker','rm','-f',container],stdout=subprocess.DEVNULL,check=False)
 shutil.rmtree(restore)
