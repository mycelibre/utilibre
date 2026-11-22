"""Finite Alpine crypto overlay using existing preparation, scan and TLS checks.

No approvals are generated. Frozen inventory/scans and native consumers remain
separate gates. All adapters require the exact source fragment once.
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
DEST=ROOT/'alpine-crypto'
mode,*keys=sys.argv[1:]
names={'prepare':'prepare-nginx.py','scan':'scan-nginx.py','tls':'check-openssl-tls.py',
       'consumer':'../security-20261109/check-musl-runtimes.py'}
assert mode in names and keys
original=(HERE/names[mode]).resolve();code=relocate_directory(original.read_text(),original.parent)
def replace(old,new):
 global code
 assert code.count(old)==1,(mode,old,code.count(old))
 code=code.replace(old,new)
if mode=='prepare':
 replace("HERE/'nginx-inputs.json'","HERE/'alpine-crypto-inputs.json'")
 assert code.count("ROOT/'nginx'")==2
 code=code.replace("ROOT/'nginx'","ROOT/'alpine-crypto'")
 replace("ROOT/'packages'/p['file']","ROOT/'vendor-packages'/p['file']")
 replace("""        version=native(im,'nginx','-v').decode().strip()  # nginx prints version on stderr; checked below too.
        info=native(im,'sh','-ec','nginx -v 2>&1; nginx -V 2>&1').decode()
        assert 'nginx/1.30.' in info""", """        cli=ROOT/'alpine-crypto/fixtures/openssl'
        assert sha(cli)==INPUTS['nativeFixture']['cliSha256']
        value=run(['docker','run','--rm',*LIMITS,'--user','65534:65534','--mount',
            'type=bind,src='+str(cli)+',dst=/native/openssl,readonly',
            '--entrypoint','/native/openssl',im,'version']).decode().strip()
        assert 'OpenSSL 3.5.' in value
        checks.append({'imageId':im,'passed':True,'version':value,'checks':1})""")
 replace("'native':checks,","'native':checks,'nativeRows':checks,")
elif mode=='scan':
 replace('ROOT=m.ROOT; inputs=m.INPUTS',"ROOT=m.ROOT; inputs=json.loads((HERE/'alpine-crypto-inputs.json').read_text())")
 replace("out=ROOT/'nginx'/key","out=ROOT/'alpine-crypto'/key")
elif mode=='tls':
 replace("Path('/var/lib/utilibre-maintenance/security-20261122/openssl-runtime')",'Path('+repr(str(DEST))+')')
 replace("'openssl-runtime-inputs.json'","'alpine-crypto-inputs.json'")
 replace("ROOT / 'vendor-debian' / key","ROOT / key")
elif mode=='consumer':
 replace("Path('/var/lib/utilibre-maintenance/security-20261109/musl')",'Path('+repr(str(DEST))+')')
 replace("HERE / 'musl-inputs.json'",'Path('+repr(str(HERE/'alpine-crypto-inputs.json'))+')')
adapter=DEST/('run-'+mode+'.py')
if adapter.exists():assert adapter.read_text()==code
else:adapter.write_text(code)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
(DEST/('adapter-'+mode+'.json')).write_text(json.dumps({'original':str(original),'originalSha256':sha(original),
 'adapterSha256':sha(adapter),'changes':['finite manifest and evidence paths','native CLI version in place of unrelated Nginx version check'] if mode=='prepare' else ['finite manifest and private evidence paths']},indent=2)+'\n')
sys.argv=[str(adapter),*keys]
exec(compile(code,str(adapter),'exec'),{'__file__':str(adapter),'__name__':'__main__'})
