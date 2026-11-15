"""Read-only exposure check of the exact eight reviewed Bookworm containers.

This proves configuration containment, not a repaired PAM binary. No user,
password, process environment, exploit, login or production command is read/run.
It neither approves findings nor changes an image or authentication setting.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

os.umask(0o077)
HERE = Path(__file__).resolve().parent
inputs = json.loads((HERE / 'pam-inputs.json').read_text())
rows = []
for target in inputs['targets']:
    info = json.loads(subprocess.check_output(['docker', 'inspect', target['container']]))[0]
    assert info['Image'] == target['image'] and info['State']['Running']
    policy = info['HostConfig']
    assert not policy['Privileged'] and not policy['CapAdd']
    assert 'ALL' in policy['CapDrop'] and 'no-new-privileges:true' in policy['SecurityOpt']
    root = Path('/proc') / str(info['State']['Pid']) / 'root'
    files = sorted((root / 'etc/pam.d').iterdir())
    assert files
    files += [root / 'etc/security/namespace.conf']
    if (root / 'etc/pam.conf').exists():
        files.append(root / 'etc/pam.conf')
    hashes = {}
    for path in files:
        assert path.is_file() and not path.is_symlink()
        content = path.read_bytes()
        active = [line for line in content.decode().splitlines() if line.strip() and not line.lstrip().startswith('#')]
        if path.name == 'namespace.conf':
            assert not active, 'Directory polyinstantiation configured'
        else:
            assert not any(re.search(r'\bpam_namespace(?:\.so)?\b', line) for line in active), 'PAM namespace module enabled'
        hashes[str(path.relative_to(root))] = hashlib.sha256(content).hexdigest()
    rows.append({'container': target['container'], 'image': target['image'], 'configurationSha256': hashes,
                 'namespaceModuleEnabled': False, 'configuredNamespacePaths': 0,
                 'privileged': False, 'capAdd': [], 'capDrop': policy['CapDrop'], 'securityOpt': policy['SecurityOpt']})
out = Path('/var/lib/utilibre-maintenance/security-20261115')
out.mkdir(exist_ok=True)
(out / 'pam-runtime.json').write_text(json.dumps({'passed': True, 'advisory': inputs['advisory'], 'packagePatched': False, 'rows': rows}, indent=2) + '\n')
print('PASS: eight exact running containers; pam_namespace unused, no namespace paths, no elevated container capabilities. Vulnerable package remains installed.')
