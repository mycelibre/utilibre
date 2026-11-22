"""Prove the signed vendor successor preserves the existing DTLS repair.

Apply both published patches to the exact same authenticated source files.
Runtime output must be byte-identical. Three enumerated test-only differences
are checked explicitly; no fuzzy source repair or release approval is implied.
"""
import hashlib
import difflib
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/bookworm-successor')
OLD = ROOT.parents[1] / 'openssl-bookworm-followup-20261012'
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
source = OLD / 'bookworm/openssl_3.0.22.orig.tar.gz'
ubuntu = OLD / 'ubuntu/openssl_3.0.13-0ubuntu3.16.debian.tar.xz'
vendor = ROOT / 'source/openssl_3.0.22-1~deb12u2.debian.tar.xz'
assert sha(source) == '67ebca7e50d17383028045486653492195b83db95f8558709701bb47b5c1ef81'
assert sha(ubuntu) == '77893129922c917792dd187c2853fb36ce1c98597c442b42d8190252959b7f6c'
auth = json.loads((ROOT / 'source/acquired.json').read_text())
assert sha(vendor) == next(f['sha256'] for f in auth['files'] if f['file'] == vendor.name)
assert sha(vendor) == '48971306c5df8124daea7f2bd0de2be7d711e18f2f53711c11327293732e42aa'
with tarfile.open(ubuntu) as t:
    old = t.extractfile('debian/patches/CVE-2026-84782.patch').read()
assert hashlib.sha256(old).hexdigest() == '50ad8c00cc9fa93b79704a116df6486461c3192d3412a77749bb4c4cd4692589'
with tarfile.open(vendor) as t:
    new = t.extractfile('debian/patches/dtls-reset-init_off-before-retransmitting-a-message.patch').read()
    assert 'dtls-reset-init_off-before-retransmitting-a-message.patch' in t.extractfile('debian/patches/series').read().decode().splitlines()
assert hashlib.sha256(new).hexdigest() == '070f6ecc0a5f07802d0d017c790fb01bae438b5ba6e46e1a862c7690f258d51a'
paths = ['ssl/d1_lib.c', 'ssl/statem/statem_dtls.c', 'test/dtlstest.c']
rows = []
with tempfile.TemporaryDirectory(prefix='source-parity-', dir=ROOT) as temp:
    work = Path(temp)
    for label, patch in [('retained', old), ('vendor', new)]:
        directory = work / label
        directory.mkdir()
        with tarfile.open(source) as t:
            for name in paths:
                file = directory / name
                file.parent.mkdir(exist_ok=True, parents=True)
                file.write_bytes(t.extractfile('openssl-3.0.22/' + name).read())
        patchfile = work / (label + '.patch')
        patchfile.write_bytes(patch)
        if label == 'retained':
            subprocess.run(['/root/.nvm/versions/node/v24.22.3/bin/node',
                            str(HERE.parent / 'openssl-bookworm-followup/refresh-context.mjs'), str(patchfile)],
                           check=True, capture_output=True, timeout=20)
        for args in (['--check'], []):
            subprocess.run(['git', 'apply', *args, str(patchfile)], cwd=directory,
                           check=True, capture_output=True, timeout=20)
    for name in paths[:2]:
        assert (work / 'retained' / name).read_bytes() == (work / 'vendor' / name).read_bytes()
        rows.append({'path': name, 'identical': True, 'resultSha256': sha(work / 'vendor' / name)})
    retained = (work / 'retained/test/dtlstest.c').read_text()
    expected = retained
    for before, after, count in [
        ('#include "../e_os.h"\n', '', 1),
        ('#include "testutil.h"\n', '#include "testutil.h"\n\n#include "../e_os.h" /* for ossl_sleep() */\n', 1),
        ('ossl_sleep((uint64_t)(tv.tv_sec * 1000 + tv.tv_usec / 1000) + 10);',
         'ossl_sleep((unsigned long)(tv.tv_sec * 1000 + tv.tv_usec / 1000) + 10);', 2),
    ]:
        assert expected.count(before) == count
        expected = expected.replace(before, after)
    actual = (work / 'vendor/test/dtlstest.c').read_text()
    if expected != actual:
        (ROOT / 'source/test-parity-difference.txt').write_text(''.join(difflib.unified_diff(
            expected.splitlines(keepends=True), actual.splitlines(keepends=True))))
    assert expected == actual
    rows.append({'path': paths[2], 'retainedSha256': sha(work / 'retained' / paths[2]),
                 'vendorSha256': sha(work / 'vendor' / paths[2]),
                 'differences': 'Include placement/comment and two explicit sleep argument casts; no other test changes'})
out = ROOT / 'source/retained-fix.json'
assert not out.exists()
out.write_text(json.dumps({'passed': True, 'advisory': 'CVE-2026-84782',
    'vendorSourceVersion': auth['version'], 'sourceArchiveSha256': sha(source),
    'vendorPackagingSha256': sha(vendor), 'files': rows, 'method': 'Exact Git patch application and resulting-byte comparison',
    'productionChanged': False, 'limitation': 'Source parity only; native regression and application gates still required'}, indent=2) + '\n')
print('Retained DTLS runtime repair is byte-identical in signed vendor successor; test-only differences enumerated.')
