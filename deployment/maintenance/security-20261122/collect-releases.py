"""Collect completed Debian receipts without changing their original dates.

One aggregate keeps shared-image project roles together for existing exact
payload reviewers. This records lineage, not approval of vulnerability findings.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
assert sys.argv[1:] in ([], ['--libraries'], ['--openssl'], ['--openssl-fips'], ['--openssl-penpot'], ['--leaves'], ['--alpine'], ['--successors'], ['--sasl'], ['--bookworm-successor'], ['--dhi-successors'], ['--remaining-vendor'], ['--openssl-extra-runtime'], ['--openssl-relay-runtime'], ['--openssl-distroless-runtime'], ['--mumble-xml'])
extra = sys.argv[1][2:] if sys.argv[1:] in (['--successors'], ['--sasl'], ['--bookworm-successor'], ['--dhi-successors'], ['--remaining-vendor'], ['--openssl-extra-runtime'], ['--openssl-relay-runtime'], ['--openssl-distroless-runtime'], ['--mumble-xml']) else None
alpine = sys.argv[1:] == ['--alpine']
libraries = sys.argv[1:] == ['--libraries']
openssl = sys.argv[1:] == ['--openssl']
leaves = sys.argv[1:] == ['--leaves']
variant = sys.argv[1][2:] if sys.argv[1:] in (['--openssl-fips'], ['--openssl-penpot']) else None
if extra:
    ROOT /= extra
elif alpine:
    ROOT /= 'alpine-crypto'
elif leaves:
    ROOT /= 'leaves'
elif libraries:
    ROOT /= 'libraries'
elif openssl:
    ROOT /= 'openssl-runtime'
elif variant:
    ROOT /= variant + '-runtime'
inputs = json.loads((HERE / ('openssl-distroless-runtime-inputs.json' if extra == 'openssl-distroless-runtime' else 'mumble-xml-inputs.json' if extra == 'mumble-xml' else 'openssl-relay-runtime-inputs.json' if extra == 'openssl-relay-runtime' else 'openssl-extra-runtime-inputs.json' if extra == 'openssl-extra-runtime' else 'remaining-vendor-inputs.json' if extra == 'remaining-vendor' else 'dhi-successor-inputs.json' if extra == 'dhi-successors' else 'bookworm-successor-inputs.json' if extra == 'bookworm-successor' else 'successor-runtime-inputs.json' if extra == 'successors' else 'sasl-inputs.json' if extra == 'sasl' else 'alpine-crypto-inputs.json' if alpine else 'debian-leaf-inputs.json' if leaves else variant + '-runtime-inputs.json' if variant else 'openssl-runtime-inputs.json' if openssl else 'debian-library-inputs.json' if libraries else 'debian-inputs.json')).read_text())
if extra:
    assert len(inputs['rows']) == {'successors': 1, 'sasl': 4, 'bookworm-successor': 5, 'dhi-successors': 2, 'remaining-vendor': 2, 'openssl-extra-runtime': 2, 'openssl-relay-runtime': 1, 'openssl-distroless-runtime': 1, 'mumble-xml': 1}[extra]
    assert all(r['releaseApproval'] == 'approved' for r in inputs['rows'])
if alpine:
    assert len(inputs['rows']) == 20 and all(r['releaseApproval'] == 'approved' for r in inputs['rows'])
if leaves:
    assert len(inputs['rows']) == 11 and all(r['releaseApproval'] == 'approved' for r in inputs['rows'])
if openssl:
    assert len(inputs['rows']) == 16
    held = [r for r in inputs['rows'] if r.get('releaseApproval') != 'approved']
    assert {r['key']: r['releaseApproval'] for r in held} == {
        'identity-server': 'rejected-incompatible-vendor-variant',
        'expanded-penpot-backend': 'rejected-incomplete-private-library',
    }
    assert all(r.get('releaseApproval') == 'approved' for r in inputs['rows'] if r not in held)
if variant:
    assert len(inputs['rows']) == 1 and inputs['rows'][0]['releaseApproval'] == 'approved'
groups, receipts = [], []
for row in inputs['rows']:
    # Yopass was prepared after this first aggregate. Its independent project
    # receipt is registered directly; never rewrite the first release's proof.
    if row.get('releaseApproval') != 'approved' or (not libraries and extra != 'openssl-distroless-runtime' and row['key'] == 'community-yopass'):
        continue
    directory = ROOT / row['key'] if alpine else ROOT / 'vendor-debian' / row['key']
    build = json.loads((directory / 'build.json').read_text())
    names = set()
    if alpine and row['key'] == 'public-utility-portal':
        # The existing portal release changes PORTAL_IMAGE in its protected
        # environment, not a literal Compose pin. Preserve its original proof.
        path = directory / 'portal-release.json'
        value = json.loads(path.read_text())
        assert value['status'] == 'passed' and not value.get('rollback')
        assert value['oldImage'] == row['base'] and value['newImage'] == build['imageId']
        assert row['containers'] == ['public-utility-portal-1']
        assert hashlib.sha256((directory / 'portal-native.json').read_bytes()).hexdigest() == row['portalNativeSha256']
        for file, digest in row['reviewedEvidence'].items():
            assert hashlib.sha256((directory / file).read_bytes()).hexdigest() == digest
        observed = subprocess.check_output(['docker', 'inspect', '--format', '{{.Image}} {{.State.Running}}', row['containers'][0]], timeout=20).decode().strip()
        assert observed == build['imageId'] + ' true'
        groups.append({'key': row['key'], 'status': 'passed', 'completedAt': value['checkedAt'],
                       'rows': [{'name': row['containers'][0], 'oldImage': row['base'], 'newImage': build['imageId']}],
                       'mechanism': 'Existing portal environment-pin release; original receipt retained'})
        receipts.append({'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
        continue
    paths = list(directory.glob('release-utilibre*.json'))
    if alpine and row['key'] == 'services-valkey':
        paths.append(directory / 'release-public-utility.json')
    for path in sorted(paths):
        value = json.loads(path.read_text())
        assert value['status'] == 'passed' and value['group']['status'] == 'passed'
        assert value.get('completedAt')
        group = {**value['group'], 'key': row['key'], 'completedAt': value['completedAt']}
        groups.append(group)
        receipts.append({'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
        names.update(r['name'] for r in group['rows'] if r['newImage'] == build['imageId'] and r['oldImage'] == row['base'])
    assert names == set(row['containers']), 'Incomplete declared release: ' + row['key']
assert groups
output = ROOT / ('release.json' if alpine else 'vendor-debian/release.json')
value = {'status': 'passed', 'completedAt': max(g['completedAt'] for g in groups),
         'groups': groups, 'sourceReceipts': receipts,
         'purpose': 'SHA-bound completed releases; no new vulnerability exemptions.'}
if openssl:
    value['excludedUnreleasedCandidates'] = [{'key': r['key'], 'reason': r['releaseRejectionReason']} for r in held]
text = json.dumps(value, indent=2) + '\n'
if output.exists():
    assert output.read_text() == text, 'Preserve the existing completed aggregate'
else:
    output.write_text(text)
print(json.dumps({'groups': len(groups), 'candidates': len({g['key'] for g in groups}), 'receipt': str(output)}))
