# Extract only checksum-verified official embedded assets into a disposable RAM cache.
from pathlib import Path
import hashlib,zipfile
archive=Path('/var/lib/utilibre-maintenance/go-runtime-20261011/input/fmd-server-v0.17.0.zip')
assert hashlib.file_digest(archive.open('rb'),'sha256').hexdigest()=='c89b6f8d1510edbf67355521039e64c08a3721dedff70dd5639bd7c5967716d6'
out=Path('/dev/shm/maintenance-fmd-embed-runtime');out.mkdir(exist_ok=True)
assert not out.is_symlink() and out.stat().st_uid==0
with zipfile.ZipFile(archive) as z:
 for name in z.namelist():
  if not name.startswith('web/dist/') or name.endswith('/'):continue
  assert '..' not in Path(name).parts
  target=out/name;target.parent.mkdir(parents=True,exist_ok=True);data=z.read(name)
  if target.exists():assert not target.is_symlink() and target.read_bytes()==data
  else:target.write_bytes(data)
