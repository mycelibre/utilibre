#!/usr/bin/env python3
"""Installer-only layers: native imports/CLI and actual Squid configs, isolated."""
import json
from pathlib import Path
import subprocess
import tempfile
import time

root=Path(__file__).resolve().parent
report=Path(tempfile.mkdtemp(prefix='language-runtime-',dir='/opt/utilibre/reports'))
rows=[]
def docker(*args):
    return subprocess.check_output(['docker',*args],text=True,stderr=subprocess.PIPE,timeout=45)
imports="""import importlib, importlib.util, json, ssl, sqlite3
names=['gunicorn','uvicorn','flask','django','requests','aiohttp','httpx','urllib3','msgpack','cryptography','sqlalchemy','radicale']
present=[n for n in names if importlib.util.find_spec(n)]
for name in present: importlib.import_module(name)
assert importlib.util.find_spec('pip') is None
assert sqlite3.connect(':memory:').execute('select 2+3').fetchone()==(5,)
assert ssl.create_default_context()
print(json.dumps({'imports':present,'sqlite':True,'tlsContext':True,'pipAbsent':True}))
"""
for spec in json.loads((root/'python-images.json').read_text()):
    bounded=['run','--rm','--network','none','--read-only','--cpus','1','--memory','384m','--pids-limit','64','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges:true','--tmpfs','/tmp:rw,size=16m,mode=1777']
    image_id=docker('image','inspect','--format','{{.Id}}',spec['candidate']).strip()
    result=json.loads(docker(*bounded,'--entrypoint','python',spec['candidate'],'-B','-c',imports))
    if spec['key']=='public-egress':
        configs=[]
        for name in spec['containers']:
            x=json.loads(docker('inspect',name))[0]
            source=next(m['Source'] for m in x['Mounts'] if m['Destination']=='/etc/squid/squid.conf')
            docker(*bounded,'-v',source+':/etc/squid/squid.conf:ro','--entrypoint','/opt/squid/sbin/squid',spec['candidate'],'-k','parse','-f','/etc/squid/squid.conf')
            configs.append(source)
        result['nativeSquidConfigurations']=configs
    rows.append({'key':spec['key'],'image':spec['candidate'],'imageId':image_id,'status':'passed',**result})
    print(spec['key']+': native imports/CLI passed',flush=True)
(report/'result.json').write_text(json.dumps({'status':'passed','date':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'network':'none','productionChanged':False,'rows':rows,'limitation':'Installer-only regression checks, not full application workflows. Whole-rootfs equivalence is independently required; Authentik and LiberaForms native account/form checks are separate.'},indent=2)+'\n')
print(str(report/'result.json'))
