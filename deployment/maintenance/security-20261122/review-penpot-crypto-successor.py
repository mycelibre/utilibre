"""Revalidate one proven OpenSSL backport across the two Penpot package overlays."""
import datetime as dt
import hashlib
import importlib.util
import json
import os
from pathlib import Path

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
source = importlib.util.spec_from_file_location('payload', HERE / 'review-glibc.py')
m = importlib.util.module_from_spec(source)
source.loader.exec_module(m)
read = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
old_dir = ROOT / 'dhi-successors'
old_inputs = read(HERE / 'dhi-successor-inputs.json')
new_inputs = read(HERE / 'penpot-glibc-inputs.json')
source_proof = read(old_dir / 'source/retained-fixes.json')
assert source_proof['passed'] and sha(old_dir / 'source/retained-fixes.json') == old_inputs['sourceProofSha256']
assert any(p['advisory'] == 'CVE-2026-124709' for p in source_proof['patches'])
fixed_vendor = {'CVE-2026-14456': '3.5.7-1~deb13u2',
                'CVE-2026-84782': '3.5.7-1~deb13u3'}
tracker_file = ROOT / 'primary/debian-security-tracker.json'
assert sha(tracker_file) == m.TRACKER_SHA
tracker = read(tracker_file)
for identifier, version in fixed_vendor.items():
    release = tracker['openssl'][identifier]['releases']['trixie']
    assert release['status'] == 'resolved' and release['fixed_version'] == version
reviewed_ids = {'CVE-2026-124709', *fixed_vendor}
old_review = read(old_dir / 'vendor-payload-review.json')
assert old_review['sourceProofSha256'] == old_inputs['sourceProofSha256']
old_release = read(old_dir / 'vendor-debian/release.json')
assert old_release['status'] == 'passed'
metadata = read(old_dir / 'baseline-inventories.json')
assert sha(old_dir / 'baseline-inventories.json') == old_inputs['baselineInventorySha256']
scan, queue = read(ROOT.parent / 'security.json'), read(ROOT.parent / 'security-queue.json')
assert scan['status'] == 'checked' and queue['status'] == 'current'
assert scan['completedAt'] == queue['scanDate']
now = dt.datetime.now(dt.timezone.utc)
assert dt.timedelta(0) <= now - dt.datetime.fromisoformat(scan['completedAt'].replace('Z', '+00:00')) < dt.timedelta(days=1)
decisions, proofs = [], []
for role in ('frontend', 'exporter'):
    old = next(r for r in old_inputs['rows'] if r['key'] == f'expanded-penpot-{role}')
    new = next(r for r in new_inputs['rows'] if r['key'] == f'expanded-penpot-{role}-glibc')
    out = ROOT / 'vendor-debian' / new['key']
    build, scope, app, gate = [read(out / (n + '.json')) for n in ('build', 'scope', 'application', 'scan-gate')]
    assert all(x['passed'] for x in (build, scope, app, gate))
    assert build['base'] == next(g['rows'][0]['newImage'] for g in old_release['groups']
        if g['key'] == old['key']) == new['base']
    assert new['releaseApproval'] == 'approved'
    assert scope['allUnrelatedImageFilesUnchanged'] and scope['configurationUnchanged']
    for name, digest in new['reviewedEvidence'].items():
        assert sha(out / name) == digest
    receipt_file = out / 'release-utilibre-expanded.json'
    receipt = read(receipt_file)
    assert receipt['status'] == receipt['group']['status'] == 'passed'
    assert receipt['buildSha256'] == sha(out / 'build.json')
    assert receipt['group']['rows'][0]['oldImage'] == new['base']
    assert receipt['group']['rows'][0]['newImage'] == build['imageId']
    assert receipt['completedAt'] < scan['completedAt']
    assert app['imageId'] == gate['imageId'] == build['imageId']
    observed = next(i for i in scan['images'] if i['id'] == build['imageId'])
    assert observed['status'] == 'checked' and observed['containers'] == new['containers']
    alias = next(r['selectedMetadataAliases'] for r in metadata['rows'] if r['image'] == old['base'])
    for package in ('libssl3t64', 'openssl', 'openssl-provider-legacy'):
        pin = old_inputs['packages'][old['packages'][package]['package']]
        assert pin['version'] == '3.5.9-1~deb13u1+dhi0'
        prior = next(p for p in old_review['proofs'] if p['key'] == old['key'] and p['package'] == package)
        assert prior['imageId'] == new['base'] and prior['archiveSha256'] == pin['sha256']
        m.ROOT, m.VERSION = old_dir, pin['version']
        payload = m.payload(pin)
        assert payload == prior['payload']
        labels = set(prior['metadataVersions'])
        assert pin['version'] in labels
        for container in new['containers']:
            assert m.command(['docker', 'inspect', '--format', '{{.Image}} {{.State.Running}}', container]) == build['imageId'] + ' true'
            assert m.command(['docker', 'exec', container, 'dpkg-query', '-W', '-f=${Version}', package]) == pin['version']
            lines = m.command(['docker', 'exec', container, 'sha256sum', *payload['files']]).splitlines()
            m.verify_hashes(payload['files'], {line.split(maxsplit=1)[1]: line.split(maxsplit=1)[0] for line in lines})
            for path, target in payload['links'].items():
                assert m.command(['docker', 'exec', container, 'readlink', path]) == target
            if package in alias:
                old_label = alias[package]
                assert m.command(['docker', 'exec', container, 'sha256sum', old_label['path']]).split()[0] == old_label['sha256']
                labels.add(old_label['version'])
        proofs.append({'role': role, 'imageId': build['imageId'], 'package': package,
                       'archiveSha256': pin['sha256'], 'oldReviewSha256': sha(old_dir / 'vendor-payload-review.json'),
                       'newReleaseSha256': sha(receipt_file), 'verifiedLabels': sorted(labels)})
        for item in queue['items']:
            if (item['status'] == 'needs-review' and item['id'] in reviewed_ids
                    and item['scope'] == 'runtime-image' and item['type'] == 'debian'
                    and item['artifact'] == build['imageId'] and item['package'] == package
                    and item['installed'] in labels and item['containers'] == new['containers']):
                decisions.append({'key': item['key'], 'status': 'mitigated',
                    'expiresAt': (now + dt.timedelta(days=7)).isoformat(),
                    'reason': f"Exact signed DHI OpenSSL {pin['version']} package payload and links match every live file in {container}. The archived signed-source proof contains the CVE-2026-124709 backport; the pinned Debian tracker fixes the two separately named vendor advisories before this installed version. Native tests and the first scoped release passed. The later glibc/font overlay leaves all OpenSSL files unchanged and passed its own scope, native check and release. The older scanner label is retained status.d metadata; the active package is {pin['version']}. This review covers only {item['id']}, package and image and expires in seven days. Raw findings remain. Evidence: security-20261122/dhi-successors/vendor-payload-review.json and vendor-debian/{new['key']}/release-utilibre-expanded.json."})
assert read(ROOT.parent / 'security.json')['completedAt'] == scan['completedAt']
output = ROOT / 'penpot-crypto-successor-review-v2.json'
assert not output.exists(), 'Preserve completed review'
output.write_text(json.dumps({'date': now.isoformat(), 'scanDate': scan['completedAt'],
    'applied': False, 'decisions': decisions, 'proofs': proofs,
    'sourceProofSha256': old_inputs['sourceProofSha256'], 'productionChanged': False}, indent=2) + '\n')
print(json.dumps({'prepared': len(decisions), 'packageProofs': len(proofs), 'applied': False}))
