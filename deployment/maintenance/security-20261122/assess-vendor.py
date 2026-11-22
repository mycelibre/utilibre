"""Read-only all-severity Debian assessment, separate from repair approval.

Use the deliberately downloaded primary snapshot and current package metadata.
No network, source uploads, decisions, host package writes or service changes.
Vendor status alone never establishes applicability or an installed fix.
"""
import collections
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import re
import sys

os.umask(0o077)
ROOT = Path('/var/lib/utilibre-maintenance')
OUT = ROOT / 'security-20261122/primary/current-assessment.json'
if sys.argv[1:]:
    assert len(sys.argv) == 3 and sys.argv[1] == '--checkpoint'
    assert re.fullmatch(r'[a-z][a-z0-9-]{0,39}', sys.argv[2])
    OUT = OUT.with_name('assessment-' + sys.argv[2] + '.json')
assert not OUT.exists(), 'Preserve earlier assessment evidence'
read = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
primary_file = ROOT / 'security-20261122/primary/debian-security-tracker.json'
assert sha(primary_file) == '56ab97cc2791c8dd0476b7d3d060a7a76c9bb9f13a8185131507a6889373759c'
primary = read(primary_file)
scan, queue = read(ROOT / 'security.json'), read(ROOT / 'security-queue.json')
queue_hash = sha(ROOT / 'security-queue.json')
assert scan['status'] == 'checked' and queue['status'] == 'current'
assert scan['completedAt'] == queue['scanDate']
pending = [i for i in queue['items'] if i['status'] == 'needs-review']
inventories, gaps = {}, []
images = {i['id']: i for i in scan['images']}


def run(args):
    return subprocess.run(args, capture_output=True, timeout=30)


for artifact in sorted({i['artifact'] for i in pending if i['type'] == 'debian'
                        and i['scope'] in ('host-os', 'runtime-image')}):
    if artifact == 'host-dpkg':
        prefix, suite = [], 'trixie'
        assert scan['host']['os']['family'] == 'debian'
        assert scan['host']['os']['name'].startswith('13.')
    else:
        image = images[artifact]
        if image['os']['family'] != 'debian':
            gaps.append({'artifact': artifact, 'reason': 'OS mismatch'})
            continue
        suite = {'12': 'bookworm', '13': 'trixie'}.get(image['os']['name'].split('.')[0])
        if not suite:
            gaps.append({'artifact': artifact, 'reason': 'No reviewed suite mapping'})
            continue
        prefix = ['docker', 'exec', image['containers'][0]]
        identity = run(['docker', 'inspect', '--format', '{{.Image}}', image['containers'][0]])
        assert identity.returncode == 0 and identity.stdout.decode().strip() == artifact
    result = run([*prefix, 'dpkg-query', '-W',
                  '-f=${Package}|${Version}|${source:Package}|${source:Version}|${db:Status-Status}\n'])
    if result.returncode:
        gaps.append({'artifact': artifact, 'reason': 'Native dpkg metadata unavailable; no result inferred'})
        continue
    packages = {}
    for line in result.stdout.decode().splitlines():
        name, version, source, source_version, status = line.split('|')
        if status == 'installed':
            assert name not in packages
            packages[name] = {'version': version, 'source': source, 'sourceVersion': source_version}
    inventories[artifact] = {'suite': suite, 'packages': packages,
                             'metadataSha256': hashlib.sha256(result.stdout).hexdigest()}

rows = []
comparisons = {}
for item in pending:
    row = {k: item.get(k) for k in ('key', 'scope', 'artifact', 'id', 'package', 'installed', 'severity', 'fixed')}
    inv = inventories.get(item['artifact'])
    package = inv['packages'].get(item['package']) if inv else None
    if item['type'] != 'debian':
        row['state'] = 'requires-other-ecosystem-assessment'
    elif not package:
        row['state'] = 'metadata-unavailable'
    elif item['installed'] != package['version']:
        row['state'] = 'scanner-label-differs-from-native-version'
        row['nativeVersion'] = package['version']
    else:
        source, version, suite = package['source'], package['sourceVersion'], inv['suite']
        entry = primary.get(source, {}).get(item['id'], {})
        vendor = entry.get('releases', {}).get(suite, {})
        row.update(source=source, sourceVersion=version, suite=suite, vendor=vendor,
                   description=entry.get('description'), upstreamDevelopment=entry.get('releases', {}).get('sid', {}))
        if vendor.get('status') == 'open':
            row['state'] = 'vendor-open'
        elif vendor.get('status') == 'resolved' and vendor.get('fixed_version'):
            fixed = vendor['fixed_version']
            if fixed == '0':
                row['state'] = 'vendor-not-affected-needs-scope-proof'
            else:
                pair = (version, fixed)
                if pair not in comparisons:
                    p = run(['dpkg', '--compare-versions', version, 'ge', fixed])
                    assert p.returncode in (0, 1)
                    comparisons[pair] = p.returncode == 0
                row['state'] = 'vendor-fixed-version-needs-payload-proof' if comparisons[pair] else 'vendor-fix-candidate'
        else:
            row['state'] = 'no-resolved-vendor-boundary'
    rows.append(row)
assert read(ROOT / 'security.json')['completedAt'] == scan['completedAt']
assert sha(ROOT / 'security-queue.json') == queue_hash, 'Queue changed during assessment'
for artifact in inventories:
    if artifact != 'host-dpkg':
        identity = run(['docker', 'inspect', '--format', '{{.Image}}', images[artifact]['containers'][0]])
        assert identity.returncode == 0 and identity.stdout.decode().strip() == artifact
result = {'schemaVersion': 1, 'date': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'scanDate': scan['completedAt'], 'primarySha256': sha(primary_file),
          'queueSha256': queue_hash,
          'notAnApproval': True, 'decisionsChanged': False, 'productionChanged': False,
          'counts': dict(collections.Counter(r['state'] for r in rows)), 'inventoryGaps': gaps,
          'inventories': inventories, 'rows': rows}
OUT.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'counts': result['counts'], 'inventoryGaps': len(gaps), 'report': str(OUT)}))
