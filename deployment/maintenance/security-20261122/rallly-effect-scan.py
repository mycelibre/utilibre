"""Frozen, offline before/after assessment of the exact Rallly candidate."""
from collections import Counter
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/rallly-effect')
read = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
stage = read(ROOT / 'stage-v2.json')
scope = read(ROOT / 'scope-v2.json')
assert stage['passed'] and scope['passed'] and stage['imageId'] == scope['imageId']
assert not (ROOT / 'scan-gate.json').exists()
db = read(HERE / 'openssl-runtime-inputs.json')['database']
cache = ROOT.parent / 'scan-cache'
assert sha(cache / 'db/trivy.db') == db['databaseSha256']
scanner = '/opt/utilibre/maintenance/bin/trivy'
assert sha(scanner) == db['scannerSha256']
for name, digest in db['javaDatabase'].items():
    assert sha(cache / 'java-db' / name) == digest

scans = []
for phase, image in [('before', stage['base']), ('after', stage['imageId'])]:
    path = ROOT / (phase + '-scan.json')
    assert not path.exists(), 'Never overwrite scan evidence'
    command = ['unshare', '--net', '--', scanner, 'image', '--config', '/dev/null',
        '--ignorefile', '/dev/null', '--skip-check-update', '--skip-version-check',
        '--skip-vex-repo-update', '--disable-telemetry', '--cache-dir', str(cache),
        '--cache-backend', 'memory', '--scanners', 'vuln', '--offline-scan',
        '--skip-db-update', '--skip-java-db-update', '--parallel', '1',
        '--timeout', '5m', '--no-progress', '--list-all-pkgs', '--image-src', 'docker',
        '--format', 'json', '--output', str(path), image]
    with (ROOT / (phase + '-scanner.log')).open('wb') as log:
        subprocess.run(command, stdout=log, stderr=log, timeout=330, check=True,
            env={**os.environ, 'GOMAXPROCS': '1', 'GOMEMLIMIT': '1GiB',
                 'TRIVY_DISABLE_TELEMETRY': 'true'})
    result = read(path)
    assert result['Metadata']['ImageID'] == image and result['Results']
    scans.append(result)


def target(result):
    return result['Type'] if result['Type'] in ('alpine', 'debian') else result['Target']


def packages(scan):
    return Counter((r['Type'], target(r), p['Name'],
                    '<reviewed Effect version>' if p['Name'] == 'effect' else p.get('Version', '<missing-version>'))
                   for r in scan['Results'] for p in r.get('Packages', []))


def findings(scan):
    return Counter((r['Type'], target(r), v['VulnerabilityID'], v['PkgName'],
                    v['InstalledVersion'], v['Severity'])
                   for r in scan['Results'] for v in r.get('Vulnerabilities', []))


assert packages(scans[0]) == packages(scans[1]), 'Unexpected installed package change'
for scan, version in zip(scans, ('3.20.0', '3.22.1')):
    found = [p.get('Version') for r in scan['Results'] for p in r.get('Packages', [])
             if p['Name'] == 'effect']
    assert found and set(found) == {version}, 'Wrong Effect package inventory'
before, after = map(findings, scans)
added = after - before
assert not added, 'New findings require separate review'
removed = before - after
assert removed and all(x[2:5] == ('CVE-2026-121707', 'effect', '3.20.0')
                       for x in removed), 'Only the fixed advisory may disappear'
assert not any(x[2] == 'CVE-2026-121707' and x[3] == 'effect' for x in after)
proof = {'passed': True, 'date': dt.datetime.now(dt.timezone.utc).isoformat(),
    'base': stage['base'], 'imageId': stage['imageId'],
    'databaseSha256': db['databaseSha256'], 'scannerSha256': db['scannerSha256'],
    'beforeScanSha256': sha(ROOT / 'before-scan.json'),
    'afterScanSha256': sha(ROOT / 'after-scan.json'),
    'completePackageInventoryPreserved': True, 'targetedRemoved': sum(removed.values()),
    'newFindings': [], 'network': 'none', 'productionChanged': False}
(ROOT / 'scan-gate.json').write_text(json.dumps(proof, indent=2) + '\n')
print(json.dumps(proof))
