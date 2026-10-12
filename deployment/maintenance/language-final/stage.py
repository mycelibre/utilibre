#!/usr/bin/env python3
"""Finite image-only candidates. No production volumes or container recreation."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('family', choices=['python','npm'])
parser.add_argument('key', help='One key from the checked-in exact image manifest')
parser.add_argument('--manifest', help='Alternate checked-in manifest basename in this directory')
args = parser.parse_args()
manifest=args.manifest or args.family+'-images.json'
assert Path(manifest).name==manifest and manifest.endswith('.json')
spec = next(x for x in json.loads((ROOT/manifest).read_text()) if x['key']==args.key)
image = json.loads(subprocess.check_output(['docker','image','inspect',spec['base']],text=True))[0]
assert image['Id']==spec['baseId'], 'Base tag drift: review the new image first'
if args.family=='npm':
    assert subprocess.check_output(['docker','image','inspect','--format','{{.Id}}','utilibre-actual:leaves-security-20261011'],text=True).strip()=='sha256:6859a1cb16fef5f0abc06c4dd4828160dda1157b01c39b6a0751efd7fdfb7a61'
assert shutil.disk_usage('/').free >= 8.3*1024**3
report = Path(tempfile.mkdtemp(prefix='language-'+args.key+'-',dir='/opt/utilibre/reports'))
with (report/'build.log').open('w') as log:
    process = subprocess.Popen(['docker','build','--network','none','--pull=false','--progress','plain',
        '-f',str(ROOT/('Dockerfile.'+args.family)), '--build-arg','BASE='+spec['base'],
        '--build-arg','APPLICATION='+spec['key'],'--build-arg','RUNTIME_USER='+spec['user'],
        '--build-arg','MANIFEST='+manifest,
        '-t',spec['candidate'],str(ROOT)], stdout=log,stderr=subprocess.STDOUT)
    while process.poll() is None:
        if shutil.disk_usage('/').free<8*1024**3:
            process.terminate();process.wait(timeout=30);raise RuntimeError('8 GiB disk floor reached')
        time.sleep(.5)
    assert process.returncode==0,str(report/'build.log')
after=json.loads(subprocess.check_output(['docker','image','inspect',spec['candidate']],text=True))[0]
for field in ['Env','Entrypoint','Cmd','WorkingDir','ExposedPorts','Volumes','Healthcheck']:
    assert image['Config'].get(field)==after['Config'].get(field), field
assert (image['Config'].get('User') or 'root')==after['Config']['User']
receipt={'status':'built-not-verified','key':spec['key'],'baseId':spec['baseId'],'image':spec['candidate'],'imageId':after['Id'],'time':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'productionChanged':False}
(report/'build.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'report':str(report),**receipt}))
