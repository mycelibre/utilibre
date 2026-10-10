#!/usr/bin/env python3
"""Publish pinned source and the reviewed recipe, never runtime state."""
from pathlib import Path
import gzip
import hashlib
import io
import json
import subprocess
import tarfile
import tempfile

root = Path(__file__).resolve().parents[2]
source = Path('/opt/utilibre/src/family-chess')
revision = 'f6e50932df60c531933dab4e07c6642cfee55e2d'
assert subprocess.check_output(['git', '-C', str(source), 'rev-parse', 'HEAD'], text=True).strip() == revision
upstream = subprocess.check_output(['git', '-C', str(source), 'archive', revision])
with tempfile.TemporaryDirectory(prefix='family-chess-source-') as temporary:
    check = Path(temporary)
    with tarfile.open(fileobj=io.BytesIO(upstream)) as archive:
        archive.extractall(check, filter='data')
    subprocess.run(['git', 'apply', '--check', str(root / 'deployment/family-chess/source.patch')], cwd=check, check=True)

public = Path('/opt/utilibre/toolbox-public/family-chess-utilibre.tar.gz')
pending = public.with_suffix('.pending')
with pending.open('wb') as raw, gzip.GzipFile(filename='', mode='wb', fileobj=raw, mtime=0) as compressed, tarfile.open(fileobj=compressed, mode='w') as output:
    with tarfile.open(fileobj=io.BytesIO(upstream)) as archive:
        for item in archive.getmembers():
            assert item.isfile() or item.isdir(), 'Unexpected source link/device'
            content = archive.extractfile(item) if item.isfile() else None
            item.name = 'upstream/' + item.name
            item.uid = item.gid = item.mtime = 0
            item.uname = item.gname = ''
            output.addfile(item, content)
    paths = sorted(path for path in (root / 'deployment/family-chess').glob('*') if path.name != '__pycache__')
    paths.append(root / 'docs/family-chess-deployment-2026-10-09.md')
    for path in paths:
        assert path.is_file() and not path.is_symlink()
        assert path.suffix not in {'.env', '.key', '.pem'}
        item = output.gettarinfo(str(path), str(path.relative_to(root)))
        item.uid = item.gid = item.mtime = 0
        item.uname = item.gname = ''
        with path.open('rb') as content:
            output.addfile(item, content)
pending.chmod(0o644)
pending.replace(public)
digest = hashlib.sha256(public.read_bytes()).hexdigest()
print(json.dumps({'sha256': digest, 'revision': revision, 'url': 'https://tools.utilibre.org/utilibre-source/family-chess-utilibre.tar.gz?revision=' + digest[:12]}))
