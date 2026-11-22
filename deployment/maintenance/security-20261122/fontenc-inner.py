"""Container-only upstream build and public-API regression harness."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile

assert os.getuid() == 65534 and Path('/.dockerenv').exists()
recipe, source, out = Path('/recipe'), Path('/source'), Path('/output')
inputs = json.loads((recipe / 'fontenc-inputs.json').read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
for name, digest in inputs['files'].items():
    assert sha(source / name) == digest
env = {**os.environ, 'HOME': '/work', 'LC_ALL': 'C.UTF-8',
       'FONTENC_CFLAGS': '-I/work/headers/usr/include', 'FONTENC_LIBS': ' ',
       'ASAN_OPTIONS': 'detect_leaks=0:halt_on_error=1:abort_on_error=0'}
# Upstream intentionally caches parsed encodings for process lifetime; ASan
# still checks accesses. This is not a finding suppression in the fleet scanner.
subprocess.run(['dpkg-deb', '-x', str(source / inputs['headers']), '/work/headers'], check=True, timeout=30)
fixtures = Path('/work/fixtures')
fixtures.mkdir()
(fixtures / 'encodings.dir').write_text('2\nutilibre-ordinary ordinary.enc\nutilibre-boundary boundary.enc\n')
(fixtures / 'ordinary.enc').write_text('STARTENCODING utilibre-ordinary\nSIZE 256\nSTARTMAPPING unicode\n0x41 0x391\n0x42 0x392\n0x43 0x393\nENDMAPPING\nENDENCODING\n')
(fixtures / 'boundary.enc').write_text('STARTENCODING utilibre-boundary\nSIZE 256 258\nSTARTMAPPING unicode\n0xff00 0\nENDMAPPING\nENDENCODING\n')
records = []
for phase in ('before', 'candidate'):
    work = Path('/work') / phase
    work.mkdir()
    with tarfile.open(source / 'libfontenc_1.1.8.orig.tar.gz') as archive:
        archive.extractall(work, filter='data')
    tree = work / 'libfontenc-1.1.8'
    before = {str(p.relative_to(tree)): sha(p) for p in tree.rglob('*') if p.is_file()}
    if phase == 'candidate':
        for check in (True, False):
            subprocess.run(['git', 'apply', *(['--check'] if check else []), str(source / 'fontenc-fix.patch')],
                           cwd=tree, check=True, capture_output=True, timeout=15)
        after = {str(p.relative_to(tree)): sha(p) for p in tree.rglob('*') if p.is_file()}
        assert before.keys() == after.keys()
        assert {p for p in before if before[p] != after[p]} == {'src/encparse.c'}
        (out / 'source-scope.json').write_text(json.dumps({'passed': True, 'changed': {'src/encparse.c':
            {'before': before['src/encparse.c'], 'after': after['src/encparse.c']}},
            'patchSha256': sha(source / 'fontenc-fix.patch'), 'productionChanged': False}, indent=2) + '\n')
    for variant, flags in [('asan', '-O1 -g -fsanitize=address -fno-omit-frame-pointer'), ('release', '-O2 -g')]:
        build = work / variant
        build.mkdir()
        with (out / (phase + '-' + variant + '-build.log')).open('wb') as log:
            subprocess.run([str(tree / 'configure'), '--disable-static', '--with-encodingsdir=/usr/share/fonts/X11/encodings'],
                           cwd=build, env={**env, 'CFLAGS': flags}, stdout=log, stderr=log, check=True, timeout=120)
            subprocess.run(['make', '-j2', 'check'], cwd=build, env=env, stdout=log, stderr=log, check=True, timeout=120)
        library = build / 'src/.libs'
        executable = build / 'fixture'
        subprocess.run(['cc', *flags.split(), '-I' + str(tree / 'include'), str(recipe / 'fontenc-native.c'),
                        '-L' + str(library), '-Wl,-rpath,' + str(library), '-lfontenc', '-o', str(executable)],
                       env=env, check=True, capture_output=True, timeout=30)
        modes = ['ordinary', 'boundary'] if variant == 'asan' else ['ordinary']
        for mode in modes:
            result = subprocess.run([str(executable), mode], env=env, capture_output=True, timeout=10)
            (out / (phase + '-' + variant + '-' + mode + '.log')).write_bytes(result.stdout + result.stderr)
            expected_failure = phase == 'before' and mode == 'boundary'
            if expected_failure:
                assert result.returncode != 0 and b'AddressSanitizer: heap-buffer-overflow' in result.stderr
                assert b'setCode' in result.stderr and b'encparse.c' in result.stderr
            else:
                assert result.returncode == 0 and ('FONTENC_' + mode.upper() + '_PASSED').encode() in result.stdout
            records.append({'phase': phase, 'variant': variant, 'case': mode,
                            'passed': not expected_failure, 'expectedBaselineFailure': expected_failure,
                            'exitCode': result.returncode})
        if variant == 'release':
            built = library / 'libfontenc.so.1.0.0'
            shutil.copyfile(built, out / ('libfontenc-' + phase + '.so.1.0.0'))
            shutil.copyfile(build / 'config.log', out / (phase + '-config.log'))
            shutil.copyfile(tree / 'COPYING', out / 'COPYING')
    # Preserve the exact changed source separately; generated build files are
    # outside the source tree and cannot silently broaden the source patch.
    if phase == 'candidate':
        shutil.copyfile(tree / 'src/encparse.c', out / 'repaired-encparse.c')
subprocess.run(['dpkg-query', '-W', '-f=${binary:Package}=${Version}\n'],
               stdout=(out / 'compiler-packages.lock').open('w'), check=True, timeout=20)
(out / 'built.json').write_text(json.dumps({'passed': True, 'compiler': inputs['compiler'],
    'inputSha256': sha(recipe / 'fontenc-inputs.json'), 'fixtureSha256': sha(recipe / 'fontenc-native.c'),
    'sourceScopeSha256': sha(out / 'source-scope.json'), 'checks': records,
    'binarySha256': sha(out / 'libfontenc-candidate.so.1.0.0'),
    'ordinaryChecksPerRun': 10, 'network': 'none', 'productionChanged': False,
    'deploymentApproved': False, 'limitation': 'Isolated upstream-library build and regression; no X server escalation or live hostile-font test.'}, indent=2) + '\n')
print('Fontenc source-scope, ordinary API and ASan baseline/candidate regression passed.')
