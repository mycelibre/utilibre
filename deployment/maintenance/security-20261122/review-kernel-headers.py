"""Review kernel-code CVEs attributed to header-only linux-libc-dev images.

The running host kernel remains a separate security boundary; host findings
are intentionally untouched. This exact-image review proves that the package
inside each selected image contains only development headers and docs.
"""

import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess

os.umask(0o077)
ROOT = Path('/var/lib/utilibre-maintenance')
OUT = ROOT / 'security-20261122/kernel-headers'
ALLOWED_FILES = ('/usr/include/', '/usr/lib/linux/uapi/',
                 '/usr/share/doc/linux-libc-dev/')


def read(path):
    return json.loads(Path(path).read_text())


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


scan = read(ROOT / 'security.json')
queue = read(ROOT / 'security-queue.json')
assert scan['status'] == 'checked' and queue['status'] == 'current'
assert scan['completedAt'] == queue['scanDate'] and scan['host']['status'] == 'checked'
assert dt.timedelta(0) <= dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(
    scan['completedAt'].replace('Z', '+00:00')) < dt.timedelta(days=1)
assert not OUT.exists()
rows = [row for row in queue['items'] if row['status'] == 'needs-review'
        and row['severity'] == 'LOW' and row['package'] == 'linux-libc-dev'
        and row['type'] in ('debian', 'ubuntu') and row['scope'] == 'runtime-image']
assert len(rows) == 261 and len({row['artifact'] for row in rows}) == 4
assert sum(row['status'] == 'needs-review' and row['severity'] == 'LOW'
           and row['package'] == 'linux-libc-dev'
           and row['scope'] == 'host-os' for row in queue['items']) == 64
images = {row['id']: row for row in scan['images']}
checks = []
for artifact in sorted({row['artifact'] for row in rows}):
    image = images[artifact]
    assert image['status'] == 'checked' and image['containers']
    for role in sorted(image['containers']):
        info = json.loads(subprocess.check_output(['docker', 'inspect', role],
                                                  text=True, timeout=20))[0]
        assert info['Image'] == artifact and info['State']['Running']
        root = Path('/proc') / str(info['State']['Pid']) / 'root'
        lists = list((root / 'var/lib/dpkg/info').glob('linux-libc-dev*.list'))
        assert len(lists) == 1
        names = lists[0].read_text().splitlines()
        assert len(names) >= 500 and len(names) == len(set(names))
        regular = 0
        missing_docs = 0
        for name in names:
            assert name.startswith('/') and '..' not in Path(name).parts
            path = root / name.lstrip('/')
            if not path.exists():
                assert name.startswith('/usr/share/doc/linux-libc-dev/')
                missing_docs += 1
                continue
            if path.is_dir():
                continue
            assert path.is_file() and name.startswith(ALLOWED_FILES)
            if not name.startswith('/usr/share/doc/linux-libc-dev/'):
                assert name.endswith('.h') and path.open('rb').read(4) != b'\x7fELF'
            regular += 1
        assert regular >= 500
        checks.append({'artifact': artifact, 'role': role, 'packageFileListSha256': sha(lists[0]),
                       'listedPaths': len(names), 'regularHeaderOrDocFiles': regular,
                       'removedDocumentationFiles': missing_docs,
                       'kernelBinaryInPackage': False})

OUT.mkdir(mode=0o700)
proof = {'date': dt.datetime.now(dt.timezone.utc).isoformat(), 'scanDate': scan['completedAt'],
         'lowRecords': len(rows), 'imageCount': 4, 'checks': checks,
         'hostKernelReviewed': False, 'hostLinuxLibcDevMatchesLeftOpen': 64,
         'productionChanged': False}
(OUT / 'runtime.json').write_text(json.dumps(proof, indent=2) + '\n')
expiry = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=7)).isoformat()
reason = ('The exact linux-libc-dev image package contains only userspace development headers and docs, '
          'not the running Linux kernel code targeted by this CVE. All installed package paths and file types '
          'were checked in every current role; host kernel findings remain open. '
          f'Proof security-20261122/kernel-headers/runtime.json SHA256 {sha(OUT / "runtime.json")}. '
          'Recheck on image/package changes or in seven days. '
          'https://packages.debian.org/trixie/linux-libc-dev '
          'https://packages.ubuntu.com/noble/linux-libc-dev')
batch = {'schemaVersion': 1, 'scanDate': scan['completedAt'],
         'decisions': [{'key': row['key'], 'status': 'not-affected',
                        'reason': reason, 'expiresAt': expiry}
                       for row in sorted(rows, key=lambda row: row['key'])],
         'runtimeProofSha256': sha(OUT / 'runtime.json'), 'productionChanged': False}
(OUT / 'review.json').write_text(json.dumps(batch, indent=2) + '\n')
print(json.dumps({'prepared': len(rows), 'imageCount': 4,
                  'hostKernelReviewed': False, 'productionChanged': False}))
