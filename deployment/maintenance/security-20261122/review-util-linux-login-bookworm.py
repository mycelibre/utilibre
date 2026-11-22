"""Review only Bookworm CVE-2026-3184 matches whose login comes from shadow."""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess

os.umask(0o077)
ROOT = Path('/var/lib/utilibre-maintenance')
OUT = ROOT / 'security-20261122/util-linux-login-bookworm'
read = lambda path: json.loads(Path(path).read_text())
sha = lambda path: hashlib.sha256(Path(path).read_bytes()).hexdigest()

def command(args):
    return subprocess.check_output(args, text=True, stderr=subprocess.PIPE, timeout=20).strip()

scan, queue = [read(ROOT / name) for name in ('security.json', 'security-queue.json')]
assert scan['status'] == 'checked' and queue['status'] == 'current'
assert scan['completedAt'] == queue['scanDate']
assert dt.timedelta(0) <= dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(scan['completedAt'].replace('Z', '+00:00')) < dt.timedelta(days=1)
assert not OUT.exists()
primary = ROOT / 'security-20261122/primary/debian-security-tracker.json'
assert sha(primary) == '56ab97cc2791c8dd0476b7d3d060a7a76c9bb9f13a8185131507a6889373759c'
entry = read(primary)['util-linux']['CVE-2026-3184']
assert '`login(1)` utility' in entry['description']
assert 'login not build from src:util-linux' in entry['releases']['bookworm']['nodsa']
assert entry['releases']['trixie']['status'] == 'open'
items = [row for row in queue['items']
         if row['status'] == 'needs-review' and row['id'] == 'CVE-2026-3184'
         and row['type'] == 'debian' and row['scope'] == 'runtime-image'
         and row['installed'].removeprefix('1:').startswith('2.38.1-5+deb12u3')]
assert len(items) == 65 and all(row['severity'] == 'MEDIUM' for row in items)
images = {row['id']: row for row in scan['images']}
artifacts = {row['artifact'] for row in items}
assert len(artifacts) == 8
checks = []
for artifact in sorted(artifacts):
    image = images[artifact]
    assert image['status'] == 'checked' and image['containers']
    for role in sorted(image['containers']):
        assert command(['docker', 'inspect', '--format', '{{.Image}} {{.State.Running}}', role]) == artifact + ' true'
        prefix = ['docker', 'exec', role]
        assert command([*prefix, 'dpkg-query', '-S', '/bin/login']) == 'login: /bin/login'
        assert command([*prefix, 'dpkg-query', '-W', '-f=${source:Package}', 'login']) == 'shadow'
        assert command([*prefix, 'dpkg-query', '-W', '-f=${Version}', 'util-linux']) == '2.38.1-5+deb12u3'
        util_files = command([*prefix, 'dpkg-query', '-L', 'util-linux']).splitlines()
        assert '/bin/login' not in util_files and '/usr/bin/login' not in util_files
        checks.append({'role': role, 'artifact': artifact, 'loginOwner': 'login',
                       'loginSource': 'shadow', 'utilLinuxLoginPresent': False,
                       'utilLinuxVersion': '2.38.1-5+deb12u3'})
assert len(checks) == 8
OUT.mkdir(mode=0o700)
proof = {'date': dt.datetime.now(dt.timezone.utc).isoformat(), 'passed': True,
         'scanDate': scan['completedAt'], 'advisory': 'CVE-2026-3184',
         'primarySha256': sha(primary), 'checks': checks,
         'trixieReviewed': False, 'productionChanged': False}
(OUT / 'runtime.json').write_text(json.dumps(proof, indent=2) + '\n')
reason = ('CVE-2026-3184 affects util-linux login -h. The Debian tracker explicitly excludes Bookworm because login is built from shadow. '
          'For each affected current Bookworm image, /bin/login is owned by login from source shadow; util-linux supplies no login executable. '
          f'Proof: security-20261122/util-linux-login-bookworm/runtime.json SHA256 {sha(OUT / "runtime.json")}. '
          'This excludes only these exact Bookworm image matches. Trixie remains open. Review expires on an image/provider change or in seven days. '
          'https://security-tracker.debian.org/tracker/CVE-2026-3184')
expiry = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=7)).isoformat()
batch = {'schemaVersion': 1, 'scanDate': scan['completedAt'],
         'decisions': [{'key': row['key'], 'status': 'not-affected',
                        'reason': reason, 'expiresAt': expiry}
                       for row in sorted(items, key=lambda row: row['key'])],
         'runtimeProofSha256': sha(OUT / 'runtime.json'),
         'productionChanged': False}
(OUT / 'review.json').write_text(json.dumps(batch, indent=2) + '\n')
print(json.dumps({'prepared': len(items), 'rolesChecked': len(checks),
                  'trixieReviewed': False, 'productionChanged': False}))
