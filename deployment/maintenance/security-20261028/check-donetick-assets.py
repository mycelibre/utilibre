"""Recheck upstream Go-embedded frontend bytes without changing live services."""
import hashlib,json,tarfile
from pathlib import Path
root=Path('/var/lib/utilibre-maintenance/security-20261028/go-services/donetick')
spec=next(s for s in json.loads(Path('deployment/maintenance/security-20261028/go-services-inputs.json').read_text())['rows'] if s['key']=='donetick')
archive=root/'source.tar.gz';assert hashlib.file_digest(archive.open('rb'),'sha256').hexdigest()==spec['sourceArchiveSha256']
old=(root/'output/before-donetick').read_bytes();new=(root/'output/donetick').read_bytes();rows=[];excluded=[]
with tarfile.open(archive,'r:gz') as files:
 for item in files:
  if not item.isfile() or not item.name.startswith('frontend/dist/'):continue
  if any(part.startswith(('.', '_')) for part in Path(item.name).parts[2:]):excluded.append(item.name);continue
  data=files.extractfile(item).read();assert data in old and data in new,item.name
  rows.append(dict(path=item.name,sha256=hashlib.sha256(data).hexdigest(),bytes=len(data)))
assert len(rows)==254
result=dict(passed=True,unchangedEmbeddedAssets=rows,upstreamGoEmbedExclusions=excluded)
retained=json.loads((root/'embedded-assets.json').read_text());assert result==retained
print('254 embedded frontend assets match the source and both executable versions.')
