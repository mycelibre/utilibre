"""Renew only the upstream-supported pam_namespace disablement review."""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

os.umask(0o077)
ROOT = Path('/var/lib/utilibre-maintenance')
HERE = Path(__file__).resolve().parent
OUT = ROOT / 'security-20261122/pam-namespace-current'
read = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
scan, queue = [read(ROOT / name) for name in ('security.json', 'security-queue.json')]
assert scan['status'] == 'checked' and queue['status'] == 'current'
assert scan['completedAt'] == queue['scanDate']
assert dt.timedelta(0) <= dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(scan['completedAt'].replace('Z', '+00:00')) < dt.timedelta(days=1)
assert not OUT.exists()
policy = read(HERE.parent / 'security-20261115/pam-inputs.json')
assert policy['advisory'] == 'CVE-2025-6020' and policy['packageVersion'] == '1.5.2-6+deb12u2'
roles = {x['container'] for x in policy['targets']}
assert len(roles) == 8
packages = {'libpam-modules', 'libpam-modules-bin', 'libpam-runtime', 'libpam0g'}
items = [x for x in queue['items'] if x['status'] == 'needs-review' and x['id'] == 'CVE-2025-6020']
assert len(items) == 32
assert {x['package'] for x in items} == packages
assert {x['containers'][0] for x in items} == roles
assert all(x['severity'] == 'HIGH' and x['type'] == 'debian' and x['scope'] == 'runtime-image'
           and x['installed'] == policy['packageVersion'] and len(x['containers']) == 1 for x in items)
images = {x['id']: x for x in scan['images']}
rows = []
for role in sorted(roles):
    selected = [x for x in items if x['containers'] == [role]]
    assert len(selected) == 4 and {x['package'] for x in selected} == packages
    image = selected[0]['artifact']
    assert all(x['artifact'] == image for x in selected)
    assert images[image]['status'] == 'checked' and images[image]['containers'] == [role]
    info = json.loads(subprocess.check_output(['docker', 'inspect', role], timeout=20))[0]
    assert info['Image'] == image and info['State']['Running']
    settings = info['HostConfig']
    assert not settings['Privileged'] and not settings['CapAdd']
    assert 'ALL' in settings['CapDrop'] and 'no-new-privileges:true' in settings['SecurityOpt']
    root = Path('/proc') / str(info['State']['Pid']) / 'root'
    files = sorted((root / 'etc/pam.d').iterdir())
    assert files and all(p.is_file() and not p.is_symlink() for p in files)
    files.append(root / 'etc/security/namespace.conf')
    if (root / 'etc/pam.conf').exists():
        files.append(root / 'etc/pam.conf')
    hashes = {}
    for path in files:
        assert path.is_file() and not path.is_symlink()
        content = path.read_bytes()
        active = [line for line in content.decode().splitlines() if line.strip() and not line.lstrip().startswith('#')]
        if path.name == 'namespace.conf':
            assert not active, 'Directory polyinstantiation enabled'
        else:
            assert not any(re.search(r'\bpam_namespace(?:\.so)?\b', line) for line in active), 'PAM namespace enabled'
        hashes[str(path.relative_to(root))] = hashlib.sha256(content).hexdigest()
    rows.append({'role': role, 'imageId': image, 'pamConfigurationSha256': hashes,
                 'namespaceEnabled': False, 'namespacePaths': 0,
                 'privileged': False, 'capAdd': [], 'capDropAll': True,
                 'noNewPrivileges': True})
assert len(rows) == 8
OUT.mkdir(mode=0o700)
proof = {'date': dt.datetime.now(dt.timezone.utc).isoformat(), 'passed': True,
         'scanDate': scan['completedAt'], 'rows': rows,
         'upstreamWorkaround': 'Disable pam_namespace or prevent user-controlled paths',
         'packagePatched': False, 'productionChanged': False}
(OUT / 'runtime.json').write_text(json.dumps(proof, indent=2) + '\n')
expiry = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=7)).isoformat()
reason = ('Current exact running Bookworm image, PAM configuration and container privilege checks confirm pam_namespace is disabled and namespace.conf has no active entries. '
          'The upstream advisory explicitly lists disabling pam_namespace as a workaround. This is a configuration mitigation, not a repaired PAM package; '
          'review expires in seven days or immediately on PAM configuration, container capability or image changes. '
          f'Evidence: security-20261122/pam-namespace-current/runtime.json SHA256 {sha(OUT / "runtime.json")}. '
          'https://github.com/linux-pam/linux-pam/security/advisories/GHSA-f9p8-gjr4-j9gx')
batch = {'schemaVersion': 1, 'scanDate': scan['completedAt'],
         'decisions': [{'key': x['key'], 'status': 'mitigated',
                        'reason': reason, 'expiresAt': expiry}
                       for x in sorted(items, key=lambda x: x['key'])],
         'runtimeProofSha256': sha(OUT / 'runtime.json'),
         'productionChanged': False}
(OUT / 'review.json').write_text(json.dumps(batch, indent=2) + '\n')
print(json.dumps({'prepared': len(items), 'configurationMitigation': True,
                  'packagePatched': False, 'productionChanged': False}))
