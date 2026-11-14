"""Same-snapshot candidate comparison using the existing offline Trivy stack.

No advisory refresh, queue mutation, network checks or deployment. Raw results
stay private; package scope and scanner coverage must both pass.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from datetime import datetime, timezone
from assessment_policy import identity as finding_identity, git_assessment

os.umask(0o077)
HERE=Path(__file__).resolve().parent
ROOT=Path('/var/lib/utilibre-maintenance/security-20261114')
I=json.loads((HERE/'inputs.json').read_text())
python_mode=sys.argv[1:2]==['--python'];headers_mode=sys.argv[1:2]==['--headers'];git_mode=sys.argv[1:2]==['--git']
if python_mode or headers_mode or git_mode:sys.argv.pop(1)
P=json.loads((HERE/('python-inputs.json' if python_mode else 'git-inputs.json' if git_mode else 'headers-inputs.json')).read_text()) if python_mode or headers_mode or git_mode else I
def sha(p):
    with Path(p).open('rb') as f: return hashlib.file_digest(f,'sha256').hexdigest()
DB=ROOT/'scan-cache/db/trivy.db'
assert sha(DB)==I['databaseSha256']
assert sha(ROOT/'before-security.json')==I['baselineScanSha256']
baseline=json.loads((ROOT/'before-security.json').read_text())
env={**os.environ,'TRIVY_DISABLE_TELEMETRY':'true','TRIVY_SKIP_VERSION_CHECK':'true','GOMAXPROCS':'1','GOMEMLIMIT':'1GiB'}
for key in sys.argv[1:]:
    s=next(r for r in P['rows'] if r['key']==key)
    out=ROOT/('git/'+key if git_mode else 'headers/vendor-debian/'+key if headers_mode else 'python/'+key if python_mode else 'vendor-debian/'+key if s['kind']=='debian' else key)
    b=json.loads((out/'build.json').read_text()); assert b['passed'] and b['base']==s['base']
    assert not (out/'scan-gate.json').exists(), 'Preserve completed scan'
    before=next(r for r in baseline['images'] if r['id']==s.get('assessmentOriginalBase',s['base']));assert before['status']=='checked'
    args=['unshare','--net','--','/opt/utilibre/maintenance/bin/trivy','image','--config','/dev/null','--ignorefile','/dev/null',
          '--skip-check-update','--skip-version-check','--skip-vex-repo-update','--disable-telemetry',
          '--cache-dir',str(ROOT/'scan-cache'),'--cache-backend','memory','--scanners','vuln','--offline-scan',
          '--skip-db-update','--skip-java-db-update','--parallel','1','--timeout','5m','--no-progress','--list-all-pkgs',
          '--image-src','docker','--format','json','--output',str(out/'after-scan.json'),b['imageId']]
    result=subprocess.run(args,capture_output=True,timeout=330,env=env)
    (out/'scanner.log').write_bytes(result.stdout+result.stderr);assert result.returncode==0
    scan=json.loads((out/'after-scan.json').read_text());assert scan['Metadata']['ImageID']==b['imageId']
    kind='python-pkg' if python_mode else s['kind']
    if not python_mode:assert scan['Metadata']['OS']['Family']==s['kind']
    results=[r for r in scan['Results'] if r['Type']==kind];assert results and all(r.get('Packages') for r in results)
    if not python_mode:assert len(results)==1
    packages={p['Name']: (str(p['Epoch'])+':' if p.get('Epoch') else '')+p['Version']+('-'+p['Release'] if p.get('Release') else '') for r in results for p in r['Packages']}
    for name,p in s['packages'].items():assert packages[name]==(P['wheels'][name]['version'] if python_mode else P['packages'][p['package']]['version'])
    def identity(r):return finding_identity(r,'git' if git_mode else 'headers' if headers_mode else 'python' if python_mode else 'native')
    def normalize(r):return {**r,'target':r['type'] if r['type'] in ('debian','alpine','ubuntu') else r['target']}
    def findings(raw):return [normalize({'id':v['VulnerabilityID'],'package':v['PkgName'],'installed':v['InstalledVersion'],'severity':v['Severity'],
         'type':r['Type'],'target':r['Target']}) for r in raw['Results'] for v in r.get('Vulnerabilities',[])]
    old=findings(json.loads(Path(s['baselineRawScan']).read_text())) if s.get('baselineRawScan') else [normalize(r) for r in before['findings']]
    new=findings(scan)
    selected=lambda rows:[r for r in rows if r['package'] in s['packages'] and r['type']==kind and (not headers_mode or r['id'] in s['targetAdvisories']) and r['severity'] in ('HIGH','CRITICAL')]
    if git_mode:
        git_assessment(selected(old),selected(new),packages['git'])
    else:
        assert selected(old) and not selected(new), 'Targeted high/critical findings remain'
    known={identity(r) for r in old}
    added=[r for r in new if r['severity'] in ('HIGH','CRITICAL') and identity(r) not in known]
    if added:(out/'new-findings.json').write_text(json.dumps(added,indent=2)+'\n')
    assert not added, 'New high/critical findings; private new-findings.json retained'
    assert sha(DB)==I['databaseSha256']
    proof={'date':datetime.now(timezone.utc).isoformat(),'passed':True,'base':s['base'],'imageId':b['imageId'],
        'databaseSha256':I['databaseSha256'],'advisoryUpdatedAt':json.loads((DB.parent/'metadata.json').read_text())['UpdatedAt'],
        'baselineScanSha256':I['baselineScanSha256'],'rawScanSha256':sha(out/'after-scan.json'),
        'targetedBefore':len(selected(old)),'targetedAfter':len(selected(new)),
        'exactGitMaintenanceRelease':git_mode,'rawBackportFindingsRetained':git_mode,'newHighCritical':added,
        'remaining':{severity:sum(r['severity']==severity for r in new) for severity in ('CRITICAL','HIGH')},
        'network':'disabled with unshare','scannerSha256':sha('/opt/utilibre/maintenance/bin/trivy'),
        'scope':'Candidate-only assessment; unrelated records remain visible. Application behavior gated separately.'}
    (out/'scan-gate.json').write_text(json.dumps(proof,indent=2)+'\n')
    print(key+(': exact Git maintenance release assessed; '+str(len(selected(new)))+' raw version-based records retained for evidence-backed review' if git_mode else ': removed '+str(len(selected(old)))+' targeted high/critical records')+'; no new high/critical findings',flush=True)
