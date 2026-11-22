"""Record every inherited DHI version from complete frozen baseline scans.

This changes no image metadata and removes no raw findings. Candidate scans
must retain both the native package version and every inherited extra version.
"""
from collections import Counter, defaultdict
import hashlib
import json
import os
from pathlib import Path
import subprocess
from assessment_helpers import package_version

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/dhi-successors')
read = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
inputs = read(HERE / 'dhi-successor-inputs.json')
assert sha(ROOT / 'scan-cache/db/trivy.db') == inputs['database']['databaseSha256']
assert sha('/opt/utilibre/maintenance/bin/trivy') == inputs['database']['scannerSha256']
for name, digest in inputs['database']['javaDatabase'].items():
    assert sha(ROOT / 'scan-cache/java-db' / name) == digest
baseline = read(ROOT / 'before/security.json')
proofs = []
for row in inputs['rows']:
    out = ROOT / 'vendor-debian' / row['key']
    out.mkdir(parents=True, exist_ok=True)
    raw = out / 'before-inventory-scan.json'
    if not raw.exists():
        args = ['unshare', '--net', '--', '/opt/utilibre/maintenance/bin/trivy', 'image',
            '--config', '/dev/null', '--ignorefile', '/dev/null', '--skip-check-update', '--skip-version-check',
            '--skip-vex-repo-update', '--disable-telemetry', '--cache-dir', str(ROOT / 'scan-cache'),
            '--cache-backend', 'memory', '--scanners', 'vuln', '--offline-scan', '--skip-db-update',
            '--skip-java-db-update', '--parallel', '1', '--timeout', '5m', '--no-progress', '--list-all-pkgs',
            '--image-src', 'docker', '--format', 'json', '--output', str(raw), row['base']]
        with (out / 'before-inventory-scan.log').open('wb') as log:
            subprocess.run(args, stdout=log, stderr=log, check=True, timeout=330,
                env={**os.environ, 'GOMAXPROCS': '1', 'GOMEMLIMIT': '1GiB', 'TRIVY_DISABLE_TELEMETRY': 'true'})
    value = read(raw)
    assert value['Metadata']['ImageID'] == row['base']
    osrows = [r for r in value['Results'] if r['Type'] == 'debian']
    assert len(osrows) == 1
    versions = defaultdict(set)
    for record in osrows[0]['Packages']:
        versions[record['Name']].add(package_version(record))
    native_file = ROOT / 'dpkg-image-inventory' / (row['base'][7:] + '.json')
    native = read(native_file)
    assert native['image'] == row['base'] and native['complete']
    assert versions.keys() == native['packages'].keys()
    extras = {}
    for name, values in versions.items():
        actual = native['packages'][name]['installed']
        assert actual in values
        if values - {actual}:
            extras[name] = sorted(values - {actual})
    aliases = {}
    for name, selected in row['packages'].items():
        # A status.d record can have the SAME version as dpkg/status before
        # upgrading, so a baseline scanner set alone cannot reveal that alias.
        # Require its actual unchanged bytes, not an inferred allowed version.
        result = subprocess.run(['docker', 'run', '--rm', '--network', 'none', '--read-only',
            '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--cpus', '.5', '--memory', '128m',
            '--pids-limit', '32', '--log-driver', 'none', '--entrypoint', 'sh', row['base'],
            '-ec', 'test -e "$1" || exit 44; cat "$1"', 'read-alias',
            '/var/lib/dpkg/status.d/' + name], capture_output=True, timeout=30)
        if result.returncode == 44:
            assert name == 'libfreetype6' and row['key'] == 'expanded-penpot-exporter'
            assert name not in extras
            continue
        assert result.returncode == 0
        blob = result.stdout
        fields = dict(line.split(': ', 1) for line in blob.decode().splitlines() if ': ' in line and not line.startswith(' '))
        assert fields['Package'] == name and fields['Version'] in versions[name]
        fixed = inputs['packages'][selected['package']]['version']
        assert fixed != fields['Version']
        values = set(extras.get(name, [])) | {fields['Version']}
        assert fixed not in values
        extras[name] = sorted(values)
        aliases[name] = {'path': '/var/lib/dpkg/status.d/' + name, 'version': fields['Version'],
                         'sha256': hashlib.sha256(blob).hexdigest()}
    fields = ('id', 'package', 'installed', 'severity', 'type', 'target')
    observed = [(v['VulnerabilityID'], v['PkgName'], v['InstalledVersion'], v['Severity'], r['Type'], r['Target'])
                for r in value['Results'] for v in r.get('Vulnerabilities', [])]
    recorded = next(i for i in baseline['images'] if i['id'] == row['base'])
    assert recorded['status'] == 'checked'
    assert Counter(observed) == Counter(tuple(f[k] for k in fields) for f in recorded['findings'])
    proofs.append({'image': row['base'], 'key': row['key'], 'extras': extras, 'selectedMetadataAliases': aliases,
        'rawScanSha256': sha(raw), 'nativeInventorySha256': sha(native_file), 'rawFindings': len(observed)})
target = ROOT / 'baseline-inventories.json'
assert not target.exists()
target.write_text(json.dumps({'passed': True, 'rows': proofs, 'baselineSha256': sha(ROOT / 'before/security.json'),
    'databaseSha256': inputs['database']['databaseSha256'], 'network': 'none',
    'allRawFindingsPreserved': True}, indent=2) + '\n')
print('Both complete inventories and raw findings match the frozen assessment.')
