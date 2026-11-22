"""Native OpenSSL operations and public ABI for exact Alpine library overlays.

Reuse the existing native crypto fixture, including its invalid-signature check.
An image without the optional legacy provider is tested with its actual default
provider; an installed provider may never disappear. No content leaves fixtures.
"""
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
os.umask(0o077)
HERE=Path(__file__).resolve().parent
ROOT=Path('/var/lib/utilibre-maintenance/security-20261122/alpine-crypto')
inputs=json.loads((HERE/'alpine-crypto-inputs.json').read_text())
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
script=HERE.parent/'openssl-bookworm-followup/native-crypto.sh'
assert sha(script)==inputs['nativeFixture']['cryptoScriptSha256']
cli=ROOT/'fixtures/openssl';assert sha(cli)==inputs['nativeFixture']['cliSha256']
limits=['--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges',
 '--cpus','.5','--memory','128m','--memory-swap','128m','--pids-limit','32','--log-driver','none','--ulimit','core=0']
def run(args):return subprocess.check_output(args,stderr=subprocess.PIPE,timeout=60)
def native(image,*args):return run(['docker','run','--rm',*limits,'--entrypoint',args[0],image,*args[1:]])
def symbols(path):
 return {p[7] for l in run(['readelf','--dyn-syms','--wide',str(path)]).decode().splitlines()
         if len(p:=l.split())>=8 and p[4] in ('GLOBAL','WEAK') and p[6]!='UND'}
for key in sys.argv[1:]:
 s=next(r for r in inputs['rows'] if r['key']==key);d=ROOT/key;b=json.loads((d/'build.json').read_text())
 assert b['passed'] and b['base']==s['base'] and not (d/'crypto-native.json').exists()
 checks=[];abis=[]
 with tempfile.TemporaryDirectory(dir=d,prefix='native-') as tmp:
  t=Path(tmp);t.chmod(0o755)
  for phase,image in [('before',s['base']),('after',b['imageId'])]:
   abi={}
   for library in ['libcrypto.so.3','libssl.so.3']:
    p=t/(phase+'-'+library);p.write_bytes(native(image,'cat','/usr/lib/'+library));abi[library]=symbols(p)
    assert len(abi[library])>(4000 if library.startswith('libcrypto') else 400)
   abis.append(abi)
   # Optional provider package differs across upstream images. Keep the exact
   # installed set and test legacy if and only if it existed before this update.
   provider=native(image,'sh','-ec','if test -f /usr/lib/ossl-modules/legacy.so; then echo legacy; else echo default-only; fi').decode().strip()
   if checks:assert provider==checks[0]['providerSet']
   code=script.read_text()
   if provider=='default-only':
    old="openssl list -providers -provider legacy | grep -q legacy\n";assert code.count(old)==1;code=code.replace(old,'')
   f=t/('check-'+phase+'.sh');f.write_text(code);f.chmod(0o644)
   output=run(['docker','run','--rm',*limits,'--user','65534:65534','--tmpfs','/tmp:rw,size=16m,mode=1777',
    '-e','PATH=/native:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
    '--mount','type=bind,src='+str(cli)+',dst=/native/openssl,readonly',
    '--mount','type=bind,src='+str(f)+',dst=/check.sh,readonly','--entrypoint','sh',image,'/check.sh']).decode()
   assert 'OPENSSL_NATIVE_RSA_ECDSA_TAMPER_AES_PBKDF2_RANDOM_PROVIDERS_PASSED' in output
   checks.append({'imageId':image,'passed':True,'providerSet':provider,'fixtureSha256':sha(f),
    'checks':['RSA signature/verification','altered signature rejected','ECDSA','AES/PBKDF2 roundtrip','secure random','installed providers']})
  assert all(abis[0][k]<=abis[1][k] for k in abis[0]),'Exported ABI removed'
 (d/'crypto-native.json').write_text(json.dumps({'passed':True,'date':datetime.datetime.now(datetime.timezone.utc).isoformat(),
  'base':s['base'],'imageId':b['imageId'],'checks':checks,'exportedAbiPreserved':True,
  'baselineSymbols':{k:len(v) for k,v in abis[0].items()},'nativeScriptSha256':sha(script),'cliSha256':sha(cli),
  'network':'none','productionChanged':False,'limitation':'Compatibility check, not individual exploit reproduction.'},indent=2)+'\n')
 print(key+': crypto operations and ABI passed',flush=True)
