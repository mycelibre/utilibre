"""Build the exact upstream correction as Debian packages in an isolated image."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess


assert os.getuid() == 65534 and Path('/.dockerenv').exists()
recipe, source, out = Path('/recipe'), Path('/source'), Path('/output')
inputs = json.loads((recipe / 'fontenc-inputs.json').read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
for name, digest in inputs['files'].items():
    assert sha(source / name) == digest
work = Path('/work')
tree = work / 'libfontenc-1.1.8'
subprocess.run(['dpkg-source', '-x', str(source / 'libfontenc_1.1.8-1.dsc'),
                str(tree)], check=True, capture_output=True, timeout=30)
patch = source / 'fontenc-fix.patch'
for mode in (['--check'], []):
    subprocess.run(['git', 'apply', *mode, str(patch)], cwd=tree,
                   check=True, capture_output=True, timeout=15)
changelog = tree / 'debian/changelog'
original = changelog.read_text()
prefix = ('libfontenc (1:1.1.8-1+deb13u0+utilibre1) trixie; urgency=medium\n\n'
          '  * Apply the upstream encoding bounds correction (CVE-2026-109908).\n\n'
          ' -- Utilibre Maintenance <security@utilibre.org>  Sun, 22 Nov 2026 18:45:00 +0000\n\n')
changelog.write_text(prefix + original)
env = {**os.environ, 'HOME': '/work', 'LC_ALL': 'C.UTF-8',
       'SOURCE_DATE_EPOCH': '1795373100', 'DEB_BUILD_OPTIONS': 'parallel=2'}
with (out / 'package-build.log').open('wb') as log:
    subprocess.run(['dpkg-buildpackage', '-b', '-us', '-uc', '-j2'], cwd=tree,
                   env=env, stdout=log, stderr=subprocess.STDOUT,
                   check=True, timeout=300)
packages = []
for file in sorted(work.glob('libfontenc*.deb')) + sorted(work.glob('libfontenc*.udeb')):
    dest = out / file.name
    shutil.copyfile(file, dest)
    packages.append({'file': dest.name, 'bytes': dest.stat().st_size,
                     'sha256': sha(dest)})
assert {p['file'].split('_', 1)[0] for p in packages} >= \
    {'libfontenc1', 'libfontenc-dev', 'libfontenc1-udeb'}
binary = next(out / p['file'] for p in packages if p['file'].startswith('libfontenc1_'))
fields = dict(line.split(': ', 1) for line in subprocess.check_output(
    ['dpkg-deb', '-f', str(binary), 'Package', 'Version'],
    text=True, timeout=10).splitlines())
assert fields == {'Package': 'libfontenc1',
                  'Version': '1:1.1.8-1+deb13u0+utilibre1'}
root = work / 'package-root'
root.mkdir()
dev = next(out / p['file'] for p in packages if p['file'].startswith('libfontenc-dev_'))
for file in (binary, dev):
    subprocess.run(['dpkg-deb', '-x', str(file), str(root)], check=True,
                   capture_output=True, timeout=15)
libdir = root / 'usr/lib/x86_64-linux-gnu'
library = libdir / 'libfontenc.so.1.0.0'
assert library.is_file()
fixtures = work / 'fixtures'
fixtures.mkdir()
(fixtures / 'encodings.dir').write_text('2\nutilibre-ordinary ordinary.enc\nutilibre-boundary boundary.enc\n')
(fixtures / 'ordinary.enc').write_text('STARTENCODING utilibre-ordinary\nSIZE 256\nSTARTMAPPING unicode\n0x41 0x391\n0x42 0x392\n0x43 0x393\nENDMAPPING\nENDENCODING\n')
(fixtures / 'boundary.enc').write_text('STARTENCODING utilibre-boundary\nSIZE 256 258\nSTARTMAPPING unicode\n0xff00 0\nENDMAPPING\nENDENCODING\n')
exe = work / 'package-fixture'
subprocess.run(['cc', '-I' + str(root / 'usr/include'),
                str(recipe / 'fontenc-native.c'), '-L' + str(libdir),
                '-Wl,-rpath,' + str(libdir), '-lfontenc', '-o', str(exe)],
               check=True, capture_output=True, timeout=30)
linked = subprocess.check_output(['ldd', str(exe)], text=True, timeout=10)
assert (libdir / 'libfontenc.so.1').resolve() == library
assert str(libdir / 'libfontenc.so.1') in linked
checks = []
for mode in ('ordinary', 'boundary'):
    result = subprocess.run([str(exe), mode], capture_output=True, timeout=10,
                            env={**env, 'LD_LIBRARY_PATH': str(libdir)})
    (out / ('package-' + mode + '.log')).write_bytes(result.stdout + result.stderr)
    assert result.returncode == 0 and ('FONTENC_' + mode.upper() + '_PASSED').encode() in result.stdout
    checks.append(mode)
(out / 'package-build.json').write_text(json.dumps({
    'passed': True, 'sourceSha256': sha(source / 'libfontenc_1.1.8-1.dsc'),
    'patchSha256': sha(patch), 'version': fields['Version'],
    'packages': packages, 'packagedLibrarySha256': sha(library),
    'nativeChecks': checks, 'network': 'none', 'productionChanged': False,
    'deploymentApproved': False,
    'limitations': ['Candidate packages only; no host or DHI integration',
                    'Byte-for-byte reproducible package output not claimed'],
}, indent=2) + '\n')
print('Debian package build and native package metadata passed.')
