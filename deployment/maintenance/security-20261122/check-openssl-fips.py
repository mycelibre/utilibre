"""Isolated preservation check for Authentik's existing vendor FIPS setup.

No new certification claim, configuration, user data or production mutation.
"""
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/openssl-fips-runtime')
inputs = json.loads((HERE / 'openssl-fips-runtime-inputs.json').read_text())
assert len(inputs['rows']) == 1
row = inputs['rows'][0]
out = ROOT / 'vendor-debian' / row['key']
build = json.loads((out / 'build.json').read_text())
assert build['passed'] and build['base'] == row['base']
assert not (out / 'fips-native.json').exists()
limits = ['--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL',
          '--security-opt', 'no-new-privileges', '--cpus', '.5', '--memory', '256m',
          '--memory-swap', '256m', '--pids-limit', '64', '--log-driver', 'none',
          '--tmpfs', '/tmp:rw,size=16m,mode=1777']


def check(image, argv):
    p = subprocess.run(['docker', 'run', *limits, '--entrypoint', argv[0], image, *argv[1:]],
                       capture_output=True, timeout=45)
    assert p.returncode == 0, 'Private vendor fixture failed'
    return p.stdout.decode().strip()


paths = ['/etc/ssl/fipsmodule.cnf', '/usr/lib/x86_64-linux-gnu/ossl-modules/fips.so', '/etc/ssl/openssl.cnf']
proofs = []
for phase, image in [('before', row['base']), ('after', build['imageId'])]:
    files = check(image, ['sha256sum', *paths])
    holds = check(image, ['apt-mark', 'showhold'])
    assert {'libssl-dev', 'libssl3t64', 'openssl'} <= set(holds.splitlines())
    providers = check(image, ['openssl', 'list', '-providers'])
    assert 'fips' in providers and 'version: 3.1.2' in providers and 'status: active' in providers
    check(image, ['openssl', 'fipsinstall', '-module', paths[1], '-in', paths[0], '-verify'])
    version = check(image, ['openssl', 'version'])
    assert ('3.5.7+ak-fips' if phase == 'before' else '3.5.9+ak-fips') in version
    python = check(image, ['/ak-root/.venv/bin/python', '-c', 'import ssl; print(ssl.OPENSSL_VERSION)'])
    assert ('3.5.7+ak-fips' if phase == 'before' else '3.5.9+ak-fips') in python
    proofs.append({'phase': phase, 'imageId': image, 'files': files, 'holds': holds,
                   'providers': providers, 'version': version, 'pythonOpenSSL': python})
assert proofs[0]['files'] == proofs[1]['files']
assert proofs[0]['holds'] == proofs[1]['holds']
assert proofs[0]['providers'].replace('version: 3.5.7\n', 'version: 3.5.9\n') == proofs[1]['providers']
(out / 'fips-native.json').write_text(json.dumps({
    'date': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'passed': True,
    'base': row['base'], 'imageId': build['imageId'], 'checks': proofs,
    'fixtureSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    'productionChanged': False, 'network': 'none',
    'limitations': 'Preserves and tests the existing vendor module; no new FIPS certification or module security clearance.'
}, indent=2) + '\n')
print('Existing Authentik FIPS provider, configuration, holds and Python TLS variant preserved')
