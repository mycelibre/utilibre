"""Reconstruct removed build-source trees from retained code-only offers.

No download/build/deployment. Existing byte-level reviewers remain authoritative.
Extraction occurs without networking; only the private review workspace is written.
"""
import hashlib, json, os, pathlib, subprocess, sys, tarfile
os.umask(0o077)
root=pathlib.Path('/var/lib/utilibre-maintenance')
specs={
 'mount':('mount-acl-final','4d25fc4768bcfd418ae87e3bc64cd3389e7137a79dda6535665f2a5abbaf7480','mount-native/sources/','util-linux_2.38.1-5+deb12u3+utilibre1.dsc'),
 'heif':('heif-bookworm-followup','c65453545c5768b9bcd18cb22934d99bf3d67b8551dd620e6e2ac3eebdaf2c50','heif-bookworm/sources/','libheif_1.15.1-1+deb12u1+utilibre1.dsc'),
 'tiff':('tiff-bookworm-followup','9956b6e92c5ac902792df79fe61be82ed52be05918f609c0a0bec2cd88660946','tiff-bookworm/sources/','tiff_4.7.2-1.dsc'),
}
assert sys.argv[1:] and len(set(sys.argv[1:]))==len(sys.argv[1:])
for key in sys.argv[1:]:
 if key=='xlib':
  base=root/'xlib-followup-20261012';proof=json.loads((base/'source-checks.json').read_text());release=json.loads((base/'host/release.json').read_text())
  assert release['status']=='passed' and proof['passed'] and hashlib.file_digest((base/'source-checks.json').open('rb'),'sha256').hexdigest()==release['sourceProofSha256']
  for source in proof['sources']:
   assert source['suite'] in ('trixie','bookworm','dhi') and source['package'] in ('libx11','libxrender','libxtst')
   archives=base/'sources'/source['suite']/source['package'];dsc=[]
   for item in source['archives']:
    assert pathlib.Path(item['file']).name==item['file'] and hashlib.file_digest((archives/item['file']).open('rb'),'sha256').hexdigest()==item['sha256']
    if item['file'].endswith('.dsc'):dsc.append(archives/item['file'])
   assert len(dsc)==1
   destination=root/'security-20261028/review-sources/xlib'/source['suite']/source['package'];assert not destination.exists();destination.parent.mkdir(parents=True,exist_ok=True)
   with (destination.parent/(source['package']+'-extraction.log')).open('w') as log:
    subprocess.run(['unshare','--net','--','dpkg-source','--no-check','-x',str(dsc[0]),str(destination)],env={'PATH':'/usr/bin:/bin','LC_ALL':'C'},stdout=log,stderr=log,timeout=120,check=True)
    for fix in source['fixes']:
     assert fix['cve'].startswith('CVE-2026-') and fix['cve'].removeprefix('CVE-2026-').isdigit()
     patch=base/'patches'/(fix['cve']+'.patch');assert hashlib.file_digest(patch.open('rb'),'sha256').hexdigest()==fix['sha256']
     subprocess.run(['unshare','--net','--','patch','-p1','--fuzz=0','--batch','--forward','-i',str(patch)],cwd=destination,stdout=log,stderr=log,timeout=30,check=True)
  print('xlib: pinned sources and exact patches reconstructed without network or builds')
  continue
 name,digest,prefix,dsc=specs[key];offer=json.loads((root/(name+'-20261012')/'source-offer.json').read_text());archive=pathlib.Path(offer['archive'])
 assert offer['published'] and offer['sha256']==digest and hashlib.file_digest(archive.open('rb'),'sha256').hexdigest()==digest
 destination=root/'security-20261028/review-sources'/key
 assert not destination.exists(), 'Preserve existing reconstruction'
 destination.mkdir(parents=True)
 inputs=destination/'inputs';inputs.mkdir()
 with tarfile.open(archive) as t:
  selected=[m for m in t.getmembers() if m.name.startswith(prefix) and m.isfile()]
  assert selected and sum(m.size for m in selected)<64*1024**2
  for m in selected:
   leaf=m.name.removeprefix(prefix);assert '/' not in leaf and leaf not in ('','..','.')
   (inputs/leaf).write_bytes(t.extractfile(m).read())
 with (destination/'extraction.log').open('w') as log:
  subprocess.run(['unshare','--net','--','dpkg-source','--no-check','-x',str(inputs/dsc),str(destination/'source')],env={'PATH':'/usr/bin:/bin','LC_ALL':'C'},stdout=log,stderr=log,timeout=120,check=True)
 (destination/'provenance.json').write_text(json.dumps({'archive':str(archive),'sha256':digest,'dsc':dsc,'network':'none','built':False,'deployed':False},indent=2)+'\n')
 print(key+': exact published source reconstructed; existing reviewers must verify it')
