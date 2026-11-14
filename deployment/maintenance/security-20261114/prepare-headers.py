"""Finite authenticated header overlay; full-image scope replaces huge argv list."""
import json,hashlib,subprocess,sys,importlib.util,os,tarfile,io
from pathlib import Path
os.umask(0o077)
HERE=Path(__file__).resolve().parent;root=Path('/var/lib/utilibre-maintenance/security-20261114/headers')
i=json.loads((HERE/'headers-inputs.json').read_text());original=HERE.parent/'security-20261109/vendor-debian.mjs'
def sha(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
helperpath=HERE.parent/'security-20261109/zlib-check.py';assert sha(helperpath)=='cdc9aabef1034e18a3951d0d83caf32f9cf5b03dd7b72ac5bd8575d8e57bbf08'
spec=importlib.util.spec_from_file_location('scope',helperpath);helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
code=original.read_text();a=code.index("const root='/var/lib/");b=code.index('\nif(kerberos)',a)
code=code[:a]+"const root='"+str(root)+"',here=new URL('"+HERE.as_uri()+"/'),inputs=JSON.parse(fs.readFileSync(new URL('headers-inputs.json',here)));"+code[b:]
code=code.replace("new URL('vendor-debian.mjs',here)","new URL('"+original.as_uri()+"')")
a=code.index(" const scope='for d");b=code.index(" const user=",a);code=code[:a]+code[b:]
a=code.index(" assert.equal(native(imageId,'sh',['-ec',scope])");b=code.index('\n',a);code=code[:a]+code[b:]
code=code.replace("applicationSha256:fingerprint.split(' ')[0],",'')
check="""  if(s.packages['linux-libc-dev']){const t=native(image,'cat',['/usr/include/linux/version.h']);assert.match(t,/#define LINUX_VERSION_CODE [0-9]+/);assert.match(t,/#define KERNEL_VERSION/);checks+=2;}
"""
needle='  assert(checks>0);nativeRows.push';assert code.count(needle)==1;code=code.replace(needle,check+needle)
adapter=root/'prepare-full-scope.mjs'
if adapter.exists():assert adapter.read_text()==code
else:adapter.write_text(code)
for key in sys.argv[1:]:
 s=next(r for r in i['rows'] if r['key']==key);out=root/'vendor-debian'/key;assert not (out/'scope.json').exists()
 pin=i['packages'][s['packages']['linux-libc-dev']['package']];deb=root/'debian-acquisition'/pin['file'];assert sha(deb)==pin['sha256']
 payload={}
 blob=subprocess.check_output(['dpkg-deb','--fsys-tarfile',str(deb)],timeout=30)
 with tarfile.open(fileobj=io.BytesIO(blob)) as t:
  for m in t:
   p=m.name.removeprefix('./').rstrip('/')
   if m.isfile():
    v=t.extractfile(m).read();assert not v.startswith(b'\x7fELF');payload[p]=hashlib.sha256(v).hexdigest()
 before=helper.export_manifest(s['base'])
 if not (out/'build.json').exists():subprocess.run(['/root/.nvm/versions/node/v24.22.3/bin/node',str(adapter),key],check=True)
 b=json.loads((out/'build.json').read_text());after=helper.export_manifest(b['imageId'])
 excluded=[]
 for p,h in payload.items():
  if p not in after:
   assert p.startswith('usr/share/doc/linux-libc-dev/') and not p.endswith('/copyright'),p
   config=subprocess.check_output(['docker','run','--rm','--network','none','--read-only','--log-driver','none','--entrypoint','sh',s['base'],'-c','cat /etc/dpkg/dpkg.cfg.d/*'],text=True)
   assert '\npath-exclude /usr/share/doc/*\n' in config;excluded.append(p)
  else:assert after[p]['sha256']==h,p
 changes={p:{'before':before.get(p),'after':after.get(p)} for p in sorted(before.keys()|after.keys()) if before.get(p)!=after.get(p)}
 allowed=lambda p:p in payload or any(p.startswith(x) for x in ['usr/include/','usr/share/doc/linux-libc-dev/','var/lib/dpkg/info/linux-libc-dev.','var/lib/dpkg/info/linux-libc-dev:amd64.']) or p in ('var/lib/dpkg/status','var/lib/dpkg/status-old','var/log/dpkg.log','var/log/alternatives.log','usr/share/doc/linux-libc-dev')
 bad=[p for p in changes if not allowed(p)];assert not bad,bad[:20]
 assert all(not p.startswith(('usr/bin/','usr/sbin/','usr/lib/','etc/')) for p in changes)
 proof={'passed':True,'imageId':b['imageId'],'base':s['base'],'allRuntimeFilesUnchanged':True,'vendorInstalledPayloadMatches':True,'preservedVendorDocExclusions':excluded,'noElfPayload':True,'changes':changes,'payload':payload,'helperSha256':sha(helperpath)}
 (out/'scope.json').write_text(json.dumps(proof,indent=2)+'\n');b.update(fullImageScopeVerified=True,scopeSha256=sha(out/'scope.json'),adapterSha256=sha(adapter));(out/'build.json').write_text(json.dumps(b,indent=2)+'\n');print(key+': complete header payload and unchanged runtime verified',flush=True)
