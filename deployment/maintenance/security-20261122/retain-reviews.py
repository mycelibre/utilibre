"""Carry unexpired exact reviews across this batch's unchanged package payloads.

Same contract as security-20261114/review-retained.mjs, extended to all
severities. No new acceptance, wildcard, severity change or expiry extension.
Produces a private proposed batch; the existing triage validator applies it.
"""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
read = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()


def identity(item):
    common = tuple(item[k] for k in ('scope', 'id', 'package', 'installed', 'severity', 'type'))
    return common if item['type'] in ('debian', 'alpine', 'ubuntu') else common + (item['target'],)


def role_scope(declared, observed, released, original, allow_partial=False):
    """No new role, duplicate or unreceipted activation may inherit a review."""
    for roles in (declared, observed, released, original):
        assert roles and len(roles) == len(set(roles))
    assert set(original) == set(declared)
    assert set(observed) == set(released)
    assert set(observed) <= set(declared)
    if not allow_partial:
        assert set(observed) == set(declared)


def main():
    completed_relays = sys.argv[1:] == ['--successors', '--completed']
    if completed_relays:
        sys.argv.pop()
    assert sys.argv[1:] in ([], ['--final-nginx'], ['--libraries'], ['--openssl'], ['--leaves'], ['--alpine'], ['--successors'], ['--sasl'], ['--bookworm-successor'], ['--dhi-successors'], ['--remaining-vendor'], ['--openssl-extra-runtime'], ['--xml-successor'], ['--openssl-relay-runtime'], ['--openssl-distroless-runtime'], ['--effect'], ['--admin-build-deps'], ['--mumble-xml'])
    extra = sys.argv[1][2:] if sys.argv[1:] in (['--successors'], ['--sasl'], ['--bookworm-successor'], ['--dhi-successors'], ['--remaining-vendor'], ['--openssl-extra-runtime'], ['--xml-successor'], ['--openssl-relay-runtime'], ['--openssl-distroless-runtime'], ['--effect'], ['--admin-build-deps'], ['--mumble-xml']) else None
    alpine = sys.argv[1:] == ['--alpine']
    final = sys.argv[1:] == ['--final-nginx']
    libraries = sys.argv[1:] == ['--libraries']
    openssl = sys.argv[1:] == ['--openssl']
    leaves = sys.argv[1:] == ['--leaves']
    scan = read(ROOT.parent / 'security.json')
    queue = read(ROOT.parent / 'security-queue.json')
    baseline_file = ROOT / (extra + '/pre-release-security-queue.json' if extra else 'alpine-crypto/pre-release-security-queue.json' if alpine else 'leaves/pre-release-security-queue.json' if leaves else 'openssl-runtime/pre-release-security-queue.json' if openssl else 'libraries/pre-release-security-queue.json' if libraries else 'pre-final-nginx-security-queue.json' if final else 'reviewed-baseline-queue.json')
    baseline = read(baseline_file)
    baseline_hash = sha(baseline_file)
    before = read(ROOT / (extra + '/pre-release-security.json' if extra else 'alpine-crypto/pre-release-security.json' if alpine else 'leaves/pre-release-security.json' if leaves else 'openssl-runtime/pre-release-security.json' if openssl else 'libraries/pre-release-security.json' if libraries else 'pre-final-nginx-security.json' if final else 'before/security.json'))
    assert scan['status'] == 'checked' and queue['status'] == 'current'
    assert scan['completedAt'] == queue['scanDate']
    assert scan['database']['updatedAt'] == before['database']['updatedAt']
    assert baseline['scanDate'] == before['completedAt']
    now = dt.datetime.now(dt.timezone.utc)
    decisions, proofs, skipped = [], [], []
    manifests = [(extra + '/vendor-debian', 'openssl-distroless-runtime-inputs.json' if extra == 'openssl-distroless-runtime' else 'mumble-xml-inputs.json' if extra == 'mumble-xml' else 'openssl-relay-runtime-inputs.json' if extra == 'openssl-relay-runtime' else 'openssl-extra-runtime-inputs.json' if extra == 'openssl-extra-runtime' else 'remaining-vendor-inputs.json' if extra == 'remaining-vendor' else 'dhi-successor-inputs.json' if extra == 'dhi-successors' else 'bookworm-successor-inputs.json' if extra == 'bookworm-successor' else 'successor-runtime-inputs.json' if extra == 'successors' else 'sasl-inputs.json')] if extra else [('alpine-crypto', 'alpine-crypto-inputs.json')] if alpine else [('leaves/vendor-debian', 'debian-leaf-inputs.json')] if leaves else [(p + '/vendor-debian', p + '-inputs.json') for p in ('openssl-runtime', 'openssl-fips-runtime', 'openssl-penpot-runtime')] if openssl else [('libraries/vendor-debian', 'debian-library-inputs.json')] if libraries else [('addy-nginx', 'addy-nginx-inputs.json'), ('rssbridge-nginx', 'rssbridge-nginx-inputs.json')] if final else [('nginx', 'nginx-inputs.json'), ('vendor', 'vendor-inputs.json'), ('vendor-debian', 'debian-inputs.json')]
    if extra == 'xml-successor':
        manifests = [('xml-successor/images', 'xml-successor-inputs.json')]
    if extra in ('effect', 'admin-build-deps'):
        manifests = [(extra, extra + '-inputs.json')]
    for kind, manifest in manifests:
        for row in read(HERE / manifest)['rows']:
            directory = ROOT / kind / row['key']
            if not (directory / 'build.json').exists() or not (directory / 'scope.json').exists():
                continue
            build, scope = read(directory / 'build.json'), read(directory / 'scope.json')
            new = next((i for i in scan['images'] if i['id'] == build['imageId']), None)
            if not new:
                continue
            try:
                expected_roles = row['containers']
                if extra == 'successors':
                    # The shared relay artifact may complete one project while
                    # another is busy. Never infer activation of the second.
                    expected_roles = new['containers']
                    assert expected_roles and set(expected_roles) <= set(row['containers'])
                    for name in set(row['containers']) - set(expected_roles):
                        observed = subprocess.check_output(['docker', 'inspect', '--format', '{{.Image}} {{.State.Running}}', name], timeout=20).decode().strip()
                        assert observed == row['base'] + ' true', 'Unreleased relay changed unexpectedly'
                assert row.get('releaseApproval') == 'approved'
                assert all(sha(directory / name) == digest for name, digest in row['reviewedEvidence'].items())
                scope_hash = sha(directory / 'scope.json')
                assert build['passed'] and scope['passed'] and scope['allUnrelatedImageFilesUnchanged']
                assert scope['configurationUnchanged'] and build['configurationUnchanged']
                assert scope.get('unrelatedDpkgRecordsUnchanged', scope.get('unrelatedApkRecordsUnchanged'))
                assert scope['base'] == row['base'] and scope['imageId'] == build['imageId']
                if alpine:
                    aggregate = read(ROOT / 'alpine-crypto/release.json')
                    assert aggregate['status'] == 'passed' and aggregate['completedAt'] < scan['completedAt']
                    for receipt in aggregate['sourceReceipts']:
                        assert sha(receipt['path']) == receipt['sha256']
                    groups = [g for g in aggregate['groups'] if g['key'] == row['key']]
                    assert groups and all(g['status'] == 'passed' for g in groups)
                    released = [r['name'] for g in groups for r in g['rows']
                                if r['oldImage'] == row['base'] and r['newImage'] == build['imageId']]
                    assert sorted(released) == sorted(row['containers'])
                if final:
                    project = 'utilibre-addy' if kind == 'addy-nginx' else 'utilibre-community'
                    release = read(directory / ('release-' + project + '.json'))
                    assert release['status'] == 'passed' and release['group']['status'] == 'passed'
                    assert release['configurationUnchanged'] and release['retentionUnchanged']
                    assert not release['productionDataModifiedByTests']
                    assert release['buildSha256'] == sha(directory / 'build.json')
                    assert release['completedAt'] < scan['completedAt']
                    assert sorted(r['name'] for r in release['group']['rows']) == sorted(row['containers'])
                    assert all(r['oldImage'] == row['base'] and r['newImage'] == build['imageId'] for r in release['group']['rows'])
                if libraries or openssl or leaves or extra:
                    released = []
                    receipts = list(directory.glob('release-utilibre-*.json'))
                    assert receipts, 'No completed scoped activation'
                    for receipt in receipts:
                        release = read(receipt)
                        assert release['status'] == 'passed' and release['group']['status'] == 'passed'
                        assert release['configurationUnchanged'] and release['retentionUnchanged']
                        assert not release['productionDataModifiedByTests']
                        assert release['buildSha256'] == sha(directory / 'build.json')
                        assert release['completedAt'] < scan['completedAt']
                        released.extend(r['name'] for r in release['group']['rows']
                                        if r['oldImage'] == row['base'] and r['newImage'] == build['imageId'])
                    assert sorted(released) == sorted(expected_roles)
                assert new['status'] == 'checked' and sorted(new['containers']) == sorted(expected_roles)
                for name in new['containers']:
                    live = subprocess.check_output(['docker', 'inspect', '--format', '{{.Image}} {{.State.Running}}', name], timeout=20).decode().strip()
                    assert live == build['imageId'] + ' true'
                candidates = [i for i in baseline['items'] if i['artifact'] == row['base'] and i['scope'] == 'runtime-image']
                matched = 0
                # A binary overlay deliberately leaves distro metadata intact.
                # Those package findings require their own fixed-byte review.
                changed_packages = set(row['packages']) | ({'nginx', 'nginx-common'} if kind == 'rssbridge-nginx' else set())
                for item in queue['items']:
                    eligible_status = item['status'] == 'needs-review' or completed_relays and item['status'] in ('mitigated', 'not-affected')
                    if item['artifact'] != build['imageId'] or item['scope'] != 'runtime-image' or not eligible_status or item['package'] in changed_packages:
                        continue
                    matches = [old for old in candidates if identity(old) == identity(item)]
                    if len(matches) != 1:
                        continue
                    old = matches[0]
                    decision = old.get('decision', {})
                    if old['status'] not in ('mitigated', 'not-affected') or decision.get('status') != old['status'] or decision.get('condition'):
                        continue
                    if dt.datetime.fromisoformat(decision['expiresAt'].replace('Z', '+00:00')) <= now:
                        continue
                    role_scope(row['containers'], item['containers'], expected_roles, old['containers'], extra == 'successors')
                    decisions.append({'key': item['key'], 'status': old['status'], 'expiresAt': decision['expiresAt'],
                        'reason': f"Retained exact {old['status']} review {old['key']} from SHA-bound {baseline_file.name} ({baseline_hash}). Full image comparison permits only selected vendor package payloads; this unchanged {item['package']} {item['installed']} is outside that set. Same advisory snapshot, advisory, severity and execution configuration; only roles with completed exact release receipts inherit this review. Original expiry retained. Scope proof {kind}/{row['key']}/scope.json ({scope_hash}). Original rationale and evidence remain in the private baseline. This records preserved prior repair evidence, not a new fix, advisory exception, or clearance of changed packages. Raw findings remain visible."})
                    matched += 1
                proofs.append({'key': row['key'], 'oldImage': row['base'], 'imageId': build['imageId'], 'carried': matched,
                               'scopeSha256': scope_hash, 'packagesChanged': sorted(changed_packages),
                               'verifiedReleasedRoles': sorted(expected_roles),
                               'notYetReleasedRoles': sorted(set(row['containers']) - set(expected_roles))})
            except Exception as error:
                skipped.append({'key': row['key'], 'error': type(error).__name__})
    output = ROOT / (extra + '/retained-reviewed-batch.json' if extra else 'alpine-crypto/retained-reviewed-batch.json' if alpine else 'leaves/retained-reviewed-batch.json' if leaves else 'openssl-runtime/retained-reviewed-batch.json' if openssl else 'libraries/retained-reviewed-batch.json' if libraries else 'retained-final-nginx-reviewed-batch.json' if final else 'retained-reviewed-batch.json')
    if completed_relays:
        assert all(not p['notYetReleasedRoles'] for p in proofs) and not skipped
        output = output.with_name('retained-completed-reviewed-batch-v2.json')
    assert not output.exists(), 'Preserve review evidence'
    output.write_text(json.dumps({'schemaVersion': 1, 'scanDate': scan['completedAt'], 'decisions': decisions,
        'baselineSha256': baseline_hash, 'proofs': proofs, 'skipped': skipped}, indent=2) + '\n')
    print(json.dumps({'prepared': len(decisions), 'skipped': skipped, 'applied': False}))
    return not skipped


if __name__ == '__main__':
    raise SystemExit(0 if main() else 1)
