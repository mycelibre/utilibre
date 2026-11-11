"""Synthetic native upgrade/recovery fixture. Internal network; no real identities."""
import os,json,secrets,subprocess,time,threading,base64,hashlib,sqlite3,shutil,ipaddress,ssl
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlparse,parse_qs,urlencode
import requests,urllib3
from cryptography.hazmat.primitives.asymmetric import rsa,padding
from cryptography.hazmat.primitives import hashes
urllib3.disable_warnings();os.umask(0o077)
ROOT=Path('/var/lib/utilibre-maintenance/held-upgrades-20261111/kitchenowl');OUT=ROOT/'browser-native';OUT.mkdir()
GW='utilibre-vendor-calendar-calino:20261111'
net='maintenance-kitchenowl-'+secrets.token_hex(4);containers=[]
def run(*args,**kw):
 try:return subprocess.check_output(args,stderr=subprocess.PIPE,text=True,timeout=120,**kw).strip()
 except subprocess.CalledProcessError as e:
  (OUT/'command-error.log').write_text(e.stderr or '');raise
def docker(*a):return run('docker',*a)
def b64(b):return base64.urlsafe_b64encode(b).decode().rstrip('=')
def number(n):return b64(n.to_bytes((n.bit_length()+7)//8,'big'))
key=rsa.generate_private_key(public_exponent=65537,key_size=2048);pub=key.public_key().public_numbers();codes={};current_user='fictional_oidc_a'
class Provider(BaseHTTPRequestHandler):
 def log_message(self,*a):pass
 def reply(self,data,status=200,location=None):
  raw=json.dumps(data).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(raw)))
  if location:self.send_header('Location',location)
  self.end_headers();self.wfile.write(raw)
 def do_GET(self):
  u=urlparse(self.path);q=parse_qs(u.query)
  if u.path=='/.well-known/openid-configuration':self.reply({'issuer':issuer,'authorization_endpoint':issuer+'/authorize','token_endpoint':issuer+'/token','jwks_uri':issuer+'/jwks','response_types_supported':['code'],'subject_types_supported':['public'],'id_token_signing_alg_values_supported':['RS256'],'token_endpoint_auth_methods_supported':['client_secret_post'],'code_challenge_methods_supported':['S256']})
  elif u.path=='/jwks':self.reply({'keys':[{'kty':'RSA','kid':'synthetic','use':'sig','alg':'RS256','n':number(pub.n),'e':number(pub.e)}]})
  elif u.path=='/authorize':
   code=secrets.token_urlsafe(24);codes[code]=(q,current_user);self.reply({},302,q['redirect_uri'][0]+'?'+urlencode({'code':code,'state':q['state'][0]}))
  else:self.reply({},404)
 def do_POST(self):
  assert self.path=='/token';q=parse_qs(self.rfile.read(int(self.headers['Content-Length'])).decode());params,user=codes.pop(q['code'][0]);assert q['client_secret'][0]=='synthetic-client-secret'
  now=int(time.time());claims={'iss':issuer,'sub':user,'aud':'synthetic-client','iat':now,'exp':now+300,'nonce':params['nonce'][0],'preferred_username':user,'email':user+'@example.invalid','name':user}
  body=b64(json.dumps({'alg':'RS256','kid':'synthetic'}).encode())+'.'+b64(json.dumps(claims).encode());sig=key.sign(body.encode(),padding.PKCS1v15(),hashes.SHA256());self.reply({'access_token':'synthetic-unused-token','token_type':'Bearer','expires_in':300,'id_token':body+'.'+b64(sig)})

try:

 docker('network','create','--internal',net);network=json.loads(docker('network','inspect',net))[0]['IPAM']['Config'][0];sub=ipaddress.ip_network(network['Subnet']);appip=str(sub.network_address+10);gwip=str(sub.network_address+11);base='https://'+gwip+':8443'
 tls=OUT/'tls';tls.mkdir();run('openssl','req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=synthetic.invalid','-addext','subjectAltName=IP:'+network['Gateway']+',IP:'+gwip,'-keyout',str(tls/'key.pem'),'-out',str(tls/'cert.pem'));(tls/'cert.pem').chmod(0o644)
 server=ThreadingHTTPServer((network['Gateway'],0),Provider);issuer='https://'+network['Gateway']+':'+str(server.server_port);context=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);context.load_cert_chain(tls/'cert.pem',tls/'key.pem');server.socket=context.wrap_socket(server.socket,server_side=True);threading.Thread(target=server.serve_forever,daemon=True).start()
 image=docker('image','inspect','--format','{{.Id}}','utilibre-kitchenowl:0.8.1-startup-fixed')
 assert image=='sha256:c8fc1a7e79c48e8f5644bfb5e2df37e5a81a77cc92f3212d869013d9e1868960'
 env={'FRONT_URL':base,'OIDC_ISSUER':issuer,'OIDC_CLIENT_ID':'synthetic-client','OIDC_CLIENT_SECRET':'synthetic-client-secret','REQUESTS_CA_BUNDLE':'/fixture-ca.pem','DISABLE_USERNAME_PASSWORD_LOGIN':'true','DISABLE_ONBOARDING':'true','OPEN_REGISTRATION':'false','COLLECT_METRICS':'false','KITCHENOWL_MCP_ENABLED':'false','DEBUG':'false','LITELLM_LOCAL_MODEL_COST_MAP':'true','LITELLM_TELEMETRY':'false','LLM_MODEL':'','LLM_API_URL':'','STORAGE_PATH':'/data','JWT_SECRET_KEY':secrets.token_hex(40),'PYTHONDONTWRITEBYTECODE':'1','SKIP_UPGRADE_DEFAULT_ITEMS':'true'}
 f=OUT/'fixture.env';f.write_text('\n'.join(k+'='+v for k,v in env.items())+'\n')
 cid=docker('run','-d','--network',net,'--ip',appip,'--read-only','--user','1000:1000','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','768m','--memory-swap','768m','--cpus','1.5','--pids-limit','128','--log-driver','json-file','--log-opt','max-size=256k','--log-opt','max-file=1','--tmpfs','/tmp:rw,size=64m,mode=1777','--tmpfs','/data:rw,size=64m,uid=1000,gid=1000','--env-file',str(f),'-v',str(tls/'cert.pem')+':/fixture-ca.pem:ro',image,'--ini','wsgi.ini:web','--gevent','100','--max-fd','4096','--disable-logging');containers.append(cid)
 (OUT/'nginx.conf').write_text('pid /tmp/nginx.pid; error_log /dev/null; events {} http { access_log off; client_body_temp_path /tmp/client; proxy_temp_path /tmp/proxy; fastcgi_temp_path /tmp/fastcgi; uwsgi_temp_path /tmp/uwsgi; scgi_temp_path /tmp/scgi; server { listen 8443 ssl; ssl_certificate /fixture-ca.pem; ssl_certificate_key /fixture-key.pem; location / { proxy_pass http://'+appip+':8080; proxy_set_header Host '+gwip+':8443; proxy_set_header X-Forwarded-Proto https; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection upgrade; } } }')
 # Mirror the production browser restrictions with only the synthetic issuer substituted.
 csp="default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' wss://"+gwip+":8443; font-src 'self'; worker-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' "+issuer
 conf=(OUT/'nginx.conf').read_text();assert conf.count('server { listen 8443 ssl;')==1
 conf=conf.replace('server { listen 8443 ssl;', 'server { listen 8443 ssl; add_header Referrer-Policy no-referrer always; add_header X-Content-Type-Options nosniff always; add_header Content-Security-Policy "'+csp+'" always;')
 (OUT/'nginx.conf').write_text(conf);(OUT/'nginx.conf').chmod(0o644);(tls/'key.pem').chmod(0o644)
 gateway=docker('run','-d','--network',net,'--ip',gwip,'--read-only','--user','101:101','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','96m','--cpus','.5','--pids-limit','64','--log-driver','json-file','--log-opt','max-size=128k','--tmpfs','/tmp:rw,size=32m,mode=1777','-v',str(OUT/'nginx.conf')+':/etc/nginx/nginx.conf:ro','-v',str(tls/'cert.pem')+':/fixture-ca.pem:ro','-v',str(tls/'key.pem')+':/fixture-key.pem:ro','--entrypoint','nginx',GW,'-g','daemon off;');containers.append(gateway)
 started=time.monotonic()
 for _ in range(360):
  assert time.monotonic()-started<180, "Fixture startup exceeded three minutes"
  for service in containers:assert json.loads(docker('inspect',service))[0]['State']['Running'], 'Fixture service stopped'
  try:
   response=requests.get(base,verify=False,timeout=3);(OUT/'startup-last.json').write_text(json.dumps({'status':response.status_code,'body':response.text[:300]}))
   if response.status_code==200:break
  except requests.RequestException as error:(OUT/'startup-error.txt').write_text(type(error).__name__)
  time.sleep(.5)
 else:raise AssertionError('Native startup failed')
 (OUT/'browser-inputs.json').write_text(json.dumps({'base':base,'issuer':issuer,'imageId':image}))
 response=requests.get(base+'/api/auth/oidc',verify=False,timeout=10);(OUT/'oidc-diagnostic.json').write_text(json.dumps({'status':response.status_code,'body':response.text}));assert response.status_code==200, 'OIDC initiation status '+str(response.status_code)
 auth=requests.get(response.json()['login_url'],allow_redirects=False,verify=False,timeout=10);params=parse_qs(urlparse(auth.headers['Location']).query);result=requests.post(base+'/api/auth/callback',json={k:params[k][0] for k in ('code','state')},verify=False,timeout=10);(OUT/'native-callback.json').write_text(result.text);assert result.status_code==200,'Native callback status '+str(result.status_code)
 result=run('node',str(Path(__file__).with_name('check-kitchenowl-browser.mjs')));print(result)
finally:
 if 'server' in globals():server.shutdown()
 for cid in reversed(containers):
  try:
   logs=subprocess.run(['docker','logs',cid],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=10);(OUT/(cid[:12]+'-server-private.log')).write_text(logs.stdout)
  except Exception:pass
  try:docker('rm','-f',cid)
  except Exception:pass
 try:docker('network','rm',net)
 except Exception:pass
