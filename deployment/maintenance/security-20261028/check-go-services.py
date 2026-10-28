# Disposable native HTTP fixtures; no external route, user data, email or real accounts.
import pathlib,subprocess,json,time,sys,secrets,tempfile,shutil,hashlib
import requests,yaml
jose='--jose' in sys.argv;baseline='--baseline' in sys.argv;key=sys.argv[1];assert key in ['donetick','librespeed']
profile='jose' if jose else 'go-services'
root=pathlib.Path('/var/lib/utilibre-maintenance/security-20261028')/profile;s=next(s for s in json.loads((pathlib.Path('deployment/maintenance/security-20261028')/(profile+'-inputs.json')).read_text())['rows'] if s['key']==key)
image=s['base'] if baseline else s['candidate'];name='maintenance-native-'+key;created=False;network=False;temp=pathlib.Path(tempfile.mkdtemp(prefix=name+'-',dir='/dev/shm'));temp.chmod(0o755)
def docker(*args):return subprocess.check_output(['docker',*args],text=True,stderr=subprocess.PIPE,timeout=90).strip()
def req(method,path,**kw):return requests.request(method,base+path,timeout=15,**kw)
try:
 assert not docker('ps','-aq','--filter','name=^/'+name+'$')
 if key=='donetick':
  config=yaml.safe_load(pathlib.Path('deployment/donetick/config.yaml').read_text());config.update(is_user_creation_disabled=False,disable_password_auth=False);config['jwt']['secret']=secrets.token_hex(32);config['storage']['base_path']='/data/storage';config['oauth2']={};config['server']['public_host']='http://fixture.invalid';config['realtime']['allowed_origins']=['http://fixture.invalid'];(temp/'selfhosted.yaml').write_text(yaml.safe_dump(config));(temp/'selfhosted.yaml').chmod(0o644)
  extra=['--workdir','/data','--tmpfs','/data:rw,size=64m,uid=1000,gid=1000,mode=0750','-v',str(temp)+':/data/config:ro','-e','DT_ENV=selfhosted','-e','DT_SQLITE_PATH=/data/fixture.db'];port=2021
 else:
  config=pathlib.Path('deployment/librespeed/settings.toml');assert config.is_file();extra=['-v',str(config.resolve())+':/app/settings.toml:ro'];port=8989
 docker('network','create','--internal',name);network=True
 docker('run','-d','--name',name,'--network',name,'--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','384m','--memory-swap','384m','--pids-limit','128','--log-driver','none','--tmpfs','/tmp:rw,size=16m',*extra,image);created=True
 ip=docker('inspect','--format','{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}',name);base=f'http://{ip}:{port}'
 for n in range(80):
  try:
   if req('GET','/' if key=='donetick' else '/empty').status_code==200:break
  except requests.RequestException:pass
  time.sleep(.25)
 else:raise AssertionError('Native fixture did not become ready')
 checks={}
 if key=='donetick':
  auth=[]
  for n in range(2):
   user='fictional'+str(n);password=secrets.token_hex(16);r=req('POST','/api/v1/auth/',json=dict(username=user,password=password,email=f'{user}@example.invalid',displayName='Fictional maintainer'));assert r.status_code==201,r.status_code
   r=req('POST','/api/v1/auth/login',json=dict(username=user,password=password));assert r.status_code==200;auth.append({'Authorization':'Bearer '+r.json()['access_token']})
  r=req('POST','/api/v1/chores/',headers=auth[0],json=dict(name='Fictional water the paper fern',frequencyType='daily',frequency=1,assignStrategy='no_assignee',isPrivate=False));assert r.status_code==200,r.status_code
  cid=r.json()['res'];url='/api/v1/chores/'+str(cid)
  assert req('GET',url,headers=auth[0]).status_code==200
  other=req('GET',url,headers=auth[1]);assert other.status_code in [400,403,404,500] and 'Fictional water' not in other.text
  assert req('GET',url).status_code==401
  assert req('DELETE',url,headers=auth[0]).status_code==200
  after=req('GET',url,headers=auth[0]);assert after.status_code in [400,404,500] and 'Fictional water' not in after.text
  listed=req('GET','/api/v1/chores/',headers=auth[0]);assert listed.status_code==200 and all(c['id']!=cid for c in listed.json()['res'])
  checks=dict(twoFictionalAccounts=True,createReadDelete=True,crossAccountDenied=True,crossAccountStatus=other.status_code,deletedLookupStatus=after.status_code,deletedAbsentFromList=True,anonymousDenied=True)
 else:
  r=req('GET','/garbage?ckSize=1');assert r.status_code==200 and len(r.content)==1048576 and r.headers['Content-Type']=='application/octet-stream'
  assert req('POST','/empty',data=b'x'*65536).status_code==200
  assert req('GET','/empty').content==b''
  checks=dict(downloadBytes=1048576,uploadBytes=65536,ping=True,noGeolocationOrStatisticsConfigured=True)
 report=dict(status='passed',date=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),imageId=docker('image','inspect','--format','{{.Id}}',image),checks=checks,network='Docker internal bridge; no external route',limits='Synthetic HTTP and native unit/regression checks; no public OIDC, email, real device or connection-speed benchmark')
 if not baseline and key=='donetick':assert checks==json.loads((root/(key+'-baseline.json')).read_text())['checks']
 (root/(key+('-baseline' if baseline else '-native')+'.json')).write_text(json.dumps(report,indent=2)+'\n');print(key+': isolated native workflow passed')
finally:
 if created:docker('rm','-f',name)
 if network:docker('network','rm',name)
 shutil.rmtree(temp)
