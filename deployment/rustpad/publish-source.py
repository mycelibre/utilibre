#!/usr/bin/env python3
"""Publish clean pinned upstream source and the exact small deployment recipe."""
from pathlib import Path
import hashlib, json, shutil, subprocess, tarfile, tempfile
root = Path(__file__).resolve().parents[2]
source = Path('/opt/utilibre/community-src/rustpad')
revision = '54e4a9383c84d7317af42a7ddb177ce8bcba058d'
assert subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip() == revision
stage = Path(tempfile.mkdtemp(prefix='rustpad-source-',dir='/opt/utilibre'))
upstream = stage / 'upstream.tar'
subprocess.run(['git','-C',str(source),'archive','--format=tar','--output',str(upstream),revision],check=True)
check = stage / 'check'; check.mkdir()
with tarfile.open(upstream) as t: t.extractall(check,filter='data')
subprocess.run(['python3',str(root/'deployment/rustpad/apply-patches.py'),str(check)],check=True)
# Check that every patched tracked file is reproduced; lockfiles and focused
# tests have dedicated recipe files, and no generated/runtime data is copied.
with (check/'rustpad-server/src/rustpad.rs').open('a') as f: f.write((root/'deployment/rustpad/bounds-unit.rs').read_text())
shutil.copy2(root/'deployment/rustpad/bounds-integration.rs',check/'rustpad-server/tests/utilibre_bounds.rs')
for lock in ['Cargo.lock','package-lock.json']: shutil.copy2(root/'deployment/rustpad'/lock,check/lock)
for path in subprocess.check_output(['git','-C',str(source),'diff','--name-only'],text=True).splitlines():
    assert (check/path).read_bytes() == (source/path).read_bytes(), f'Recipe mismatch: {path}'
archive=stage/'rustpad-utilibre.tar.gz'
with tarfile.open(archive,'w:gz') as out, tarfile.open(upstream) as src:
    for item in src.getmembers():
        assert item.isfile() or item.isdir(), 'Unexpected source link/device'
        stream=src.extractfile(item) if item.isfile() else None
        item.name='upstream/'+item.name;out.addfile(item,stream)
    files=list((root/'deployment/rustpad').glob('*'))+[root/'docs/rustpad-deployment-2026-10-09.md']
    for path in sorted(files):
        assert path.is_file() and not path.is_symlink()
        assert path.suffix not in {'.env','.key','.pem'}
        out.add(path,arcname=str(path.relative_to(root)),recursive=False)
public=Path('/opt/utilibre/toolbox-public/rustpad-utilibre.tar.gz')
if public.exists(): shutil.copy2(public,stage/'previous-rustpad-utilibre.tar.gz')
shutil.copy2(archive,public.with_suffix('.tmp'));public.with_suffix('.tmp').replace(public);public.chmod(0o644)
hash=hashlib.sha256(public.read_bytes()).hexdigest()
print(json.dumps({'sha256':hash,'url':'https://tools.utilibre.org/utilibre-source/rustpad-utilibre.tar.gz?revision='+hash[:12],'revision':revision,'version':'54e4a93-p1'}))
