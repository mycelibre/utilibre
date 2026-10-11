#!/usr/bin/env python3
"""Small locked leaf-only overlays; never change a live container."""
import argparse
from pathlib import Path
import json
import shutil
import subprocess
import tempfile
import time

ROOT=Path(__file__).resolve().parent
PINS={
 'kuma':('utilibre-kuma:2.5.6-security-20261011','sha256:3f54318380deeb275b2127133ec0fdd59de12ebe295c58bf3f99174b3f86f475','utilibre-kuma:2.5.6-leaves-security-20261011'),
 'actual':('utilibre-actual:proxyaddr-security-20261011','sha256:b664a7abda3fb06c807995b93013a6acedb59fbfe103e87ccf88da6919f737ca','utilibre-actual:leaves-security-20261011'),
 'actual-rollback':('utilibre-actual:proxyaddr-security-20261011','sha256:b664a7abda3fb06c807995b93013a6acedb59fbfe103e87ccf88da6919f737ca','utilibre-actual:privacy-rollback-20261011'),
}
parser=argparse.ArgumentParser(); parser.add_argument('app',choices=PINS); args=parser.parse_args()
base,expected,candidate=PINS[args.app]
assert subprocess.check_output(['docker','image','inspect','--format','{{.Id}}',base],text=True).strip()==expected
assert shutil.disk_usage('/').free>=8.3*1024**3, '8 GiB floor plus bounded build margin required'
report=Path(tempfile.mkdtemp(prefix=args.app+'-leaves-',dir='/opt/utilibre/reports'))
with (report/'build.log').open('w') as log:
 process=subprocess.Popen(['docker','build','--progress','plain','-f',str(ROOT/('Dockerfile.'+args.app)),'-t',candidate,str(ROOT)],stdout=log,stderr=subprocess.STDOUT)
 while process.poll() is None:
  if shutil.disk_usage('/').free<8*1024**3:
   process.terminate(); process.wait(timeout=30); raise RuntimeError('Disk floor reached; build stopped')
  time.sleep(1)
 assert process.returncode==0, str(report/'build.log')
image=subprocess.check_output(['docker','image','inspect','--format','{{.Id}}',candidate],text=True).strip()
record={'date':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'base':base,'baseImageId':expected,'candidate':candidate,'imageId':image,'productionChanged':False}
(report/'receipt.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({'report':str(report),**record}))
