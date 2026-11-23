"""Review two exact sealed-journal matches in images without journal machinery."""

import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess

os.umask(0o077)
ROOT = Path('/var/lib/utilibre-maintenance')
OUT = ROOT / 'security-20261122/sealed-journal'
TRACKER = ROOT / 'security-20261122/primary/debian-security-tracker.json'
TRACKER_SHA256 = '56ab97cc2791c8dd0476b7d3d060a7a76c9bb9f13a8185131507a6889373759c'
ADVISORIES = ('CVE-2023-31438', 'CVE-2023-31439')
BINARIES = ('lib/systemd/systemd', 'usr/lib/systemd/systemd',
            'lib/systemd/systemd-journald', 'usr/lib/systemd/systemd-journald',
            'bin/journalctl', 'usr/bin/journalctl')


def read(path):
    return json.loads(Path(path).read_text())


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


scan = read(ROOT / 'security.json')
queue = read(ROOT / 'security-queue.json')
assert scan['status'] == 'checked' and queue['status'] == 'current'
assert scan['completedAt'] == queue['scanDate']
assert dt.timedelta(0) <= dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(
    scan['completedAt'].replace('Z', '+00:00')) < dt.timedelta(days=1)
assert sha(TRACKER) == TRACKER_SHA256 and not OUT.exists()
tracker = read(TRACKER)['systemd']
assert all('sealed log file' in tracker[advisory]['description'] for advisory in ADVISORIES)
images = {row['id']: row for row in scan['images']}
rows = [row for row in queue['items'] if row['id'] in ADVISORIES
        and row['status'] == 'needs-review' and row['severity'] == 'LOW'
        and row['type'] == 'debian' and row['scope'] == 'runtime-image'
        and row['package'] in ('libsystemd0', 'libudev1')]
assert {advisory: sum(row['id'] == advisory for row in rows) for advisory in ADVISORIES} == {
    advisory: 60 for advisory in ADVISORIES}
eligible = set()
checks = []
for artifact in sorted({row['artifact'] for row in rows}):
    image = images[artifact]
    assert image['status'] == 'checked' and image['containers']
    clear = True
    for role in sorted(image['containers']):
        info = json.loads(subprocess.check_output(['docker', 'inspect', role],
                                                  text=True, timeout=20))[0]
        assert info['Image'] == artifact and info['State']['Running']
        root = Path('/proc') / str(info['State']['Pid']) / 'root'
        present = any((root / path).exists() for path in BINARIES)
        mounts = any(mount['Destination'] == '/var/log/journal' or
                     mount['Destination'].startswith(('/var/log/journal/', '/run/log/journal/',
                                                      '/lib/systemd/', '/usr/lib/systemd/'))
                     for mount in info['Mounts'])
        files = any(path.is_dir() and any(path.rglob('*.journal'))
                    for path in (root / 'var/log/journal', root / 'run/log/journal'))
        clear &= not present and not mounts and not files
        checks.append({'artifact': artifact, 'role': role, 'binaryPresent': present,
                       'journalOrSystemdMount': mounts, 'journalFilePresent': files})
    if clear:
        eligible.add(artifact)
selected = [row for row in rows if row['artifact'] in eligible]
assert len(eligible) == 25 and len(selected) == 104
assert any(row['binaryPresent'] for row in checks), 'Images with journal machinery must remain open'

OUT.mkdir(mode=0o700)
proof = {'date': dt.datetime.now(dt.timezone.utc).isoformat(), 'scanDate': scan['completedAt'],
         'primarySha256': sha(TRACKER), 'advisories': ADVISORIES,
         'selectedCount': len(selected), 'checks': checks, 'hostReviewed': False,
         'productionChanged': False}
(OUT / 'runtime.json').write_text(json.dumps(proof, indent=2) + '\n')
expiry = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=7)).isoformat()
reason = ('The sealed-journal integrity issue requires a sealed journal and systemd journal machinery. '
          'Every running role of these exact images lacks systemd, journald and journalctl executables, '
          'has no mounted journal/systemd directory and has no journal file. '
          f'Proof security-20261122/sealed-journal/runtime.json SHA256 {sha(OUT / "runtime.json")}. '
          'Only source-package library matches are selected; the host and images with journal machinery stay open. '
          'Recheck on image/mount changes or in seven days. '
          'https://security-tracker.debian.org/tracker/CVE-2023-31438 '
          'https://security-tracker.debian.org/tracker/CVE-2023-31439')
batch = {'schemaVersion': 1, 'scanDate': scan['completedAt'],
         'decisions': [{'key': row['key'], 'status': 'not-affected',
                        'reason': reason, 'expiresAt': expiry}
                       for row in sorted(selected, key=lambda row: row['key'])],
         'runtimeProofSha256': sha(OUT / 'runtime.json'), 'productionChanged': False}
(OUT / 'review.json').write_text(json.dumps(batch, indent=2) + '\n')
print(json.dumps({'prepared': len(selected), 'imagesWithoutJournalMachinery': len(eligible),
                  'productionChanged': False}))
