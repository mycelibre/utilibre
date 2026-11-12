"""Ordinary native host compatibility with fictional local data; no network."""
import ctypes
import hashlib
import html.parser
import json
import os
from pathlib import Path
import platform
import pyexpat
import shutil
import sqlite3
import ssl
import subprocess
import sys
import sysconfig
import tarfile
import tempfile
import venv

assert platform.python_version() == '3.13.18'
assert sysconfig.get_config_var('SOABI') == 'cpython-313-x86_64-linux-gnu'
assert ctypes.CDLL(None).getpid() > 0
assert ssl.create_default_context().check_hostname
assert pyexpat.ParserCreate().Parse(b'<fictional/>', True) == 1
with sqlite3.connect(':memory:') as db:
    db.execute('create table fictional(label text)')
    db.execute('insert into fictional values(?)', ('Ficción ñ',))
    assert db.execute('select label from fictional').fetchone() == ('Ficción ñ',)
with tempfile.TemporaryDirectory(prefix='utilibre-python-native-') as tmp:
    root = Path(tmp)
    (root / 'fictional.txt').write_text('Ficción ñ', encoding='utf-8')
    with tarfile.open(root / 'fictional.tar', 'w') as archive:
        archive.add(root / 'fictional.txt', arcname='fictional.txt')
    with tarfile.open(root / 'fictional.tar') as archive:
        archive.extractall(root / 'restored', filter='data')
    assert (root / 'restored/fictional.txt').read_text() == 'Ficción ñ'
    venv.create(root / 'environment', with_pip=False)
    environment = dict(os.environ)
    environment.pop('PYTHONHOME', None)
    environment.pop('PYTHONPATH', None)
    output = subprocess.check_output(
        [str(root / 'environment/bin/python'), '-c',
         'import sys; print(sys.version_info[:3])'],
        env=environment, text=True, timeout=20)
    assert output.strip() == '(3, 13, 18)'
    with tempfile.TemporaryDirectory(dir=root) as nested:
        (Path(nested) / 'ordinary.txt').write_text('fictional')
    assert not Path(nested).exists()
    # Debian native extensions are relevant consumers of the maintained ABI.
    import apt_pkg
    import apt
    import dbus
    import requests
    import cryptography
    from cryptography.hazmat.primitives import hashes
    apt_pkg.init_config()
    apt_pkg.init_system()
    assert apt_pkg.version_compare('2', '1') > 0
    assert dbus.String('Ficción') == 'Ficción'
    digest = hashes.Hash(hashes.SHA256())
    digest.update(b'fictional')
    assert digest.finalize() == hashlib.sha256(b'fictional').digest()
assert not Path(tmp).exists()
print(json.dumps({'passed': True, 'version': platform.python_version(),
                  'expat': pyexpat.EXPAT_VERSION,
                  'soabi': sysconfig.get_config_var('SOABI'),
                  'sqliteUnicode': True, 'tarRoundTrip': True,
                  'venv': True, 'temporaryDirectoryCleanup': True,
                  'nativeAptDbusCrypto': True,
                  'tlsVerificationDefault': True, 'networkRequests': 0}))
