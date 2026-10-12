"""Verify the existing snapshot and SQLite integrity without reading user records."""
from pathlib import Path
import hashlib
import json
import shutil
import sqlite3
import sys
import tarfile
import tempfile

backup = Path(sys.argv[1]).resolve()
assert backup.parent == Path('/opt/utilibre/records/backups')
for name, expected in json.loads((backup / 'SHA256.json').read_text()).items():
    assert '/' not in name and name not in ('.', '..')
    with (backup / name).open('rb') as stream:
        assert hashlib.file_digest(stream, 'sha256').hexdigest() == expected
verified_home = False
with tempfile.TemporaryDirectory(prefix='grist-integrity-', dir='/var/lib/utilibre-maintenance/sandbox-final-20261011') as scratch:
    with tarfile.open(backup / 'saved-work-and-config.tar.gz') as archive:
        for member in archive.getmembers():
            if not (member.isfile() and member.name.startswith('data/grist/') and member.name.endswith(('.sqlite3', '.grist'))):
                continue
            # Deliberately don't use archive paths or query table/user contents.
            target = Path(scratch) / 'check.sqlite3'
            with archive.extractfile(member) as source, target.open('wb') as output:
                shutil.copyfileobj(source, output)
            with sqlite3.connect('file:' + str(target) + '?mode=ro', uri=True) as db:
                assert db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
            target.unlink()
            verified_home |= member.name == 'data/grist/home.sqlite3'
assert verified_home
print('Native saved-work snapshot checksums and Grist SQLite integrity passed; no user records queried.')
