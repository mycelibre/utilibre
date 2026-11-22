"""Finite vendor-fixed review; preserve raw findings and open advisories.

Reuses the signed Debian package/payload checker. No network, deployments,
automatic acceptance, severity filtering or expiry extension.
"""
import datetime as dt
import importlib.util
import json
import os
from pathlib import Path
import sys

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('payload', HERE / 'review-glibc.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
ROOT = m.ROOT
POLICY = {
    'libfreetype6': ('freetype', '2.13.3+dfsg-1+deb13u2', {'CVE-2026-95512'}),
    'libnghttp2-14': ('nghttp2', '1.64.0-1.1+deb13u2', {'CVE-2026-58055'}),
    'libmongocrypt0': ('libmongocrypt', '1.13.2-1+deb13u2', set('CVE-2026-106429 CVE-2026-106433 CVE-2026-106434 CVE-2026-114655 CVE-2026-84962 CVE-2026-84971'.split())),
}
for package in ('libbson-1.0-0t64', 'libmongoc-1.0-0t64'):
    POLICY[package] = ('mongo-c-driver', '1.30.4-1+deb13u5', set('CVE-2026-106428 CVE-2026-106431 CVE-2026-106437 CVE-2026-106438 CVE-2026-120678 CVE-2026-120684 CVE-2026-120955 CVE-2026-120956 CVE-2026-84963 CVE-2026-84964 CVE-2026-84965 CVE-2026-84969 CVE-2026-88035 CVE-2026-88036 CVE-2026-93394 CVE-2026-96746'.split()))


def eligible(item, image, containers, package, include_reviewed=False):
    status = item.get('status') == 'needs-review' or include_reviewed and item.get('status') in ('mitigated', 'not-affected')
    return (status and item.get('scope') == 'runtime-image'
            and item.get('type') == 'debian' and item.get('artifact') == image
            and item.get('package') == package and package in POLICY
            and item.get('installed') == POLICY[package][1] and item.get('id') in POLICY[package][2]
            and sorted(item.get('containers', [])) == sorted(containers))


def main():
    assert sys.argv[1:] in (['--leaves'], ['--mongo'], ['--mongo', '--released-only'], ['--mongo', '--completed'], ['--remaining-vendor'])
    os.umask(0o077)
    mongo = sys.argv[1] == '--mongo'
    remaining = sys.argv[1] == '--remaining-vendor'
    partial = sys.argv[1:] == ['--mongo', '--released-only']
    completed = sys.argv[1:] == ['--mongo', '--completed']
    directory = ROOT / ('remaining-vendor' if remaining else 'successors' if mongo else 'leaves')
    inputs = m.read(HERE / ('remaining-vendor-inputs.json' if remaining else 'successor-runtime-inputs.json' if mongo else 'debian-leaf-inputs.json'))
    output = directory / ('vendor-payload-completed-review.json' if completed else 'vendor-payload-partial-review.json' if partial else 'vendor-payload-review.json')
    assert not output.exists(), 'Preserve prior evidence'
    scan, queue = [m.read(ROOT.parent / name) for name in ('security.json', 'security-queue.json')]
    assert scan['status'] == 'checked' and queue['status'] == 'current'
    assert scan['completedAt'] == queue['scanDate']
    now = dt.datetime.now(dt.timezone.utc)
    assert dt.timedelta(0) <= now - dt.datetime.fromisoformat(scan['completedAt'].replace('Z', '+00:00')) < dt.timedelta(days=1)
    primary = ROOT / 'primary/debian-security-tracker.json'
    assert m.sha(primary) == m.TRACKER_SHA
    tracker = m.read(primary)
    proofs, decisions = [], []
    for row in inputs['rows']:
        assert row['releaseApproval'] == 'approved'
        out = directory / 'vendor-debian' / row['key']
        b, scope = [m.read(out / (n + '.json')) for n in ('build', 'scope')]
        assert b['passed'] and scope['passed'] and scope['base'] == row['base'] and scope['imageId'] == b['imageId']
        assert scope['allUnrelatedImageFilesUnchanged'] and scope['unrelatedDpkgRecordsUnchanged'] and scope['configurationUnchanged']
        for name, digest in row['reviewedEvidence'].items():
            assert m.sha(out / name) == digest
        if mongo:
            for name, digest in row['nativeEvidence'].items():
                assert m.sha(out / name) == digest
                value = m.read(out / name)
                assert value['passed'] and value['base'] == row['base'] and value['imageId'] == b['imageId']
        released = []
        for path in sorted(out.glob('release-utilibre*.json')):
            r = m.read(path)
            assert r['status'] == r['group']['status'] == 'passed' and r['completedAt'] < scan['completedAt']
            assert r['buildSha256'] == m.sha(out / 'build.json') and r['configurationUnchanged']
            released.extend(x['name'] for x in r['group']['rows'] if x['oldImage'] == row['base'] and x['newImage'] == b['imageId'])
        assert released and len(released) == len(set(released))
        if partial:
            assert set(released) < set(row['containers']), 'This mode is only for an explicitly incomplete release'
            for name in set(row['containers']) - set(released):
                assert m.command(['docker', 'inspect', '--format', '{{.Image}} {{.State.Running}}', name]) == row['base'] + ' true'
        else:
            assert sorted(released) == sorted(row['containers'])
        observed = next(i for i in scan['images'] if i['id'] == b['imageId'])
        assert observed['status'] == 'checked' and sorted(observed['containers']) == sorted(released)
        for name in released:
            assert m.command(['docker', 'inspect', '--format', '{{.Image}} {{.State.Running}}', name]) == b['imageId'] + ' true'
        for package, selection in row['packages'].items():
            if package not in POLICY:
                continue
            source, version, ids = POLICY[package]
            pin = inputs['packages'][selection['package']]
            assert pin['version'] == version
            for identifier in ids:
                record = tracker[source][identifier]['releases']['trixie']
                assert record['status'] == 'resolved' and record['fixed_version'] == version
            m.ROOT, m.VERSION = directory, version
            payload = m.payload(pin)
            for name in released:
                assert m.command(['docker', 'exec', name, 'dpkg-query', '-W', '-f=${Version}', package]) == version
                lines = m.command(['docker', 'exec', name, 'sha256sum', *payload['files']]).splitlines()
                actual = {line.split(maxsplit=1)[1]: line.split(maxsplit=1)[0] for line in lines}
                m.verify_hashes(payload['files'], actual)
                for path, target in payload['links'].items():
                    assert m.command(['docker', 'exec', name, 'readlink', path]) == target
            proofs.append({'key': row['key'], 'imageId': b['imageId'], 'package': package,
                           'packageSha256': pin['sha256'], 'payload': payload, 'scopeSha256': m.sha(out / 'scope.json'),
                           'verifiedReleasedRoles': sorted(released),
                           'notYetReleasedRoles': sorted(set(row['containers']) - set(released))})
            for item in queue['items']:
                if eligible(item, b['imageId'], released, package, completed):
                    expiry = item['decision']['expiresAt'] if completed and item['status'] in ('mitigated', 'not-affected') else (now + dt.timedelta(days=7)).isoformat()
                    assert dt.datetime.fromisoformat(expiry.replace('Z', '+00:00')) > now
                    decisions.append({'key': item['key'], 'status': 'mitigated', 'expiresAt': expiry,
                        'reason': f"Debian's pinned primary tracker explicitly fixes {item['id']} in {version}. Every installed non-documentation package file/symlink matches authenticated archive {pin['sha256']}; current image, released service roles, completed scoped release and native compatibility checks are verified. Evidence: security-20261122/{directory.name}/{output.name}. Unreleased roles receive no new review. Mongo successors additionally preserve all six retained source fixes and pass native BSON boundary and upstream automatic/explicit encryption/decryption examples. Frozen scanner raw matches remain; no per-CVE exploit reproduction or clearance of unrelated advisories is claimed. Seven-day exact-byte review. https://security-tracker.debian.org/tracker/{item['id']}"})
    assert m.read(ROOT.parent / 'security.json')['completedAt'] == scan['completedAt']
    output.write_text(json.dumps({'schemaVersion': 1, 'date': now.isoformat(), 'scanDate': scan['completedAt'],
        'decisions': decisions, 'proofs': proofs, 'primarySha256': m.sha(primary), 'applied': False,
        'productionChanged': False}, indent=2) + '\n')
    print(json.dumps({'prepared': len(decisions), 'output': str(output), 'applied': False}))


if __name__ == '__main__':
    main()
