"""Finite adapters around retained synthetic application workflow checks.

Exact candidate/evidence/database selections only. No production credentials or
user data are supplied. Original/adapted hashes and bounded logs are retained.
"""
import hashlib,json,os,subprocess,sys
from pathlib import Path
from datetime import datetime,timezone
os.umask(0o077)
HERE=Path(__file__).resolve().parent;ROOT=Path('/var/lib/utilibre-maintenance/security-20261114')
I=json.loads((HERE/'inputs.json').read_text());NODE='/root/.nvm/versions/node/v24.22.3/bin/node'
python_mode=sys.argv[1:2]==['--python']
if python_mode:sys.argv.pop(1)
P=json.loads((HERE/'python-inputs.json').read_text()) if python_mode else I
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
for key in sys.argv[1:]:
 s=next(r for r in P['rows'] if r['key']==key);out=ROOT/('python/'+key if python_mode else 'vendor-debian/'+key if s['kind']=='debian' else key)
 if python_mode:assert key in ('identity-worker','pack-forms-app','linkding-linkding')
 b=json.loads((out/'build.json').read_text());assert b['passed'];assert not (out/'application.json').exists()
 originals={'identity-worker':'check-auth-vendor.mjs','pack-forms-app':'check-liberaforms-cairosvg.mjs',
            'pollaris-pollaris':'php-20261022/check-pollaris.mjs','linkding-linkding':'check-linkding-python.mjs'}
 if key=='services-privatebin':
  original=HERE.parent.parent/'utilibre/tests/check-privatebin-uploads.mjs'
  args=[NODE,str(original)];env={**os.environ,'PRIVATEBIN_TEST_IMAGE':b['imageId']}
 elif key=='turn-option-turn':
  original=HERE.parent/'native-final/check-coturn.py';args=['python3',str(original),b['imageId']]
  env={**os.environ,'UTILIBRE_COTURN_TEST_SUBNET':'198.19.249.0/28'}
 else:
  original=HERE.parent/originals[key];code=original.read_text()
  def replace(old,new):
   global code
   assert code.count(old)==1,(key,old,code.count(old));code=code.replace(old,new)
  # Preserve native fixture resolution when the adapter lives in private output.
  code=code.replace('import.meta.url',json.dumps(original.as_uri()))
  if key in ('identity-worker','pack-forms-app'):
   line=next(l for l in code.splitlines() if l.startswith('assert([') and 'Reviewed image only' in l)
   replace(line,'assert.equal(image,'+json.dumps(b['imageId'])+');')
   if key=='identity-worker':
    replace("const dir='/var/lib/utilibre-maintenance/vendor-stage-20261011';","const dir="+json.dumps(str(out))+";")
    replace("'postgres:16-alpine@sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea'",json.dumps(I['libpqDatabaseImage']))
    result=out/'authentik.json'
   else:
    replace("'postgres:17.11-alpine@sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73'",json.dumps(I['libpqDatabaseImage']))
    line=next(l for l in code.splitlines() if l.strip().startswith('const reportFile='));replace(line,' const reportFile='+json.dumps(str(out/'forms.json'))+';');result=out/'forms.json'
  elif key=='pollaris-pollaris':
   line=next(l for l in code.splitlines() if l.startswith('const dir='));replace(line,'const dir='+json.dumps(str(out))+',b=JSON.parse(fs.readFileSync(dir+"/build.json"));')
   replace("from './specs.mjs'","from "+json.dumps((original.parent/'specs.mjs').as_uri()))
   replace("'sha256:34bce7234d7454085fd6131efd1471061e0e36e47e83baa4cd56ec9fbf1d63c3'",json.dumps(I['libpqDatabaseImage']));result=out/'application.json'
  elif key=='linkding-linkding':
   line=next(l for l in code.splitlines() if l.startswith('const drf='));replace(line,'const drf=true,spec='+json.dumps({'candidate':b['imageId'],'base':s['base'],'oldRef':s['base']})+';')
   line=next(l for l in code.splitlines() if l.startswith('const dir='));replace(line,'const dir='+json.dumps(str(out))+';mkdirSync(dir,{recursive:true,mode:0o700});');result=out/'stage.json'
  adapter=out/'application-adapter.mjs'
  if adapter.exists():assert adapter.read_text()==code
  else:adapter.write_text(code)
  args=[NODE,str(adapter),b['imageId']];env=os.environ.copy()
 process=subprocess.run(args,env=env,capture_output=True,timeout=540)
 (out/'application-run.log').write_bytes(process.stdout+process.stderr)
 assert process.returncode==0,key+': native application check failed; private log retained'
 if key in ('services-privatebin','turn-option-turn'):
  r=json.loads(process.stdout.decode().strip().splitlines()[-1]);assert r['passed'];assert r.get('imageId',r.get('image'))==b['imageId']
 else:
  r=json.loads(result.read_text());assert r.get('imageId',r.get('newImage'))==b['imageId']
  if key=='identity-worker':assert r['nativePasswordAndTotpReplay'] and r['rsaAndEcdsaOAuthCodeExchange']
  elif key=='pack-forms-app':assert r['blankDatabase'] and r['nativeRequiredEncryptionFormCreation'] and r['otherAndAnonymousDenied']
  elif key=='linkding-linkding':assert r['status']=='passed' and r['freshSyntheticDatabase'] and r['checks']['anonymousDenied']
  else:assert r['passed'] and r['twoSessions'] and r['pollDeleted']
 proof={'passed':True,'date':datetime.now(timezone.utc).isoformat(),'imageId':b['imageId'],'base':s['base'],
    'fixture':str(original),'fixtureSha256':sha(original),'native':r,'productionChanged':False,
    'network':'isolated synthetic fixture only','limitations':'Native fixture coverage, not new real-device or external-provider verification.'}
 if key not in ('services-privatebin','turn-option-turn'):proof['adapterSha256']=sha(adapter)
 if key=='pollaris-pollaris':(out/'application-native.json').write_text(json.dumps(r,indent=2)+'\n')
 (out/'application.json').write_text(json.dumps(proof,indent=2)+'\n');print(key+': retained native application workflow passed',flush=True)
