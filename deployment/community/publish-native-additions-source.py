"""Publish only allowlisted source/config; no runtime data, identity state or secrets."""
from pathlib import Path
import tarfile,hashlib,json
repo=Path(__file__).resolve().parents[2];published=Path('/opt/utilibre/toolbox-public');report=Path('/opt/utilibre/reports/new-services-20261009')
records=[]
for app in ['bytestash','openresume']:
 source=Path('/opt/utilibre/community-src')/app;output=published/(app+'-utilibre.tar.gz')
 def clean(info):
  parts=Path(info.name).parts
  if any(p in {'.git','node_modules','.next','out','build','.env','.env.local','.env.production'} for p in parts):return None
  if info.issym() or info.islnk():return None
  info.uid=info.gid=0;info.uname=info.gname='';return info
 with tarfile.open(output,'w:gz') as archive:
  archive.add(source,arcname=app,filter=clean)
  archive.add(repo/'deployment/community'/app,arcname=app+'/utilibre-deployment',filter=clean)
  archive.add(repo/'deployment/community'/('compose.'+app+'.yaml'),arcname=app+'/utilibre-deployment/compose.'+app+'.yaml',filter=clean)
 output.chmod(0o644);records.append({'app':app,'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'bytes':output.stat().st_size,'url':'https://tools.utilibre.org/utilibre-source/'+output.name})
(report/'new-native-source-archives.json').write_text(json.dumps(records,indent=2));print(json.dumps(records,indent=2))
