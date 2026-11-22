"""Scoped Alpine crypto activation using the existing release/rollback mechanism.

Requires explicit hash-bound review, full file and runtime checks. Keeps SMTP
supervisors and shared-state boundaries; no migrations or content inspection.
"""
import hashlib
import json
import os
from pathlib import Path
import sys
from adapter_scope import relocate_directory
os.umask(0o077)
HERE=Path(__file__).resolve().parent
ROOT=Path('/var/lib/utilibre-maintenance/security-20261122')
inputs=json.loads((HERE/'alpine-crypto-inputs.json').read_text())
assert len(sys.argv)==3 and sys.argv[1] in ('check','apply','verify')
row=next(r for r in inputs['rows'] if r['key']==sys.argv[2]);d=ROOT/'alpine-crypto'/row['key']
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert row.get('releaseApproval')=='approved'
app=json.loads((d/'application.json').read_text());b=json.loads((d/'build.json').read_text())
assert app['passed'] and app['imageId']==b['imageId'] and app['base']==row['base']
assert set(app['checks'])=={'crypto-native.json','native-tls.json','consumer.json','scope.json'}
for name,digest in app['checks'].items():assert sha(d/name)==digest
original=HERE/'release-nginx.py';code=relocate_directory(original.read_text(),HERE)
def replace(old,new):
 global code
 assert code.count(old)==1,(old,code.count(old))
 code=code.replace(old,new)
assert code.count("HERE/'nginx-inputs.json'")==2
code=code.replace("HERE/'nginx-inputs.json'","HERE/'alpine-crypto-inputs.json'")
# Replacement strings inside the retained adapter must select the same finite
# manifest; counts are explicit rather than broad path guessing.
assert code.count("ROOT/'nginx'")==2
code=code.replace("ROOT/'nginx'","ROOT/'alpine-crypto'")
replace("if(project==='utilibre-newsletters'){","if(project==='utilibre-newsletters'&&!g.rows.some(r=>r.service==='smtp')){")
replace("adapter=ROOT/'release-nginx-adapter-v3.mjs'","adapter=ROOT/'alpine-crypto/release-adapter-v2.mjs'")
replace("ROOT/'release-adapter.json'","ROOT/'alpine-crypto/release-adapter.json'")
# Preserve the existing records egress boundary across its shared DB/image updates.
anchor="for relative in ('../security-20261103/release-lock.mjs'"
extra='''replace("const unlock=acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock');", """function boundary(g){
 if(g.project!=='utilibre-records')return null;
 const rules=command('iptables',['-S','UTILIBRE-RECORDS']);assert(rules.includes('-j DROP')&&rules.includes('--dport 3128'));
 command('iptables',['-C','DOCKER-USER','-j','UTILIBRE-RECORDS']);return hash(rules);
}
const unlock=acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock');""")
replace('  const original=config(g),refs=new Set();','  g.boundarySha256=boundary(g);\\n  const original=config(g),refs=new Set();')
replace("await checkExistingGroup(previous.group,'new');","await checkExistingGroup(previous.group,'new');assert.equal(boundary(previous.group),previous.group.boundarySha256);")
replace('await checkExistingGroup(g,version);exactConfig(version);','await checkExistingGroup(g,version);assert.equal(boundary(g),g.boundarySha256);exactConfig(version);')
replace('  const selected=new Set(g.rows.map(r=>r.name));', """  // Only the explicitly reviewed same-image gateway follows this web netns.
  for(const expected of spec.namespaceCompanions||[]){
   assert.equal(key,'newsletters-web');assert.equal(project,'utilibre-newsletters');
   const x=all.find(x=>x.Name==='/'+expected.name),parent=live.find(x=>x.Name==='/'+expected.parent);
   assert(x&&parent);assert.equal(x.Image,expected.imageId);
   assert.equal(x.Config.Labels['com.docker.compose.project'],project);
   assert.equal(x.Config.Labels['com.docker.compose.service'],expected.service);
   assert.equal(x.HostConfig.NetworkMode,'container:'+parent.Id);
   const ref=original.services[expected.service].image;assert.equal(inspect(ref).Id,x.Image);
   live.push(x);g.rows.push({name:expected.name,service:expected.service,oldRef:ref,newRef:ref,oldImage:x.Image,newImage:x.Image,oldContainerId:x.Id,oldRestartCount:x.RestartCount,namespaceParent:expected.parent});
  }
  const selected=new Set(g.rows.map(r=>r.name));""")
# Check only an aggregate active HTTP/WebSocket connection count for Galene.
replace(" if(key!=='turn-option-turn')return;", """ if(key==='pack-galene-galene'){
  assert.deepEqual(x.Config.Cmd.slice(0,2),['-http','0.0.0.0:8080']);
  const tables=['tcp','tcp6'].map(t=>docker('exec',x.Name,'cat','/proc/net/'+t));
  const active=tables.flatMap(t=>t.trim().split('\\\\n').slice(1)).filter(l=>{const p=l.trim().split(/\\\\s+/);return p[3]==='01'&&p[1]?.endsWith(':1F90');}).length;
  assert.equal(active,0,'Active meeting/web connections: postpone; do not interrupt');return;
 }
 if(key!=='turn-option-turn')return;""")
'''
replace(anchor,extra+anchor)
adapter=ROOT/'alpine-crypto/run-release-v2.py'
if adapter.exists():assert adapter.read_text()==code
else:adapter.write_text(code)
exec(compile(code,str(adapter),'exec'),{'__file__':str(adapter),'__name__':'__main__'})
