"""Finite Penpot private-library extension of the same reviewed OpenSSL gates."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/openssl-penpot-runtime')
mode, *args = sys.argv[1:]
assert mode in ('inventory', 'scope', 'check-extra', 'scan', 'tls', 'regression', 'crypto', 'release')
if mode in ('crypto', 'release'):
    inputs = json.loads((HERE / 'openssl-penpot-runtime-inputs.json').read_text())
    assert len(inputs['rows']) == 1
    selected = inputs['rows'][0]
    out = ROOT / 'vendor-debian' / selected['key']
    build = json.loads((out / 'build.json').read_text())
    proof_file = out / 'private-crypto.json'
    if mode == 'crypto':
        assert args == [selected['key']] and not proof_file.exists()
        fixture = HERE.parent / 'openssl-bookworm-followup/native-crypto.sh'
        assert hashlib.sha256(fixture.read_bytes()).hexdigest() == inputs['nativeFixture']['cryptoSha256']
        rows = []
        for image in (selected['base'], build['imageId']):
            result = subprocess.run(['docker', 'run', '--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL',
                '--security-opt', 'no-new-privileges', '--user', '65534:65534', '--cpus', '.5', '--memory', '192m',
                '--memory-swap', '192m', '--pids-limit', '32', '--log-driver', 'none', '--tmpfs', '/tmp:rw,size=16m,mode=1777',
                '-v', str(ROOT / 'fixtures/openssl') + ':/native/openssl:ro', '-v', str(fixture) + ':/native.sh:ro',
                '-e', 'PATH=/native:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
                '--entrypoint', 'sh', image, '/native.sh'], capture_output=True, timeout=60)
            assert result.returncode == 0 and result.stdout.strip() == b'OPENSSL_NATIVE_RSA_ECDSA_TAMPER_AES_PBKDF2_RANDOM_PROVIDERS_PASSED'
            rows.append({'imageId': image, 'checks': 8, 'passed': True})
        proof_file.write_text(json.dumps({'passed': True, 'base': selected['base'], 'imageId': build['imageId'], 'nativeRows': rows,
            'fixtureSha256': inputs['nativeFixture']['cryptoSha256'], 'productionChanged': False, 'network': 'none'}, indent=2) + '\n')
        print('Penpot ordinary crypto checks pass through the selected private library')
        raise SystemExit(0)
    assert hashlib.sha256(proof_file.read_bytes()).hexdigest() == selected['opensslEvidence']['private-crypto.json']
    proof = json.loads(proof_file.read_text())
    assert proof['passed'] and proof['base'] == selected['base'] and proof['imageId'] == build['imageId']
original = HERE / ('check-openssl-tls.py' if mode == 'tls' else 'check-openssl-regressions.py' if mode == 'regression' else 'debian-followup.py')
code = original.read_text()
old = 'HERE = Path(__file__).resolve().parent'
assert code.count(old) == 1
code = code.replace(old, 'HERE = Path(' + repr(str(HERE)) + ')')
for old, new in [('/security-20261122/openssl-runtime', '/security-20261122/openssl-penpot-runtime'),
                 ("'openssl-runtime'", "'openssl-penpot-runtime'"),
                 ('openssl-runtime-inputs.json', 'openssl-penpot-runtime-inputs.json')]:
    code = code.replace(old, new)
if mode == 'scope':
    # Inject only the declared, exact library into the existing full-image and
    # exported-symbol comparison. All unrelated files/config remain exact.
    anchor = "if mode == 'prepare' and openssl:"
    assert code.count(anchor) == 1
    extension = '''if mode == 'scope' and openssl:
    replace("    allowed.update(payload)", """    private = row['privateLibrary']
    path = private['path'].lstrip('/')
    assert path == 'opt/imagick/lib/deps/libcrypto.so.3'
    assert hashlib.sha256(helper.image_file(old, '/' + path)).hexdigest() == private['beforeSha256']
    assert hashlib.sha256(helper.image_file(new, '/' + path)).hexdigest() == private['afterSha256']
    payload.add(path)
    allowed.update(payload)""")
elif mode == 'prepare' and openssl:'''
    code = code.replace(anchor, extension)
adapter = ROOT / ('coordinator-' + mode + '.py')
if adapter.exists():
    assert adapter.read_text() == code
else:
    adapter.write_text(code)
sys.argv = [str(adapter), *args] if mode in ('tls', 'regression') else [str(adapter), '--openssl', mode, *args]
sys.path.insert(0, str(HERE))
exec(compile(code, str(adapter), 'exec'), {'__file__': str(adapter), '__name__': '__main__'})
