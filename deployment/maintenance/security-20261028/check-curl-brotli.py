"""Bounded native transfers in the existing curl fixture's network-none namespace.

No production mounts or accounts. This verifies compatibility, not an exploit
reproduction; the same-database package assessment supplies the advisory check.
"""
import ctypes
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
from datetime import datetime, timezone

os.umask(0o077)
ROOT = Path(__file__).resolve().parents[3]
OUT = Path('/var/lib/utilibre-maintenance/security-20261028/nginx')
stage = json.loads((OUT / 'stage.json').read_text())
assert stage['status'] == 'passed'
old = stage['rows'][0]['oldImage']
new = stage['sharedImage']
PYTHON = 'sha256:3dd7cc108ec1493442514f5c2a871af6af0ec31d768ff6e378a93340c3b3db5f'
server = 'maintenance-curl-brotli-fixture'
limits = ['--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
          '--cpus', '1', '--memory', '192m', '--memory-swap', '192m',
          '--pids-limit', '64', '--log-driver', 'none']


def run(args, *, expected=0, timeout=120):
    p = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout)
    assert p.returncode == expected, (args[0:3], p.returncode, p.stderr.decode(errors='replace')[:800])
    return p.stdout


rows = []
with tempfile.TemporaryDirectory(prefix='curl-brotli-', dir=OUT) as tmp:
    tmp = Path(tmp)
    body = b'fictional transfer\n'
    encoder = ctypes.CDLL('libbrotlienc.so.1').BrotliEncoderCompress
    encoder.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_size_t,
                        ctypes.c_void_p, ctypes.POINTER(ctypes.c_size_t), ctypes.c_void_p]
    encoder.restype = ctypes.c_int
    data = ctypes.create_string_buffer(1024)
    size = ctypes.c_size_t(1024)
    assert encoder(5, 22, 0, len(body), body, ctypes.byref(size), data) == 1
    (tmp / 'body.br').write_bytes(data.raw[:size.value])
    (tmp / 'invalid.br').write_bytes(b'\xff' * 32)
    run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '2',
         '-keyout', str(tmp / 'key.pem'), '-out', str(tmp / 'cert.pem'),
         '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost'])
    (tmp / 'cert.pem').chmod(0o644)
    fixture = ROOT / 'deployment/maintenance/closure-followup/curl-fixture-server.py'
    try:
        run(['docker', 'run', '-d', '--name', server, *limits, '--network', 'none',
             '--user', '0', '-v', str(tmp) + ':/fixture:ro',
             '-v', str(fixture) + ':/server.py:ro', '--entrypoint', 'python3', PYTHON, '/server.py'])
        run(['docker', 'exec', server, 'python3', '-c',
             'import socket,time\nfor i in range(40):\n try:\n  socket.create_connection(("127.0.0.1",18443),.1).close();break\n except OSError: time.sleep(.1)\nelse: raise RuntimeError("fixture readiness")'])
        feature_sets = []
        for image in (old, new):
            base = ['docker', 'run', '--rm', *limits, '--network', 'container:' + server,
                    '-v', str(tmp / 'cert.pem') + ':/ca.pem:ro', '--entrypoint', 'curl', image]
            version = run(base + ['--version']).decode()
            feature_sets.append({k: set(next(l for l in version.splitlines() if l.startswith(k)).split()[1:])
                                 for k in ('Features:', 'Protocols:')})
            checks = []
            opts = ['--silent', '--show-error', '--noproxy', '*', '--max-time', '5']
            for path in ('/', '/redirect', '/gzip', '/brotli'):
                assert run(base + opts + ['--location', '--max-redirs', '3', '--compressed',
                                          'http://localhost:18080' + path]) == body
                checks.append(path)
            assert run(base + opts + ['--data', 'fictional=utilibre', 'http://localhost:18080/post']) == b'fictional=utilibre'
            assert run(base + opts + ['--cacert', '/ca.pem', 'https://localhost:18443/']) == body
            run(base + opts + ['--cacert', '/ca.pem', 'https://127.0.0.1:18443/'], expected=60)
            run(base + opts + ['--compressed', 'http://localhost:18080/bad-brotli'], expected=61)
            assert run(base + opts + ['--write-out', '%{http_code}', 'http://localhost:18080/missing']) == b'missing404'
            rows.append({'imageId': image, 'checks': checks + ['POST', 'TLS trusted', 'TLS hostname rejected',
                         'malformed Brotli rejected', '404 preserved'], 'passed': True, 'version': version})
        for k in feature_sets[0]:
            assert feature_sets[0][k] <= feature_sets[1][k], 'Lost curl feature/protocol'
    finally:
        subprocess.run(['docker', 'rm', '-f', server], capture_output=True, timeout=30)

db = Path('/var/cache/utilibre-security/db/trivy.db')
def dbhash():
    with db.open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()
db_sha = dbhash()
scans = []
for label, image in [('before', old), ('after', new)]:
    report = OUT / ('native-' + label + '-scan.json')
    run(['/opt/utilibre/maintenance/bin/trivy', 'image', '--disable-telemetry', '--cache-dir',
         '/var/cache/utilibre-security', '--cache-backend', 'memory', '--scanners', 'vuln',
         '--offline-scan', '--skip-db-update', '--skip-java-db-update', '--parallel', '1',
         '--timeout', '3m', '--no-progress', '--list-all-pkgs', '--format', 'json',
         '--image-src', 'docker', '--output', str(report), image], timeout=210)
    result = json.loads(report.read_text())
    assert result['Metadata']['ImageID'] == image
    assert any(r.get('Type') == 'alpine' and len(r.get('Packages', [])) >= 60 for r in result['Results'])
    findings = [{'id': v['VulnerabilityID'], 'package': v['PkgName'], 'severity': v['Severity']}
                for r in result['Results'] for v in r.get('Vulnerabilities', []) if v['Severity'] in ('HIGH', 'CRITICAL')]
    scans.append({'imageId': image, 'findings': findings})
assert dbhash() == db_sha
assert {'CVE-2026-92392', 'CVE-2026-111497'} <= {f['id'] for f in scans[0]['findings']}
assert not scans[1]['findings']
proof = {'date': datetime.now(timezone.utc).isoformat(), 'passed': True, 'imageId': new,
         'fixtureImage': PYTHON, 'fixtureSha256': hashlib.sha256(fixture.read_bytes()).hexdigest(),
         'network': 'none; clients share only the synthetic fixture network namespace',
         'native': rows, 'databaseSha256': db_sha, 'scans': scans,
         'limitations': 'Compatibility and vendor-fix inventory, not reproduction of the HTTP/2 UAF or Brotli overflow.'}
(OUT / 'native.json').write_text(json.dumps(proof, indent=2) + '\n')
print('Native HTTP/TLS/Brotli transfers and rejection checks passed on old/new; same-DB target findings removed.')
