"""Recover only the second build's failed final evidence-writing step.

The native build and tests already finished. Check Debian-generated checksums
before recording success; retain the wrapper failure and original recipe. No
rebuild, installation, publication or production action.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/openssl-build-v2')
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert not (ROOT / 'built.json').exists()
assert sha(ROOT / 'inner-at-build.py') == '2ce7a0175d12ff1f60dece9a173971ef542d0b6d17d33a71732471a160dfdb60'
error = (ROOT / 'runner.log').read_text()
assert error.count('Traceback (most recent call last):') == 1
assert error.rstrip().endswith("PermissionError: [Errno 13] Permission denied: '/output/runner.log'")
assert 'artifacts = {p.name: sha(p) for p in out.iterdir() if p.is_file()}' in error
log = (ROOT / 'build.log').read_text()
assert re.search(r'Files=347, Tests=4932, [^\n]*\nResult: PASS', log)
assert log.rstrip().endswith('dpkg-buildpackage: info: binary-only upload (no source included)')
inputs = json.loads((HERE / 'openssl-inputs.json').read_text())
version = inputs['candidateVersion']
assert version == '3.5.9-1~deb13u1+utilibre1'


def checksums(file):
    text = file.read_text()
    assert '\nVersion: ' + version + '\n' in text
    lines = text.split('Checksums-Sha256:\n')
    assert len(lines) == 2
    result = {}
    for line in lines[1].splitlines():
        if not line.startswith(' '):
            break
        digest, size, name = line.split()
        assert re.fullmatch('[0-9a-f]{64}', digest) and Path(name).name == name and name not in result
        result[name] = {'sha256': digest, 'bytes': int(size)}
    assert result
    return result


binary_list = checksums(ROOT / ('openssl_' + version + '_amd64.changes'))
source_list = checksums(ROOT / ('openssl_' + version + '.dsc'))
expected_packages = {'libssl-dev', 'libssl-doc', 'libssl3t64', 'openssl', 'openssl-provider-fips', 'openssl-provider-legacy'}
observed = set()
for file in ROOT.glob('*.deb'):
    expected = binary_list[file.name]
    assert sha(file) == expected['sha256'] and file.stat().st_size == expected['bytes']
    package = subprocess.check_output(['dpkg-deb', '-f', str(file), 'Package'], text=True, timeout=15).strip()
    assert package in expected_packages and package not in observed
    assert subprocess.check_output(['dpkg-deb', '-f', str(file), 'Version'], text=True, timeout=15).strip() == version
    observed.add(package)
assert observed == expected_packages
buildinfo = ROOT / ('openssl_' + version + '_amd64.buildinfo')
assert sha(buildinfo) == binary_list[buildinfo.name]['sha256']
for name, expected in source_list.items():
    assert sha(ROOT / name) == expected['sha256'] and (ROOT / name).stat().st_size == expected['bytes']
assert source_list['openssl_3.5.9.orig.tar.gz']['sha256'] == next(p['sha256'] for p in inputs['sourceFiles'] if p['file'] == 'openssl_3.5.9.orig.tar.gz')
proof = json.loads((ROOT / 'source-scope.json').read_text())
assert proof['passed'] and proof['network'] == 'none' and proof['patches'] == inputs['patches']
assert len(proof['changed']) == 13
for name in ('x509_check_cert_pkey_test', 'ectest', 'dtlstest'):
    assert (ROOT / name).read_bytes().startswith(b'\x7fELF')
artifacts = {p.name: sha(p) for p in ROOT.iterdir() if p.is_file()}
record = {**proof, 'candidateVersion': version, 'artifacts': artifacts,
          'nativeSuite': {'passed': True, 'files': 347, 'tests': 4932},
          'evidenceFinalization': {'recovered': True, 'reason': 'Build UID could not read host-owned wrapper log after successful native build and artifact copy',
                                   'coordinatorSha256': sha(__file__), 'nativeBuildRepeated': False,
                                   'debianGeneratedPackageChecksumsVerified': True,
                                   'debianGeneratedSourceChecksumsVerified': True,
                                   'originalRecipeSha256': sha(ROOT / 'inner-at-build.py')}}
(ROOT / 'built.json').write_text(json.dumps(record, indent=2) + '\n')
print('Completed OpenSSL native build finalized: 4932 tests pass, source/package checksums verified; not deployed')
