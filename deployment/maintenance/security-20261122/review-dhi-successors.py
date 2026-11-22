"""Finite exact-payload review, including proven stale DHI metadata labels.

Raw records remain intact. This cannot approve a release or an open advisory
without one of the explicitly reviewed source fixes below.
"""
import datetime as dt
import importlib.util
import json
import os
from pathlib import Path
import tarfile

HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
RUNTIME = ROOT / 'dhi-successors'
spec = importlib.util.spec_from_file_location('payload', HERE / 'review-glibc.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
BACKPORTS = frozenset('CVE-2026-107493 CVE-2026-107496 CVE-2026-124709 CVE-2026-35190 CVE-2026-88822 CVE-2026-88823 CVE-2026-95691 CVE-2026-95692'.split())
VENDOR_FIXED = {
    '3.5.7-1~deb13u2': frozenset('CVE-2026-14456 CVE-2026-14457 CVE-2026-18798 CVE-2026-54874 CVE-2026-63072 CVE-2026-63073 CVE-2026-63074 CVE-2026-63075 CVE-2026-63076 CVE-2026-75803'.split()),
    '3.5.7-1~deb13u3': frozenset('CVE-2026-35189 CVE-2026-35191 CVE-2026-42772 CVE-2026-54872 CVE-2026-54873 CVE-2026-54875 CVE-2026-72897 CVE-2026-75804 CVE-2026-75805 CVE-2026-75806 CVE-2026-77696 CVE-2026-84782 CVE-2026-84784'.split()),
}
CRYPTO_IDS = BACKPORTS | frozenset().union(*VENDOR_FIXED.values())


def eligible(item, image, roles, package, versions, ids):
    return (item.get('status') == 'needs-review' and item.get('scope') == 'runtime-image'
            and item.get('type') == 'debian' and item.get('artifact') == image
            and item.get('package') == package and item.get('installed') in versions
            and item.get('id') in ids and sorted(item.get('containers', [])) == sorted(roles))


def main():
    os.umask(0o077)
    inputs = m.read(HERE / 'dhi-successor-inputs.json')
    source = m.read(RUNTIME / 'source/retained-fixes.json')
    assert source['passed'] and m.sha(RUNTIME / 'source/retained-fixes.json') == inputs['sourceProofSha256']
    assert {p['advisory'] for p in source['patches']} == BACKPORTS
    acquired = m.read(RUNTIME / 'source/acquired.json')
    assert m.sha(RUNTIME / 'source/acquired.json') == source['sourceAcquisitionSha256']
    for row in acquired['sources']:
        for file in row['files']:
            assert m.sha(RUNTIME / 'source' / file['file']) == file['sha256']
    # These two vendor source patches were reviewed separately from OpenSSL.
    for archive, patch in [
        ('freetype_2.13.3+dfsg-1+deb13u1+dhi1.debian.tar.xz', 'dhi-cve-2026-95512-cid-read-subrs-overlap-limit.patch'),
        ('nghttp2_1.64.0-1.1+deb13u2+dhi0.debian.tar.xz', 'CVE-2026-58055.patch')]:
        with tarfile.open(RUNTIME / 'source' / archive) as tar:
            assert patch in tar.extractfile('debian/patches/series').read().decode().splitlines()
            assert tar.extractfile('debian/patches/' + patch).read()
    tracker_file = ROOT / 'primary/debian-security-tracker.json'
    assert m.sha(tracker_file) == m.TRACKER_SHA
    tracker = m.read(tracker_file)
    for version, identifiers in VENDOR_FIXED.items():
        for identifier in identifiers:
            release = tracker['openssl'][identifier]['releases']['trixie']
            assert release['status'] == 'resolved' and release['fixed_version'] == version
    scan, queue = [m.read(ROOT.parent / name) for name in ('security.json', 'security-queue.json')]
    assert scan['status'] == 'checked' and queue['status'] == 'current' and scan['completedAt'] == queue['scanDate']
    now = dt.datetime.now(dt.timezone.utc)
    assert dt.timedelta(0) <= now - dt.datetime.fromisoformat(scan['completedAt'].replace('Z', '+00:00')) < dt.timedelta(days=1)
    aggregate = m.read(RUNTIME / 'vendor-debian/release.json')
    assert aggregate['status'] == 'passed' and aggregate['completedAt'] < scan['completedAt']
    for receipt in aggregate['sourceReceipts']:
        assert m.sha(receipt['path']) == receipt['sha256']
    metadata = m.read(RUNTIME / 'baseline-inventories.json')
    assert m.sha(RUNTIME / 'baseline-inventories.json') == inputs['baselineInventorySha256']
    decisions, proofs = [], []
    for row in inputs['rows']:
        assert row['releaseApproval'] == 'approved'
        out = RUNTIME / 'vendor-debian' / row['key']
        build, scope = m.read(out / 'build.json'), m.read(out / 'scope.json')
        assert build['passed'] and scope['passed'] and scope['allUnrelatedImageFilesUnchanged'] and scope['configurationUnchanged']
        for name, digest in (row['reviewedEvidence'] | row['nativeEvidence']).items():
            assert m.sha(out / name) == digest
        roles = [r for g in aggregate['groups'] if g['key'] == row['key'] for r in g['rows']]
        assert {r['name'] for r in roles} == set(row['containers'])
        assert all(r['oldImage'] == row['base'] and r['newImage'] == build['imageId'] for r in roles)
        observed = next(i for i in scan['images'] if i['id'] == build['imageId'])
        assert observed['status'] == 'checked' and sorted(observed['containers']) == sorted(row['containers'])
        aliases = next(r['selectedMetadataAliases'] for r in metadata['rows'] if r['image'] == row['base'])
        for name in row['containers']:
            assert m.command(['docker', 'inspect', '--format', '{{.Image}} {{.State.Running}}', name]) == build['imageId'] + ' true'
        for package, selected in row['packages'].items():
            pin = inputs['packages'][selected['package']]
            if package in ('libssl3t64', 'openssl', 'openssl-provider-legacy'):
                assert pin['version'] == '3.5.9-1~deb13u1+dhi0'
                ids = CRYPTO_IDS
            elif package == 'libfreetype6':
                assert pin['version'] == '2.13.3+dfsg-1+deb13u1+dhi1'
                ids = {'CVE-2026-95512'}
            else:
                assert package == 'libnghttp2-14' and pin['version'] == '1.64.0-1.1+deb13u2+dhi0'
                ids = {'CVE-2026-58055'}
            versions = {pin['version']}
            m.ROOT, m.VERSION = RUNTIME, pin['version']
            payload = m.payload(pin)
            for name in row['containers']:
                assert m.command(['docker', 'exec', name, 'dpkg-query', '-W', '-f=${Version}', package]) == pin['version']
                actual = m.command(['docker', 'exec', name, 'sha256sum', *payload['files']]).splitlines()
                m.verify_hashes(payload['files'], {line.split(maxsplit=1)[1]: line.split(maxsplit=1)[0] for line in actual})
                for path, target in payload['links'].items():
                    assert m.command(['docker', 'exec', name, 'readlink', path]) == target
                if package in aliases:
                    alias = aliases[package]
                    assert m.command(['docker', 'exec', name, 'sha256sum', alias['path']]).split()[0] == alias['sha256']
                    versions.add(alias['version'])
            proofs.append({'key': row['key'], 'imageId': build['imageId'], 'package': package,
                'actualVersion': pin['version'], 'metadataVersions': sorted(versions), 'payload': payload,
                'archiveSha256': pin['sha256'], 'scopeSha256': m.sha(out / 'scope.json')})
            for item in queue['items']:
                if eligible(item, build['imageId'], row['containers'], package, versions, ids):
                    decisions.append({'key': item['key'], 'status': 'mitigated', 'expiresAt': (now + dt.timedelta(days=7)).isoformat(),
                        'reason': f"Exact signed DHI {package} {pin['version']} payload and symlinks verified in the running released image. {item['id']} is covered by the enumerated vendor/upstream fixes, signed packaging source and frozen primary evidence. Eight OpenSSL backports match reviewed upstream hunks byte-for-byte. Native crypto/TLS/regression/application tests passed; exporter also passed HTTP/2 and font checks. Any older scanner label is tied to unchanged status.d bytes, not a second installed library. Raw findings retained; CVE-2026-84786 and CVE-2026-95690 remain open. No exploit reproduction for every advisory or complete upstream suite for this vendor binary is claimed. Evidence: security-20261122/dhi-successors/vendor-payload-review.json."})
    assert m.read(ROOT.parent / 'security.json')['completedAt'] == scan['completedAt']
    output = RUNTIME / 'vendor-payload-review.json'
    assert not output.exists()
    output.write_text(json.dumps({'schemaVersion': 1, 'scanDate': scan['completedAt'], 'decisions': decisions,
        'proofs': proofs, 'sourceProofSha256': inputs['sourceProofSha256'], 'applied': False,
        'productionChanged': False}, indent=2) + '\n')
    print(json.dumps({'prepared': len(decisions), 'applied': False}))


if __name__ == '__main__':
    main()
