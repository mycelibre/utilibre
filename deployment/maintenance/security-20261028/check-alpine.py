"""Finite native consumers of signed library overlays; no live provider requests."""
import ctypes, json, os, subprocess, tempfile, sys
from pathlib import Path
from datetime import datetime, timezone
os.umask(0o077)
HERE=Path(__file__).resolve().parent
ROOT=Path('/var/lib/utilibre-maintenance/security-20261028')
SPECS=json.loads((HERE/'alpine-inputs.json').read_text())['rows']
KEYS=sys.argv[1:]
assert KEYS and len(KEYS)==len(set(KEYS)) and set(KEYS)<=set(s['key'] for s in SPECS)
# Exact local fixture interpreter, recorded independently of application images.
PYTHON='sha256:3dd7cc108ec1493442514f5c2a871af6af0ec31d768ff6e378a93340c3b3db5f'
LIMITS=['--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','192m','--memory-swap','192m','--pids-limit','64','--log-driver','none']
def run(a,expected=0):
 p=subprocess.run(a,capture_output=True,timeout=45)
 assert p.returncode==expected,(a[:3],p.returncode,p.stderr.decode(errors='replace')[:500])
 return p.stdout
for key in KEYS:
 s=next(s for s in SPECS if s['key']==key);out=ROOT/'alpine'/key;b=json.loads((out/'build.json').read_text())
 assert b['passed'] and not (out/'consumer.json').exists()
 rows=[]
 if 'libcurl' in s['packages']:
  with tempfile.TemporaryDirectory(prefix='fixture-',dir=out) as tmp:
   t=Path(tmp);data=ctypes.create_string_buffer(1024);size=ctypes.c_size_t(1024);body=b'fictional transfer\n'
   enc=ctypes.CDLL('libbrotlienc.so.1').BrotliEncoderCompress
   enc.argtypes=[ctypes.c_int,ctypes.c_int,ctypes.c_int,ctypes.c_size_t,ctypes.c_void_p,ctypes.POINTER(ctypes.c_size_t),ctypes.c_void_p]
   assert enc(5,22,0,len(body),body,ctypes.byref(size),data)==1
   (t/'body.br').write_bytes(data.raw[:size.value]);(t/'invalid.br').write_bytes(b'\xff'*32)
   run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-days','2','-keyout',str(t/'key.pem'),'-out',str(t/'cert.pem'),'-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost']);(t/'cert.pem').chmod(0o644)
   name='maintenance-alpine-curl-fixture'
   try:
    run(['docker','run','-d','--name',name,*LIMITS,'--network','none','--user','0','-v',tmp+':/fixture:ro','-v',str(HERE.parent/'closure-followup/curl-fixture-server.py')+':/server.py:ro','--entrypoint','python3',PYTHON,'/server.py'])
    run(['docker','exec',name,'python3','-c','import socket,time\nfor i in range(40):\n try:\n  socket.create_connection(("127.0.0.1",18443),.1).close();break\n except OSError: time.sleep(.1)\nelse: raise RuntimeError("fixture readiness")'])
    for image in (s['base'],b['imageId']):
     base=['docker','run','--rm',*LIMITS,'--network','container:'+name,'-v',str(t/'cert.pem')+':/ca.pem:ro']
     if 'curl' in s['packages']:
      base+=['--entrypoint','curl',image];version=run(base+['--version']).decode()
      features={k:sorted(next(l for l in version.splitlines() if l.startswith(k)).split()[1:]) for k in ('Features:','Protocols:')}
      opts=['--silent','--show-error','--noproxy','*','--max-time','5']
      for path in ('/','/redirect','/gzip','/brotli'):assert run(base+opts+['--location','--max-redirs','3','--compressed','http://localhost:18080'+path])==body
      assert run(base+opts+['--data','fictional=utilibre','http://localhost:18080/post'])==b'fictional=utilibre'
      assert run(base+opts+['--cacert','/ca.pem','https://localhost:18443/'])==body
      run(base+opts+['--cacert','/ca.pem','https://127.0.0.1:18443/'],expected=60)
      run(base+opts+['--compressed','http://localhost:18080/bad-brotli'],expected=61)
      assert run(base+opts+['--write-out','%{http_code}','http://localhost:18080/missing'])==b'missing404'
      rows.append({'imageId':image,'passed':True,'checks':9,'features':features,'consumer':'curl CLI'})
     else:
      n=json.loads(run(base+['-v',str(HERE/'curl-consumer.php')+':/test.php:ro','--entrypoint','php',image,'/test.php']))
      assert n['passed'] and n['checks']==9
      rows.append({'imageId':image,**n,'consumer':'installed PHP curl extension'})
    if 'curl' in s['packages']:
     for k in rows[0]['features']:
      removed=set(rows[0]['features'][k])-set(rows[1]['features'][k])
      # Existing curl-policy.mjs permits upstream TLS-SRP removal. This
      # observed exception is scoped to OpenGist's HTTP healthcheck consumer.
      assert not removed or key=='opengist' and k=='Features:' and removed=={'TLS-SRP'}
      if removed:rows[1]['upstreamRemovedFeatures']=sorted(removed)
    else:
     assert rows[0]['version']['features'] & ~rows[1]['version']['features']==0
     assert set(rows[0]['version']['protocols'])<=set(rows[1]['version']['protocols'])
   finally:subprocess.run(['docker','rm','-f',name],capture_output=True,timeout=30)
 else:
  assert len(b['nativeRows'])==2 and all(r['passed'] for r in b['nativeRows'])
  rows=b['nativeRows']
 extra={}
 if key=='privatebin':
  n=json.loads((out/'upload-command.log').read_text().strip().splitlines()[-1]);assert n['passed'] and n['imageId']==b['imageId'];extra['privatebinUploads']=n
 proof={'date':datetime.now(timezone.utc).isoformat(),'passed':True,'imageId':b['imageId'],'rows':rows,'network':'network-none loopback fixture; no live providers','scope':'Native shared-library compatibility and exact unchanged application files; not an upstream exploit reproduction',**extra}
 (out/'consumer.json').write_text(json.dumps(proof,indent=2)+'\n');print(key+': native consumer checks passed',flush=True)
