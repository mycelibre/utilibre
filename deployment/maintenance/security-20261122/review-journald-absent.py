"""Review only systemd-journald CVE-2026-40228 image matches without that binary."""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess

os.umask(0o077)
ROOT = Path('/var/lib/utilibre-maintenance')
OUT = ROOT / 'security-20261122/journald-absent'
read = lambda path: json.loads(Path(path).read_text())
sha = lambda path: hashlib.sha256(Path(path).read_bytes()).hexdigest()

scan, queue = [read(ROOT / name) for name in ('security.json', 'security-queue.json')]
assert scan['status'] == 'checked' and queue['status'] == 'current'
assert scan['completedAt'] == queue['scanDate']
assert dt.timedelta(0) <= dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(scan['completedAt'].replace('Z', '+00:00')) < dt.timedelta(days=1)
assert not OUT.exists()
primary = ROOT / 'security-20261122/primary/debian-security-tracker.json'
assert sha(primary) == '56ab97cc2791c8dd0476b7d3d060a7a76c9bb9f13a8185131507a6889373759c'
entry = read(primary)['systemd']['CVE-2026-40228']
assert 'systemd-journald' in entry['description'] and 'ForwardToWall=yes' in entry['description']
items = [row for row in queue['items'] if row['id'] == 'CVE-2026-40228'
         and row['status'] == 'needs-review' and row['scope'] == 'runtime-image'
         and row['type'] in ('debian', 'ubuntu') and row['package'] in ('libsystemd0', 'libudev1')]
images = {row['id']: row for row in scan['images']}
by_image = {}
checks = []
for artifact in sorted({row['artifact'] for row in items}):
    observed = images[artifact]
    assert observed['status'] == 'checked' and observed['containers']
    absent = True
    for role in sorted(observed['containers']):
        info = json.loads(subprocess.check_output(['docker', 'inspect', role], timeout=20))[0]
        assert info['Image'] == artifact and info['State']['Running']
        root = Path('/proc') / str(info['State']['Pid']) / 'root'
        paths = [root / 'lib/systemd/systemd-journald', root / 'usr/lib/systemd/systemd-journald']
        present = any(path.exists() for path in paths)
        absent &= not present
        checks.append({'artifact': artifact, 'role': role,
                       'journaldBinaryPresent': present,
                       'checkedPaths': ['/lib/systemd/systemd-journald',
                                        '/usr/lib/systemd/systemd-journald']})
    by_image[artifact] = absent
selected = [row for row in items if by_image[row['artifact']]]
assert len(selected) == 60 and len({row['artifact'] for row in selected}) == 29
assert all(row['severity'] == 'LOW' and row['package'] in ('libsystemd0', 'libudev1') for row in selected)
counts = {image: len([row for row in selected if row['artifact'] == image])
          for image in {row['artifact'] for row in selected}}
assert sorted(counts.values()) == [2] * 28 + [4]
assert next(image for image, count in counts.items() if count == 4) == 'sha256:30755120cf221a00d19bcee7c4af9b469153f5c2ab4dfe7a1a95e2e62d649ffe'
assert any(row['journaldBinaryPresent'] for row in checks), 'Reviewer must leave images with journald open'
OUT.mkdir(mode=0o700)
proof = {'date': dt.datetime.now(dt.timezone.utc).isoformat(), 'passed': True,
         'scanDate': scan['completedAt'], 'primarySha256': sha(primary),
         'advisory': 'CVE-2026-40228', 'checks': checks,
         'selectedImageCount': 29, 'selectedRecordCount': len(selected),
         'hostReviewed': False, 'imagesWithJournaldReviewed': False,
         'productionChanged': False}
(OUT / 'runtime.json').write_text(json.dumps(proof, indent=2) + '\n')
expiry = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=7)).isoformat()
reason = ('CVE-2026-40228 requires systemd-journald forwarding emergency messages to wall. '
          'The exact current image and every running role lack the journald executable at both standard paths; only source-package library matches are selected. '
          f'Per-role proof: security-20261122/journald-absent/runtime.json SHA256 {sha(OUT / "runtime.json")}. '
          'Images containing journald and the host remain open. Review expires on image/mount changes or in seven days. '
          'https://security-tracker.debian.org/tracker/CVE-2026-40228')
batch = {'schemaVersion': 1, 'scanDate': scan['completedAt'],
         'decisions': [{'key': row['key'], 'status': 'not-affected',
                        'reason': reason, 'expiresAt': expiry}
                       for row in sorted(selected, key=lambda row: row['key'])],
         'runtimeProofSha256': sha(OUT / 'runtime.json'),
         'productionChanged': False}
(OUT / 'review.json').write_text(json.dumps(batch, indent=2) + '\n')
print(json.dumps({'prepared': len(selected), 'imagesChecked': len(by_image),
                  'imagesWithoutJournald': 29, 'hostReviewed': False,
                  'productionChanged': False}))
