"""Reject Power8-only glibc matches in the exact running amd64 images."""

import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess

os.umask(0o077)
ROOT = Path('/var/lib/utilibre-maintenance')
OUT = ROOT / 'security-20261122/glibc-power8'
TRACKER = ROOT / 'security-20261122/primary/debian-security-tracker.json'
TRACKER_SHA256 = '56ab97cc2791c8dd0476b7d3d060a7a76c9bb9f13a8185131507a6889373759c'


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
assert not OUT.exists() and sha(TRACKER) == TRACKER_SHA256
description = read(TRACKER)['glibc']['CVE-2026-97399']['description']
assert 'Power8 architecture' in description and 'strncasecmp' in description
assert subprocess.check_output(['uname', '-m'], text=True, timeout=10).strip() == 'x86_64'
images = {row['id']: row for row in scan['images']}
rows = [row for row in queue['items'] if row['id'] == 'CVE-2026-97399'
        and row['status'] == 'needs-review' and row['scope'] == 'runtime-image'
        and row['type'] in ('debian', 'ubuntu')]
assert len(rows) == 39 and sum(row['severity'] == 'LOW' for row in rows) == 28
checks = []
for artifact in sorted({row['artifact'] for row in rows}):
    image = images[artifact]
    assert image['status'] == 'checked' and image['containers']
    inspected = json.loads(subprocess.check_output(['docker', 'image', 'inspect', artifact],
                                                   text=True, timeout=20))[0]
    assert inspected['Id'] == artifact and inspected['Architecture'] == 'amd64'
    for role in sorted(image['containers']):
        info = json.loads(subprocess.check_output(['docker', 'inspect', role],
                                                  text=True, timeout=20))[0]
        assert info['Image'] == artifact and info['State']['Running']
        checks.append({'artifact': artifact, 'role': role, 'imageArchitecture': 'amd64',
                       'hostArchitecture': 'x86_64'})
assert len({row['artifact'] for row in rows}) == 15

OUT.mkdir(mode=0o700)
proof = {'date': dt.datetime.now(dt.timezone.utc).isoformat(), 'scanDate': scan['completedAt'],
         'primarySha256': sha(TRACKER), 'advisory': 'CVE-2026-97399',
         'lowRecords': 28, 'mediumRecords': 11, 'checks': checks,
         'productionChanged': False}
(OUT / 'runtime.json').write_text(json.dumps(proof, indent=2) + '\n')
expiry = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=7)).isoformat()
reason = ('CVE-2026-97399 affects the Power8-optimized strncasecmp implementation. '
          'The current host is x86_64 and each exact running image is amd64, '
          'so its glibc package cannot contain that Power8 implementation. '
          f'Proof security-20261122/glibc-power8/runtime.json SHA256 {sha(OUT / "runtime.json")}. '
          'Recheck on image/architecture changes or in seven days. '
          'https://security-tracker.debian.org/tracker/CVE-2026-97399')
batch = {'schemaVersion': 1, 'scanDate': scan['completedAt'],
         'decisions': [{'key': row['key'], 'status': 'not-affected',
                        'reason': reason, 'expiresAt': expiry}
                       for row in sorted(rows, key=lambda row: row['key'])],
         'runtimeProofSha256': sha(OUT / 'runtime.json'), 'productionChanged': False}
(OUT / 'review.json').write_text(json.dumps(batch, indent=2) + '\n')
print(json.dumps({'prepared': len(rows), 'low': 28, 'medium': 11,
                  'productionChanged': False}))
