"""Synthetic native upgrade/recovery fixture. Internal network; no real identities."""
import os,json,secrets,subprocess,time,threading,base64,hashlib,sqlite3,shutil,ipaddress,ssl
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlparse,parse_qs,urlencode
import requests,urllib3
from cryptography.hazmat.primitives.asymmetric import rsa,padding
from cryptography.hazmat.primitives import hashes
urllib3.disable_warnings();os.umask(0o077)
ROOT=Path('/var/lib/utilibre-maintenance/held-upgrades-20261111/bytestash');OUT=ROOT/'native';OUT.mkdir()
OLD='sha256:94d81d16e0eff04fefd3696398222b39cc629c11f574d616f629cd6da72852b3'
NEW='sha256:3e7ee6694aab40d09766f19929f389ddba7583ff80d1bff12d8aeb1ce0a3a01e'
GW='utilibre-vendor-calendar-calino:20261111'
net='maintenance-bytestash-'+secrets.token_hex(4);containers=[]
def run(*args,**kw):
 try:return subprocess.check_output(args,stderr=subprocess.PIPE,text=True,timeout=120,**kw).strip()
 except subprocess.CalledProcessError as e:
  (OUT/'command-error.log').write_text(e.stderr or '');raise
def docker(*a):return run('docker',*a)
def b64(b):return base64.urlsafe_b64encode(b).decode().rstrip('=')
def number(n):return b64(n.to_bytes((n.bit_length()+7)//8,'big'))
key=rsa.generate_private_key(public_exponent=65537,key_size=2048);pub=key.public_key().public_numbers();codes={};current_user='fixture-a'
class Provider(BaseHTTPRequestHandler):
 def log_message(self,*a):pass
 def reply(self,data,status=200,location=None):
  raw=json.dumps(data).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(raw)))
  if location:self.send_header('Location',location)
  self.end_headers();self.wfile.write(raw)
 def do_GET(self):
  u=urlparse(self.path);q=parse_qs(u.query)
  if u.path=='/.well-known/openid-configuration':self.reply({'issuer':issuer,'authorization_endpoint':issuer+'/authorize','token_endpoint':issuer+'/token','jwks_uri':issuer+'/jwks','response_types_supported':['code'],'subject_types_supported':['public'],'id_token_signing_alg_values_supported':['RS256'],'token_endpoint_auth_methods_supported':['client_secret_basic'],'code_challenge_methods_supported':['S256']})
  elif u.path=='/jwks':self.reply({'keys':[{'kty':'RSA','kid':'synthetic','use':'sig','alg':'RS256','n':number(pub.n),'e':number(pub.e)}]})
  elif u.path=='/authorize':
   code=secrets.token_urlsafe(24);codes[code]=(q,current_user);self.reply({},302,q['redirect_uri'][0]+'?'+urlencode({'code':code,'state':q['state'][0]}))
  else:self.reply({},404)
 def do_POST(self):
  assert self.path=='/token';q=parse_qs(self.rfile.read(int(self.headers['Content-Length'])).decode());params,user=codes.pop(q['code'][0]);assert b64(hashlib.sha256(q['code_verifier'][0].encode()).digest())==params['code_challenge'][0]
  now=int(time.time());claims={'iss':issuer,'sub':user,'aud':'synthetic-client','iat':now,'exp':now+300,'nonce':params['nonce'][0],'preferred_username':user,'email':user+'@example.invalid','name':user}
  body=b64(json.dumps({'alg':'RS256','kid':'synthetic'}).encode())+'.'+b64(json.dumps(claims).encode());sig=key.sign(body.encode(),padding.PKCS1v15(),hashes.SHA256());self.reply({'access_token':'synthetic-unused-token','token_type':'Bearer','expires_in':300,'id_token':body+'.'+b64(sig)})
def stop(cid):docker('rm','-f',cid);containers.remove(cid)
def start(image,data):
 data.mkdir(exist_ok=True);os.chown(data,1000,1000)
 for p in data.rglob('*'):os.chown(p,1000,1000)
 env={'NODE_EXTRA_CA_CERTS':'/fixture-ca.pem','DEBUG':'false','JWT_SECRET':secrets.token_hex(40),'TOKEN_EXPIRY':'8h','ALLOW_NEW_ACCOUNTS':'true','DISABLE_ACCOUNTS':'false','DISABLE_INTERNAL_ACCOUNTS':'true','ALLOW_PASSWORD_CHANGES':'false','ADMIN_USERNAMES':'fixture-operator','OIDC_ENABLED':'true','OIDC_ISSUER_URL':issuer,'OIDC_CLIENT_ID':'synthetic-client','OIDC_CLIENT_SECRET':'synthetic-client-secret','OIDC_SCOPES':'openid email profile','PUBLIC_URL':base}
 f=OUT/'fixture.env';f.write_text('\n'.join(k+'='+v for k,v in env.items())+'\n')
 cid=docker('run','-d','--network',net,'--ip',appip,'--network-alias','bytestash','--read-only','--user','1000:1000','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','512m','--memory-swap','512m','--cpus','1','--pids-limit','128','--log-driver','none','--tmpfs','/tmp:rw,size=32m','--env-file',str(f),'-v',str(tls/'cert.pem')+':/fixture-ca.pem:ro','-v',str(data)+':/data/snippets',image);containers.append(cid)
 for _ in range(60):
  try:
   if requests.get('http://'+appip+':5000/api/auth/config',timeout=3).status_code==200:return cid
  except requests.RequestException:pass
  time.sleep(.5)
 raise AssertionError('Native app startup failed')
def login(user,new=False):
 global current_user
 current_user=user;s=requests.Session();s.verify=False
 r=s.get(base+'/api/auth/oidc/auth',allow_redirects=False,timeout=10);assert r.status_code==302
 auth=s.get(r.headers['Location'],allow_redirects=False,timeout=10);assert auth.status_code==302
 cb=s.get(auth.headers['Location'],allow_redirects=False,timeout=10);assert cb.status_code==302,(cb.status_code,cb.text[:100])
 location=cb.headers['Location']
 if new:
  assert location=='/auth/callback' and 'HttpOnly' in cb.headers.get('Set-Cookie','') and 'Secure' in cb.headers.get('Set-Cookie','')
 else:
  token=parse_qs(urlparse(location).fragment)['token'][0];s.headers['bytestashauth']='Bearer '+token
 assert s.get(base+'/api/auth/verify',timeout=10).json()['valid'];return s
def call(s,method,path,body=None,status=200):
 r=s.request(method,base+'/api'+path,json=body,timeout=10);assert r.status_code==status,(method,path,r.status_code);return r

def snapshot(db,dst):
 with sqlite3.connect('file:'+str(db)+'?mode=ro',uri=True) as a,sqlite3.connect(dst) as b:a.backup(b);assert b.execute('pragma integrity_check').fetchone()==('ok',)
try:
 docker('network','create','--internal',net);network=json.loads(docker('network','inspect',net))[0]['IPAM']['Config'][0];sub=ipaddress.ip_network(network['Subnet']);appip=str(sub.network_address+10);gwip=str(sub.network_address+11);base='https://'+gwip+':8443'
 
 tls=OUT/'tls';tls.mkdir();run('openssl','req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=synthetic.invalid','-addext','subjectAltName=IP:'+network['Gateway'],'-keyout',str(tls/'key.pem'),'-out',str(tls/'cert.pem'))
 server=ThreadingHTTPServer((network['Gateway'],0),Provider);issuer='https://'+network['Gateway']+':'+str(server.server_port);context=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);context.load_cert_chain(tls/'cert.pem',tls/'key.pem');server.socket=context.wrap_socket(server.socket,server_side=True);threading.Thread(target=server.serve_forever,daemon=True).start()
 config=Path('/home/ubuntu/freetools/deployment/community/bytestash/nginx.conf').read_text();config=config.replace('listen 8080;','listen 8443 ssl; ssl_certificate /fixture/cert.pem; ssl_certificate_key /fixture/key.pem;').replace('proxy_pass http://bytestash:5000;','proxy_pass http://'+appip+':5000;').replace('proxy_set_header Host snippets-library.utilibre.org;','proxy_set_header Host $http_host;').replace('proxy_set_header X-Forwarded-Host snippets-library.utilibre.org;','proxy_set_header X-Forwarded-Host $http_host;')
 (tls/'nginx.conf').write_text(config);os.chown(tls,101,101)
 for p in tls.iterdir():os.chown(p,101,101);p.chmod(0o600)
 (tls/'cert.pem').chmod(0o444)
 data=OUT/'data';app=start(OLD,data)
 gateway=docker('run','-d','--network',net,'--ip',gwip,'--user','101:101','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','64m','--cpus','.25','--pids-limit','64','--log-driver','none','--tmpfs','/tmp:rw,size=16m','-v',str(tls)+':/fixture:ro','-v',str(tls/'nginx.conf')+':/etc/nginx/nginx.conf:ro','--entrypoint','nginx',GW,'-g','daemon off;');containers.append(gateway);time.sleep(1)
 a=login('fixture-a');b=login('fixture-b');body={'title':'Fictional native snippet','description':'Synthetic code only','categories':['fixture'],'fragments':[{'file_name':'fictional.py','language':'python','code':'print("Fictional test")\n','position':0}],'is_public':False}
 item=call(a,'POST','/snippets',body,201).json();sid=item['id'];snapshot(data/'snippets.db',OUT/'before.sqlite');stop(app)
 app=start(NEW,data);a=login('fixture-a',True);b=login('fixture-b',True)
 restored=call(a,'GET','/snippets/'+str(sid)).json();assert restored['fragments'][0]['code']==body['fragments'][0]['code'];assert b.get(base+'/api/snippets/'+str(sid)).status_code in [403,404];assert requests.get(base+'/api/snippets/'+str(sid),verify=False).status_code==401
 body['title']='Fictional revised snippet';call(a,'PUT','/snippets/'+str(sid),body);call(a,'PATCH','/snippets/'+str(sid)+'/recycle');call(a,'PATCH','/snippets/'+str(sid)+'/restore')
 cookies=[{'name':c.name,'value':c.value,'domain':gwip,'path':c.path,'secure':c.secure,'httpOnly':True,'sameSite':'Lax'} for c in a.cookies]
 (OUT/'browser-input.json').write_text(json.dumps({'base':base,'network':net,'cookies':cookies,'expectedCode':body['fragments'][0]['code']}))
 # Browser execution is a separate existing-framework fixture; it imports/exports native JSON.
 run('node','/home/ubuntu/freetools/deployment/maintenance/releases-20261111/check-bytestash-upgrade-browser.mjs',str(OUT))
 snapshot(data/'snippets.db',OUT/'after.sqlite');stop(app)
 recovery=OUT/'restore';recovery.mkdir();shutil.copyfile(OUT/'after.sqlite',recovery/'snippets.db');app=start(NEW,recovery);a=login('fixture-a',True);assert call(a,'GET','/snippets/'+str(sid)).json()['title']=='Fictional revised snippet';stop(app)
 olddata=OUT/'rollback';olddata.mkdir();shutil.copyfile(OUT/'before.sqlite',olddata/'snippets.db');app=start(OLD,olddata);a=login('fixture-a');assert call(a,'GET','/snippets/'+str(sid)).json()['title']=='Fictional native snippet';stop(app)
 (OUT/'result.json').write_text(json.dumps({'passed':True,'oldImage':OLD,'imageId':NEW,'twoNativeOidcIdentities':True,'cookieOnlyCallback':True,'httpOnlySecureSession':True,'existingSnippetPreserved':True,'accountIsolation':True,'nativeEditRecycleRestore':True,'nativeJsonExportImport':True,'syntheticRestore':True,'oldBackupRollback':True,'externalNetwork':'none; internal synthetic OIDC provider','productionChanged':False,'limitation':'Local synthetic issuer and desktop Chromium; not a live Authentik or real phone test.'},indent=2)+'\n');print('ByteStash native OIDC, migration, isolation, export/import and restore passed')
finally:
 for cid in containers:subprocess.run(['docker','rm','-f',cid],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 if 'server' in globals():server.shutdown();server.server_close()
 subprocess.run(['docker','network','rm',net],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
