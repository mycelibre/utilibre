"""No-network CLI validation; never executes a substituted shell command."""
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import argparse

assert Path('/.dockerenv').exists()
work = Path(tempfile.mkdtemp(prefix='username-', dir='/tmp'))
rows = []
parser = argparse.ArgumentParser()
parser.add_argument('--backports103', action='store_true')
backports = parser.parse_args().backports103
versions = ('10.3p1-1~bpo13+1', '10.3p1-1~bpo13+1+utilibre1') if backports else ('10.0p1-7+deb13u4+utilibre2', '10.0p1-7+deb13u4+utilibre3')
for label, directory, version in [('baseline', '/current', versions[0]), ('candidate', '/candidate', versions[1])]:
    tree = work / label
    tree.mkdir()
    archive = Path(directory) / f'openssh-client_{version}_amd64.deb'
    subprocess.run(['dpkg-deb', '-x', str(archive), str(tree)], check=True, timeout=10)
    binary = tree / 'usr/bin/ssh'
    def query(args):
        return subprocess.run([str(binary), '-G', '-F', '/dev/null', *args], capture_output=True, timeout=5)
    denied = []
    # Harmless literal characters, no $(), backticks, ProxyCommand or Match exec.
    for user in ['fixture$dollar', 'fixture\\name']:
        for args in [['-l', user, '127.0.0.1'], [user + '@127.0.0.1']]:
            p = query(args)
            rejected = p.returncode != 0 and b'username contains invalid characters' in p.stderr
            assert rejected == (label == 'candidate'), (label, args, p.stderr)
            if label == 'baseline':
                assert p.returncode == 0 and ('user ' + user + '\n').encode() in p.stdout
            denied.append(rejected)
    for user in ['fixture', 'test-user', 'svc_build', 'node.2']:
        p = query(['-l', user, '127.0.0.1'])
        assert p.returncode == 0 and ('user ' + user + '\n').encode() in p.stdout
    config = tree / 'literal.conf'
    config.write_text('Host *\n User fixture$dollar\n')
    p = subprocess.run([str(binary), '-G', '-F', str(config), '127.0.0.1'], capture_output=True, timeout=5)
    assert p.returncode == 0 and b'user fixture$dollar\n' in p.stdout
    rows.append(dict(label=label, binarySha256=hashlib.sha256(binary.read_bytes()).hexdigest(),
                     rejected=denied, legitimateUsers=4, configurationLiteralPreserved=True))
print(json.dumps(dict(passed=True, rows=rows, network='none', scope='CLI parsing, no shell injection executed')))
