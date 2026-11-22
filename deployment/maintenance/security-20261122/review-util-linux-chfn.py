"""Review CVE-2022-0563 against the executable provider in each running role."""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess

os.umask(0o077)
ROOT = Path('/var/lib/utilibre-maintenance')
OUT = ROOT / 'security-20261122/util-linux-chfn'
read = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
def command(args):
    return subprocess.check_output(args, text=True, stderr=subprocess.PIPE, timeout=20).strip()

scan, queue = [read(ROOT / x) for x in ('security.json', 'security-queue.json')]
assert scan['status'] == 'checked' and queue['status'] == 'current'
assert scan['completedAt'] == queue['scanDate']
assert dt.timedelta(0) <= dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(scan['completedAt'].replace('Z', '+00:00')) < dt.timedelta(days=1)
assert not OUT.exists()
primary_file = ROOT / 'security-20261122/primary/debian-security-tracker.json'
assert sha(primary_file) == '56ab97cc2791c8dd0476b7d3d060a7a76c9bb9f13a8185131507a6889373759c'
entry = read(primary_file)['util-linux']['CVE-2022-0563']
assert 'chfn and chsh utilities' in entry['description']
items = [x for x in queue['items'] if x['id'] == 'CVE-2022-0563' and x['status'] == 'needs-review']
assert len(items) == 267
assert all(x['severity'] == 'LOW' and x['type'] == 'debian'
           and x['scope'] in ('runtime-image', 'host-os') for x in items)
images = {x['id']: x for x in scan['images']}
artifacts = {x['artifact'] for x in items}
assert 'host-dpkg' in artifacts and len(artifacts) == 30
checks = []
for artifact in sorted(artifacts):
    if artifact == 'host-dpkg':
        assert scan['host']['status'] == 'checked'
        targets = [('host', [])]
    else:
        observed = images[artifact]
        assert observed['status'] == 'checked' and observed['containers']
        targets = [(name, ['docker', 'exec', name]) for name in sorted(observed['containers'])]
    for name, prefix in targets:
        if prefix:
            actual = command(['docker', 'inspect', '--format', '{{.Image}} {{.State.Running}}', name])
            assert actual == artifact + ' true'
        owners = command([*prefix, 'dpkg-query', '-S', '/usr/bin/chfn', '/usr/bin/chsh']).splitlines()
        assert owners == ['passwd: /usr/bin/chfn', 'passwd: /usr/bin/chsh']
        assert command([*prefix, 'dpkg-query', '-W', '-f=${source:Package}', 'passwd']) == 'shadow'
        listing = command([*prefix, 'dpkg-query', '-L', 'util-linux']).splitlines()
        assert '/usr/bin/chfn' not in listing and '/usr/bin/chsh' not in listing
        checks.append({'role': name, 'artifact': artifact,
                       'chfnOwner': 'passwd', 'chshOwner': 'passwd',
                       'providerSource': 'shadow',
                       'utilLinuxProvidesAffectedExecutables': False})
assert len(checks) >= 30
OUT.mkdir(mode=0o700)
proof = {'date': dt.datetime.now(dt.timezone.utc).isoformat(), 'passed': True,
         'scanDate': scan['completedAt'], 'advisory': 'CVE-2022-0563',
         'primarySha256': sha(primary_file), 'checks': checks,
         'description': 'The affected util-linux chfn/chsh implementations are absent; all checked executable owners are shadow/passwd.',
         'productionChanged': False}
(OUT / 'runtime.json').write_text(json.dumps(proof, indent=2) + '\n')
expiry = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=7)).isoformat()
reason = ('CVE-2022-0563 concerns util-linux chfn/chsh. Exact current image and host checks find both installed executables owned by passwd from source shadow; util-linux installs neither path. '
          f'Per-role proof: security-20261122/util-linux-chfn/runtime.json SHA256 {sha(OUT / "runtime.json")}. '
          'This is a source-package scanner match, not a claim that all util-linux defects are fixed. Review expires on binary/provider changes or in seven days. '
          'https://security-tracker.debian.org/tracker/CVE-2022-0563')
batch = {'schemaVersion': 1, 'scanDate': scan['completedAt'],
         'decisions': [{'key': x['key'], 'status': 'not-affected',
                        'reason': reason, 'expiresAt': expiry}
                       for x in sorted(items, key=lambda x: x['key'])],
         'runtimeProofSha256': sha(OUT / 'runtime.json'),
         'productionChanged': False}
(OUT / 'review.json').write_text(json.dumps(batch, indent=2) + '\n')
print(json.dumps({'prepared': len(items), 'rolesChecked': len(checks),
                  'productionChanged': False}))
