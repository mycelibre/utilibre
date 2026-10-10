#!/usr/bin/env python3
"""Native database dump + private files, restored into a disposable networkless DB."""
import datetime,hashlib,json,os,pathlib,shutil,subprocess,tarfile,tempfile,time
os.umask(0o077)
name='addy';base=pathlib.Path('/opt/utilibre')/name
compose=['docker','compose','-f',str(pathlib.Path('/home/ubuntu/freetools/deployment')/name/'compose.yaml')]
if shutil.disk_usage(base).free<5*1024**3:raise SystemExit('Less than5GiB free; backup refused')
when=datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H-%M-%SZ');out=base/'backups'/when;out.mkdir(mode=0o700)
if name=='addy':
 dump_cmd=['exec','-T','db','sh','-c','exec mariadb-dump --single-transaction --user="$MARIADB_USER" --password="$MARIADB_PASSWORD" --databases addy']
else:dump_cmd=['exec','-T','db','pg_dump','-U','simplelogin','-d','simplelogin','-Fc']
with open(out/'database.dump','wb')as f:subprocess.run(compose+dump_cmd,stdout=f,check=True)
with tarfile.open(out/'files-and-private.tar.gz','w:gz')as a:
 a.add(base/'private',arcname='private')
 for p in (['app']if name=='addy'else['upload','pgp']):a.add(base/'data'/p,arcname=p)
restore='utilibre-'+name+'-restore-'+str(os.getpid())
if name=='addy':
 image='mariadb:12.2@sha256:6a4c4bbf0447c2247801309513fcc0dd17c3f35390368139ce419387fdd1144d'
 options=['-e','MARIADB_ALLOW_EMPTY_ROOT_PASSWORD=1','--tmpfs','/var/lib/mysql:rw,size=512m','--tmpfs','/run/mysqld:rw,size=8m'];args=['--skip-networking','--innodb-buffer-pool-size=64M'];ping=['mariadb-admin','ping','--silent']
else:
 image='postgres:17.11-alpine@sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73'
 options=['-e','POSTGRES_HOST_AUTH_METHOD=trust','--tmpfs','/var/lib/postgresql/data:rw,size=512m'];args=[];ping=['pg_isready','-U','postgres']
try:
 subprocess.run(['docker','run','-d','--name',restore,'--network','none','--memory','384m','--cpus','0.5']+options+[image]+args,check=True,stdout=subprocess.DEVNULL)
 for attempt in range(60):
  if subprocess.run(['docker','exec',restore]+ping,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0:break
  time.sleep(0.5)
 else:raise RuntimeError('Isolated restore DB did not initialize')
 if name=='addy':
  with open(out/'database.dump','rb')as f:subprocess.run(['docker','exec','-i',restore,'mariadb'],stdin=f,check=True,stdout=subprocess.DEVNULL)
  counts=subprocess.check_output(['docker','exec',restore,'mariadb','-N','-e','SELECT COUNT(*) FROM addy.users; SELECT COUNT(*) FROM addy.aliases;'],text=True).split()
 else:
  subprocess.run(['docker','exec',restore,'createuser','-U','postgres','simplelogin'],check=True)
  subprocess.run(['docker','exec',restore,'createdb','-U','postgres','-O','simplelogin','simplelogin'],check=True)
  with open(out/'database.dump','rb')as f:subprocess.run(['docker','exec','-i',restore,'pg_restore','-U','postgres','-d','simplelogin','--no-owner'],stdin=f,check=True,stdout=subprocess.DEVNULL)
  counts=subprocess.check_output(['docker','exec',restore,'psql','-U','postgres','-d','simplelogin','-Atc','SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM alias;'],text=True).split()
 with tempfile.TemporaryDirectory(prefix=name+'-archive-restore-')as temp:
  with tarfile.open(out/'files-and-private.tar.gz')as a:a.extractall(temp,filter='data')
  assert(pathlib.Path(temp)/'private/app.env').is_file()
 (out/'RESTORE-VERIFIED.json').write_text(json.dumps({'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'native dump restored in isolated networkless container; files/private archive extraction; no production writes','users':int(counts[0]),'aliases':int(counts[1])},indent=2)+'\n')
finally:subprocess.run(['docker','rm','-f',restore],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
(out/'SHA256.json').write_text(json.dumps({p.name:hashlib.sha256(p.read_bytes()).hexdigest()for p in out.iterdir()},indent=2)+'\n')
print(out)
