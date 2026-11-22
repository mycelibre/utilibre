"""Compare eight DHI OpenSSL fixes with already reviewed upstream patch hunks."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import tarfile

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
source = ROOT / 'dhi-successors/source'
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
spec = importlib.util.spec_from_file_location('patch_hunks', HERE / 'check-successor-patches.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
acquired = json.loads((source / 'acquired.json').read_text())
for row in acquired['sources']:
    for file in row['files']:
        assert sha(source / file['file']) == file['sha256']
pins = json.loads((HERE / 'openssl-inputs.json').read_text())['patches']
proofs = []
archive = source / 'openssl_3.5.9-1~deb13u1+dhi0.debian.tar.xz'
with tarfile.open(archive) as tar:
    series = tar.extractfile('debian/patches/series').read().decode().splitlines()
    for pin in pins:
        original = ROOT / 'openssl-source' / pin['file']
        assert sha(original) == pin['sha256']
        matches = [name for name in series if name.startswith(pin['advisory'] + '-')]
        assert len(matches) == 1
        vendor = tar.extractfile('debian/patches/' + matches[0]).read()
        assert module.hunks(original.read_bytes()) == module.hunks(vendor), pin['advisory']
        proofs.append({'advisory': pin['advisory'], 'upstreamPatchSha256': pin['sha256'],
            'vendorPatchSha256': hashlib.sha256(vendor).hexdigest(), 'exactOrderedHunkLines': True})
assert len(proofs) == 8
target = source / 'retained-fixes.json'
assert not target.exists()
target.write_text(json.dumps({'passed': True, 'patches': proofs, 'sourceArchiveSha256': sha(archive),
    'sourceAcquisitionSha256': sha(source / 'acquired.json'), 'scriptSha256': sha(__file__),
    'limitation': 'Exact ordered source hunk parity; native library and application tests remain required.'}, indent=2) + '\n')
print('Eight upstream fixes match the signed DHI packaging source.')
