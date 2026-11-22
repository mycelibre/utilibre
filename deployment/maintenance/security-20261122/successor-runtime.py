"""Exact vendor successors through the existing Debian overlay gates."""
import hashlib
import json
import os
from pathlib import Path
import sys
from adapter_scope import relocate_directory
os.umask(0o077)
HERE=Path(__file__).resolve().parent
ROOT=Path('/var/lib/utilibre-maintenance/security-20261122/successors')
mode,*args=sys.argv[1:]
names={'inventory':'inventory-debian.py','prepare':'prepare-debian.py','scope':'scope-debian.py','check':'check-debian.py','scan':'scan-debian.py','release':'release-debian.py'}
assert mode in names
if mode=='release':
 inputs=json.loads((HERE/'successor-runtime-inputs.json').read_text());selected=next(r for r in inputs['rows'] if r['key']==args[1])
 assert selected.get('releaseApproval')=='approved'
 for name,digest in selected['nativeEvidence'].items():
  assert name in ('retained-mongo.json','crypto-example.json')
  file=ROOT/'vendor-debian'/selected['key']/name;assert hashlib.sha256(file.read_bytes()).hexdigest()==digest
  value=json.loads(file.read_text());assert value['passed'] and value['base']==selected['base']
  assert value['imageId']==json.loads((file.parent/'build.json').read_text())['imageId']
original=HERE/names[mode];code=relocate_directory(original.read_text(),HERE)
code=code.replace("Path('/var/lib/utilibre-maintenance/security-20261122')",'Path('+repr(str(ROOT))+')')
code=code.replace("Path('/var/lib/utilibre-maintenance/security-20261122/vendor-debian')",'Path('+repr(str(ROOT/'vendor-debian'))+')')
code=code.replace("'debian-inputs.json'","'successor-runtime-inputs.json'").replace('"debian-inputs.json"','"successor-runtime-inputs.json"')
def replace(old,new):
 global code
 assert code.count(old)==1,(mode,old)
 code=code.replace(old,new)
if mode=='prepare':
 replace("checks='''  if(s.packages.libc6){", """checks='''  if(s.packages['libmongoc-1.0-0t64']){
   const fixture=inputs.mongoFixture.path;assert.equal(sha(fs.readFileSync(fixture)),inputs.mongoFixture.sha256);
   const result=docker('run','--rm',...limits,'--user','65534:65534','-v',fixture+':/native:ro','--entrypoint','/native',image);
   assert.equal(result,'Original-header BSON/JSON, UTF-8, typed data, TLS URI and offline client lifecycle passed.');checks+=6;
  }
  if(s.packages.libc6){""")
if mode=='scan':replace('"ROOT=m.ROOT; inputs=json.loads','"ROOT=Path('+repr(str(ROOT))+'); inputs=json.loads')
adapter=ROOT/('run-'+names[mode])
if adapter.exists():assert adapter.read_text()==code
else:adapter.write_text(code)
(ROOT/('adapter-'+mode+'.json')).write_text(json.dumps({'originalSha256':hashlib.sha256(original.read_bytes()).hexdigest(),'adapterSha256':hashlib.sha256(code.encode()).hexdigest(),'changes':['finite vendor successors and evidence paths','retained ordinary BSON/Mongo client fixture']},indent=2)+'\n')
sys.argv=[str(adapter),*args]
exec(compile(code,str(adapter),'exec'),{'__file__':str(adapter),'__name__':'__main__'})
