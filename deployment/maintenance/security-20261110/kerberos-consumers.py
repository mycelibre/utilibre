"""Inspect ELF consumers of the two removed private upstream symbols; no execution."""
import hashlib,json,subprocess,tarfile,tempfile,sys,os
from pathlib import Path
from datetime import datetime,timezone
os.umask(0o077)
removed={'krb5int_utf8_next','gss_krb5int_unseal_token_v3'}
root=Path('/var/lib/utilibre-maintenance/security-20261110/vendor-debian')
for key in sys.argv[1:]:
 d=root/key;b=json.loads((d/'build.json').read_text());assert b['passed'];rows=[];references=[];literals=[]
 cid=subprocess.check_output(['docker','create','--entrypoint','/bin/true',b['imageId']],text=True).strip()
 try:
  p=subprocess.Popen(['docker','export',cid],stdout=subprocess.PIPE)
  with tempfile.TemporaryDirectory(dir=d) as tmp,tarfile.open(fileobj=p.stdout,mode='r|') as tar:
   for m in tar:
    if not m.isfile() or m.size<4:continue
    stream=tar.extractfile(m);head=stream.read(4)
    if head!=b'\x7fELF':continue
    assert m.size<512*1024**2,'Large ELF requires explicit review'
    data=head+stream.read();file=Path(tmp)/'current.elf';file.write_bytes(data)
    result=subprocess.run(['readelf','--dyn-syms','--wide',str(file)],capture_output=True,text=True,timeout=15);assert result.returncode==0
    undefined={v[7].split('@')[0] for l in result.stdout.splitlines() if len(v:=l.split())>=8 and v[6]=='UND'}
    hit=sorted(undefined&removed)
    if hit:references.append({'path':m.name,'symbols':hit})
    raw=[x for x in sorted(removed) if x.encode() in data]
    if raw:literals.append({'path':m.name,'symbols':raw})
    rows.append({'path':m.name,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)})
  assert p.wait()==0 and rows
  (d/'linked-consumers.json').write_text(json.dumps({'date':datetime.now(timezone.utc).isoformat(),'imageId':b['imageId'],'passed':not references and not literals,'removedPrivateSymbols':sorted(removed),'elfFiles':rows,'undefinedReferences':references,'symbolLiterals':literals,'scope':'All regular ELF files in candidate image. No mounted/plugin code, future downloads or remote integration is assessed. No execution.'},indent=2)+'\n')
  assert not references and not literals,(key,references,literals)
  print(key+': '+str(len(rows))+' ELF consumers have no reference to removed private helpers',flush=True)
 finally:subprocess.run(['docker','rm',cid],check=True,stdout=subprocess.DEVNULL)
