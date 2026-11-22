"""Disposable-container entry point; never run on the host."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

assert os.getuid() == 65534 and Path('/.dockerenv').exists()
mode = sys.argv[1]
assert mode in ('check-source', 'build')
recipe = Path('/recipe')
source = Path('/source')
out = Path('/output')
inputs = json.loads((recipe / 'openssl-inputs.json').read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
for p in inputs['sourceFiles'] + inputs['patches']:
    assert sha(source / p['file']) == p['sha256']
os.environ.update({'HOME': '/work', 'LC_ALL': 'C.UTF-8', 'DEB_BUILD_OPTIONS': 'parallel=2',
                   'DEBFULLNAME': 'Utilibre maintainers', 'DEBEMAIL': 'admin@utilibre.org'})
work = Path('/work/src')
with (out / 'extract.log').open('w') as log:
    subprocess.run(['dpkg-source', '--no-check', '-x', str(source / ('openssl_' + inputs['sourceVersion'] + '.dsc')), str(work)],
                   cwd='/work', check=True, stdout=log, stderr=subprocess.STDOUT, timeout=90)
os.chdir(work)
subprocess.run(['dpkg-checkbuilddeps'], check=True, timeout=30)
expected = set()
before = {}
for p in inputs['patches']:
    for line in (source / p['file']).read_text().splitlines():
        if line.startswith('diff --git '):
            _, _, old, new = line.split()
            assert old[2:] == new[2:] and '..' not in old.split('/')
            assert old.startswith(('a/crypto/', 'a/ssl/', 'a/include/internal/', 'a/providers/', 'a/test/'))
            expected.add(old[2:])
for p in work.rglob('*'):
    if p.is_file() and not p.is_symlink():
        before[str(p.relative_to(work))] = sha(p)
with (out / 'patches.log').open('w') as log:
    for p in inputs['patches']:
        subprocess.run(['git', 'apply', '--check', str(source / p['file'])], check=True, stdout=log, stderr=subprocess.STDOUT)
        subprocess.run(['git', 'apply', str(source / p['file'])], check=True, stdout=log, stderr=subprocess.STDOUT)
after = {str(p.relative_to(work)): sha(p) for p in work.rglob('*') if p.is_file() and not p.is_symlink()}
assert before.keys() == after.keys()
changed = {p for p in before if before[p] != after[p]}
assert changed == expected, (changed, expected)
proof = {'passed': True, 'network': 'none', 'date': datetime.datetime.now(datetime.timezone.utc).isoformat(),
         'sourceVersion': inputs['sourceVersion'], 'patches': inputs['patches'],
         'changed': {p: {'before': before[p], 'after': after[p]} for p in sorted(changed)}, 'deployed': False}
(out / 'source-scope.json').write_text(json.dumps(proof, indent=2) + '\n')
for name in ['rules', 'control', 'patches/series']:
    shutil.copyfile(work / 'debian' / name, out / ('debian-' + name.replace('/', '-')))
if mode == 'check-source':
    print('All eight upstream patches apply exactly; native prerequisites present')
    sys.exit(0)
# Store each unchanged upstream diff in the native source package. dpkg-source
# checks that the complete source change is represented by this quilt series.
for p in reversed(inputs['patches']):
    subprocess.run(['git', 'apply', '--reverse', str(source / p['file'])], check=True)
for p in inputs['patches']:
    filename = 'utilibre-' + p['file']
    shutil.copyfile(source / p['file'], work / 'debian/patches' / filename)
    with (work / 'debian/patches/series').open('a') as f:
        f.write(filename + '\n')
with (out / 'quilt.log').open('w') as log:
    subprocess.run(['quilt', 'push', '-a'], env={**os.environ, 'QUILT_PATCHES': 'debian/patches', 'QUILT_PATCH_OPTS': '--fuzz=0'},
                   check=True, stdout=log, stderr=subprocess.STDOUT, timeout=90)
assert all(sha(work / p) == after[p] for p in expected)
subprocess.run(['dch', '--newversion', inputs['candidateVersion'], '--distribution', 'trixie',
                'Apply eight pinned upstream OpenSSL security corrections; retain native ABI and all Debian build/test rules.'], check=True)
# Assemble corresponding source before compilation introduces generated package
# trees. The first attempt called dpkg-source after binary packaging; its failed
# logs remain in openssl-build. No include-binaries or broad ignore is used.
with (out / 'source-package.log').open('w') as log:
    subprocess.run(['dpkg-source', '-b', '.'], check=True, stdout=log, stderr=subprocess.STDOUT, timeout=120)
for p in Path('/work').iterdir():
    if p.is_file() and p.name.endswith(('.dsc', '.tar.xz', '.tar.gz')):
        shutil.copyfile(p, out / p.name)
with (out / 'build-packages.lock').open('w') as log:
    subprocess.run(['dpkg-query', '-W', '-f=${binary:Package}=${Version}\n'], check=True, stdout=log)
with (out / 'build.log').open('w') as log:
    subprocess.run(['dpkg-buildpackage', '-b', '-us', '-uc'], check=True, stdout=log, stderr=subprocess.STDOUT, timeout=6600)
# Retain upstream test executables/fixtures for independently bounded checks.
for filename in ['x509_check_cert_pkey_test', 'ectest', 'dtlstest']:
    shutil.copyfile(work / 'build_shared/test' / filename, out / filename)
    (out / filename).chmod(0o755)
shutil.copytree(work / 'test/certs', out / 'test-certs')
for p in Path('/work').iterdir():
    if p.is_file() and (p.name.endswith(('.deb', '.dsc', '.tar.xz', '.tar.gz', '.buildinfo', '.changes'))) and '-dbgsym_' not in p.name:
        shutil.copyfile(p, out / p.name)
# The host owns runner.log and deliberately keeps it private. It is transport
# diagnostics, not a compiler artifact, and is not readable by this build UID.
artifacts = {p.name: sha(p) for p in out.iterdir() if p.is_file() and p.name != 'runner.log'}
(out / 'built.json').write_text(json.dumps({**proof, 'artifacts': artifacts, 'candidateVersion': inputs['candidateVersion']}, indent=2) + '\n')
print('Native OpenSSL package build and upstream tests passed; candidate only')
