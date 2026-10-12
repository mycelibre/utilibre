"""Synthetic Python/Expat consumer checks, including actual salt API calls."""
import ctypes
import hashlib
import inspect
import io
import json
import pyexpat
import sqlite3
import ssl
import sys
import tarfile
import xml.etree.ElementTree as ET

assert sys.version_info[:3] == (3, 11, 2)
baseline = '--baseline' in sys.argv
if not baseline:
    assert pyexpat.version_info == (2, 9, 0)
probe = ctypes.CDLL(None)
probe.utilibre_entropy_calls.restype = ctypes.c_uint
probe.utilibre_nonzero_entropy_calls.restype = ctypes.c_uint
before = probe.utilibre_entropy_calls()
parser = pyexpat.ParserCreate()
assert probe.utilibre_entropy_calls() == before + (0 if baseline else 1)
assert parser.Parse('<fictional>á ñ</fictional>', True)
before = probe.utilibre_entropy_calls()
parser2 = ET.XMLParser()
assert probe.utilibre_entropy_calls() == before + (0 if baseline else 1)
parser2.feed('<fictional>á ñ</fictional>')
assert parser2.close().text == 'á ñ'
assert probe.utilibre_entropy_calls() == probe.utilibre_nonzero_entropy_calls()
with sqlite3.connect(':memory:') as db:
    assert db.execute('select ?', ('fictional ñ',)).fetchone() == ('fictional ñ',)
data = io.BytesIO()
with tarfile.open(fileobj=data, mode='w') as archive:
    item = tarfile.TarInfo('fictional.txt')
    payload = b'fictional native data\n'
    item.size = len(payload)
    archive.addfile(item, io.BytesIO(payload))
data.seek(0)
with tarfile.open(fileobj=data) as archive:
    assert archive.extractfile('fictional.txt').read() == payload
# This Debian branch has no extraction filters. Do NOT represent its default
# extraction as safe for untrusted archives or a newly fixed feature.
assert 'filter' not in inspect.signature(tarfile.TarFile.extractall).parameters
for name in ['data_filter', 'tar_filter', 'LinkFallbackError']:
    assert not hasattr(tarfile, name)
assert not hasattr(tarfile.TarFile, 'makelink_with_filter')
context = ssl.create_default_context()
assert context.check_hostname and context.verify_mode == ssl.CERT_REQUIRED
print(json.dumps({'passed': True, 'python': sys.version.split()[0], 'expat': pyexpat.EXPAT_VERSION,
                  'nativeEntropyApiCalls': probe.utilibre_entropy_calls(),
                  'baseline': baseline, 'bothParserPathsUse128BitSalt': not baseline, 'sqliteUnicode': True,
                  'tarRoundTrip': True, 'legacyTarExtractionFiltersAbsent': True,
                  'legacyTarSha256': hashlib.sha256(open(tarfile.__file__, 'rb').read()).hexdigest(),
                  'tlsVerificationDefault': True}))
