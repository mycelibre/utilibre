"""Reuse the two unchanged native fixtures with a finite additional selection."""
import hashlib
import json
import os
from pathlib import Path
import sys
from adapter_scope import relocate_directory

os.umask(0o077)
HERE = Path(__file__).resolve().parent
relay = sys.argv[1:2] == ['--relay']
if relay:
    sys.argv.pop(1)
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122') / ('openssl-relay-runtime' if relay else 'openssl-extra-runtime')
mode, *keys = sys.argv[1:]
assert mode in ('tls', 'regressions') and keys
original = HERE / ('check-openssl-' + mode + '.py')
code = relocate_directory(original.read_text(), HERE)
for old, new in [("Path('/var/lib/utilibre-maintenance/security-20261122/openssl-runtime')", 'Path(' + repr(str(ROOT)) + ')'),
                 ("'openssl-runtime-inputs.json'", "'openssl-relay-runtime-inputs.json'" if relay else "'openssl-extra-runtime-inputs.json'")]:
    assert code.count(old) == 1
    code = code.replace(old, new)
adapter = ROOT / ('check-' + mode + '.py')
if adapter.exists():
    assert adapter.read_text() == code
else:
    adapter.write_text(code)
(ROOT / ('check-' + mode + '-adapter.json')).write_text(json.dumps({'originalSha256': hashlib.sha256(original.read_bytes()).hexdigest(),
    'adapterSha256': hashlib.sha256(code.encode()).hexdigest(), 'changes': ['finite manifest and evidence paths only']}, indent=2) + '\n')
sys.argv = [str(adapter), *keys]
exec(compile(code, str(adapter), 'exec'), {'__file__': str(adapter), '__name__': '__main__'})
