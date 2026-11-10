"""Publish corresponding source and finite build recipes; never copy runtime data."""
import hashlib,json,os,shutil,subprocess,tarfile,tempfile
from pathlib import Path
from datetime import datetime,timezone
os.umask(0o077)
root=Path('/var/lib/utilibre-maintenance/security-20261110/kerberos');here=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
previous=json.loads((root/'source-offer.json').read_text());old=Path(previous['archive'])
assert sha(old)==previous['sha256']=='a7680afec7968137ee04f0fe4ab95b412589ba78e54ae7f2b0ebeb1efb4ad617'
filename='security-kerberos-20261110-r2-source.tar.gz';archive=Path('/opt/utilibre/toolbox-public')/filename
assert not archive.exists(),'Preserve published source archives'
driver=json.loads((here/'kerberos-driver-inputs.json').read_text())
with tempfile.TemporaryDirectory(prefix='source-offer-r2-',dir=root) as tmp:
 stage=Path(tmp)
 with tarfile.open(old) as t:t.extractall(stage,filter='data')
 recipes=['README.md','kerberos-inputs.json','kerberos-build.sh','kerberos-inner.sh','kerberos-prepare.py','kerberos-native.c','kerberos-realm.py','kerberos-consumers.py','kerberos-payload.py','kerberos-policy.mjs','kerberos-host.py','kerberos-driver-inputs.json','kerberos-driver.py','kerberos-driver-build.sh','promote-kitchenowl.mjs','check-kerberos-policy.mjs']
 for name in recipes:shutil.copyfile(here/name,stage/'recipes'/name)
 # Public signature/key files only; never copy a GNUPG directory or private reports.
 (stage/'authentication').mkdir()
 for name in ['mit-release-signing-key.asc','krb5-1.22.3.tar.gz.asc']:shutil.copyfile(root/'source'/name,stage/'authentication'/name)
 (stage/'packaging-inputs').mkdir()
 for name in ['krb5_1.20.1-2+deb12u5.debian.tar.xz','krb5_1.21.3-5+deb13u1.debian.tar.xz','krb5_1.22.1-3.debian.tar.xz']:shutil.copyfile(root/'packaging'/name,stage/'packaging-inputs'/name)
 (stage/'kitchenowl').mkdir();src=root/'kitchenowl/psycopg2_binary-2.9.12.tar.gz';assert sha(src)==driver['sourceSha256'];shutil.copyfile(src,stage/'kitchenowl'/src.name)
 shutil.copyfile(root/'kitchenowl/output/build-packages.lock',stage/'kitchenowl/build-packages.lock')
 shutil.copyfile(root/'compiler-images.json',stage/'compiler-images.json')
 package=root/'kitchenowl/output'/driver['package']['file'];assert sha(package)==driver['package']['sha256']
 with tempfile.TemporaryDirectory(dir=stage) as pkg:
  subprocess.run(['dpkg-deb','-x',str(package),pkg],check=True,timeout=30,capture_output=True)
  shutil.copyfile(Path(pkg)/'usr/share/doc/libpq5/copyright',stage/'kitchenowl/libpq5-copyright')
 (stage/'README.txt').write_text('''MIT Kerberos 1.22.3 corresponding source, Debian packaging and Utilibre recipes.
Signed upstream input: https://web.mit.edu/kerberos/krb5-1.22/krb5-1.22.3.html
Debian integration retains the original Bookworm/Trixie package boundaries.
The two original source packages include all distribution integration patches.
Authentication contains the upstream detached signature and public key only.

KitchenOwl retains Psycopg2-binary 2.9.12 source and its bundled license notices.
The same-source native extension replaces the wheel's bundled libraries with
system libpq 17.11. Source: https://www.postgresql.org/ftp/source/v17.11/
and Debian postgresql-17 17.11-0+deb13u1; copyright notice is included.

Pinned compiler images and build package lists describe the recorded environment.
Native sources, patch preparation and ordinary API/application gates are distinct.
No full byte-reproducible build claim. The offline driver replay matched its
original extension hash; that observation does not establish whole-image
reproducibility. Compiler images and binary artifacts are retained locally,
not distributed inside this source archive. Missing prerequisites must stop a
replay rather than resolve newer dependencies automatically.

Complete shared build/release adapters and operator instructions:
https://github.com/mycelibre/utilibre/tree/main/deployment/maintenance/security-20261110
No account data, application configuration, private keys or production database.
This revision adds the final host/driver recipes; the original archive remains.
''')
 entries={str(p.relative_to(stage)):sha(p) for p in sorted(stage.rglob('*')) if p.is_file()}
 (stage/'source-files.json').write_text(json.dumps(entries,indent=2)+'\n')
 local=root/filename
 subprocess.run(['tar','--sort=name','--mtime=@0','--owner=0','--group=0','--numeric-owner','-czf',str(local),'-C',str(stage),'.'],check=True,timeout=60)
 with tarfile.open(local) as t:
  for name,digest in entries.items():assert hashlib.sha256(t.extractfile('./'+name).read()).hexdigest()==digest
 shutil.copyfile(local,archive);archive.chmod(0o644)
 report={'date':datetime.now(timezone.utc).isoformat(),'published':True,'filename':filename,'archive':str(archive),'sha256':sha(archive),'bytes':archive.stat().st_size,'files':len(entries),'previousArchivePreserved':sha(old)==previous['sha256']}
 (root/'source-offer-r2.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
