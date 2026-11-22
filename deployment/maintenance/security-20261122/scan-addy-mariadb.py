"""Compare Addy's exact candidate to its current image with one frozen Trivy DB."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
from collections import Counter

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
OUT = ROOT / 'addy-mariadb/addy-mariadb'
inputs = json.loads((HERE / 'addy-mariadb-inputs.json').read_text())
row = inputs['rows'][0]
build = json.loads((OUT / 'build.json').read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert build['passed'] and build['base'] == row['base']
assert sha(ROOT / 'scan-cache/db/trivy.db') == inputs['database']['databaseSha256']
assert sha('/opt/utilibre/maintenance/bin/trivy') == inputs['database']['scannerSha256']
before_file = ROOT / 'addy-nginx/addy/after-scan.json'
before = json.loads(before_file.read_text())
assert before['Metadata']['ImageID'] == build['base']
after_file = OUT / 'after-scan.json'
assert not (OUT / 'scan-gate.json').exists(), 'Preserve completed comparison'
if not after_file.exists():
    args = ['unshare', '--net', '--', '/opt/utilibre/maintenance/bin/trivy',
        'image', '--config', '/dev/null', '--ignorefile', '/dev/null',
        '--skip-check-update', '--skip-version-check', '--skip-vex-repo-update',
        '--disable-telemetry', '--cache-dir', str(ROOT / 'scan-cache'),
        '--cache-backend', 'memory', '--scanners', 'vuln', '--offline-scan',
        '--skip-db-update', '--skip-java-db-update', '--parallel', '1',
        '--timeout', '5m', '--no-progress', '--list-all-pkgs',
        '--image-src', 'docker', '--format', 'json', '--output', str(after_file),
        build['imageId']]
    with (OUT / 'scanner.log').open('wb') as log:
        result = subprocess.run(args, stdout=log, stderr=log, timeout=330,
            env={**os.environ, 'GOMAXPROCS': '1', 'GOMEMLIMIT': '1GiB',
                 'TRIVY_DISABLE_TELEMETRY': 'true'})
    assert result.returncode == 0, 'Scanner failed; private log retained'
after = json.loads(after_file.read_text())
assert after['Metadata']['ImageID'] == build['imageId']
assert before['Metadata']['OS']['Family'] == after['Metadata']['OS']['Family'] == 'alpine'


def findings(scan):
    return Counter((v['VulnerabilityID'], v['PkgName'], v['InstalledVersion'],
                    v['Severity'], r['Type'],
                    r['Type'] if r['Type'] in ('alpine', 'debian', 'ubuntu') else r['Target'])
                   for r in scan['Results'] for v in r.get('Vulnerabilities', []))


old, new = findings(before), findings(after)
target = set(row['packages'])
assert any(name in target for _, name, *_ in old)
assert not any(name in target for _, name, *_ in new), 'Targeted findings remain'
assert all(new[key] <= old[key] for key in new), 'New finding or changed count'
old_non_target = Counter({k: v for k, v in old.items() if k[1] not in target})
new_non_target = Counter({k: v for k, v in new.items() if k[1] not in target})
assert old_non_target == new_non_target, 'Unrelated finding changed'
osrows = [r for r in after['Results'] if r['Type'] == 'alpine']
assert len(osrows) == 1
versions = {p['Name']: p['Version'] + ('-' + p['Release'] if p.get('Release') else '')
            for p in osrows[0]['Packages']}
assert all(versions[name] == inputs['packages'][name]['version'] for name in target)
targeted_before = sum(v for k, v in old.items() if k[1] in target)
targeted_high_before = sum(v for k, v in old.items() if k[1] in target and k[3] == 'HIGH')
assert targeted_before > 9 and targeted_high_before == 9
result = {
    'passed': True, 'base': build['base'], 'imageId': build['imageId'],
    'targetedBefore': targeted_before, 'targetedHighBefore': targeted_high_before,
    'targetedAfter': 0, 'newFindings': [],
    'unrelatedFindingsUnchanged': True, 'rawBeforeSha256': sha(before_file),
    'rawScanSha256': sha(after_file), 'databaseSha256': inputs['database']['databaseSha256'],
    'scannerSha256': inputs['database']['scannerSha256'],
    'advisoryUpdatedAt': inputs['database']['metadata']['UpdatedAt'],
    'network': 'none'
}
(OUT / 'scan-gate.json').write_text(json.dumps(result, indent=2) + '\n')
print(f'Addy candidate: {targeted_before} target records removed, including 9 high; '
      'all unrelated findings unchanged')
