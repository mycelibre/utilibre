"""Use the portal's existing environment-pin release and rollback procedure."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
os.umask(0o077)
HERE=Path(__file__).resolve().parent
ROOT=Path('/var/lib/utilibre-maintenance/security-20261122/alpine-crypto/public-utility-portal')
assert sys.argv[1:]==['--apply']
inputs=json.loads((HERE/'alpine-crypto-inputs.json').read_text());row=next(r for r in inputs['rows'] if r['key']=='public-utility-portal')
assert row['releaseApproval']=='approved'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
for name,digest in row['reviewedEvidence'].items():assert sha(ROOT/name)==digest
assert sha(ROOT/'portal-native.json')==row['portalNativeSha256']
b=json.loads((ROOT/'build.json').read_text());native=json.loads((ROOT/'portal-native.json').read_text())
assert native['passed'] and native['base']==row['base'] and native['imageId']==b['imageId']
app=json.loads((ROOT/'application.json').read_text())
for name,digest in app['checks'].items():assert sha(ROOT/name)==digest
original=HERE.parent/'security-20261115/release-portal.mjs';code=original.read_text()
def replace(old,new):
 global code
 assert code.count(old)==1,(old,code.count(old))
 code=code.replace(old,new)
replace("const root='/var/lib/utilibre-maintenance/search-20261115';",'const root='+json.dumps(str(ROOT))+';')
replace("const pin=JSON.parse(readFileSync(new URL('./portal-inputs.json',import.meta.url)));",'const inputs=JSON.parse(readFileSync('+json.dumps(str(HERE/'alpine-crypto-inputs.json'))+'));\nconst row=inputs.rows.find(r=>r.key==="public-utility-portal"),build=JSON.parse(readFileSync(root+"/build.json"));\nconst pin={...row,approved:row.releaseApproval==="approved",imageId:build.imageId,evidence:row.reviewedEvidence};')
replace("const gate=JSON.parse(readFileSync(root+'/portal-scan-gate.json'));","const gate=JSON.parse(readFileSync(root+'/scan-gate.json'));")
replace("assert(gate.passed&&gate.base===pin.base&&gate.candidate===pin.imageId);assert.deepEqual(gate.retainedFindings,[]);","assert(gate.passed&&gate.base===pin.base&&gate.imageId===pin.imageId);assert.deepEqual(gate.newFindings,[]);assert.equal(gate.targetedAfter,0);assert.equal(gate.databaseSha256,inputs.database.databaseSha256);assert(Date.now()-Date.parse(gate.advisoryUpdatedAt)<48*3600000);")
replace("assert.equal(JSON.parse(readFileSync(root+'/portal-staging.json')).passed,true);\nassert(readFileSync(root+'/final-e2e.log','utf8').includes('10 passed'));","assert.equal(JSON.parse(readFileSync(root+'/portal-native.json')).passed,true);")
# Bounded four own-origin read-only checks from the existing release. No form
# submission, search request, index submission or third-party requests.
for relative in ('../security-20261103/release-lock.mjs','../language-final/release.mjs'):
 replace("from '"+relative+"'",'from '+json.dumps((original.parent/relative).resolve().as_uri()))
adapter=ROOT/'release-portal-adapter.mjs'
if adapter.exists():assert adapter.read_text()==code
else:adapter.write_text(code)
(ROOT/'portal-release-adapter.json').write_text(json.dumps({'originalSha256':sha(original),'adapterSha256':sha(adapter),'changes':['exact crypto candidate evidence','existing portal environment-pin release; native route parity replaces content-change tests']},indent=2)+'\n')
subprocess.run(['/root/.nvm/versions/node/v24.22.3/bin/node',str(adapter),'--apply'],check=True,timeout=600)
