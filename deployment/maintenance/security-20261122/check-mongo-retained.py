"""Complete the retained Mongo patch check with OCSP/BSON and native boundary tests."""
import datetime
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tarfile
os.umask(0o077)
HERE=Path(__file__).resolve().parent
ROOT=Path('/var/lib/utilibre-maintenance/security-20261122')
spec=importlib.util.spec_from_file_location('retained',HERE/'check-successor-patches.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
source=ROOT/'successor-sources';old=json.loads((source/'retained-mongo-patch-comparison.json').read_text());assert old['passed']
inputs=json.loads((HERE/'successor-runtime-inputs.json').read_text());assert sha(source/'retained-mongo-patch-comparison.json')==inputs['retainedSourceProofSha256']
bson=json.loads((HERE.parent/'security-20261028/bson-inputs.json').read_text())
proofs=[]
archive=source/'mongo-c-driver_1.30.4-1+deb13u5.debian.tar.xz'
auth=json.loads((source/'acquired.json').read_text());pins={f['file']:f['sha256'] for s in auth['sources'] for f in s['files']};assert sha(archive)==pins[archive.name]
with tarfile.open(archive) as t:
 for path,key,name in [(HERE.parent/'security-20261028/bson-reserve.patch','patchSha256','0021_CVE-2026-106437.patch'),(Path('/var/lib/utilibre-maintenance/security-20261028/bson/input/source/debian/patches/utilibre-CVE-2026-84964.patch'),'priorPatchSha256','0012_CVE-2026-84964.patch')]:
  data=path.read_bytes();assert sha(path)==bson[key];vendor=t.extractfile('debian/patches/'+name).read()
  assert m.hunks(data)==m.hunks(vendor)
  proofs.append({'vendorPatch':name,'retainedSha256':sha(path),'vendorSha256':hashlib.sha256(vendor).hexdigest(),'allOrderedHunksIdentical':True})
fixture=Path('/var/lib/utilibre-maintenance/security-20261028/bson/output/bson-native')
prior=json.loads(Path('/var/lib/utilibre-maintenance/security-20261028/bson/native.json').read_text());assert prior['status']=='passed' and sha(fixture)==prior['fixtureSha256']
row=inputs['rows'][0];out=ROOT/'successors/vendor-debian'/row['key'];b=json.loads((out/'build.json').read_text());checks=[]
for image in [row['base'],b['imageId']]:
 p=subprocess.run(['docker','run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','128m','--cpus','.5','--pids-limit','32','--log-driver','none','--ulimit','core=0','--user','65534:65534','-v',str(fixture)+':/native:ro','--entrypoint','/native',image,'after'],capture_output=True,timeout=60,check=True)
 result=json.loads(p.stdout);assert result=={'passed':True,'normalChecks':10,'boundaryCases':5,'undersizedRejected':True};checks.append({'imageId':image,**result})
file=out/'retained-mongo.json';assert not file.exists();file.write_text(json.dumps({'passed':True,'date':datetime.datetime.now(datetime.timezone.utc).isoformat(),'base':row['base'],'imageId':b['imageId'],
 'earlierFourFixesProofSha256':sha(source/'retained-mongo-patch-comparison.json'),'additionalFixes':proofs,
 'bsonNativeSha256':sha(fixture),'native':checks,'network':'none','productionChanged':False,
 'limitation':'Exact retained patch hunks/results and native boundary/ordinary behavior; no new live OCSP provider check.'},indent=2)+'\n')
print('All six retained source fixes preserved; BSON normal/boundary checks pass on old and vendor runtime')
