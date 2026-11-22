"""Compare exact Penpot candidates with their current images using one frozen DB."""
import hashlib
import json
import os
from collections import Counter
from pathlib import Path
import subprocess
import sys

from assessment_helpers import package_version

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
INPUTS = json.loads((HERE / 'penpot-glibc-inputs.json').read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert len(sys.argv) == 2 and sys.argv[1] in ('frontend', 'exporter')
role = sys.argv[1]
row = next(r for r in INPUTS['rows'] if r['key'] == f'expanded-penpot-{role}-glibc')
out = ROOT / 'vendor-debian' / row['key']
build = json.loads((out / 'build.json').read_text())
assert build['passed'] and build['base'] == row['base']
assert json.loads((out / 'scope.json').read_text())['passed']
assert sha(ROOT / 'scan-cache/db/trivy.db') == INPUTS['database']['databaseSha256']
assert sha('/opt/utilibre/maintenance/bin/trivy') == INPUTS['database']['scannerSha256']
for filename, digest in INPUTS['database']['javaDatabase'].items():
    assert sha(ROOT / 'scan-cache/java-db' / filename) == digest
before_file = ROOT / 'dhi-successors/vendor-debian' / f'expanded-penpot-{role}' / 'after-scan.json'
before = json.loads(before_file.read_text())
assert before['Metadata']['ImageID'] == build['base']
after_file = out / 'after-scan.json'
gate_file = out / 'scan-gate.json'
assert not gate_file.exists(), 'Preserve completed assessment'
if not after_file.exists():
    args = ['unshare', '--net', '--', '/opt/utilibre/maintenance/bin/trivy', 'image',
            '--config', '/dev/null', '--ignorefile', '/dev/null',
            '--skip-check-update', '--skip-version-check', '--skip-vex-repo-update',
            '--disable-telemetry', '--cache-dir', str(ROOT / 'scan-cache'),
            '--cache-backend', 'memory', '--scanners', 'vuln', '--offline-scan',
            '--skip-db-update', '--skip-java-db-update', '--parallel', '1',
            '--timeout', '5m', '--no-progress', '--list-all-pkgs', '--image-src', 'docker',
            '--format', 'json', '--output', str(after_file), build['imageId']]
    with (out / 'scanner.log').open('wb') as log:
        result = subprocess.run(args, stdout=log, stderr=log, timeout=330,
            env={**os.environ, 'GOMAXPROCS': '1', 'GOMEMLIMIT': '1GiB',
                 'TRIVY_DISABLE_TELEMETRY': 'true'})
    assert result.returncode == 0, 'Scanner failed; private log retained'
after = json.loads(after_file.read_text())
assert after['Metadata']['ImageID'] == build['imageId']
assert before['Metadata']['OS']['Family'] == after['Metadata']['OS']['Family'] == 'debian'


def packages(scan):
    rows = [r for r in scan['Results'] if r['Type'] == 'debian']
    assert len(rows) == 1
    return {p['Name']: package_version(p) for p in rows[0]['Packages']}


old_packages, new_packages = packages(before), packages(after)
expected = dict(old_packages)
for name, package in row['packages'].items():
    assert old_packages[name] == package['installed']
    expected[name] = INPUTS['packages'][package['package']]['version']
assert new_packages == expected, 'Incomplete or unexpected scanner package inventory'
targets = set(row['packages'])


def findings(scan):
    return Counter((v['VulnerabilityID'], v['PkgName'], v['InstalledVersion'],
                    v['Severity'], r['Type'],
                    r['Type'] if r['Type'] in ('debian', 'alpine', 'ubuntu') else r['Target'])
                   for r in scan['Results'] for v in r.get('Vulnerabilities', []))


old, new = findings(before), findings(after)
old_unrelated = Counter({key: count for key, count in old.items() if key[1] not in targets})
new_unrelated = Counter({key: count for key, count in new.items() if key[1] not in targets})
assert old_unrelated == new_unrelated, 'Unrelated finding changed'


def targeted(rows):
    return Counter((key[0], key[1], key[3], key[4], key[5])
                   for key, count in rows.items() for _ in range(count)
                   if key[1] in targets)


old_target, new_target = targeted(old), targeted(new)
assert old_target, 'No targeted baseline findings'
assert all(new_target[key] <= old_target[key] for key in new_target), 'New target finding'
remaining = [dict(id=k[0], package=k[1], severity=k[2], type=k[3], target=k[4], count=v)
             for k, v in sorted(new_target.items())]
old_total = sum(old_target.values())
new_total = sum(new_target.values())
# Vendor source fixes can remain in Trivy's generic Debian records until its
# advisory data recognizes the DHI backport. Preserve every such record.
assert new_total <= old_total
result = {
    'passed': True, 'base': build['base'], 'imageId': build['imageId'],
    'targetedBefore': old_total, 'targetedAfter': new_total,
    'targetedHighBefore': sum(v for k, v in old_target.items() if k[2] == 'HIGH'),
    'targetedHighAfter': sum(v for k, v in new_target.items() if k[2] == 'HIGH'),
    'remainingTargetedFindings': remaining, 'newFindings': [],
    'unrelatedFindingsUnchanged': True, 'rawBeforeSha256': sha(before_file),
    'rawScanSha256': sha(after_file), 'databaseSha256': INPUTS['database']['databaseSha256'],
    'scannerSha256': INPUTS['database']['scannerSha256'],
    'advisoryUpdatedAt': INPUTS['database']['metadata']['UpdatedAt'],
    'network': 'none', 'deploymentApproved': False,
}
gate_file.write_text(json.dumps(result, indent=2) + '\n')
print(f"{row['key']}: {old_total-new_total} target records removed, "
      f"{result['targetedHighBefore']-result['targetedHighAfter']} high; "
      f"{new_total} vendor target records retained")
