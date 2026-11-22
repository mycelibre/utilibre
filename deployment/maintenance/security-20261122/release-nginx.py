"""Finite adapter to the existing exact-image Compose and rollback procedure.

check/verify do not deploy. apply requires successful native, complete-file and
all-severity scan receipts. No automatic exception or candidate approval.
"""
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import subprocess
import sys

os.umask(0o077)
HERE=Path(__file__).resolve().parent
ROOT=Path('/var/lib/utilibre-maintenance/security-20261122')
REPO=HERE.parents[2]
inputs=json.loads((HERE/'nginx-inputs.json').read_text())
assert len(sys.argv)==3 and sys.argv[1] in ('check','apply','verify')
assert sys.argv[2] in [r['key'] for r in inputs['rows']]
selected=next(r for r in inputs['rows'] if r['key']==sys.argv[2])
if sys.argv[1] in ('apply','verify'):
    assert selected.get('releaseApproval')=='approved', 'Exact candidate approval required'
    assert selected.get('reviewedEvidence')
    for filename,digest in selected['reviewedEvidence'].items():
        assert filename in ('build.json','scope.json','application.json','scan-gate.json','after-scan.json')
        assert hashlib.sha256((ROOT/'nginx'/selected['key']/filename).read_bytes()).hexdigest()==digest
original=HERE.parent/'security-20261114/release-libraries.mjs'
code=original.read_text()


def replace(old,new):
    global code
    assert code.count(old)==1, 'Existing release adapter changed: '+old[:80]
    code=code.replace(old,new)


replace("const repo=fileURLToPath(new URL('../../../',import.meta.url)),root='/var/lib/utilibre-maintenance/security-20261114';",
        'const repo='+json.dumps(str(REPO)+'/')+',root='+json.dumps(str(ROOT/'nginx'))+';')
replace("read(new URL('./inputs.json',import.meta.url))", "read("+json.dumps(str(HERE/'nginx-inputs.json'))+")")
replace("const pythonMode=process.argv[2]==='--python',headerMode=process.argv[2]==='--headers',gitMode=process.argv[2]==='--git';if(pythonMode||headerMode||gitMode)process.argv.splice(2,1);",
        'const pythonMode=false,headerMode=false,gitMode=false;')
replace("assert((pythonMode||headerMode||gitMode?selection.rows.map(r=>r.key):['linkding-linkding','turn-option-turn','identity-worker','kitchenowl-app','pack-forms-app','services-privatebin','pollaris-pollaris','community-pairdrop']).includes(key));",
        'assert(selection.rows.map(r=>r.key).includes(key));')
replace('scan.newHighCritical.length===0','scan.newFindings.length===0')
replace('inputs.databaseSha256','inputs.database.databaseSha256')
replace("if(pythonMode&&['utilibre-trip','utilibre-13ft','utilibre-unfurl'].includes(project))", "if(['utilibre-trip','utilibre-13ft','utilibre-unfurl'].includes(project))")
replace("assert(['proxy','gateway'].includes(service));", "assert(['app','proxy','gateway'].includes(service));")
replace("  const selected=new Set(g.rows.map(r=>r.name));", """  // The retained newsletters supervisor recreates SMTP even for a gateway
  // release. Track that unchanged companion, including its firewall gate.
  if(project==='utilibre-newsletters'){
   const x=all.find(x=>x.Name==='/utilibre-newsletters-smtp-1');assert(x);
   const service='smtp',ref=original.services[service].image;assert.equal(inspect(ref).Id,x.Image);
   live.push(x);g.rows.push({name:x.Name.slice(1),service,oldRef:ref,newRef:ref,oldImage:x.Image,newImage:x.Image,oldContainerId:x.Id,oldRestartCount:x.RestartCount});
  }
  const selected=new Set(g.rows.map(r=>r.name));""")
for relative in ('../security-20261103/release-lock.mjs','../security-20261109/relay-idle.mjs','../language-final/release.mjs'):
    replace("from '"+relative+"'", "from '"+(original.parent/relative).resolve().as_uri()+"'")
adapter=ROOT/'release-nginx-adapter-v3.mjs'
if adapter.exists():assert adapter.read_text()==code
else:adapter.write_text(code)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
(ROOT/'release-adapter.json').write_text(json.dumps({'originalSha256':sha(original),'adapterSha256':sha(adapter),
    'changes':['finite November 22 paths/manifest','all-severity comparison','preserve existing supervisor companions'],
    'mechanism':'Retained scoped Compose, configuration equality, native health and rollback gates'},indent=2)+'\n')
environment=os.environ.copy()
if selected['key'].startswith('toolbox-'):
    live=json.loads(subprocess.check_output(['docker','inspect',selected['containers'][0]],timeout=15))[0]
    addresses={v['HostIp'] for bindings in live['HostConfig']['PortBindings'].values() for v in bindings or []
               if not ipaddress.ip_address(v['HostIp']).is_loopback}
    assert len(addresses)==1
    address=next(iter(addresses));assert ipaddress.ip_address(address).is_private
    if environment.get('APP_BIND_IP'):assert environment['APP_BIND_IP']==address
    environment['APP_BIND_IP']=address
subprocess.run(['/root/.nvm/versions/node/v24.22.3/bin/node',str(adapter),*sys.argv[1:]],check=True,env=environment)
