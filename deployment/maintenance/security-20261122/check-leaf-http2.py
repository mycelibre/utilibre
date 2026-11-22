"""Reuse the existing synthetic HTTP/2 peer for native library consumers."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/leaves')
inputs = json.loads((HERE / 'debian-leaf-inputs.json').read_text())
pin = inputs['http2Fixture']
server_file = HERE.parent / 'bookworm-curl-followup/impersonate-fixture.mjs'
cli = ROOT / 'fixtures/curl'
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert sha(server_file) == pin['serverSha256'] and sha(cli) == pin['cliSha256']
limits = ['--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
          '--cpus', '.5', '--memory', '192m', '--memory-swap', '192m',
          '--pids-limit', '64', '--log-driver', 'none']


def run(args, expected=0):
    p = subprocess.run(args, capture_output=True, timeout=30)
    assert p.returncode == expected, (args[:3], p.returncode, p.stderr.decode(errors='replace')[:500])
    return p.stdout


name = 'utilibre-leaf-http2-fixture'
assert not run(['docker', 'ps', '-aq', '--filter', 'name=^/' + name + '$']).strip()
with tempfile.TemporaryDirectory(prefix='http2-', dir=ROOT) as tmp:
    fixture = Path(tmp)
    fixture.chmod(0o755)
    run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
         '-keyout', str(fixture / 'key.pem'), '-out', str(fixture / 'cert.pem'),
         '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost'])
    for p in fixture.iterdir():
        p.chmod(0o644)
    try:
        run(['docker', 'run', '-d', '--name', name, *limits, '--network', 'none',
             '--user', '65534:65534', '-v', str(fixture) + ':/fixture:ro',
             '-v', str(server_file) + ':/server.mjs:ro', '--entrypoint', 'node',
             pin['serverImage'], '/server.mjs'])
        ready = False
        for _ in range(40):
            p = subprocess.run(['docker', 'exec', name, 'node', '-e',
                "fetch('http://127.0.0.1:18080/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"],
                capture_output=True, timeout=5)
            if p.returncode == 0:
                ready = True
                break
            time.sleep(.1)
        assert ready
        for key in pin['selectedKeys']:
            row = next(r for r in inputs['rows'] if r['key'] == key)
            out = ROOT / 'vendor-debian' / key
            build = json.loads((out / 'build.json').read_text())
            target = out / 'http2-native.json'
            assert not target.exists()
            proofs = []
            for phase, image in [('before', row['base']), ('after', build['imageId'])]:
                base = ['docker', 'run', '--rm', *limits, '--network', 'container:' + name,
                        '--user', '65534:65534', '-e', 'LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu',
                        '-v', str(cli) + ':/native/curl:ro', '-v', str(fixture) + ':/fixture:ro',
                        '--entrypoint', '/native/curl', image]
                version = run(base + ['--version']).decode()
                assert 'nghttp2/1.64.0' in version and 'HTTP2' in version
                opts = ['--silent', '--show-error', '--noproxy', '*', '--max-time', '5',
                        '--http2', '--cacert', '/fixture/cert.pem']
                response = json.loads(run(base + opts + ['https://localhost:18443/browser']))
                assert response['protocol'] == '2.0'
                assert run(base + opts + ['https://localhost:18443/']) == b'fictional transfer\n'
                assert run(base + opts + ['--compressed', 'https://localhost:18443/gzip']) == b'fictional transfer\n'
                assert run(base + opts + ['--data', 'fictional=utilibre', 'https://localhost:18443/post']) == b'fictional=utilibre'
                assert run(base + opts + ['--write-out', '%{http_code}', 'https://localhost:18443/missing']) == b'missing404'
                run(base + opts + ['https://127.0.0.1:18443/'], expected=60)
                proofs.append({'phase': phase, 'imageId': image, 'passed': True,
                    'checks': ['HTTP/2 negotiated', 'body', 'gzip', 'POST', '404 preserved', 'wrong hostname rejected'],
                    'version': version})
            target.write_text(json.dumps({'date': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                'passed': True, 'base': row['base'], 'imageId': build['imageId'], 'checks': proofs,
                'fixture': pin, 'scriptSha256': sha(__file__), 'network': 'isolated loopback only',
                'productionChanged': False, 'limitation': 'System-library compatibility; not exploit reproduction or provider behavior.'}, indent=2) + '\n')
            print(key + ': native HTTP/2 and rejection checks passed before/after', flush=True)
    finally:
        subprocess.run(['docker', 'rm', '-f', name], capture_output=True, timeout=30)
