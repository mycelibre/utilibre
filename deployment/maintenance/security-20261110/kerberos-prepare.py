#!/usr/bin/env python3
"""Prepare exact vendor source plus Debian packaging; never touches a runtime."""
import argparse,hashlib,json,tarfile,subprocess,shutil,tempfile
from pathlib import Path
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('suite',choices=('bookworm','trixie'))
parser.add_argument('--root',type=Path,default=Path('/var/lib/utilibre-maintenance/security-20261110/kerberos'))
args=parser.parse_args();suite=args.suite;root=args.root
assert root.is_absolute() and root.is_dir()
source=root/'source/krb5-1.22.3.tar.gz';pack=root/'packaging'
assert hashlib.sha256(source.read_bytes()).hexdigest()=='fe90af8441ad9fa9b064b8e53077cefb782a96f8a68276b031dc54af1789ff0b'
assert 'VALIDSIG C4493CB739F4A89F9852CBC20CBA08575F8372DF' in (root/'source/gpgv-verification.txt').read_text()
version={'bookworm':'1.20.1-2+deb12u5','trixie':'1.21.3-5+deb13u1'}[suite]
packaging_hash={'bookworm':'195842a66252dfee21b3402b5048f8dea11ea92056742aedf71b356e26f4513f','trixie':'02b873b239fbe7ddf016dfe44deba4130673f4606c18c93da0622e2bc8500fb4'}[suite]
assert hashlib.sha256((pack/f'krb5_{version}.debian.tar.xz').read_bytes()).hexdigest()==packaging_hash
work=root/suite/'candidate-source';assert not work.exists();work.mkdir()
with tarfile.open(source) as t:t.extractall(work,filter='data')
s=work/'krb5-1.22.3'
with tarfile.open(pack/f'krb5_{version}.debian.tar.xz') as t:t.extractall(s,filter='data')
# Use the compatible Debian 1.22 packaging patches, never fuzzy-refresh an old hunk.
with tarfile.open(pack/'krb5_1.22.1-3.debian.tar.xz') as t:
 assert hashlib.sha256((pack/'krb5_1.22.1-3.debian.tar.xz').read_bytes()).hexdigest()=='519ad7537260ebc450a678b38f00c8deaf0e05d848d0e5cfeef1ddb154663ba8'
 names=t.extractfile('debian/patches/series').read().decode().splitlines()[:11]
 for name in names:
  dest=s/'debian/patches'/name;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(t.extractfile('debian/patches/'+name).read())
 for member in t.getmembers():
  if member.name.endswith('.symbols'):
   dest=s/member.name
   if dest.exists():dest.write_bytes(t.extractfile(member).read())
(s/'debian/patches/series').write_text('\n'.join(names)+'\n')
# New exported helper in the signed 1.22.3 release; keep strict symbol checking.
p=s/'debian/libkrb5-3.symbols';text=p.read_text();anchor=' k5_rc_store@krb5_3_MIT 1.20~beta1\n';assert text.count(anchor)==1
p.write_text(text.replace(anchor,anchor+' k5_ser_unpack_len@krb5_3_MIT 1.22.3\n'))
# Review was against clean 1.22.3: the release includes the prior upstream fixes.
# Only the distribution integration patches listed above are replayed.
checks=[]
with tempfile.TemporaryDirectory(dir=work) as trial:
 shutil.copytree(s,Path(trial)/'source');test=Path(trial)/'source'
 for name in names:
  f=s/'debian/patches'/name
  subprocess.run(['git','apply','--check',str(f)],cwd=test,check=True,capture_output=True)
  subprocess.run(['git','apply',str(f)],cwd=test,check=True,capture_output=True)
  checks.append({'path':name,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
shutil.copy2(source,work/'krb5_1.22.3.orig.tar.gz')
(root/suite/'source-preparation.json').write_text(json.dumps({'suite':suite,'upstream':'1.22.3','baselinePackaging':version,'integrationPatchPackaging':'1.22.1-3','patches':checks,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'upstreamSecurityTestsExecuted':False},indent=2)+'\n')
print(s)
