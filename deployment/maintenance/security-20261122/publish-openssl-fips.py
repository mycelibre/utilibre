"""Publish the corresponding vendor-variant source through the existing offer."""
import os
from pathlib import Path
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
assert sys.argv[1:] in (['prepare'], ['publish'])
original = HERE / 'publish-openssl.py'
code = original.read_text()
replacements = [
    ('HERE = Path(__file__).resolve().parent', 'HERE = Path(' + repr(str(HERE)) + ')'),
    ("'openssl-build-v2'", "'openssl-fips-build'"),
    ('security-openssl-20261122-source.tar.gz', 'security-openssl-authentik-20261122-source.tar.gz'),
    ('openssl-source-offer.json', 'openssl-fips-source-offer.json'),
    ("'openssl-source'", "'openssl-fips-source'"),
    ('openssl-inputs.json', 'openssl-fips-inputs.json'),
    ('openssl-build.txt', 'openssl-fips-build.txt'),
    ("'publish-openssl.py'):", "'publish-openssl.py', 'publish-openssl-fips.py', 'prepare-openssl-fips.py', 'openssl-inputs.json', 'openssl-ak-fips.patch'):"),
]
for old, new in replacements:
    assert old in code, old
    code = code.replace(old, new)
adapter = ROOT / 'publish-openssl-fips-adapter.py'
if adapter.exists():
    assert adapter.read_text() == code
else:
    adapter.write_text(code)
exec(compile(code, str(adapter), 'exec'), {'__file__': str(adapter), '__name__': '__main__'})
