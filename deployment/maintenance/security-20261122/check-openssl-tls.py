"""Reuse the native loopback TLS fixture for exact before/after libraries.

The same old, hash-bound CLI runs against both libraries, including images
without a CLI. No production mounts, content, credentials or external routes.
This is compatibility verification, not an exploit-reproduction claim.
"""
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/openssl-runtime')
inputs = json.loads((HERE / 'openssl-runtime-inputs.json').read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
cli = ROOT / 'fixtures/openssl'
server = HERE.parent / 'closure-followup/curl-fixture-server.py'
assert sha(cli) == inputs['nativeFixture']['cliSha256']
assert sha(server) == inputs['nativeFixture']['tlsServerSha256']
limits = ['--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
          '--cpus', '.5', '--memory', '192m', '--memory-swap', '192m', '--pids-limit', '32',
          '--log-driver', 'none', '--ulimit', 'core=0', '--tmpfs', '/tmp:rw,size=16m,mode=1777']


def run(args, timeout=30):
    return subprocess.run(args, capture_output=True, timeout=timeout)


assert sys.argv[1:]
for key in sys.argv[1:]:
    row = next(r for r in inputs['rows'] if r['key'] == key)
    out = ROOT / 'vendor-debian' / key
    build = json.loads((out / 'build.json').read_text())
    assert build['passed'] and build['base'] == row['base']
    assert not (out / 'native-tls.json').exists(), 'Keep completed evidence'
    fixture = out / 'tls-fixture'
    fixture.mkdir(mode=0o755)
    fixture.chmod(0o755)  # The private parent remains 0700; this synthetic mount is read by uid 65534.
    p = run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
             '-keyout', str(fixture / 'key.pem'), '-out', str(fixture / 'cert.pem'),
             '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost'])
    assert p.returncode == 0
    for path in fixture.iterdir():
        path.chmod(0o644)  # Synthetic, disposable fixture key only.
    name = 'utilibre-openssl-tls-' + str(os.getpid())
    checks = []
    try:
        p = run(['docker', 'run', '-d', '--name', name, *limits, '--network', 'none',
                 '--user', '65534:65534', '--mount', 'type=bind,src=' + str(fixture) + ',dst=/fixture,readonly',
                 '--mount', 'type=bind,src=' + str(server) + ',dst=/server.py,readonly',
                 '--entrypoint', 'python3', inputs['nativeFixture']['tlsImage'], '/server.py'])
        assert p.returncode == 0
        p = run(['docker', 'exec', name, 'python3', '-c',
                 'import socket,ssl,time\nc=ssl.create_default_context(cafile="/fixture/cert.pem")\nfor i in range(40):\n try:\n  s=c.wrap_socket(socket.create_connection(("127.0.0.1",18443),.2),server_hostname="localhost");s.close();break\n except OSError: time.sleep(.1)\nelse: raise RuntimeError("TLS fixture readiness")'])
        assert p.returncode == 0
        for phase, image in [('before', row['base']), ('after', build['imageId'])]:
            prefix = ['docker', 'run', '--rm', *limits, '--network', 'container:' + name,
                      '--user', '65534:65534', '--mount', 'type=bind,src=' + str(cli) + ',dst=/native/openssl,readonly',
                      '--mount', 'type=bind,src=' + str(fixture / 'cert.pem') + ',dst=/ca.pem,readonly']
            for tls in ['tls1_2', 'tls1_3']:
                p = run([*prefix, '--entrypoint', 'sh', image, '-ec',
                         "printf 'GET / HTTP/1.0\\r\\nHost: localhost\\r\\n\\r\\n' | /native/openssl s_client -quiet -ign_eof -ignore_unexpected_eof -connect 127.0.0.1:18443 -CAfile /ca.pem -verify_return_error -verify_hostname localhost -" + tls])
                (out / (phase + '-' + tls + '.log')).write_bytes(p.stdout + p.stderr)
                assert p.returncode == 0 and b'fictional transfer' in p.stdout
            p = run([*prefix, '--entrypoint', '/native/openssl', image, 's_client',
                     '-connect', '127.0.0.1:18443', '-CAfile', '/ca.pem', '-verify_return_error',
                     '-verify_hostname', 'wrong.invalid'])
            (out / (phase + '-wrong-host.log')).write_bytes(p.stdout + p.stderr)
            assert p.returncode != 0 and b'hostname mismatch' in p.stderr
            checks.append({'imageId': image, 'tls12': True, 'tls13': True, 'wrongHostRejected': True})
    finally:
        run(['docker', 'rm', '-f', '-v', name])
    (out / 'native-tls.json').write_text(json.dumps({
        'passed': True, 'date': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'base': row['base'], 'imageId': build['imageId'], 'checks': checks,
        'cliSha256': sha(cli), 'serverSha256': sha(server),
        'network': 'isolated loopback fixture only', 'productionChanged': False,
    }, indent=2) + '\n')
    print(key + ': native TLS 1.2/1.3 and wrong-host rejection passed', flush=True)
