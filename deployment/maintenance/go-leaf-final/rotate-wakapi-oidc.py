"""One-client incident rotation. Secrets never enter argv, reports or stdout.

Changes only Wakapi's confidential OIDC secret and recreates the exact current
Wakapi image. Password salt and all account/document data remain untouched.
"""
import copy
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import sys
import time
from urllib.parse import urlparse,parse_qs
import requests

os.umask(0o077)
REPO=Path('/home/ubuntu/freetools')
CWD=REPO/'deployment/expanded'
FILES=[CWD/'.env',CWD/'.env.wakapi-config.yml',Path('/opt/utilibre/identity-data/data/private/oidc-clients.json')]
IMAGE='sha256:de076a730673305c40e51c5930c4a05ce1187ba2b19df9cf207afa5129f804e7'
CONTAINER='utilibre-expanded-wakapi-1'
IDENTITY='utilibre-identity-server-1'
TOKEN='https://auth.utilibre.org/application/o/token/'
CALLBACK='https://wakapi.utilibre.org/oidc/utilibre/callback'
ROOT=Path('/var/lib/utilibre-maintenance/wakapi-oidc-rotation-'+time.strftime('%Y%m%dT%H%M%SZ',time.gmtime()))
ROOT.mkdir(mode=0o700)
SESSION=requests.Session()
SESSION.trust_env=False
COMPOSE=['docker','compose','--project-directory',str(CWD),'-p','utilibre-expanded','-f',str(CWD/'compose.yaml')]
report={'client':'wakapi','imageId':IMAGE,'status':'preflight','passwordSaltUnchanged':False}
before={}
mutated=False

def run(args,input=None,timeout=60):
    try:
        result=subprocess.run(args,input=input,text=True,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,
                              timeout=timeout,env={**os.environ,'APP_BIND_IP':'10.10.1.43'})
    except Exception:
        raise RuntimeError('Bounded private operation failed') from None
    if result.returncode:
        raise RuntimeError('Bounded private operation failed')
    return result.stdout.strip()

def atomic(path,content):
    stat=path.stat()
    temporary=path.with_name(path.name+'.rotation-'+secrets.token_hex(4))
    try:
        temporary.write_bytes(content)
        os.chmod(temporary,stat.st_mode&0o777)
        os.chown(temporary,stat.st_uid,stat.st_gid)
        os.replace(temporary,path)
    finally:
        if temporary.exists():
            temporary.unlink()

def save():
    (ROOT/'receipt.json').write_text(json.dumps(report,indent=2)+'\n')

def config():
    return json.loads(run(COMPOSE+['config','--format','json']))['services']['wakapi']

def state():
    # Deliberately avoid broad inspect, even when subprocess operations fail.
    return run(['docker','inspect',CONTAINER,'--format',
                '{{.Image}}|{{.State.Running}}|{{.RestartCount}}|{{if .State.Health}}{{.State.Health.Status}}{{end}}']).split('|')

def recreate():
    run(COMPOSE+['up','-d','--force-recreate','--no-deps','--no-build','--pull','never','wakapi'],timeout=180)
    for _ in range(150):
        current=state()
        if current[:3]==[IMAGE,'true','0'] and current[3] in ['','healthy']:
            run(['docker','exec',CONTAINER,'/app/healthcheck'])
            return
        time.sleep(1)
    raise RuntimeError('Exact Wakapi readiness failed')

def token_error(client_id,secret):
    response=SESSION.post(TOKEN,auth=(client_id,secret),data={
        'grant_type':'authorization_code','code':'utilibre-rotation-invalid-'+secrets.token_hex(20),
        'redirect_uri':CALLBACK},timeout=20,allow_redirects=False)
    return response.status_code,response.json().get('error')

def identity_change(expected,replacement,client_id):
    # Data travels through stdin only. The model's single changed field is
    # asserted transactionally; provider IDs, scopes and policies stay intact.
    payload=json.dumps({'expected':expected,'replacement':replacement,'client_id':client_id})
    code='''import json
from django.db import transaction
from django.forms.models import model_to_dict
from authentik.providers.oauth2.models import OAuth2Provider
from authentik.core.models import Application
from authentik.policies.models import PolicyBinding
data=json.loads(PAYLOAD)
with transaction.atomic():
    provider=OAuth2Provider.objects.select_for_update().get(client_id=data['client_id'])
    assert provider.name=='Utilibre wakapi'
    assert provider.client_secret==data['expected']
    def stable():
        values=model_to_dict(provider)
        values.pop('client_secret',None)
        values['mappings']=sorted(map(str,provider.property_mappings.values_list('pk',flat=True)))
        app=Application.objects.get(slug='wakapi',provider=provider)
        values['application']=model_to_dict(app)
        values['policies']=list(PolicyBinding.objects.filter(target=app).order_by('pk').values())
        return json.dumps(values,sort_keys=True,default=str)
    before=stable()
    provider.client_secret=data['replacement']
    provider.save(update_fields=['client_secret'])
    provider.refresh_from_db()
    assert provider.client_secret==data['replacement'] and stable()==before
print('UTILIBRE_SINGLE_SECRET_ROTATED')
'''.replace('PAYLOAD',repr(payload))
    output=run(['docker','exec','-i',IDENTITY,'ak','shell','-c','import sys; exec(sys.stdin.read())'],input=code,timeout=120)
    assert output.endswith('UTILIBRE_SINGLE_SECRET_ROTATED')

def public_gate(client_id):
    assert SESSION.get('https://wakapi.utilibre.org/api/health',timeout=20).status_code==200
    response=SESSION.get('https://wakapi.utilibre.org/oidc/utilibre/login',timeout=20,allow_redirects=False)
    assert response.status_code in [302,303,307]
    target=urlparse(response.headers['Location'])
    query=parse_qs(target.query)
    assert target.scheme=='https' and target.hostname=='auth.utilibre.org'
    assert query.get('client_id')==[client_id] and query.get('redirect_uri')==[CALLBACK]

try:
    assert state()[:3]==[IMAGE,'true','0']
    for number,path in enumerate(FILES):
        before[path]=path.read_bytes()
        # Private exact recovery copies, never source-controlled.
        shutil.copy2(path,ROOT/('private-'+str(number)))
        os.chmod(ROOT/('private-'+str(number)),0o600)
    clients=json.loads(before[FILES[2]])
    client_id=clients['wakapi']['client_id']
    old=clients['wakapi']['client_secret']
    assert client_id=='utilibre-wakapi' and len(old)>=32
    env=before[FILES[0]].decode()
    line=re.search(r'^WAKAPI_OIDC_CLIENT_SECRET=(.*)$',env,re.M)
    assert line and line.group(1).strip('\"\'')==old
    native=before[FILES[1]].decode()
    native_line=re.search(r'^  oidc: (.+)$',native,re.M)
    assert native_line
    providers=json.loads(native_line.group(1))
    assert len(providers)==1 and providers[0]['client_id']==client_id and providers[0]['client_secret']==old
    original_config=config()
    assert original_config['environment']['WAKAPI_OIDC_PROVIDERS_0_CLIENT_SECRET']==old
    salt=original_config['environment']['WAKAPI_PASSWORD_SALT']
    assert original_config['environment']['WAKAPI_DISABLE_LOCAL_AUTH']=='true'
    assert token_error(client_id,old)==(400,'invalid_grant')
    public_gate(client_id)
    new=secrets.token_urlsafe(64)
    clients['wakapi']['client_secret']=new
    providers[0]['client_secret']=new
    new_env=env[:line.start(1)]+new+env[line.end(1):]
    new_native=native[:native_line.start(1)]+json.dumps(providers)+native[native_line.end(1):]
    identity_change(old,new,client_id)
    mutated=True
    atomic(FILES[2],(json.dumps(clients)+'\n').encode())
    atomic(FILES[0],new_env.encode())
    atomic(FILES[1],new_native.encode())
    expected=copy.deepcopy(original_config)
    expected['environment']['WAKAPI_OIDC_PROVIDERS_0_CLIENT_SECRET']=new
    assert config()==expected
    assert expected['environment']['WAKAPI_PASSWORD_SALT']==salt
    recreate()
    assert token_error(client_id,new)==(400,'invalid_grant')
    assert token_error(client_id,old)[1]=='invalid_client'
    public_gate(client_id)
    report.update(status='passed',newSecretAccepted=True,oldSecretRejected=True,
                  onlyProviderSecretChanged=True,onlyWakapiRecreated=True,nativeHealth=True,
                  publicHealthAndLoginRedirect=True,passwordSaltUnchanged=True,
                  appImageUnchanged=True,completedAt=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()))
    save()
    print(json.dumps(report))
except Exception:
    report['status']='failed'
    if mutated:
        try:
            identity_change(new,old,client_id)
            for path,content in before.items():
                atomic(path,content)
            assert config()==original_config
            recreate()
            assert token_error(client_id,old)==(400,'invalid_grant')
            public_gate(client_id)
            report['rollbackVerified']=True
        except Exception:
            report['rollbackVerified']=False
    save()
    print(json.dumps(report))
    sys.exit(1)
