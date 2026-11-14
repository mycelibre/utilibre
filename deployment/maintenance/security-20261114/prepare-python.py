"""Exact upstream wheels via retained pip; preserve every unrelated image file.

No dependency solving, downloads, application data, network or deployment here.
"""
import hashlib,importlib.util,json,os,shutil,subprocess,sys
from pathlib import Path
from datetime import datetime,timezone
os.umask(0o077)
HERE=Path(__file__).resolve().parent;ROOT=Path('/var/lib/utilibre-maintenance/security-20261114/python')
I=json.loads((HERE/'python-inputs.json').read_text())
LIMITS=['--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','512m','--pids-limit','96','--log-driver','none','--tmpfs','/tmp:rw,size=32m,mode=1777']
def sha(p):
 with Path(p).open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def run(a,**kw):return subprocess.run(a,capture_output=True,check=True,timeout=240,**kw).stdout
def docker(*a):return run(['docker',*a]).decode().strip()
def native(s,image,code,*args):return run(['docker','run','--rm','-i',*LIMITS,'--entrypoint',s['python'],image,'-B','-',*args],input=code)
helperpath=HERE.parent/'security-20261109/zlib-check.py'
assert sha(helperpath)=='cdc9aabef1034e18a3951d0d83caf32f9cf5b03dd7b72ac5bd8575d8e57bbf08'
module=importlib.util.spec_from_file_location('retained_image',helperpath);helper=importlib.util.module_from_spec(module);module.loader.exec_module(helper)
pip=Path('/var/lib/utilibre-maintenance/certifi-20261021/pip-26.2-py3-none-any.whl')
assert sha(pip)=='931c303696af6fa3417112103b1cad26890e5a07eccb5b99783700e33f2b8aad'
for key in sys.argv[1:]:
 s=next(r for r in I['rows'] if r['key']==key);out=ROOT/key;out.mkdir(exist_ok=True);assert not (out/'build.json').exists()
 assert shutil.disk_usage(ROOT).free>=8*1024**3
 for name in s['containers']:assert docker('inspect','--format','{{.Image}}',name)==s['base']
 beforecfg=json.loads(docker('image','inspect','--format','{{json .Config}}',s['base']))
 site={p['site'] for p in s['packages'].values()};assert len(site)==1;site=site.pop()
 inventory=b'import importlib.metadata as m,json;print(json.dumps({d.metadata["Name"].lower().replace("_","-"):d.version for d in m.distributions()}))'
 before=json.loads(native(s,s['base'],inventory));expected={n:I['wheels'][n]['version'] for n in s['packages']}
 for n,p in s['packages'].items():assert before[n]==p['version']
 context=out/'context';context.mkdir(exist_ok=True)
 for p in [pip,*[ROOT/I['wheels'][n]['file'] for n in s['packages']]]:shutil.copyfile(p,context/p.name);(context/p.name).chmod(0o644)
 for n in s['packages']:assert sha(context/I['wheels'][n]['file'])==I['wheels'][n]['sha256']
 temporary='/usr/local/lib/utilibre-wheel-stage'
 names=' '.join(temporary+'/'+I['wheels'][n]['file'] for n in s['packages'])
 user=beforecfg.get('User','');assert all(c.isalnum() or c in '_:.-' for c in user)
 recipe=f'FROM {s["base"]}\n'+('USER 0\n' if user else '')+f'COPY *.whl {temporary}/\nRUN PYTHONPATH={temporary}/{pip.name} {s["python"]} -B -m pip --isolated install --disable-pip-version-check --no-cache-dir --no-compile --no-index --no-deps --force-reinstall {names} && rm -r {temporary}\n'+('USER '+user+'\n' if user else '')
 (context/'Dockerfile').write_text(recipe)
 process=subprocess.run(['docker','build','--network','none','--pull=false','--force-rm','--memory','512m','--cpu-period','100000','--cpu-quota','100000','-t',s['candidate'],str(context)],capture_output=True,timeout=240,env={**os.environ,'DOCKER_BUILDKIT':'0'})
 (out/'build.log').write_bytes(process.stdout+process.stderr);assert process.returncode==0,'Private build log retained'
 image=docker('image','inspect','--format','{{.Id}}',s['candidate']);assert json.loads(docker('image','inspect','--format','{{json .Config}}',image))==beforecfg
 after=json.loads(native(s,image,inventory));assert after=={**before,**expected},'Unrelated Python distribution changed'
 a,b=[helper.export_manifest(i) for i in (s['base'],image)]
 prefixes=[]
 for n,p in s['packages'].items():prefixes.extend([site.lstrip('/')+'/'+('dns' if n=='dnspython' else n),site.lstrip('/')+'/'+n+'-'+p['version']+'.dist-info',site.lstrip('/')+'/'+n+'-'+expected[n]+'.dist-info'])
 allowed=lambda p:any(p==pre or p.startswith(pre+'/') for pre in prefixes)
 changes={p:{'before':a.get(p),'after':b.get(p)} for p in sorted(a.keys()|b.keys()) if a.get(p)!=b.get(p)}
 assert changes and all(allowed(p) for p in changes),'Unexpected full-image changes: '+repr([p for p in changes if not allowed(p)][:20])
 normal=json.loads(native(s,image,(HERE/'python-native.py').read_bytes(),json.dumps(expected)))
 dns=None
 if 'dnspython' in expected:
  # Retain the earlier finite pointer-bound rejection and legitimate UDP/TCP
  # + email-validator fixture, ensuring the local 2.7 backport is not lost.
  dns=json.loads(native(s,image,(HERE.parent/'security-20261028/dnspython-check.py').read_bytes(),expected['dnspython'],'fixed'))
  assert dns['passed'] and dns['consumerChecks']==10
 (out/'scope.json').write_text(json.dumps({'passed':True,'base':s['base'],'imageId':image,'allUnrelatedFilesUnchanged':True,'configurationUnchanged':True,'allowedPrefixes':prefixes,'changed':changes,'inventoryHelperSha256':sha(helperpath)},indent=2)+'\n')
 proof={'passed':True,'date':datetime.now(timezone.utc).isoformat(),**s,'imageId':image,'configurationUnchanged':True,'unrelatedPackagesUnchanged':True,'unrelatedFilesUnchanged':True,'wheels':{n:I['wheels'][n] for n in s['packages']},'native':normal,'retainedDnsRegression':dns,'scopeSha256':sha(out/'scope.json'),'fixtureSha256':sha(HERE/'python-native.py'),'network':'none','deployed':False}
 (out/'build.json').write_text(json.dumps(proof,indent=2)+'\n');print(key+': exact wheels, full-image scope and native consumer checks passed',flush=True)
