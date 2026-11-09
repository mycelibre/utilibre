"""Candidate-only comparison with the retained 18:08 scan and frozen local DB.

No whole-install scan, advisory download, queue update, or production action.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from datetime import datetime, timezone

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261109/zlib')
INPUTS = json.loads((HERE / 'zlib-inputs.json').read_text())
DB = Path('/var/cache/utilibre-security/db/trivy.db')
EXPECTED_DB = '3f021611ab6c0b94ca9f4fb630fb583c200663e8cae430446f89ded1b99fdb29'

def sha(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def identity(row):
    return tuple(row[k] for k in ('id', 'package', 'installed', 'severity', 'type', 'target'))

assert sys.argv[1:] and len(sys.argv[1:]) == len(set(sys.argv[1:]))
assert sha(ROOT / 'baseline-scan.json') == INPUTS['baselineScanSha256']
baseline = json.loads((ROOT / 'baseline-scan.json').read_text())
metadata = json.loads((DB.parent / 'metadata.json').read_text())
assert metadata['UpdatedAt'] == baseline['database']['updatedAt']
assert metadata['DownloadedAt'] == baseline['database']['downloadedAt']
assert sha(DB) == EXPECTED_DB
env = {**os.environ, 'TRIVY_DISABLE_TELEMETRY': 'true', 'TRIVY_SKIP_VERSION_CHECK': 'true',
       'GOMAXPROCS': '1', 'GOMEMLIMIT': '1GiB'}
for key in sys.argv[1:]:
    spec = next(row for row in INPUTS['rows'] if row['key'] == key)
    out = ROOT / key
    build = json.loads((out / 'build.json').read_text())
    consumer = json.loads((out / 'consumer.json').read_text())
    assert build['passed'] and consumer['passed'] and consumer['imageId'] == build['imageId']
    assert consumer['base'] == build['base'] == spec['base']
    assert not (out / 'scan-gate.json').exists(), 'Preserve completed proof'
    assert not (out / 'after-scan.json').exists(), 'Preserve raw prior scan'
    disk = os.statvfs('/')
    assert disk.f_bavail * disk.f_frsize >= INPUTS['minimumFreeBytes']
    if 'baselineRawScan' in spec:
        ref=spec['baselineRawScan'];assert ref['file']=='baseline-degoog.json' and key=='evaluation-degoog'
        assert ref['databaseSha256']==EXPECTED_DB and sha(ROOT/ref['file'])==ref['sha256']
        raw=json.loads((ROOT/ref['file']).read_text());assert raw['Metadata']['ImageID']==spec['base']
        before={'status':'checked','findings':[{'id':v['VulnerabilityID'],'package':v['PkgName'],'installed':v['InstalledVersion'],'severity':v['Severity'],'type':result['Type'],'target':result['Target']} for result in raw['Results'] for v in result.get('Vulnerabilities',[])]}
    else:
        before = next(row for row in baseline['images'] if row['id'] == spec['base'])
    assert before['status'] == 'checked'
    image = build['imageId']
    args = ['unshare', '--net', '--', '/opt/utilibre/maintenance/bin/trivy', 'image', '--config', '/dev/null', '--ignorefile', '/dev/null', '--skip-check-update', '--skip-version-check', '--skip-vex-repo-update', '--disable-telemetry',
            '--cache-dir', '/var/cache/utilibre-security', '--cache-backend', 'memory',
            '--scanners', 'vuln', '--offline-scan', '--skip-db-update', '--skip-java-db-update',
            '--parallel', '1', '--timeout', '5m', '--no-progress', '--list-all-pkgs',
            '--image-src', 'docker', '--format', 'json', '--output', str(out / 'after-scan.json'), image]
    process = subprocess.run(args, env=env, capture_output=True, timeout=330)
    (out / 'scanner.log').write_bytes(process.stdout + process.stderr)
    assert process.returncode == 0, 'Raw scanner failure retained'
    scan = json.loads((out / 'after-scan.json').read_text())
    assert scan['Metadata']['ImageID'] == image
    assert scan['Metadata']['OS']['Family'] == 'alpine'
    text = subprocess.check_output(['docker', 'run', '--rm', '--network', 'none', '--read-only',
        '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--memory', '128m',
        '--cpus', '1', '--log-driver', 'none', '--entrypoint', 'cat', image, '/lib/apk/db/installed']).decode()
    expected = []
    for record in text.split('\n\n'):
        fields = {line[0]: line[2:] for line in record.splitlines() if line.startswith(('P:', 'V:'))}
        if fields:
            expected.append(fields['P'] + '@' + fields['V'])
    actual = {p['ID'] for result in scan['Results'] if result['Type'] == 'alpine' for p in result.get('Packages', [])}
    assert expected and set(expected) == actual, 'Incomplete or unexpected native APK inventory'
    assert 'zlib@1.4-r0' in actual
    old = [{**finding, 'target': 'alpine' if finding['type'] == 'alpine' else finding['target']} for finding in before['findings']]
    new = [{'id': v['VulnerabilityID'], 'package': v['PkgName'], 'installed': v['InstalledVersion'],
            'severity': v['Severity'], 'type': result['Type'],
            'target': 'alpine' if result['Type'] == 'alpine' else result['Target']}
           for result in scan['Results'] for v in result.get('Vulnerabilities', [])]
    targets = lambda rows: [r for r in rows if r['package'] == 'zlib' and r['id'] in INPUTS['advisories']]
    assert targets(old) and not targets(new), 'Target finding absent in baseline or remains in candidate'
    known = {identity(row) for row in old}
    added = [row for row in new if row['severity'] in ('HIGH', 'CRITICAL') and identity(row) not in known]
    assert not added, 'New HIGH/CRITICAL records: ' + repr(added)
    assert sha(DB) == EXPECTED_DB
    proof = {'date': datetime.now(timezone.utc).isoformat(), 'passed': True, 'base': spec['base'],
             'imageId': image, 'databaseSha256': EXPECTED_DB, 'advisoryUpdatedAt': metadata['UpdatedAt'],
             'baselineScanDate': baseline['completedAt'] if 'baselineRawScan' not in spec else None, 'baselineScanSha256': spec.get('baselineRawScan', {}).get('sha256', INPUTS['baselineScanSha256']),
             'rawCandidateScanSha256': sha(out / 'after-scan.json'), 'nativeApkInventoryComplete': True,
             'targetedFindingRemoved': True, 'baselineTargets': targets(old), 'newHighCritical': 0,
             'remainingHigh': len([r for r in new if r['severity'] == 'HIGH']),
             'remainingCritical': len([r for r in new if r['severity'] == 'CRITICAL']),
             'consumerSha256': sha(out / 'consumer.json'), 'fixtureSha256': sha(__file__),
             'scope': 'Candidate only; unchanged frozen DB, native APK completeness and existing scan baseline. Other findings remain open; queue untouched.'}
    (out / 'scan-gate.json').write_text(json.dumps(proof, indent=2) + '\n')
    print(key + ': zlib HIGH removed; no new HIGH/CRITICAL findings', flush=True)
