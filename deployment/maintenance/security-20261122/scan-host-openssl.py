"""Compare complete host inventories with the frozen scanner, without installing."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
from datetime import datetime, timezone
from assessment_helpers import installed_packages, package_version, finding_identity
from host_candidate import project_status

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
OUT = ROOT / 'host-openssl'
read = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
inputs = read(HERE / 'openssl-runtime-inputs.json')
proof = read(OUT / 'prepared.json')
assert proof['passed'] and proof['rollbackPayloadMatchesHost']
assert not (OUT / 'scan-gate.json').exists()
scanner = '/opt/utilibre/maintenance/bin/trivy'
assert sha(scanner) == inputs['database']['scannerSha256']
assert sha(ROOT / 'scan-cache/db/trivy.db') == inputs['database']['databaseSha256']
status = Path('/var/lib/dpkg/status').read_bytes()
controls = {}
for name, pin in inputs['packages'].items():
    archive = ROOT / 'openssl-build-v2' / pin['file']
    assert sha(archive) == pin['sha256']
    text = subprocess.check_output(['dpkg-deb', '-f', str(archive)], text=True, timeout=30)
    controls[name] = dict(line.split(': ', 1) for line in text.splitlines()
                          if line and not line[0].isspace() and ': ' in line)
versions = {name: (proof['oldVersion'], proof['newVersion']) for name in controls}
candidate = project_status(status, versions, controls)
findings, scans = {}, {}
for phase, blob in [('before', status), ('after', candidate)]:
    dest = OUT / ('scan-' + phase)
    dest.mkdir()
    for file in ['etc/os-release', 'etc/debian_version', 'var/lib/dpkg/status']:
        target = dest / file
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(blob if file.endswith('/status') else (Path('/') / file).read_bytes())
    raw = OUT / (phase + '-scan.json')
    args = ['unshare', '--net', '--', scanner, 'rootfs', '--config', '/dev/null',
            '--ignorefile', '/dev/null', '--skip-check-update', '--skip-version-check',
            '--skip-vex-repo-update', '--disable-telemetry', '--cache-dir', str(ROOT / 'scan-cache'),
            '--cache-backend', 'memory', '--scanners', 'vuln', '--offline-scan', '--skip-db-update',
            '--skip-java-db-update', '--parallel', '1', '--timeout', '2m', '--no-progress',
            '--list-all-pkgs', '--pkg-types', 'os', '--format', 'json', '--output', str(raw), str(dest)]
    with (OUT / (phase + '-scan.log')).open('wb') as log:
        result = subprocess.run(args, stdout=log, stderr=log, timeout=150,
            env={'PATH': '/usr/bin:/bin', 'HOME': str(dest), 'GOMAXPROCS': '1', 'GOMEMLIMIT': '512MiB'})
    assert result.returncode == 0
    data = read(raw)
    assert data['Metadata']['OS']['Family'] == 'debian'
    rows = [row for row in data['Results'] if row['Type'] == 'debian']
    assert len(rows) == 1
    packages = {p['Name']: package_version(p) for p in rows[0]['Packages']}
    assert len(packages) == len(rows[0]['Packages'])
    assert packages == {n: p['installed'] for n, p in installed_packages(blob).items()}
    findings[phase] = [{'id': v['VulnerabilityID'], 'package': v['PkgName'], 'installed': v['InstalledVersion'],
        'severity': v['Severity'], 'type': row['Type'], 'target': row['Target']}
        for row in rows for v in row.get('Vulnerabilities', [])]
    scans[phase] = {'sha256': sha(raw), 'packages': len(packages), 'findings': len(findings[phase])}
assert Path('/var/lib/dpkg/status').read_bytes() == status
before = {finding_identity(f, controls) for f in findings['before']}
added = [f for f in findings['after'] if finding_identity(f, controls) not in before]
assert not added, 'New findings require review; no clearance'
(OUT / 'scan-gate.json').write_text(json.dumps({'passed': True, 'date': datetime.now(timezone.utc).isoformat(),
    'preparedSha256': sha(OUT / 'prepared.json'), 'statusSha256': hashlib.sha256(status).hexdigest(),
    'databaseSha256': inputs['database']['databaseSha256'], 'scannerSha256': sha(scanner),
    'scans': scans, 'newFindings': added, 'remainingSelected': [f for f in findings['after'] if f['package'] in controls],
    'network': 'none', 'productionChanged': False, 'deploymentApproved': False}, indent=2) + '\n')
print('Complete host inventories matched; frozen comparison passed. Unresolved findings retained. No installation.')
