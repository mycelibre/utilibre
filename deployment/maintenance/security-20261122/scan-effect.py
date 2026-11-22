"""Same-snapshot Trivy checks with complete before/after package comparison."""
from collections import Counter
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from assessment_helpers import package_version

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/effect')
read = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
inputs = read(HERE / 'effect-inputs.json')
scanner = read(HERE / 'openssl-runtime-inputs.json')['database']
cache = ROOT.parent / 'scan-cache'
assert sha(cache / 'db/trivy.db') == scanner['databaseSha256']
assert sha('/opt/utilibre/maintenance/bin/trivy') == scanner['scannerSha256']
for name, digest in scanner['javaDatabase'].items():
    assert sha(cache / 'java-db' / name) == digest
reuse = sys.argv[1:2] == ['--reuse-recorded-scans']
args = sys.argv[2:] if reuse else sys.argv[1:]
assert len(args) == 1
row = next(r for r in inputs['rows'] if r['key'] == args[0])
out = ROOT / row['key']
build = read(out / 'build.json')
assert build['passed'] and not (out / 'scan-gate.json').exists()
scans = []
for phase, image in [('before', row['base']), ('after', build['imageId'])]:
    path = out / (phase + '-scan.json')
    assert path.exists() if reuse else not path.exists()
    args = ['unshare', '--net', '--', '/opt/utilibre/maintenance/bin/trivy', 'image',
        '--config', '/dev/null', '--ignorefile', '/dev/null', '--skip-check-update', '--skip-version-check',
        '--skip-vex-repo-update', '--disable-telemetry', '--cache-dir', str(cache), '--cache-backend', 'memory',
        '--scanners', 'vuln', '--offline-scan', '--skip-db-update', '--skip-java-db-update', '--parallel', '1',
        '--timeout', '5m', '--no-progress', '--list-all-pkgs', '--image-src', 'docker', '--format', 'json',
        '--output', str(path), image]
    if not reuse:
        with (out / (phase + '-scanner.log')).open('wb') as log:
            subprocess.run(args, stdout=log, stderr=log, timeout=330, check=True,
                env={**os.environ, 'GOMAXPROCS': '1', 'GOMEMLIMIT': '1GiB', 'TRIVY_DISABLE_TELEMETRY': 'true'})
    result = read(path)
    assert result['Metadata']['ImageID'] == image and result['Results']
    assert any(r['Type'] in ('debian', 'alpine') and r.get('Packages') for r in result['Results'])
    scans.append(result)


def target(result):
    return result['Type'] if result['Type'] in ('alpine', 'debian') else result['Target']


def packages(scan):
    return Counter((r['Type'], target(r), p['Name'],
                    '<reviewed Effect version>' if p['Name'] == 'effect' else package_version(p) if 'Version' in p else '<missing-version>')
                   for r in scan['Results'] for p in r.get('Packages', []))


def findings(scan):
    return Counter((r['Type'], target(r), v['VulnerabilityID'], v['PkgName'], v['InstalledVersion'], v['Severity'])
                   for r in scan['Results'] for v in r.get('Vulnerabilities', []))


assert packages(scans[0]) == packages(scans[1]), 'Unexpected package inventory change'
for scan, version in zip(scans, ['3.20.0', '3.22.1']):
    versions = [package_version(p) for r in scan['Results'] for p in r.get('Packages', []) if p['Name'] == 'effect']
    assert versions and set(versions) == {version}
before, after = map(findings, scans)
added = after - before
assert not added, 'New findings require separate review'
removed = before - after
assert removed and all(x[2:5] == ('CVE-2026-121707', 'effect', '3.20.0') for x in removed)
assert not any(x[2] == 'CVE-2026-121707' and x[3] == 'effect' for x in after)
proof = {'passed': True, 'date': dt.datetime.now(dt.timezone.utc).isoformat(), 'base': row['base'], 'imageId': build['imageId'],
    'databaseSha256': scanner['databaseSha256'], 'scannerSha256': scanner['scannerSha256'],
    'advisoryUpdatedAt': scanner['metadata']['UpdatedAt'], 'beforeScanSha256': sha(out / 'before-scan.json'),
    'rawScanSha256': sha(out / 'after-scan.json'), 'completePackageInventoryPreserved': True,
    'targetedBefore': sum(removed.values()), 'targetedAfter': 0, 'newFindings': [],
    'remaining': {s: sum(n for x, n in after.items() if x[-1] == s) for s in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']},
    'network': 'none', 'deploymentApproved': False, 'reusedRecordedScans': reuse,
    'unchangedUnversionedPackageRecords': sum(1 for r in scans[1]['Results'] for p in r.get('Packages', []) if 'Version' not in p),
    'coverageLimit': 'Any unversioned package records are compared explicitly as unversioned and retained; no installed version or security clearance is inferred for them.'}
(out / 'scan-gate.json').write_text(json.dumps(proof, indent=2) + '\n')
print(row['key'] + ': exact Effect finding removed; all other packages/findings preserved')
