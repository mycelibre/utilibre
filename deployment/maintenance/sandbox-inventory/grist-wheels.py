"""Read shipped application-code metadata only, never Grist documents or caches."""
import email
import glob
import hashlib
import json
import os
import zipfile

rows = []
paths = sorted(glob.glob('/grist/sandbox/pyodide/_build/packages/*.whl'))
assert 0 < len(paths) <= 200, 'Unexpected wheel inventory'
for path in paths:
    assert not os.path.islink(path) and os.path.getsize(path) <= 32 * 1024**2
    with zipfile.ZipFile(path) as archive:
        names = [n for n in archive.namelist() if n.endswith('.dist-info/METADATA')]
        assert len(names) == 1
        assert archive.getinfo(names[0]).file_size < 1024**2
        metadata = email.message_from_bytes(archive.read(names[0]))
    with open(path, 'rb') as source:
        digest = hashlib.file_digest(source, 'sha256').hexdigest()
    rows.append({'name': metadata['Name'], 'version': metadata['Version'],
                 'filename': os.path.basename(path), 'sha256': digest})
print(json.dumps(rows))
