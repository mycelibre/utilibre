"""Fresh native local account/session/heartbeat check. No production telemetry."""
import base64
import json
from pathlib import Path
import re
import secrets
import subprocess
import time
import sys
import os
import requests

IMAGE = 'utilibre-wakapi:2.18.1-healthcheck-security-20261011'
NAME = 'maintenance-wakapi-native'
BASE = 'http://127.0.0.1:33144'
OUT = Path('/var/lib/utilibre-maintenance/go-leaf-final-20261011/output/wakapi-native.json')
assert all(a in ['--oct28','--jose'] for a in sys.argv[1:])
if '--oct28' in sys.argv:
    IMAGE='utilibre-wakapi:go-security-20261028'
    OUT=Path('/var/lib/utilibre-maintenance/security-20261028/go-leaf/output/wakapi-native.json')
if '--jose' in sys.argv:
    IMAGE='utilibre-wakapi:jose-security-20261028'
    OUT=Path('/var/lib/utilibre-maintenance/security-20261028/jose-leaf/wakapi/output/wakapi-native.json')
def docker(*args):
    return subprocess.check_output(['docker',*args],text=True,stderr=subprocess.PIPE).strip()
env = {'WAKAPI_DB_TYPE':'sqlite3','WAKAPI_DB_NAME':'/tmp/fictional.db',
       'WAKAPI_LISTEN_IPV4':'0.0.0.0','WAKAPI_LISTEN_IPV6':'-','WAKAPI_PORT':'3000',
       'WAKAPI_ALLOW_SIGNUP':'true','WAKAPI_DISABLE_LOCAL_AUTH':'false',
       'WAKAPI_PASSWORD_SALT':secrets.token_hex(24),'WAKAPI_INSECURE_COOKIES':'true',
       'WAKAPI_LEADERBOARD_ENABLED':'false','WAKAPI_MAIL_ENABLED':'false',
       'WAKAPI_SENTRY_DSN':'','WAKAPI_SENTRY_TRACING':'false',
       'WAKAPI_IMPORT_ENABLED':'false'}
original_namespace=os.open('/proc/self/ns/net',os.O_RDONLY)
try:
    args=['run','-d','--name',NAME,'--network','none','--read-only','--cap-drop','ALL',
          '--security-opt','no-new-privileges','--log-driver','none',
          '--memory','256m','--cpus','1','--tmpfs','/tmp:rw,size=96m,mode=1777',
          '--pids-limit','128']
    for k,v in env.items():
        args+=['-e',k+'='+v]
    docker(*args,IMAGE)
    pid=docker('inspect','--format','{{.State.Pid}}',NAME)
    with open('/proc/'+pid+'/ns/net') as namespace: os.setns(namespace.fileno(),os.CLONE_NEWNET)
    BASE='http://127.0.0.1:3000'
    for _ in range(100):
        try:
            if requests.get(BASE+'/api/health',timeout=1).status_code==200:
                break
        except requests.RequestException:
            pass
        time.sleep(.3)
    else:
        raise AssertionError('Native Wakapi startup failed')
    session=requests.Session()
    password=secrets.token_urlsafe(30)
    # Email is optional. Leave it empty so this fixture needs no DNS/MX lookup.
    response=session.post(BASE+'/signup',data={'username':'fictional','email':'',
                 'password':password,'password_repeat':password},allow_redirects=False,timeout=10)
    assert response.status_code==302,('signup',response.status_code)
    response=session.post(BASE+'/login',data={'username':'fictional','password':password},allow_redirects=False,timeout=10)
    assert response.status_code==302,('login',response.status_code)
    assert session.get(BASE+'/summary',timeout=10).status_code==200
    settings=session.get(BASE+'/settings',timeout=10)
    assert settings.status_code==200
    keys=re.findall(r'name="api_key_value" value="([^"]+)"',settings.text)
    if not keys:
        response=session.post(BASE+'/settings',data={'action':'add_api_key','api_name':'Fictional check','api_readonly':'false'},timeout=10)
        assert response.status_code==200
        keys=re.findall(r'name="api_key_value" value="([^"]+)"',session.get(BASE+'/settings',timeout=10).text)
    assert keys,'Native API key absent'
    # Native WakaTime compatibility format: base64(API key), without ':'.
    token=base64.b64encode(keys[0].encode()).decode()
    body={'entity':'fictional.py','type':'file','category':'coding','project':'Fictional regression',
          'language':'Python','time':time.time(),'is_write':True}
    response=requests.post(BASE+'/api/heartbeat',json=body,headers={'Authorization':'Basic '+token},timeout=10)
    assert response.status_code in [200,201,202],('heartbeat',response.status_code)
    assert requests.post(BASE+'/api/heartbeat',json=body,timeout=10).status_code==401
    docker('exec',NAME,'/app/healthcheck')
    assert session.post(BASE+'/logout',allow_redirects=False,timeout=10).status_code==302
    assert session.get(BASE+'/settings',allow_redirects=False,timeout=10).status_code in [302,303]
    report={'imageId':docker('image','inspect',IMAGE,'--format','{{.Id}}'),'passed':True,
            'freshSqliteMigrations':True,'nativeAccountLoginLogout':True,
            'authenticatedHeartbeatAndAnonymousDenial':True,'nativeHealthcheck':True,
            'productionOidc':'unchanged, not exercised by this isolated local-account test'}
    OUT.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report))
finally:
    os.setns(original_namespace,os.CLONE_NEWNET);os.close(original_namespace)
    try:
        docker('rm','-f',NAME)
    except subprocess.CalledProcessError:
        pass
