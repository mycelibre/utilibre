"""Finite fictional fixtures only. Run unprivileged in a fresh network namespace.

All deliberate baseline escape paths remain inside the disposable test directory.
Nothing is downloaded; no host pip installation or production data is involved.
"""
import base64
import csv
import hashlib
import io
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tarfile
import tempfile
import types
import venv
import zipfile

wheel = Path(sys.argv[1]).resolve()
mode = sys.argv[2]
assert mode in ('old', 'new')
with zipfile.ZipFile(wheel) as z:
    source = z.read('setuptools/_vendor/jaraco/context.py')
    for name, digest, length in csv.reader(io.StringIO(z.read('setuptools-78.1.1.dist-info/RECORD').decode())):
        if not digest:
            continue
        algorithm, expected = digest.split('=', 1)
        assert algorithm == 'sha256'
        payload = z.read(name)
        assert len(payload) == int(length)
        assert base64.urlsafe_b64encode(hashlib.sha256(payload).digest()).rstrip(b'=').decode() == expected
module = types.ModuleType('verified_native_jaraco_context')
exec(compile(source, str(wheel) + '/jaraco/context.py', 'exec'), module.__dict__)
assert hasattr(module, '_default_filter') == (mode == 'new')

def archive(path, entries):
    with tarfile.open(path, 'w:gz') as out:
        for name, content, kind, link in entries:
            member = tarfile.TarInfo(name)
            member.mode = 0o644
            member.type = kind
            member.linkname = link
            member.size = len(content) if kind == tarfile.REGTYPE else 0
            out.addfile(member, io.BytesIO(content) if member.size else None)

safe = unsafe = rejected_or_confined = 0
with tempfile.TemporaryDirectory(prefix='utilibre-vendor-check-') as temp:
    base = Path(temp)
    good = base / 'good.tar.gz'
    archive(good, [('bundle/readme.txt', 'Fictional ñ\n'.encode(), tarfile.REGTYPE, ''),
                   ('bundle/folder/image.txt', b'fictional pixels', tarfile.REGTYPE, '')])
    with module.tarball(good.as_uri(), base / 'normal') as target:
        assert (Path(target) / 'readme.txt').read_text() == 'Fictional ñ\n'
        assert (Path(target) / 'folder/image.txt').read_bytes() == b'fictional pixels'
        safe += 1
    assert not (base / 'normal').exists()

    for kind in ('traversal', 'deep-traversal', 'absolute', 'symlink', 'hardlink', 'fifo', 'nested'):
        case = base / kind
        case.mkdir()
        output = case / 'out'
        sentinel = case / 'private-target'
        sentinel.write_bytes(b'fictional private sentinel')
        escaped = base / 'deep-escaped.txt' if kind == 'deep-traversal' else case / 'escaped.txt'
        name = 'bundle/../escaped.txt'
        member_type, link = tarfile.REGTYPE, ''
        if kind == 'deep-traversal':
            name = 'bundle/../../deep-escaped.txt'
        elif kind == 'absolute':
            name = 'bundle/' + str(escaped)
        elif kind in ('symlink', 'hardlink'):
            name, link = 'bundle/link', '../private-target'
            member_type = tarfile.SYMTYPE if kind == 'symlink' else tarfile.LNKTYPE
        elif kind == 'fifo':
            name, member_type = 'bundle/fifo', tarfile.FIFOTYPE
        fixture = case / 'input.tar.gz'
        archive(fixture, [(name, b'fictional escape', member_type, link)])
        if kind == 'nested':
            nested = fixture.read_bytes()
            archive(fixture, [('bundle/inner.tar.gz', nested, tarfile.REGTYPE, '')])
        exposed = denied = False
        try:
            with module.tarball(fixture.as_uri(), output) as target:
                if kind == 'nested':
                    with module.tarball((Path(target) / 'inner.tar.gz').as_uri(), case / 'inner-out'):
                        exposed = escaped.exists()
                elif kind in ('symlink', 'hardlink'):
                    exposed = (Path(target) / 'link').read_bytes() == sentinel.read_bytes()
                elif kind == 'fifo':
                    exposed = stat.S_ISFIFO((Path(target) / 'fifo').stat().st_mode)
                else:
                    exposed = escaped.exists()
        except tarfile.FilterError:
            denied = True
        assert sentinel.read_bytes() == b'fictional private sentinel'
        if mode == 'old':
            assert exposed and not denied, 'Baseline did not reproduce: ' + kind
            unsafe += 1
        else:
            assert not exposed and not escaped.exists(), 'Unsafe extraction: ' + kind
            assert denied or kind == 'absolute', 'Expected native filter rejection'
            rejected_or_confined += 1
        assert not output.exists()

    # Actual native venv + packaging consumer, not just imports from the zip.
    envdir = base / 'venv'
    venv.EnvBuilder(with_pip=True).create(envdir)
    python = str(envdir / 'bin/python')
    clean = {'PATH': '/usr/bin:/bin', 'LANG': 'C.UTF-8', 'PIP_CONFIG_FILE': '/dev/null',
             'PIP_NO_INDEX': '1', 'PIP_DISABLE_PIP_VERSION_CHECK': '1', 'PYTHONDONTWRITEBYTECODE': '1'}
    def run(args, cwd=None):
        return subprocess.run(args, cwd=cwd, env=clean, capture_output=True, text=True, check=True, timeout=60).stdout
    run([python, '-m', 'pip', 'install', '--no-index', '--no-deps', '--no-compile', str(wheel)])
    source_check = run([python, '-B', '-c', "import setuptools._vendor.jaraco.context as c; print(hasattr(c, '_default_filter'))"])
    assert source_check.strip() == str(mode == 'new')
    project = base / 'project'
    project.mkdir()
    (project / 'setup.py').write_text("from setuptools import setup\nsetup(name='utilibre-fictional-fixture',version='0.0.1',py_modules=['fictional'])\n")
    (project / 'fictional.py').write_text("VALUE = 'fictional example'\n")
    run([python, 'setup.py', 'bdist_wheel'], cwd=project)
    built = list((project / 'dist').glob('*.whl'))
    assert len(built) == 1
    run([python, '-m', 'pip', 'install', '--no-index', '--no-deps', '--no-compile', str(built[0])])
    assert run([python, '-c', 'import fictional; print(fictional.VALUE)']).strip() == 'fictional example'
    run([python, '-m', 'pip', 'check'])

print(json.dumps({'passed': True, 'mode': mode, 'wheelSha256': hashlib.sha256(wheel.read_bytes()).hexdigest(),
                  'contextSha256': hashlib.sha256(source).hexdigest(), 'recordHashesValid': True,
                  'normalArchiveFlows': safe, 'baselineUnsafeCases': unsafe,
                  'rejectedOrConfinedCases': rejected_or_confined,
                  'nativeVenvSetupBuildInstallImport': True, 'network': 'caller-enforced-unshared'}))
