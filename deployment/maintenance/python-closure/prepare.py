#!/usr/bin/env python3
"""Select exact vendor runtime hunks; retain originals and source hashes."""
import hashlib,json,re,tarfile
from pathlib import Path
root=Path('/var/lib/utilibre-maintenance/python-closure-20261012')
sources=json.loads((root/'sources.json').read_text());records=[]
selected={
 'flask_1.1.2-2+deb11u1.debian.tar.xz':['CVE-2023-30861.patch'],
 'python-werkzeug_1.0.1+dfsg1-2+deb11u2.debian.tar.xz':[
  'don-t-strip-leading-when-parsing-cookie.patch',
  'limit-the-maximum-number-of-multipart-form-parts.patch',
  'CVE-2024-34069-1.patch','CVE-2024-34069-2.patch']}
for archive,names in selected.items():
    expected=next(x['sha256'] for x in sources if x['file']==archive)
    assert hashlib.sha256((root/archive).read_bytes()).hexdigest()==expected
    with tarfile.open(root/archive) as tar:
        for name in names:
            original=tar.extractfile('debian/patches/'+name).read()
            parts=re.split(r'(?=^--- (?:a/|flask-))',original.decode(),flags=re.M)
            runtime=[]
            for part in parts:
                if not re.match(r'^--- (?:a/|flask-[^/]+/)src/(?:flask|werkzeug)/',part):continue
                part=re.split(r'^diff --git ',part,flags=re.M)[0]
                runtime.append(part.rstrip()+'\n')
            assert runtime,name
            patch=''.join(runtime).encode();(root/name).write_bytes(patch)
            records.append({'file':name,'originalSha256':hashlib.sha256(original).hexdigest(),'runtimeSha256':hashlib.sha256(patch).hexdigest(),'archive':archive})
(root/'patches.json').write_text(json.dumps(records,indent=2)+'\n');print(json.dumps(records))
