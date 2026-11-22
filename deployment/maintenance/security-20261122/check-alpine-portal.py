"""Exact old/candidate portal HTTP parity in disposable, networkless containers."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
os.umask(0o077)
ROOT=Path('/var/lib/utilibre-maintenance/security-20261122/alpine-crypto/public-utility-portal')
b=json.loads((ROOT/'build.json').read_text());assert b['passed'] and not (ROOT/'portal-native.json').exists()
live=json.loads(subprocess.check_output(['docker','inspect','public-utility-portal-1'],timeout=30))[0]
env=[e for e in live['Config']['Env'] if e.startswith('PUBLIC_') or e.split('=')[0] in ['ENABLED_SERVICES','LISTED_SERVICES','DEFAULT_LANGUAGE','PROJECT_NAME','PRIVATE_PREVIEW']]
script=r'''const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
(async()=>{const rows=[];for(const path of ['/en/','/es/','/en/my-utilibre','/es/mi-utilibre','/en/guides/file-transfer','/es/guias/preparar-imagen','/sitemap.xml','/robots.txt','/nonexistent-security-fixture']){
 let r;for(let i=0;i<30;i++){try{r=await fetch('http://127.0.0.1:8080'+path);break}catch{await new Promise(r=>setTimeout(r,100))}}
 assert.equal(r.status,path.includes('nonexistent')?404:200,path);const text=await r.text();assert(text.length>20);
 rows.push({path,status:r.status,contentType:r.headers.get('content-type'),sha256:createHash('sha256').update(text).digest('hex')});}
 const r=await fetch('http://127.0.0.1:8080/en/',{method:'POST',body:'fictional'});assert.equal(r.status,400);
 const empty=await fetch('http://127.0.0.1:8080/en/',{method:'POST'});assert.equal(empty.status,405);
 rows.push({method:'POST',bodyRejected:r.status,emptyRejected:empty.status});console.log(JSON.stringify({passed:true,rows}));})().catch(e=>{console.error(e);process.exit(1)});'''
proofs=[]
for phase,image in [('before',b['base']),('after',b['imageId'])]:
 name='utilibre-portal-crypto-fixture'
 try:
  subprocess.run(['docker','run','-d','--name',name,'--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','384m','--cpus','.5','--pids-limit','64','--log-driver','none',*[v for e in env for v in ['-e',e]],image],capture_output=True,timeout=60,check=True)
  p=subprocess.run(['docker','exec',name,'node','-e',script],capture_output=True,timeout=90)
  (ROOT/(phase+'-http.log')).write_bytes(p.stdout+p.stderr);assert p.returncode==0,'Native HTTP check failed; private diagnostic retained'
  result=json.loads(p.stdout);assert result['passed'];proofs.append({'imageId':image,**result})
 finally:subprocess.run(['docker','rm','-f','-v',name],capture_output=True,timeout=30)
assert proofs[0]['rows']==proofs[1]['rows']
(ROOT/'portal-native.json').write_text(json.dumps({'passed':True,'date':datetime.datetime.now(datetime.timezone.utc).isoformat(),'base':b['base'],'imageId':b['imageId'],'checks':proofs,'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'network':'none; synthetic loopback','productionChanged':False,'limitation':'Native HTTP parity; no new visual/browser claim.'},indent=2)+'\n')
print('Portal: EN/ES, guides/toolkit, sitemap/robots, real 404 and POST rejection passed unchanged')
