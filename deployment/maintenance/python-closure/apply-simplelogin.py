"""Apply signed vendor security fixes and remove only installer/development caches."""
import hashlib,json,shutil,subprocess,sys
from pathlib import Path
root=Path('/tmp/python-closure');site=Path('/code/.venv/lib/python3.12/site-packages')
assert sys.prefix=='/code/.venv'
for item in json.loads((root/'patches.json').read_text()):
    patch=root/item['file'];assert hashlib.sha256(patch.read_bytes()).hexdigest()==item['runtimeSha256']
    subprocess.run(['patch','--batch','--fuzz=0','-p2','-d',str(site),'-i',str(patch)],check=True)
# The bundled interpreter is under .local/share/uv/python, NOT .cache/uv.
# Check every installed symlink before removing cached build/download copies.
cache=Path('/root/.cache/uv');assert cache.is_dir() and not cache.is_symlink()
for parent in [Path('/code/.venv'),Path('/root/.local/share/uv/python')]:
    for path in parent.rglob('*'):
        if path.is_symlink():assert not path.resolve().is_relative_to(cache),str(path)
shutil.rmtree(cache)
for p in ['/usr/bin/uv','/usr/bin/uvx']:
    path=Path(p);assert path.is_file() and not path.is_symlink();path.unlink()
assert Path('/code/.venv/bin/python').resolve().is_file()
