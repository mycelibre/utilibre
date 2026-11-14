"""Extract checksum-pinned source archives into fresh RAM-backed workspaces."""
import hashlib,json,os,subprocess,sys
from pathlib import Path
os.umask(0o077)
h=Path(__file__).resolve().parent;i=json.loads((h/'xserver-source-inputs.json').read_text())
assert sys.argv[1:] in (['check'],['prepare'])
root=Path('/dev/shm/utilibre-xserver-20261114');root.mkdir(exist_ok=True)
for s in i['rows']:
 for a in s['archives']:
  p=Path(s['dir'])/a['file'];assert p.name==a['file'];assert hashlib.sha256(p.read_bytes()).hexdigest()==a['sha256'];assert p.stat().st_size==a['bytes']
 if sys.argv[1]=='prepare':
  dest=root/('source-'+s['role']);assert not dest.exists(),'Preserve existing source; use a new run after review'
  subprocess.run(['unshare','--net','--','dpkg-source','-x',str(Path(s['dir'])/s['dsc']),str(dest)],check=True,stdout=subprocess.DEVNULL,timeout=120)
 print(s['role']+': authenticated source '+sys.argv[1]+' passed')
