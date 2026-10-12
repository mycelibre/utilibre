"""Compare uncompressed native wheel content; timestamps are not application code."""
import hashlib
import json
import sys
import zipfile

with zipfile.ZipFile(sys.argv[1]) as old, zipfile.ZipFile(sys.argv[2]) as new:
    assert sorted(old.namelist()) == sorted(new.namelist())
    changed = [name for name in old.namelist() if old.read(name) != new.read(name)]
    assert sorted(changed) == ['setuptools-78.1.1.dist-info/RECORD', 'setuptools/_vendor/jaraco/context.py'], changed
    print(json.dumps({'passed': True, 'changedFiles': changed, 'entries': len(new.namelist()),
                      'oldContextSha256': hashlib.sha256(old.read('setuptools/_vendor/jaraco/context.py')).hexdigest(),
                      'newContextSha256': hashlib.sha256(new.read('setuptools/_vendor/jaraco/context.py')).hexdigest()}))
