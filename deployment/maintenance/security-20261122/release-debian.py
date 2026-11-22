"""Exact vendor candidates through the retained scoped release/rollback gate.

Unresolved advisories remain in assessment and triage. This approval authorizes
only the individually reviewed vendor update, never a vulnerability exemption.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
REPO = HERE.parents[2]
inputs = json.loads((HERE / 'debian-inputs.json').read_text())
assert len(sys.argv) == 3 and sys.argv[1] in ('check', 'apply', 'verify')
selected = next(r for r in inputs['rows'] if r['key'] == sys.argv[2])
assert selected.get('releaseApproval') == 'approved'
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
out = ROOT / 'vendor-debian' / selected['key']
for filename, digest in selected['reviewedEvidence'].items():
    assert filename in ('build.json', 'scope.json', 'application.json', 'scan-gate.json', 'after-scan.json')
    assert sha(out / filename) == digest
scope = json.loads((out / 'scope.json').read_text())
assert scope['passed'] and scope['allUnrelatedImageFilesUnchanged'] and scope['configurationUnchanged']
assert scope['unrelatedDpkgRecordsUnchanged']
scan = json.loads((out / 'scan-gate.json').read_text())
assert scan['passed'] and not scan['newFindings']
retained = json.dumps(scan['remainingTargetedFindings'], separators=(',', ':'), ensure_ascii=False).encode()
assert hashlib.sha256(retained).hexdigest() == selected['retainedTargetedFindingsSha256']
inventory = ROOT / 'dpkg-image-inventory' / (selected['base'][7:] + '.json')
assert sha(inventory) == selected['completeInventorySha256']
original = HERE.parent / 'security-20261114/release-libraries.mjs'
code = original.read_text()


def replace(old, new):
    global code
    assert code.count(old) == 1, old
    code = code.replace(old, new)


replace("const repo=fileURLToPath(new URL('../../../',import.meta.url)),root='/var/lib/utilibre-maintenance/security-20261114';", 'const repo=' + json.dumps(str(REPO) + '/') + ',root=' + json.dumps(str(ROOT)) + ';')
replace("read(new URL('./inputs.json',import.meta.url))", 'read(' + json.dumps(str(HERE / 'debian-inputs.json')) + ')')
replace("const pythonMode=process.argv[2]==='--python',headerMode=process.argv[2]==='--headers',gitMode=process.argv[2]==='--git';if(pythonMode||headerMode||gitMode)process.argv.splice(2,1);", 'const pythonMode=false,headerMode=false,gitMode=false;')
replace("assert((pythonMode||headerMode||gitMode?selection.rows.map(r=>r.key):['linkding-linkding','turn-option-turn','identity-worker','kitchenowl-app','pack-forms-app','services-privatebin','pollaris-pollaris','community-pairdrop']).includes(key));", 'assert(selection.rows.map(r=>r.key).includes(key));')
replace('scan.newHighCritical.length===0', 'scan.newFindings.length===0')
replace('else assert.equal(scan.targetedAfter,0);', 'else assert.equal(hash(JSON.stringify(scan.remainingTargetedFindings)),spec.retainedTargetedFindingsSha256);')
replace('inputs.databaseSha256', 'inputs.database.databaseSha256')
replace("if(key!=='turn-option-turn')return;", "if(key!=='galene-turn-turn')return;")
replace("if(pythonMode&&['utilibre-trip','utilibre-13ft','utilibre-unfurl'].includes(project))", "if(['utilibre-trip','utilibre-13ft','utilibre-unfurl'].includes(project))")
replace("assert(['proxy','gateway'].includes(service));", "assert(['app','proxy','gateway'].includes(service));")
replace("const anchor='  turn:\\n    <<: *turn\\n';assert.equal(before.split(anchor).length,2);\n    changes.push({file,before,after:before.replace(anchor,anchor+'    image: '+spec.candidate+'\\n')});continue;", "const anchor='  turn:\\n    <<: *turn\\n    image: '+g.rows.find(r=>r.service==='turn').oldRef+'\\n';assert.equal(before.split(anchor).length,2);\n    changes.push({file,before,after:before.replace(anchor,'  turn:\\n    <<: *turn\\n    image: '+spec.candidate+'\\n')});continue;")
replace("const unlock=acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock');", """function boundary(g){
 const chain=g.project==='utilibre-wallabag'?'UTILIBRE-WALLABAG':g.project==='utilibre-records'?'UTILIBRE-RECORDS':null;
 if(!chain)return null;
 const rules=command('iptables',['-S',chain]);assert(rules.includes('-j DROP')&&rules.includes('--dport 3128'));
 command('iptables',['-C','DOCKER-USER','-j',chain]);
 if(g.project==='utilibre-wallabag')command('systemctl',['is-active','--quiet','utilibre-wallabag.service']);
 return hash(rules);
}
const unlock=acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock');""")
replace("await checkExistingGroup(previous.group,'new');", "await checkExistingGroup(previous.group,'new');assert.equal(boundary(previous.group),previous.group.boundarySha256);")
replace('  const original=config(g),refs=new Set();', '  g.boundarySha256=boundary(g);\n  const original=config(g),refs=new Set();')
replace('await checkExistingGroup(g,version);exactConfig(version);', 'await checkExistingGroup(g,version);assert.equal(boundary(g),g.boundarySha256);exactConfig(version);')
for relative in ('../security-20261103/release-lock.mjs', '../security-20261109/relay-idle.mjs', '../language-final/release.mjs'):
    replace("from '" + relative + "'", 'from ' + json.dumps((original.parent / relative).resolve().as_uri()))
adapter = ROOT / 'release-debian-adapter-v4.mjs'
if adapter.exists():
    assert adapter.read_text() == code
else:
    adapter.write_text(code)
(ROOT / 'release-debian-adapter.json').write_text(json.dumps({
    'originalSha256': sha(original), 'adapterSha256': sha(adapter),
    'changes': ['finite approved vendor candidates', 'all-severity comparison and exact retained findings', 'existing coupled supervisors and relay-idle safeguard'],
}, indent=2) + '\n')
subprocess.run(['/root/.nvm/versions/node/v24.22.3/bin/node', str(adapter), *sys.argv[1:]], check=True)
