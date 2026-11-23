"""Review two exact, low-severity systemd matches against current runtime boundaries.

This does not modify services or accept other systemd advisories. The review
expires after seven days and must be repeated after a SELinux/runtime change.
"""

import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess

os.umask(0o077)
ROOT = Path('/var/lib/utilibre-maintenance')
OUT = ROOT / 'security-20261122/systemd-context'
TRACKER = ROOT / 'security-20261122/primary/debian-security-tracker.json'
TRACKER_SHA256 = '56ab97cc2791c8dd0476b7d3d060a7a76c9bb9f13a8185131507a6889373759c'
BINARIES = ('/lib/systemd/systemd', '/usr/lib/systemd/systemd',
            '/lib/systemd/systemd-journald', '/usr/lib/systemd/systemd-journald',
            '/bin/journalctl', '/usr/bin/journalctl')


def read(path):
    return json.loads(Path(path).read_text())


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def output(args):
    return subprocess.check_output(args, text=True, stderr=subprocess.PIPE, timeout=20).strip()


scan = read(ROOT / 'security.json')
queue = read(ROOT / 'security-queue.json')
assert scan['status'] == 'checked' and queue['status'] == 'current'
assert scan['completedAt'] == queue['scanDate']
assert scan['host']['status'] == 'checked'
assert dt.timedelta(0) <= dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(
    scan['completedAt'].replace('Z', '+00:00')) < dt.timedelta(days=1)
assert sha(TRACKER) == TRACKER_SHA256 and not OUT.exists()
tracker = read(TRACKER)['systemd']
assert 'selinux' in tracker['CVE-2013-4392']['description'].lower()
assert 'sealed log file' in tracker['CVE-2023-31437']['description']

# Debian's CVE-2013-4392 note says this is only relevant when systemd runs
# with SELinux. There is no active SELinux filesystem or enforcement endpoint
# on this exact host; all Docker roles share its kernel.
assert not Path('/sys/fs/selinux/enforce').exists()
selinux_mount = subprocess.run(['findmnt', '-t', 'selinuxfs', '-o', 'TARGET', '--noheadings'],
                               text=True, capture_output=True, timeout=20)
assert selinux_mount.returncode in (0, 1) and selinux_mount.stdout == ''
security_options = json.loads(output(['docker', 'info', '--format', '{{json .SecurityOptions}}']))
assert not any('selinux' in option.lower() for option in security_options)
selinux_rows = [row for row in queue['items'] if row['id'] == 'CVE-2013-4392'
                and row['status'] == 'needs-review' and row['severity'] == 'LOW'
                and row['type'] == 'debian' and row['scope'] in ('host-os', 'runtime-image')]
assert len(selinux_rows) == 86 and {row['scope'] for row in selinux_rows} == {'host-os', 'runtime-image'}
images = {row['id']: row for row in scan['images']}
assert all(row['artifact'] == 'host-dpkg' if row['scope'] == 'host-os'
           else row['artifact'] in images and images[row['artifact']]['status'] == 'checked'
           and images[row['artifact']]['containers'] for row in selinux_rows)

# CVE-2023-31437 concerns a modified sealed journal being displayed. Select
# only current runtime library-label matches where neither a systemd service
# nor journalctl is present, and no journal/systemd path is mounted in.
journal_rows = [row for row in queue['items'] if row['id'] == 'CVE-2023-31437'
                and row['status'] == 'needs-review' and row['severity'] == 'LOW'
                and row['type'] == 'debian' and row['scope'] == 'runtime-image'
                and row['package'] in ('libsystemd0', 'libudev1')]
assert len(journal_rows) == 60
checks = []
eligible = set()
for artifact in sorted({row['artifact'] for row in journal_rows}):
    image = images[artifact]
    assert image['status'] == 'checked' and image['containers']
    image_clear = True
    for role in sorted(image['containers']):
        container = json.loads(output(['docker', 'inspect', role]))[0]
        assert container['Image'] == artifact and container['State']['Running']
        root = Path('/proc') / str(container['State']['Pid']) / 'root'
        present = [binary for binary in BINARIES if (root / binary.lstrip('/')).exists()]
        mounted = [mount['Destination'] for mount in container['Mounts']
                   if mount['Destination'] == '/var/log/journal'
                   or mount['Destination'].startswith(('/var/log/journal/', '/lib/systemd/',
                                                       '/usr/lib/systemd/', '/run/log/journal/'))]
        journal_dirs = [root / 'var/log/journal', root / 'run/log/journal']
        journal_files = any(path.is_dir() and any(path.rglob('*.journal')) for path in journal_dirs)
        image_clear &= not present and not mounted and not journal_files
        checks.append({'artifact': artifact, 'role': role,
                       'systemdOrJournalctlPresent': bool(present),
                       'systemdOrJournalMountPresent': bool(mounted),
                       'journalFilesPresent': journal_files})
    if image_clear:
        eligible.add(artifact)
selected = [row for row in journal_rows if row['artifact'] in eligible]
assert len(eligible) == 25 and len(selected) == 104 // 2
assert len(checks) > len(eligible) and any(row['systemdOrJournalctlPresent'] for row in checks)

OUT.mkdir(mode=0o700)
proof = {'date': dt.datetime.now(dt.timezone.utc).isoformat(), 'scanDate': scan['completedAt'],
         'primarySha256': sha(TRACKER), 'selinuxActive': False,
         'dockerSelinuxSecurityOption': False, 'CVE-2013-4392': len(selinux_rows),
         'CVE-2023-31437': len(selected), 'journalChecks': checks,
         'hostJournalIssueReviewed': False, 'productionChanged': False}
(OUT / 'runtime.json').write_text(json.dumps(proof, indent=2) + '\n')
expiry = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=7)).isoformat()
proof_ref = f'security-20261122/systemd-context/runtime.json SHA256 {sha(OUT / "runtime.json")}'
reasons = {
    'CVE-2013-4392': ('Debian says this symlink permission issue is only relevant when systemd runs with SELinux. '
                      'The exact host has no active selinuxfs/enforcement endpoint, and Docker has no SELinux security option. '
                      f'Current host and image matches only; proof {proof_ref}. Recheck on SELinux changes or in seven days. '
                      'https://security-tracker.debian.org/tracker/CVE-2013-4392'),
    'CVE-2023-31437': ('This issue requires a sealed journal to be viewed. In every running role of these exact images, '
                       'systemd, journald and journalctl executables are absent and no journal/systemd directory is mounted. '
                       f'Only library-label matches are selected; proof {proof_ref}. Recheck on image/mount changes or in seven days. '
                       'https://security-tracker.debian.org/tracker/CVE-2023-31437'),
}
selected_rows = selinux_rows + selected
assert len({row['key'] for row in selected_rows}) == len(selected_rows) == 138
batch = {'schemaVersion': 1, 'scanDate': scan['completedAt'],
         'decisions': [{'key': row['key'], 'status': 'not-affected',
                        'reason': reasons[row['id']], 'expiresAt': expiry}
                       for row in sorted(selected_rows, key=lambda row: row['key'])],
         'runtimeProofSha256': sha(OUT / 'runtime.json'), 'productionChanged': False}
(OUT / 'review.json').write_text(json.dumps(batch, indent=2) + '\n')
print(json.dumps({'prepared': len(selected_rows), 'selinuxBoundary': len(selinux_rows),
                  'journalViewerAbsent': len(selected), 'productionChanged': False}))
