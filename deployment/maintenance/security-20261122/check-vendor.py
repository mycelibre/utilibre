"""Reuse retained offline native workflows for the finite PHP image batch."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from datetime import datetime, timezone

os.umask(0o077)
HERE=Path(__file__).resolve().parent
ROOT=Path('/var/lib/utilibre-maintenance/security-20261122/vendor')
NODE='/root/.nvm/versions/node/v24.22.3/bin/node'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
inputs=json.loads((HERE/'vendor-inputs.json').read_text())
for key in sys.argv[1:]:
    row=next(r for r in inputs['rows'] if r['key']==key)
    out=ROOT/key;build=json.loads((out/'build.json').read_text());assert build['passed']
    assert not (out/'application.json').exists()
    env=os.environ.copy()
    if key=='privatebin':
        original=HERE.parent.parent/'utilibre/tests/check-privatebin-uploads.mjs'
        env['PRIVATEBIN_TEST_IMAGE']=build['imageId'];args=[NODE,str(original)]
    elif key=='fourget':
        original=HERE.parent/'php-20261022/check-fourget.mjs'
        env['FOURGET_TEST_REPORT_DIR']=str(out);args=[NODE,str(original)]
    else:
        original=HERE.parent/('php-20261022/check-degoog.mjs' if key=='degoog' else 'php-20261022/check-native.mjs')
        code=original.read_text()
        code=code.replace("from './specs.mjs'", 'from '+json.dumps((original.parent/'specs.mjs').as_uri()))
        if key=='degoog':
            old="const dir=output+'/degoog',b=";assert code.count(old)==1
            code=code.replace(old,'const dir='+json.dumps(str(out))+',b=')
        else:
            old="const dir=(httpClient?";start=code.index(old);end=code.index(',b=JSON.parse',start)
            code=code[:start]+'const dir='+json.dumps(str(out))+code[end:]
        adapter=out/'application-adapter.mjs';adapter.write_text(code);args=[NODE,str(adapter),key]
    p=subprocess.run(args,env=env,capture_output=True,timeout=540)
    (out/'application-run.log').write_bytes(p.stdout+p.stderr)
    assert p.returncode==0, key+': private native diagnostic retained'
    if key=='privatebin':
        native=json.loads(p.stdout.decode().strip().splitlines()[-1])
    else:
        native=json.loads((out/'application.json').read_text())
        (out/'application.json').rename(out/'application-native.json')
    assert native['passed'] and native['imageId']==build['imageId']
    proof={'passed':True,'date':datetime.now(timezone.utc).isoformat(),'imageId':build['imageId'],
           'base':row['base'],'native':native,'checker':str(original),'checkerSha256':sha(original),
           'productionUserDataUsed':False,'limitations':'Synthetic local workflows; no external search or mail delivery tested.'}
    if key not in ('privatebin','fourget'):proof['adapterSha256']=sha(adapter)
    (out/'application.json').write_text(json.dumps(proof,indent=2)+'\n')
    print(key+': native isolated workflow passed',flush=True)
