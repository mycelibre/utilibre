"""ABI plus native transaction checks for exact client-library candidates.

One ephemeral internal network and RAM-only PostgreSQL. No production volumes,
credentials, outbound provider requests or persistent test accounts.
"""
import hashlib,importlib.util,json,os,subprocess,sys,tempfile,time,uuid
from pathlib import Path
from datetime import datetime,timezone
os.umask(0o077)
HERE=Path(__file__).resolve().parent;ROOT=Path('/var/lib/utilibre-maintenance/security-20261114')
I=json.loads((HERE/'inputs.json').read_text())
LIMITS=['--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','384m','--pids-limit','96','--log-driver','none']
def run(a,timeout=90):return subprocess.run(a,capture_output=True,check=True,timeout=timeout).stdout
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def native(image,*a):return run(['docker','run','--rm','--network','none',*LIMITS,'--user','0','--entrypoint',a[0],image,*a[1:]])
specs=[next(r for r in I['rows'] if r['key']==k) for k in sys.argv[1:]]
assert specs and all('libpq5' in s['packages'] or 'libpq' in s['packages'] for s in specs)
source=HERE/'libpq-connection.c';f=ROOT/'fixtures'
compiler=json.loads((HERE.parent/'releases-20261111/vendor-inputs.json').read_text())['nativeFixture']['compiler']
run(['cc','-O2','-Wall','-Wextra','-Werror',str(source),'-ldl','-o',str(f/'pq-connect-glibc')])
run(['docker','run','--rm','--network','none',*LIMITS,'--tmpfs','/tmp:rw,size=32m','-v',str(source)+':/fixture.c:ro','-v',str(f)+':/out:rw','--entrypoint','cc',compiler,'-O2','-Wall','-Wextra','-Werror','/fixture.c','-ldl','-o','/out/pq-connect-musl'])
for binary in (f/'pq-connect-glibc',f/'pq-connect-musl'): binary.chmod(0o755)
module=importlib.util.spec_from_file_location('image_helpers',HERE.parent/'security-20261109/zlib-check.py');helper=importlib.util.module_from_spec(module);module.loader.exec_module(helper)
assert sha(HERE.parent/'security-20261109/zlib-check.py')==I['fixtureHashes']['security-20261109/zlib-check.py']
dbimage=I['libpqDatabaseImage'];assert run(['docker','image','inspect','--format','{{.Id}}',dbimage]).decode().strip()==dbimage
name='utilibre-pq-fixture-'+uuid.uuid4().hex[:10];network=name+'-net';created=False
try:
 run(['docker','network','create','--internal',network])
 run(['docker','run','-d','--name',name,'--network',network,'--network-alias','fixture-db',*LIMITS,
      '--user','70:70','--tmpfs','/var/lib/postgresql/data:rw,size=128m,uid=70,gid=70,mode=0700',
      '--tmpfs','/var/run/postgresql:rw,size=16m,uid=70,gid=70','--tmpfs','/tmp:rw,size=16m,mode=1777',
      '-e','POSTGRES_USER=fictional','-e','POSTGRES_DB=fictional','-e','POSTGRES_PASSWORD=Fictional-Only-Not-Production',dbimage,
      '-c','log_statement=none','-c','log_connections=off','-c','log_disconnections=off','-c','log_min_error_statement=panic','-c','log_min_messages=panic']);created=True
 for _ in range(30):
  try:run(['docker','exec',name,'pg_isready','-U','fictional']);break
  except subprocess.CalledProcessError:time.sleep(.5)
 else:raise AssertionError('Disposable PostgreSQL unavailable')
 for s in specs:
  out=ROOT/('vendor-debian/'+s['key'] if s['kind']=='debian' else s['key']);b=json.loads((out/'build.json').read_text());assert b['passed']
  assert not (out/'consumer.json').exists()
  lib='/usr/lib/x86_64-linux-gnu/libpq.so.5' if s['kind']=='debian' else '/usr/lib/libpq.so.5'
  abi=[];native_rows=[]
  with tempfile.TemporaryDirectory(dir=out) as tmp:
   for n,image in enumerate([s['base'],b['imageId']]):
    p=Path(tmp)/str(n);p.write_bytes(native(image,'cat',lib));symbols=helper.symbols(p)
    dynamic=[l.split(')',1)[1].strip() for l in run(['readelf','-d',str(p)]).decode().splitlines() if '(NEEDED)' in l or '(SONAME)' in l]
    abi.append({'imageId':image,'symbols':sorted(symbols),'dynamic':dynamic,'sha256':sha(p)})
    binary=f/('pq-connect-glibc' if s['kind']=='debian' else 'pq-connect-musl')
    value=run(['docker','run','--rm','--network',network,*LIMITS,'--user','65534:65534',
       '-e','UTILIBRE_TEST_CONNINFO=host=fixture-db dbname=fictional user=fictional password=Fictional-Only-Not-Production sslmode=disable connect_timeout=3',
       '-v',str(binary)+':/native:ro','--entrypoint','/native',image]).decode().strip()
    assert value=='LIBPQ_DATABASE_PASSED checks=6';native_rows.append({'imageId':image,'passed':True,'checks':6})
  assert len(abi[0]['symbols'])>100 and set(abi[0]['symbols'])<=set(abi[1]['symbols']) and abi[0]['dynamic']==abi[1]['dynamic']
  (out/'consumer.json').write_text(json.dumps({'passed':True,'date':datetime.now(timezone.utc).isoformat(),
    'base':s['base'],'imageId':b['imageId'],'abiPreserved':True,'abi':abi,'nativeRows':native_rows,
    'databaseImage':dbimage,'fixtureSha256':sha(source),'fixtureBinarySha256':sha(binary),
    'network':'ephemeral Docker internal network','data':'fictional temporary tables; RAM-only server',
    'limitations':'Native library/transaction compatibility; application-specific workflows checked separately where required. No production data or external services.'},indent=2)+'\n')
  print(s['key']+': preserved libpq ABI; before/after database read/write, Unicode, rollback and error recovery passed',flush=True)
finally:
 if created:run(['docker','rm','-f','-v',name])
 run(['docker','network','rm',network])
