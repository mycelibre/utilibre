"""Preserve and explicitly reconcile inherited DHI inventory aliases.

Both versions remain in raw findings. Only metadata comparison is corrected;
no file, severity, scanner check, advisory or finding is excluded.
"""
import hashlib
import json
import os
from pathlib import Path
import sys
from collections import Counter, defaultdict
from assessment_helpers import package_version

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/leaves')
read = lambda p: json.loads(Path(p).read_text())
key = 'expanded-penpot-exporter'
assert sys.argv[1:] == [key]
inputs = read(HERE / 'debian-leaf-inputs.json')
row = next(r for r in inputs['rows'] if r['key'] == key)
names = {'apt', 'base-files', 'gcc-14-base', 'git', 'gpgv', 'libapt-pkg7.0',
         'libc-bin', 'libc6', 'libgcc-s1', 'libgssapi-krb5-2', 'libk5crypto3',
         'libkrb5-3', 'libkrb5support0', 'libpcre2-8-0', 'libperl5.40',
         'perl', 'perl-base', 'perl-modules-5.40', 'libssh2-1t64', 'libssl3t64',
         'openssl', 'openssl-provider-legacy', 'libstdc++6', 'node-corepack',
         'nodejs-24', 'npm', 'zlib1g'}
assert not names & row['packages'].keys()
scope = read(ROOT / 'vendor-debian' / key / 'scope.json')
assert scope['passed'] and scope['allUnrelatedImageFilesUnchanged'] and scope['unrelatedDpkgRecordsUnchanged']
baseline = next(i for i in read(ROOT / 'before/security.json')['images'] if i['id'] == row['base'])
baseline_file = ROOT / 'vendor-debian' / key / 'before-inventory-scan.json'
baseline_sha = hashlib.sha256(baseline_file.read_bytes()).hexdigest()
assert baseline_sha == '8a56cc118b68a0da8652ecfa353ad3abbd8bf9fe8acafdccd884e32af0cf0365'
raw = read(baseline_file)
assert raw['Metadata']['ImageID'] == row['base']
osrows = [r for r in raw['Results'] if r['Type'] == 'debian']
assert len(osrows) == 1
versions = defaultdict(set)
for record in osrows[0]['Packages']:
    versions[record['Name']].add(package_version(record))
native = read(ROOT / 'dpkg-image-inventory' / (row['base'][7:] + '.json'))
assert native['image'] == row['base']
assert versions.keys() == native['packages'].keys()
assert {name for name, values in versions.items() if len(values) > 1} == names
extra = {name: sorted(values - {native['packages'][name]['installed']})
         for name, values in versions.items() if name in names}
assert all(len(values) == 1 for values in extra.values())
# The baseline's full findings must agree with the recorded frozen assessment.
# The duplicate versions are retained in both inventories and all raw findings.
fields = ('id', 'package', 'installed', 'severity', 'type', 'target')
observed = [dict(zip(fields, (v['VulnerabilityID'], v['PkgName'], v['InstalledVersion'],
             v['Severity'], r['Type'], r['Target'])))
            for r in raw['Results'] for v in r.get('Vulnerabilities', [])]
assert Counter(tuple(f[k] for k in fields) for f in observed) == Counter(
    tuple(f[k] for k in fields) for f in baseline['findings'])
original = ROOT / 'scan-debian-adapter-v4.py'
code = original.read_text()
changes = [
    ("packages={p['Name']:package_version(p) for p in osrows[0]['Packages']}", "scanner_package_records=osrows[0]['Packages']"),
    ("    assert packages==expected, 'Incomplete or changed scanner package inventory'", "    from scanner_inventory import validate_inventory\n    packages,inherited_duplicates=validate_inventory(scanner_package_records,expected," + repr(extra) + ")\n    assert packages==expected, 'Incomplete or changed scanner package inventory'"),
    ("'rawScanSha256':m.sha(raw),'network':'none'", "'rawScanSha256':m.sha(raw),'network':'none','inheritedDuplicateScannerVersions':inherited_duplicates,'baselineInventoryScanSha256':" + repr(baseline_sha)),
]
for old, new in changes:
    assert code.count(old) == 1
    code = code.replace(old, new)
adapter = ROOT / 'scan-exporter-duplicates-v6.py'
assert not adapter.exists(), 'Preserve prior evidence'
adapter.write_text(code)
sys.path.insert(0, str(HERE))
sys.argv = [str(adapter), key]
exec(compile(code, str(adapter), 'exec'), {'__file__': str(adapter), '__name__': '__main__'})
