"""Prepare exact vendor-fixed decisions; never deploy or edit the review ledger.

Only the fourteen advisories explicitly fixed by the authenticated u5 source
and Debian tracker are eligible. Other glibc findings remain open. Native
compatibility tests are not presented as exploit reproductions.
"""
import datetime as dt
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import tarfile

HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
VERSION = '2.41-12+deb13u5'
IDS = frozenset('CVE-2026-6238 CVE-2026-5435 CVE-2026-6791 CVE-2026-6368 CVE-2026-19542 CVE-2026-19499 CVE-2026-77117 CVE-2026-80489 CVE-2026-18374 CVE-2026-8674 CVE-2026-89092 CVE-2026-86805 CVE-2026-95818 CVE-2026-97399'.split())
TRACKER_SHA = '56ab97cc2791c8dd0476b7d3d060a7a76c9bb9f13a8185131507a6889373759c'
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
read = lambda p: json.loads(Path(p).read_text())


def eligible(item, row, image):
    return (item.get('type') == 'debian' and item.get('scope') == 'runtime-image'
            and item.get('artifact') == image and item.get('installed') == VERSION
            and item.get('id') in IDS and item.get('package') in row['packages']
            and row['packages'][item['package']]['package'] in {
                'trixie/libc6', 'trixie/libc-bin', 'trixie/libc-dev-bin',
                'trixie/libc6-dev', 'trixie/libc-l10n', 'trixie/locales'}
            and sorted(item.get('containers', [])) == sorted(row['containers']))


def command(args):
    return subprocess.check_output(args, timeout=40, stderr=subprocess.PIPE).decode().strip()


def verify_hashes(expected, observed):
    if not expected or expected != observed:
        raise ValueError('Installed package bytes do not match the authenticated artifact')


def distroless_payload(name, manifest):
    """Copy only named signed-package files; no shell or user-data traversal."""
    observed, links = {}, {}
    for filename in list(manifest['files']) + list(manifest['links']):
        blob = subprocess.check_output(['docker', 'cp', name + ':' + filename, '-'], timeout=30, stderr=subprocess.PIPE)
        assert len(blob) < 32 * 1024**2
        with tarfile.open(fileobj=io.BytesIO(blob)) as archive:
            entries = [m for m in archive if not m.isdir()]
            assert len(entries) == 1
            entry = entries[0]
            if filename in manifest['files']:
                assert entry.isfile()
                observed[filename] = hashlib.sha256(archive.extractfile(entry).read()).hexdigest()
            else:
                assert entry.issym()
                links[filename] = entry.linkname
    verify_hashes(manifest['files'], observed)
    assert links == manifest['links']


def payload(pin):
    deb = ROOT / 'debian-acquisition' / pin['file']
    assert sha(deb) == pin['sha256']
    assert command(['dpkg-deb', '-f', str(deb), 'Package']) == pin['name']
    assert command(['dpkg-deb', '-f', str(deb), 'Version']) == VERSION
    files, links = {}, {}
    with tempfile.TemporaryDirectory(prefix='glibc-payload-', dir=ROOT) as directory:
        subprocess.run(['dpkg-deb', '-x', str(deb), directory], check=True, timeout=40, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        for base, dirs, names in os.walk(directory):
            for name in dirs + names:
                p = Path(base) / name
                target = '/' + str(p.relative_to(directory))
                assert '\n' not in target and '\\' not in target
                # Minimal Debian images intentionally omit documentation using
                # existing dpkg path-exclude rules. It is not executable or
                # consumed locale data. Verify every other supplied file.
                if target.startswith(('/usr/share/doc/', '/usr/share/man/', '/usr/share/lintian/')):
                    continue
                if p.is_symlink():
                    links[target] = os.readlink(p)
                elif p.is_file():
                    files[target] = sha(p)
    assert files
    return {'files': dict(sorted(files.items())), 'links': dict(sorted(links.items()))}


def run():
    os.umask(0o077)
    now = dt.datetime.now(dt.timezone.utc)
    scan = read(ROOT.parent / 'security.json')
    queue = read(ROOT.parent / 'security-queue.json')
    assert scan['status'] == 'checked' and queue['status'] == 'current'
    assert queue['scanDate'] == scan['completedAt']
    assert dt.timedelta(0) <= now - dt.datetime.fromisoformat(scan['completedAt'].replace('Z', '+00:00')) < dt.timedelta(days=1)
    inputs = read(HERE / 'debian-inputs.json')
    acquisition = ROOT / 'debian-acquisition/authenticated.json'
    assert sha(acquisition) == inputs['acquisitionSha256']
    tracker_path = ROOT / 'primary/debian-security-tracker.json'
    assert sha(tracker_path) == TRACKER_SHA
    tracker = read(tracker_path)['glibc']
    for identifier in IDS:
        release = tracker[identifier]['releases']['trixie']
        assert release['status'] == 'resolved' and release['fixed_version'] == VERSION
    decisions, proofs, skipped, manifests = [], [], [], {}
    for row in inputs['rows']:
        if row.get('releaseApproval') != 'approved' or 'libc6' not in row['packages']:
            continue
        directory = ROOT / 'vendor-debian' / row['key']
        try:
            build, scope, app = [read(directory / (n + '.json')) for n in ('build', 'scope', 'application')]
            image = build['imageId']
            items = [i for i in queue['items'] if eligible(i, row, image)]
            if not items:
                continue
            assert all(sha(directory / f) == digest for f, digest in row['reviewedEvidence'].items())
            assert build['passed'] and scope['passed'] and app['passed']
            assert scope['allUnrelatedImageFilesUnchanged'] and scope['configurationUnchanged']
            assert build['nativeRows'] and all(n['passed'] and n['checks'] >= 9 for n in build['nativeRows'])
            assert next(i for i in scan['images'] if i['id'] == image)['status'] == 'checked'
            receipts, released = [], set()
            for f in sorted(directory.glob('release-utilibre*.json')):
                receipt = read(f)
                assert receipt['status'] == 'passed'
                assert dt.datetime.fromisoformat(receipt['completedAt'].replace('Z', '+00:00')) <= dt.datetime.fromisoformat(scan['date'].replace('Z', '+00:00'))
                receipts.append({'path': str(f), 'sha256': sha(f)})
                for role in receipt['group']['rows']:
                    if role['newImage'] == image and role['oldImage'] == row['base']:
                        released.add(role['name'])
            assert released == set(row['containers'])
            for name in row['containers']:
                observed = command(['docker', 'inspect', '--format', '{{.Image}} {{.State.Running}}', name])
                assert observed == image + ' true'
            for package in sorted({i['package'] for i in items}):
                pin = inputs['packages'][row['packages'][package]['package']]
                assert pin['version'] == VERSION
                if package not in manifests:
                    manifests[package] = payload(pin)
                manifest = manifests[package]
                for name in row['containers']:
                    if row['key'] == 'community-yopass':
                        assert package == 'libc6'
                        # Candidate package inventory and immutable image ID
                        # were already bound above; compare actual live bytes.
                        distroless_payload(name, manifest)
                        continue
                    assert command(['docker', 'exec', name, 'dpkg-query', '-W', '-f=${Version}', package]) == VERSION
                    observed = {}
                    paths = list(manifest['files'])
                    for start in range(0, len(paths), 100):
                        lines = command(['docker', 'exec', name, 'sha256sum', '--', *paths[start:start + 100]]).splitlines()
                        for line in lines:
                            digest, filename = line.split('  ', 1)
                            assert filename not in observed
                            observed[filename] = digest
                    verify_hashes(manifest['files'], observed)
                    for filename, target in manifest['links'].items():
                        assert command(['docker', 'exec', name, 'readlink', '--', filename]) == target
                proof = {'artifact': image, 'containers': row['containers'], 'package': package, 'version': VERSION,
                         'debSha256': pin['sha256'], 'payload': manifest, 'receipts': receipts,
                         'scopeSha256': sha(directory / 'scope.json'), 'applicationSha256': sha(directory / 'application.json')}
                proofs.append(proof)
                proof_hash = hashlib.sha256(json.dumps(proof, sort_keys=True).encode()).hexdigest()
                for item in items:
                    if item['package'] != package:
                        continue
                    decisions.append({'key': item['key'], 'status': 'not-affected',
                        'expiresAt': (now + dt.timedelta(days=7)).isoformat(),
                        'reason': f"Debian's authenticated glibc {VERSION} and pinned primary tracker explicitly fix {item['id']}. Exact {image}, {package}: every packaged file/symlink except non-runtime documentation matches the signed artifact; release and native application/libc checks passed. Proof {proof_hash}; package {pin['sha256']}; tracker {TRACKER_SHA}. Existing image policy omits docs, manuals and lintian metadata; runtime, headers and locale payloads are checked. The frozen scanner retains its older distribution match. No exploit reproduction or exemption for other glibc advisories. Raw findings retained; seven-day review. https://security-tracker.debian.org/tracker/{item['id']}"})
        except Exception as error:
            # No command output or environment is copied into a public report.
            skipped.append({'key': row['key'], 'error': type(error).__name__, 'message': str(error)[:180] if isinstance(error, (AssertionError, ValueError)) else 'Bounded package verification failed; no decision issued'})
    report = {'date': now.isoformat(), 'scanDate': scan['completedAt'], 'applied': False,
              'inputs': {'scanSha256': sha(ROOT.parent / 'security.json'), 'queueSha256': sha(ROOT.parent / 'security-queue.json'), 'checkerSha256': sha(__file__), 'trackerSha256': TRACKER_SHA},
              'decisions': decisions, 'proofs': proofs, 'skipped': skipped,
              'limitations': ['Vendor-fixed fourteen-ID allowlist only; all other glibc findings remain pending.', 'Ordinary native compatibility tests, not per-advisory exploit reproductions.']}
    assert sys.argv[1:] in ([], ['--after-yopass'])
    output = ROOT / ('glibc-review-after-yopass.json' if sys.argv[1:] else 'glibc-review-v2.json')
    assert not output.exists(), 'Preserve completed review evidence'
    output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'prepared': len(decisions), 'skipped': skipped, 'applied': False, 'report': str(output)}))
    return not skipped


if __name__ == '__main__':
    raise SystemExit(0 if run() else 1)
