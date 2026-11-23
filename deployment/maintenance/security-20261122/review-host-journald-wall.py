"""Review the live host journald terminal-forwarding mitigation only."""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance')
OUT = ROOT / 'security-20261122/host-journald-wall'
read = lambda path: json.loads(Path(path).read_text())
sha = lambda path: hashlib.sha256(Path(path).read_bytes()).hexdigest()

def command(args):
    return subprocess.check_output(args, text=True, stderr=subprocess.PIPE, timeout=20).strip()

scan, queue = [read(ROOT / name) for name in ('security.json', 'security-queue.json')]
assert scan['status'] == 'checked' and queue['status'] == 'current'
assert scan['completedAt'] == queue['scanDate'] and scan['host']['status'] == 'checked'
assert dt.timedelta(0) <= dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(scan['completedAt'].replace('Z', '+00:00')) < dt.timedelta(days=1)
assert not OUT.exists()
source = HERE / '80-utilibre-journald.conf'
installed = Path('/etc/systemd/journald.conf.d/80-utilibre.conf')
assert installed.is_file() and not installed.is_symlink()
assert sha(installed) == sha(source) == 'fe765a6666960d67e6b5ddf56dbd5f9a595bc03f2fe38a9280e4ab6417ac09d6'
primary = ROOT / 'security-20261122/primary/debian-security-tracker.json'
assert sha(primary) == '56ab97cc2791c8dd0476b7d3d060a7a76c9bb9f13a8185131507a6889373759c'
entry = read(primary)['systemd']['CVE-2026-40228']
assert 'systemd-journald' in entry['description'] and 'ForwardToWall=yes' in entry['description']
config = command(['systemd-analyze', 'cat-config', 'systemd/journald.conf'])
active = [line.strip() for line in config.splitlines() if line.strip() and not line.lstrip().startswith('#')]
values = {}
for line in active:
    if '=' in line:
        key, value = line.split('=', 1)
        values[key] = value
assert values.get('ForwardToWall') == 'no'
assert values.get('SystemMaxUse') == '512M'
assert command(['systemctl', 'is-active', 'systemd-journald.service']) == 'active'
pid = int(command(['systemctl', 'show', 'systemd-journald.service', '-p', 'MainPID', '--value']))
assert pid > 1 and (Path('/proc') / str(pid) / 'comm').read_text().strip() == 'systemd-journal'
elapsed = int(command(['ps', '-o', 'etimes=', '-p', str(pid)]))
assert dt.datetime.now(dt.timezone.utc).timestamp() - elapsed >= installed.stat().st_mtime - 2
marker = command(['journalctl', '-t', 'utilibre-maintenance-check', '--since', '15 minutes ago', '-n', '1', '-o', 'cat', '--no-pager'])
assert marker == 'journald-config-check'
items = [row for row in queue['items'] if row['id'] == 'CVE-2026-40228'
         and row['status'] == 'needs-review' and row['scope'] == 'host-os'
         and row['artifact'] == 'host-dpkg' and row['type'] == 'debian']
assert len(items) == 11 and all(row['severity'] == 'LOW' for row in items)
OUT.mkdir(mode=0o700)
proof = {'date': dt.datetime.now(dt.timezone.utc).isoformat(), 'passed': True,
         'scanDate': scan['completedAt'], 'advisory': 'CVE-2026-40228',
         'primarySha256': sha(primary), 'configSha256': sha(installed),
         'effectiveForwardToWall': values['ForwardToWall'],
         'systemMaxUse': values['SystemMaxUse'], 'journaldActive': True,
         'startedAfterConfig': True, 'syntheticJournalWriteAndRead': True,
         'patchedBinary': False, 'productionChangedByReviewer': False}
(OUT / 'runtime.json').write_text(json.dumps(proof, indent=2) + '\n')
expiry = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=7)).isoformat()
reason = ('CVE-2026-40228 requires journald ForwardToWall=yes. The current host has a SHA-bound drop-in with ForwardToWall=no, '
          'the effective configuration matches, journald restarted after installation and a synthetic journal write/read passed. '
          f'Proof: security-20261122/host-journald-wall/runtime.json SHA256 {sha(OUT / "runtime.json")}. '
          'The binary is not patched. Review expires on config/service changes or in seven days. '
          'https://security-tracker.debian.org/tracker/CVE-2026-40228')
batch = {'schemaVersion': 1, 'scanDate': scan['completedAt'],
         'decisions': [{'key': row['key'], 'status': 'mitigated',
                        'reason': reason, 'expiresAt': expiry}
                       for row in sorted(items, key=lambda row: row['key'])],
         'runtimeProofSha256': sha(OUT / 'runtime.json'),
         'productionChangedByReviewer': False}
(OUT / 'review.json').write_text(json.dumps(batch, indent=2) + '\n')
print(json.dumps({'prepared': len(items), 'journaldActive': True,
                  'effectiveForwardToWall': 'no', 'patchedBinary': False}))
