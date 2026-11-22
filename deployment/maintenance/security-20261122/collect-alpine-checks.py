"""Bind completed native/consumer checks, without granting release approval."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import sys
os.umask(0o077)
HERE=Path(__file__).resolve().parent
ROOT=Path('/var/lib/utilibre-maintenance/security-20261122/alpine-crypto')
inputs=json.loads((HERE/'alpine-crypto-inputs.json').read_text())
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
for key in sys.argv[1:]:
 row=next(r for r in inputs['rows'] if r['key']==key);d=ROOT/key;b=json.loads((d/'build.json').read_text());assert b['passed']
 checks={}
 for name in ['crypto-native.json','native-tls.json','consumer.json','scope.json']:
  p=d/name;v=json.loads(p.read_text());assert v['passed'] and v['base']==b['base'] and v['imageId']==b['imageId'];checks[name]=sha(p)
 consumer=json.loads((d/'consumer.json').read_text());assert consumer['abiPreserved']
 assert consumer['profile']==row['consumerProfile']
 scope=json.loads((d/'scope.json').read_text());assert scope['allUnrelatedImageFilesUnchanged'] and scope['configurationUnchanged'] and scope['unrelatedApkRecordsUnchanged']
 proof={'date':datetime.datetime.now(datetime.timezone.utc).isoformat(),'passed':True,'base':b['base'],'imageId':b['imageId'],
  'fixtureSha256':sha(__file__),'checks':checks,'nativeConsumerProfile':row['consumerProfile'],'productionChanged':False,
  'network':'none or isolated fixture network; no production credentials, mounts or external providers',
  'limitation':'Library-only compatibility and retained synthetic workflow checks; not a new upstream app release or real-device test.'}
 p=d/'application.json';assert not p.exists();p.write_text(json.dumps(proof,indent=2)+'\n')
 print(key+': all required native evidence bound; no deployment approval')
