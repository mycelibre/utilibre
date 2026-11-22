"""Reuse retained TLS, DTLS and Wishlist fixtures with exact vendor candidates."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/bookworm-successor')
OLD = ROOT.parents[1] / 'openssl-bookworm-followup-20261012'
inputs = json.loads((HERE / 'bookworm-successor-inputs.json').read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
node = '/root/.nvm/versions/node/v24.22.3/bin/node'
mode, *keys = sys.argv[1:]
assert mode in ('tls', 'dtls', 'wishlist') and keys
assert len(set(keys)) == len(keys) <= 5


def run(command, timeout=120):
    return subprocess.run(command, capture_output=True, timeout=timeout)


if mode == 'tls':
    # The existing test explicitly uses the same CLI with both libraries.
    fixture = ROOT / 'fixtures'
    fixture.mkdir(mode=0o700, exist_ok=True)
    cli = fixture / 'openssl'
    if not cli.exists():
        created = subprocess.check_output(['docker', 'create', '--network', 'none', '--entrypoint', 'true',
                                          inputs['nativeFixture']['tlsImage']], text=True, timeout=30).strip()
        try:
            subprocess.run(['docker', 'cp', created + ':/usr/bin/openssl', str(cli)], check=True, capture_output=True, timeout=30)
            cli.chmod(0o755)
        finally:
            subprocess.run(['docker', 'rm', '-v', created], check=True, capture_output=True, timeout=30)
    assert sha(cli) == inputs['nativeFixture']['cliSha256']
    original = HERE / 'check-openssl-tls.py'
    code = original.read_text()
    for old, new in [
        ('HERE = Path(__file__).resolve().parent', 'HERE = Path(' + repr(str(HERE)) + ')'),
        ("Path('/var/lib/utilibre-maintenance/security-20261122/openssl-runtime')", 'Path(' + repr(str(ROOT)) + ')'),
        ("'openssl-runtime-inputs.json'", "'bookworm-successor-inputs.json'"),
    ]:
        assert code.count(old) == 1
        code = code.replace(old, new)
    adapter = ROOT / 'tls-adapter.py'
    if adapter.exists():
        assert adapter.read_text() == code
    else:
        adapter.write_text(code)
    subprocess.run(['python3', str(adapter), *keys], check=True, timeout=300)
else:
    for key in keys:
        row = next(r for r in inputs['rows'] if r['key'] == key)
        out = ROOT / 'vendor-debian' / key
        build = json.loads((out / 'build.json').read_text())
        assert build['passed'] and build['base'] == row['base']
        if mode == 'dtls':
            assert not (out / 'dtls-regression.json').exists()
            assert sha(OLD / 'fixture/dtlstest') == inputs['nativeFixture']['dtlsBinarySha256']
            assert sha(OLD / 'fixture/server.pem') == inputs['nativeFixture']['dtlsCertificateSha256']
            checks = []
            for phase, image in [('before', row['base']), ('after', build['imageId'])]:
                for test in ('test_dtls_client_retransmit', 'test_dtls_server_retransmit'):
                    p = run(['docker', 'run', '--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL',
                             '--security-opt', 'no-new-privileges', '--cpus', '.5', '--memory', '192m',
                             '--memory-swap', '192m', '--pids-limit', '32', '--log-driver', 'none', '--ulimit', 'core=0',
                             '--user', '65534:65534', '-v', str(OLD / 'fixture') + ':/fixture:ro',
                             '--entrypoint', '/fixture/dtlstest', image, '-test', test,
                             '/fixture/server.pem', '/fixture/server.pem'])
                    text = p.stdout + p.stderr
                    (out / (phase + '-' + test + '.log')).write_bytes(text)
                    assert p.returncode == 0 and b'not ok' not in text
                    assert re.search(rb'(?m)^ok 1 - ' + test.encode() + rb'$', text)
                    checks.append({'imageId': image, 'test': test, 'passed': True})
            (out / 'dtls-regression.json').write_text(json.dumps({'passed': True,
                'date': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'base': row['base'],
                'imageId': build['imageId'], 'checks': checks, 'fixtureSha256': inputs['nativeFixture']['dtlsBinarySha256'],
                'network': 'none', 'productionChanged': False,
                'limitation': 'Both inputs already contain the repair; preservation checks, not a new failing-baseline claim.'}, indent=2) + '\n')
        else:
            assert key == 'wishlist-app' and not (out / 'application.json').exists()
            for file in ('scope.json', 'consumer.json'):
                checked = json.loads((out / file).read_text())
                assert checked['passed'] and checked['imageId'] == build['imageId']
            original = HERE.parent / 'openssl-bookworm-followup/wishlist-check.mjs'
            code = original.read_text()
            for old, new in [
                ("const dir='/var/lib/utilibre-maintenance/openssl-bookworm-followup-20261012/images/wishlist'", 'const dir=' + json.dumps(str(out))),
                ("from '../../../portal/node_modules/playwright-core/index.mjs'", 'from ' + json.dumps((HERE.parents[2] / 'portal/node_modules/playwright-core/index.mjs').as_uri())),
            ]:
                assert code.count(old) == 1
                code = code.replace(old, new)
            adapter = out / 'wishlist-native.mjs'
            adapter.write_text(code)
            p = run([node, str(adapter)], timeout=300)
            (out / 'wishlist-native.log').write_bytes(p.stdout + p.stderr)
            assert p.returncode == 0
            native = json.loads((out / 'application.json').read_text())
            assert native['passed'] and native['imageId'] == build['imageId']
            (out / 'application.json').rename(out / 'application-native.json')
            (out / 'application.json').write_text(json.dumps({**native, 'base': row['base'],
                'originalSha256': sha(original), 'adapterSha256': sha(adapter),
                'nativeSha256': sha(out / 'application-native.json'), 'consumerSha256': sha(out / 'consumer.json'),
                'productionChanged': False}, indent=2) + '\n')
        print(key + ': retained ' + mode + ' check passed', flush=True)
