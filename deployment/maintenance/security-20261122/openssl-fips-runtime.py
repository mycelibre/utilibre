"""Use the existing OpenSSL gates for one separately built vendor variant.

Selection, preparation, tests and release are separate commands. The release
additionally requires explicit provider-preservation evidence. No fuzzy edits.
"""
import hashlib
import json
import os
from pathlib import Path
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/openssl-fips-runtime')
mode, *args = sys.argv[1:]
assert mode in ('inventory', 'prepare', 'scope', 'check', 'scan', 'tls', 'regression', 'release')
if mode in ('tls', 'regression'):
    original = HERE / ('check-openssl-tls.py' if mode == 'tls' else 'check-openssl-regressions.py')
else:
    original = HERE / 'debian-followup.py'
code = original.read_text()
old = 'HERE = Path(__file__).resolve().parent'
assert code.count(old) == 1
code = code.replace(old, 'HERE = Path(' + repr(str(HERE)) + ')')
for old, new in [
    ('/security-20261122/openssl-runtime', '/security-20261122/openssl-fips-runtime'),
    ("'openssl-runtime'", "'openssl-fips-runtime'"),
    ('openssl-runtime-inputs.json', 'openssl-fips-runtime-inputs.json'),
    ('openssl-build-v2', 'openssl-fips-build'),
    ('openssl-source-offer.json', 'openssl-fips-source-offer.json'),
]:
    code = code.replace(old, new)
if mode == 'prepare':
    anchor = "elif mode == 'release' and openssl:"
    assert code.count(anchor) == 1
    extra = '''    replace("code=code.replace(needle,checks+needle)",
        "code=code.replace(needle,checks+needle)\\nassert code.count('&& test -z') == 1\\ncode=code.replace('&& test -z', '&& apt-mark hold libssl-dev libssl3t64 openssl && test -z')")
elif mode == 'release' and openssl:'''
    code = code.replace(anchor, extra)
if mode == 'release':
    selected = next(r for r in json.loads((HERE / 'openssl-fips-runtime-inputs.json').read_text())['rows'] if r['key'] == args[1])
    proof_file = ROOT / 'vendor-debian' / selected['key'] / 'fips-native.json'
    assert hashlib.sha256(proof_file.read_bytes()).hexdigest() == selected['opensslEvidence']['fips-native.json']
    proof = json.loads(proof_file.read_text())
    assert proof['passed'] and proof['base'] == selected['base']
    assert proof['imageId'] == json.loads((proof_file.parent / 'build.json').read_text())['imageId']
adapter = ROOT / ('coordinator-' + mode + '.py')
if adapter.exists():
    assert adapter.read_text() == code
else:
    adapter.write_text(code)
sys.argv = [str(adapter), *args] if mode in ('tls', 'regression') else [str(adapter), '--openssl', mode, *args]
sys.path.insert(0, str(HERE))
exec(compile(code, str(adapter), 'exec'), {'__file__': str(adapter), '__name__': '__main__'})
