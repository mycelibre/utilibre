"""Credential-free DHI source/binary parity and public API regression."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tarfile


assert os.getuid() == 65534 and Path('/.dockerenv').exists()
source, recipe, evidence, out = [Path(p) for p in
    ('/source', '/recipe', '/evidence', '/output')]
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
acquired = json.loads((source / 'authenticated.json').read_text())
assert acquired['version'] == '1:1.1.8-1+deb13u0+dhi1'
assert all(sha(source / row['file']) == row['sha256'] for row in acquired['files'])
scope = json.loads((evidence / 'source-scope.json').read_text())
assert scope['passed'] and set(scope['changed']) == {'src/encparse.c'}
archive = source / 'libfontenc_1.1.8-1+deb13u0+dhi1.tar.gz'
with tarfile.open(archive) as tar:
    before = tar.extractfile('libfontenc/.pc/dhi-cve-2026-109908-encparse-setcode-bounds.patch/src/encparse.c').read()
    after = tar.extractfile('libfontenc/src/encparse.c').read()
    header = tar.extractfile('libfontenc/include/X11/fonts/fontenc.h').read()
    vendor_patch = tar.extractfile('libfontenc/debian/patches/dhi-cve-2026-109908-encparse-setcode-bounds.patch').read()
assert hashlib.sha256(before).hexdigest() == scope['changed']['src/encparse.c']['before']
assert hashlib.sha256(after).hexdigest() == scope['changed']['src/encparse.c']['after']
assert b'CVE-2026-109908' in vendor_patch and b'5920c6ee144fffff84b62f5b479171f734f15316' in vendor_patch
root = Path('/work/dhi')
root.mkdir()
package = source / 'libfontenc1_1.1.8-1+deb13u0+dhi1_amd64.deb'
subprocess.run(['dpkg-deb', '-x', str(package), str(root)],
               check=True, capture_output=True, timeout=20)
libdir = root / 'usr/lib/x86_64-linux-gnu'
library = libdir / 'libfontenc.so.1.0.0'
assert library.is_file() and (libdir / 'libfontenc.so.1').resolve() == library
include = Path('/work/include/X11/fonts')
include.mkdir(parents=True)
(include / 'fontenc.h').write_bytes(header)
fixtures = Path('/work/fixtures')
fixtures.mkdir()
(fixtures / 'encodings.dir').write_text('2\nutilibre-ordinary ordinary.enc\nutilibre-boundary boundary.enc\n')
(fixtures / 'ordinary.enc').write_text('STARTENCODING utilibre-ordinary\nSIZE 256\nSTARTMAPPING unicode\n0x41 0x391\n0x42 0x392\n0x43 0x393\nENDMAPPING\nENDENCODING\n')
(fixtures / 'boundary.enc').write_text('STARTENCODING utilibre-boundary\nSIZE 256 258\nSTARTMAPPING unicode\n0xff00 0\nENDMAPPING\nENDENCODING\n')
exe = Path('/work/fixture')
subprocess.run(['cc', '-I/work/include', str(recipe / 'fontenc-native.c'),
                str(library), '-Wl,-rpath,' + str(libdir), '-o', str(exe)],
               check=True, capture_output=True, timeout=30)
linked = subprocess.check_output(['ldd', str(exe)], text=True, timeout=10)
assert str(libdir / 'libfontenc.so.1') in linked
for mode in ('ordinary', 'boundary'):
    result = subprocess.run([str(exe), mode], capture_output=True, timeout=10,
                            env={**os.environ, 'LD_LIBRARY_PATH': str(libdir)})
    (out / (mode + '.log')).write_bytes(result.stdout + result.stderr)
    assert result.returncode == 0 and ('FONTENC_' + mode.upper() + '_PASSED').encode() in result.stdout
(out / 'native.json').write_text(json.dumps({
    'passed': True, 'vendorVersion': acquired['version'],
    'sourceScopeSha256': sha(evidence / 'source-scope.json'),
    'vendorLibrarySha256': sha(library),
    'checks': ['ordinary API', 'boundary .enc', 'source patch parity'],
    'network': 'none', 'productionChanged': False,
}, indent=2) + '\n')
print('Signed DHI source parity and binary API regressions passed.')
