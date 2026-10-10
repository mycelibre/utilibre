#!/usr/bin/env python3
"""Native snapshot/isolated browser restore; only a newly created fixture is touched live."""
import datetime, hashlib, json, os, secrets, shutil, subprocess, tempfile, time
from pathlib import Path

os.umask(0o077)
REPO=Path(__file__).resolve().parents[3]
LIVE='utilibre-services-freshrss-1'
LIVE_DB='utilibre-services-postgres-1'
report=Path(tempfile.mkdtemp(prefix='freshrss-browser-restore-',dir='/opt/utilibre/reports'))
stage=Path(tempfile.mkdtemp(prefix='freshrss-restore-',dir='/opt/utilibre'))
token=secrets.token_hex(6)
name='utilibre-freshrss-restore-'+token
network=name+'-net'
username='utilibrerestore'+token
fixture={'username':username,'password':secrets.token_urlsafe(24),'feedName':'Fictional recovery feed','title':'Fictional recovery article '+token}
fixture_file=report/'fixture.json'
fixture_file.write_text(json.dumps(fixture))
created=False
resources=[]
bridge=None
started=time.monotonic()

def run(*args,input=None):
 try:
  return subprocess.check_output(args,input=input,stderr=subprocess.PIPE,timeout=90)
 except subprocess.CalledProcessError as error:
  # Keep diagnostics private; subprocess arguments can contain fixture credentials.
  (report/'failure-stderr.log').write_bytes(error.stderr or b'')
  raise
def docker(*args,input=None):return run('docker',*args,input=input)
def php(container,code):return docker('exec','-i','-u','www-data',container,'php',input=('<?php\n'+code).encode())
def cli(container,*args):return docker('exec','-u','www-data',container,'php',*args)

try:
 assert shutil.disk_usage(stage).free>5*1024**3,'Retained backups must keep their disk floor'
 image=docker('inspect',LIVE,'--format','{{.Image}}').decode().strip()
 pgimage=docker('inspect',LIVE_DB,'--format','{{.Image}}').decode().strip()
 cli(LIVE,'/var/www/FreshRSS/cli/create-user.php','--user',username,'--password',fixture['password'],'--language','en','--no-default-feeds')
 created=True
 # Native models create exactly one fictional feed/article, without fetching a URL.
 code="""require '/var/www/FreshRSS/cli/_cli.php';
cliInitUser(USER);
$feed=FreshRSS_Factory::createFeedDao()->addFeed(['url'=>'https://example.invalid/recovery.xml','kind'=>0,'category'=>1,'name'=>FEED,'website'=>'https://example.invalid/','description'=>'Disposable restoration fixture','lastUpdate'=>time(),'error'=>0]);
if (!$feed) exit(1);
$entry=new FreshRSS_Entry($feed,'urn:utilibre:recovery:TOKEN',TITLE,'Fictional Author','<p>Fictional recovery content.</p>','https://example.invalid/recovery',time(),false,true);
$entry->_id((string)(int)(microtime(true)*1000000));
if (!FreshRSS_Factory::createEntryDao()->addEntry($entry->toArray(),false)) exit(2);
echo $feed;
""".replace('USER',json.dumps(username)).replace('FEED',json.dumps(fixture['feedName'])).replace('TITLE',json.dumps(fixture['title'])).replace('TOKEN',token)
 fixture['feedId']=int(php(LIVE,code).decode().strip())
 fixture_file.write_text(json.dumps(fixture))
 snapshot=report/'snapshot'
 snapshot.mkdir()
 # Same native formats as the normal core backup; do not invoke generation pruning.
 (snapshot/'freshrss.dump').write_bytes(docker('exec',LIVE_DB,'pg_dump','-U','postgres','-Fc','freshrss'))
 run('tar','-C','/opt/utilibre/data','-czf',str(snapshot/'freshrss-data.tar.gz'),'freshrss')
 (snapshot/'SHA256SUMS').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n' for p in sorted(snapshot.iterdir()) if p.is_file()))
 subprocess.run(['sha256sum','-c','SHA256SUMS'],cwd=snapshot,check=True,stdout=subprocess.DEVNULL)
 cli(LIVE,'/var/www/FreshRSS/cli/delete-user.php','--user',username)
 created=False
 run('tar','-C',str(stage),'-xzf',str(snapshot/'freshrss-data.tar.gz'))
 docker('network','create','--internal',network)
 resources.append(('network',network))
 pg=name+'-db'
 docker('run','-d','--name',pg,'--network',network,'--network-alias','postgres','--memory','384m','--cpus','0.5','--pids-limit','96','--log-driver','none','--tmpfs','/var/lib/postgresql/data:rw,size=256m','-e','POSTGRES_HOST_AUTH_METHOD=trust',pgimage)
 resources.append(('container',pg))
 for _ in range(30):
  try:docker('exec',pg,'pg_isready','-U','postgres');break
  except subprocess.CalledProcessError:time.sleep(.5)
 docker('exec',pg,'psql','-U','postgres','-c','CREATE ROLE freshrss LOGIN;')
 docker('exec',pg,'createdb','-U','postgres','-O','freshrss','freshrss')
 docker('exec','-i',pg,'pg_restore','-U','postgres','--role=freshrss','--no-owner','-d','freshrss',input=(snapshot/'freshrss.dump').read_bytes())
 data=stage/'freshrss/data'
 # Rebind only the clone's hostname; preserve snapshot credentials and user state.
 config_code='''$p='/var/www/FreshRSS/data/config.php';
$c=require $p;
$c['base_url']='http://127.0.0.1:33291';
$c['db']['host']='postgres';
file_put_contents($p,"<?php\\nreturn ".var_export($c,true).';');'''
 docker('run','--rm','--network','none','--entrypoint','php','-v',str(data)+':/var/www/FreshRSS/data',image,'-r',config_code)
 docker('run','-d','--name',name,'--network',network,'--memory','512m','--cpus','0.5','--pids-limit','96','--log-driver','none','--security-opt','no-new-privileges:true',
  '-e','FRESHRSS_ENV=silent','-e','COPY_LOG_TO_SYSLOG=Off','-e','COPY_SYSLOG_TO_STDERR=Off','-e','CRON_MIN=',
  '-v',str(data)+':/var/www/FreshRSS/data','-v',str(stage/'freshrss/extensions')+':/var/www/FreshRSS/extensions',
  '-v',str(REPO/'deployment/pack/freshrss-start.sh')+':/privacy/freshrss-start.sh:ro','-v',str(REPO/'deployment/pack/freshrss-privacy.conf')+':/etc/apache2/utilibre-privacy.conf:ro',image,'/bin/sh','/privacy/freshrss-start.sh')
 resources.append(('container',name))
 ip=json.loads(docker('inspect',name))[0]['NetworkSettings']['Networks'][network]['IPAddress']
 bridge=subprocess.Popen(['socat','TCP4-LISTEN:33291,bind=127.0.0.1,reuseaddr,fork,max-children=16','TCP4:'+ip+':80'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,start_new_session=True)
 import urllib.request
 for _ in range(40):
  try:
   with urllib.request.urlopen('http://127.0.0.1:33291/i/',timeout=1) as response:
    if response.status==200:break
  except Exception:time.sleep(.5)
 run('node',str(REPO/'deployment/utilibre/tests/check-freshrss-restored-browser.mjs'),str(fixture_file),str(report/'restored.png'),str(report/'browser.json'))
 evidence={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'passed':True,'snapshot':str(snapshot),'elapsedSeconds':round(time.monotonic()-started,1),'checks':['native disposable account and fictional article','PostgreSQL custom dump and matching files','checksum verification','separate database and application with no Internet route','native restored browser login and article','live fixture deleted through native CLI'],'limitations':['one fictional account and article','no remote feed fetch','same VM rehearsal, not whole-host recovery']}
 (report/'result.json').write_text(json.dumps(evidence,indent=2)+'\n')
 print('PASS: FreshRSS restored login and article; evidence '+str(report/'result.json'))
finally:
 if created:
  cli(LIVE,'/var/www/FreshRSS/cli/delete-user.php','--user',username)
 if bridge:
  import signal
  os.killpg(bridge.pid,signal.SIGTERM)
 for kind,value in reversed(resources):
  docker('rm','-f',value) if kind=='container' else docker('network','rm',value)
 assert stage.parent==Path('/opt/utilibre') and stage.name.startswith('freshrss-restore-')
 shutil.rmtree(stage)
 if (report/'result.json').exists():fixture_file.unlink()
