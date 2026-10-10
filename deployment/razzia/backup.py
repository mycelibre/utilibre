#!/usr/bin/env python3
"""Validate/copy independent native records without disconnecting live quiz rooms."""
from pathlib import Path
from datetime import datetime,timezone
import tarfile,hashlib,json,time,shutil,os
here=Path(__file__).resolve().parent;data=Path('/opt/utilibre/razzia-data')
backup=Path('/opt/utilibre/calendar-backups')/('razzia-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'));backup.mkdir(parents=True,mode=0o700)
stage=backup/'snapshot';stage.mkdir(mode=0o700)
try:
 # Quiz/result JSON files are independent native records. Validate each stable
 # read; this is not a transaction spanning concurrent edits to different files.
 for source in data.rglob('*'):
  if source.is_symlink() or not source.is_file():continue
  relative=source.relative_to(data)
  for attempt in range(5):
   try:
    before=source.stat();content=source.read_bytes();after=source.stat()
    if (before.st_mtime_ns,before.st_size)!=(after.st_mtime_ns,after.st_size):raise ValueError('File changed during backup')
    if source.suffix=='.json':json.loads(content)
    target=stage/relative;target.parent.mkdir(parents=True,exist_ok=True,mode=0o700);target.write_bytes(content);target.chmod(0o600);break
   except FileNotFoundError:break # A native deletion completed during enumeration.
   except (ValueError,json.JSONDecodeError):
    if attempt==4:raise
    time.sleep(0.05)
 with tarfile.open(backup/'config-private.tar.gz','w:gz') as a:a.add(stage,arcname='config')
 with tarfile.open(backup/'deployment.tar.gz','w:gz') as a:a.add(here,arcname='deployment')
 files=[backup/'config-private.tar.gz',backup/'deployment.tar.gz']
 for p in files:p.chmod(0o600)
 (backup/'SHA256SUMS').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n' for p in files))
 print(backup)
finally:shutil.rmtree(stage)
