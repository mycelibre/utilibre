#!/usr/bin/env python3
# Exact vendor payload attribution, with ordinary isolated compatibility only.
import hashlib,io,json,subprocess,tarfile,datetime
from pathlib import Path
root=Path('/var/lib/utilibre-maintenance');out=root/'security-20261110'
sha=lambda data:hashlib.sha256(data).hexdigest()
archive=root/'host-final-20261011/python3-jwt_2.15.1-1_all.deb'
assert sha(archive.read_bytes())=='e2bdfe81e1c0c45866e37e1a2f2fd190fcec24f8c5fc083e994733b0f915b1af'
assert subprocess.check_output(['dpkg-query','-W','-f=${Version}','python3-jwt'],text=True)=='2.15.1-1'
release=json.loads((root/'host-final-20261011/jwt-release.json').read_text());assert release['status']=='passed'
native=json.loads((out/'jwt-ordinary.json').read_text());assert native=={'passed':True,'version':'2.15.1','validAlgorithmRoundTrips':3,'network':'none','bypassReproduction':False}
prefix='/usr/lib/python3/dist-packages/jwt/'
rows=[]
with tarfile.open(fileobj=io.BytesIO(subprocess.check_output(['dpkg-deb','--fsys-tarfile',str(archive)]))) as t:
 for m in t:
  name='/'+m.name.lstrip('./')
  if name.startswith(prefix) and m.isfile():
   expected=sha(t.extractfile(m).read());assert sha(Path(name).read_bytes())==expected
   rows.append({'path':name,'sha256':expected})
assert len(rows)>10
assert sorted(r['path'] for r in rows if r['path'].endswith('.py'))==sorted(str(p) for p in Path(prefix).rglob('*.py'))
queue=json.loads((root/'security-queue.json').read_text());items=[x for x in queue['items'] if x['id']=='CVE-2026-102268' and x['artifact']=='host-dpkg' and x['package']=='python3-jwt' and x['installed']=='2.15.1-1'];assert len(items)==1
now=datetime.datetime.now(datetime.timezone.utc)
proof={'date':now.isoformat(),'package':'python3-jwt','version':'2.15.1-1','archiveSha256':sha(archive.read_bytes()),'files':rows,'native':native,'source':'https://github.com/jpadilla/pyjwt/security/advisories/GHSA-ffc3-869f-jxw9','releaseReceiptSha256':sha((root/'host-final-20261011/jwt-release.json').read_bytes()),'rawScanRetained':True}
(out/'jwt-vendor-proof.json').write_text(json.dumps(proof,indent=2)+'\n')
reason='The upstream advisory fixes CVE-2026-102268 in PyJWT 2.14.0. Every installed host PyJWT 2.15.1 source file matches the retained authenticated Debian 2.15.1-1 package; no additional Python source is present. Three legitimate HS256/RS256/ES256 round trips pass in a credential-free network namespace. No bypass reproduction. This renews only the expired exact host package review, not an exemption for another version, image or advisory. Raw scanner match retained. Evidence: security-20261110/jwt-vendor-proof.json. https://github.com/jpadilla/pyjwt/security/advisories/GHSA-ffc3-869f-jxw9'
(out/'reviewed-jwt-decision.json').write_text(json.dumps({'schemaVersion':1,'scanDate':queue['scanDate'],'decisions':[{'key':items[0]['key'],'status':'not-affected','reason':reason,'expiresAt':(now+datetime.timedelta(days=7)).isoformat()}]},indent=2)+'\n')
print('Exact vendor payload and ordinary compatibility verified; decision prepared, not applied.')
