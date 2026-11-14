"""Reuse the full-image Alpine overlay gate for the finite November 14 batch.

Original and adapted source identities are retained. Only the selected vendor
payload may change; no network or production data is available during builds.
"""
import hashlib
import json
import os
from pathlib import Path
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261114')
INPUTS = json.loads((HERE/'inputs.json').read_text())
original = HERE.parent/'releases-20261111/vendor-prepare.py'
code = original.read_text()
def change(old,new):
    global code
    assert code.count(old)==1, old
    code=code.replace(old,new)
change("HERE = Path(__file__).resolve().parent", "HERE = Path("+repr(str(HERE))+")")
change("ROOT = Path('/var/lib/utilibre-maintenance/vendor-libs-20261111')", "ROOT = Path("+repr(str(ROOT))+")")
change("INPUTS = json.loads((HERE / 'vendor-inputs.json').read_text())", "INPUTS = json.loads((HERE / 'inputs.json').read_text())\nfor row in INPUTS['rows']:\n    if row['kind']=='alpine': row['packages']={n:v['installed'] for n,v in row['packages'].items()}")
change("p.startswith(('usr/lib/', 'usr/bin/', 'usr/share/'))", "p.startswith(('usr/lib/', 'usr/bin/', 'usr/share/', 'usr/sbin/', 'etc/apache2/', 'etc/init.d/apache2', 'etc/conf.d/apache2', 'etc/logrotate.d/apache2', 'var/www/', 'var/log/apache2/', 'run/apache2/'))")
change("assert abi and before['lib/ld-musl-x86_64.so.1'] == after['lib/ld-musl-x86_64.so.1']", "assert ('libpq' not in names or abi) and before['lib/ld-musl-x86_64.so.1'] == after['lib/ld-musl-x86_64.so.1']")
change("    changed = {p:", '''    if 'apache2' in names:
        import tarfile, io, re
        # apk preserves our local configuration and writes the signed vendor
        # replacement alongside it. Verify both instead of allowing /etc drift.
        config='etc/apache2/httpd.conf'
        assert before[config] == after[config]
        package=INPUTS['packages'][s['branch']+'/apache2']
        with tarfile.open(ROOT/'packages'/('alpine-'+s['branch'])/package['file']) as archive:
            vendor=archive.extractfile(config).read()
        assert after[config+'.apk-new']['sha256'] == hashlib.sha256(vendor).hexdigest()
        allowed.add(config+'.apk-new')
        scripts=[]
        for image in (s['base'], b['imageId']):
            blob=native(image,'cat','/lib/apk/db/scripts.tar.gz')
            with tarfile.open(fileobj=io.BytesIO(blob)) as archive:
                scripts.append({re.sub(r'^apache2-[^.]+(?:\\.[^.]+)*\\.X[0-9a-f]+\\.', 'apache2.',m.name):hashlib.sha256(archive.extractfile(m).read()).hexdigest() for m in archive if m.isfile()})
        assert scripts[0] == scripts[1], 'Package scripts changed beyond the Apache version identifier'
        allowed.add('lib/apk/db/scripts.tar.gz')
    if 'nodejs' in names:
        import tarfile, io, re
        scripts=[]
        for image in (s['base'],b['imageId']):
            blob=native(image,'cat','/lib/apk/db/scripts.tar')
            with tarfile.open(fileobj=io.BytesIO(blob)) as archive:
                scripts.append({re.sub(r'^nodejs-[0-9.]+-r[0-9]+\\.Q1[^.]+\\.', 'nodejs.',m.name):hashlib.sha256(archive.extractfile(m).read()).hexdigest() for m in archive if m.isfile()})
        assert scripts[0]==scripts[1], 'Package scripts changed beyond the Node version identifier'
        allowed.add('lib/apk/db/scripts.tar')
    changed = {p:''')
start=code.index("    fixture = INPUTS['nativeFixture']; native_rows = []")
end=code.index("    b = {**s,",start)
code=code[:start]+'''    fixture = INPUTS['libpqFixture']; native_rows = []
    for im in (s['base'], image):
        results = {}
        if 'libpq' in s['packages']:
            f=ROOT/'fixtures/libpq-native-musl'; assert sha(f)==fixture['musl']
            value=run(['docker','run','--rm',*LIMITS,'--user','65534:65534','-v',str(f)+':/native:ro','--entrypoint','/native',im]).decode().strip()
            assert value in ('LIBPQ_NATIVE_PASSED version=180006 checks=5','LIBPQ_NATIVE_PASSED version=180007 checks=5')
            results['libpq']=value
        if 'apache2' in s['packages']:
            assert 'Apache/2.4.' in native(im,'httpd','-v').decode()
            native(im,'httpd','-t'); results['apache']='configuration and version passed'
        if 'nodejs' in s['packages']:
            value=native(im,'node','-e',"const a=require('node:assert/strict');a.equal(require('node:crypto').createHash('sha256').update('fixture').digest('hex').length,64);a.equal(JSON.parse(JSON.stringify({value:42})).value,42);console.log('NODE_NATIVE_PASSED')").decode().strip()
            assert value=='NODE_NATIVE_PASSED';results['node']=value
        assert results
        native_rows.append({'imageId':im,'passed':True,'results':results})
''' +code[end:]
# PrivateBin declares /tmp as a Docker VOLUME. Build payloads must live outside
# declared volumes so deletion is committed rather than leaving APKs in layers.
assert code.count('/tmp/utilibre-vendor') == 5
code=code.replace('/tmp/utilibre-vendor','/usr/lib/utilibre-vendor')
adapter=ROOT/'prepare-alpine-adapter.py'
if adapter.exists(): assert adapter.read_text()==code
else: adapter.write_text(code)
(ROOT/'alpine-adapter.json').write_text(json.dumps({
    'originalSha256':hashlib.sha256(original.read_bytes()).hexdigest(),
    'adapterSha256':hashlib.sha256(adapter.read_bytes()).hexdigest(),
    'changes':['finite manifest and output root','package-owned Apache paths','ordinary Apache/Node/libpq fixtures']},indent=2)+'\n')
assert sys.argv[1:] and all(next(r for r in INPUTS['rows'] if r['key']==k)['kind']=='alpine' for k in sys.argv[1:])
exec(compile(code,str(adapter),'exec'),{'__file__':str(original),'__name__':'__main__'})
