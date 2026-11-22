"""Complete image/payload and exported-library-ABI comparison for pinned Debian updates."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

os.umask(0o077)
HERE=Path(__file__).resolve().parent
ROOT=Path('/var/lib/utilibre-maintenance/security-20261122')
inputs=json.loads((HERE/'debian-inputs.json').read_text())
exporter=HERE.parent/'security-20261109/zlib-check.py'
assert hashlib.sha256(exporter.read_bytes()).hexdigest()==inputs['exporterSha256']
s=importlib.util.spec_from_file_location('retained_scope',exporter);helper=importlib.util.module_from_spec(s);s.loader.exec_module(helper)


def records(blob):
    result={}
    for paragraph in blob.decode().strip().split('\n\n'):
        name=next(l[9:] for l in paragraph.splitlines() if l.startswith('Package: '))
        assert name not in result;result[name]=paragraph
    return result


def filelist(image,name):
    return subprocess.check_output(['docker','run','--rm',*helper.LIMITS,'--entrypoint','dpkg-query',image,'-L',name],timeout=40).decode().splitlines()


def symbols(image,path):
    content=helper.image_file(image,'/'+path)
    with tempfile.NamedTemporaryFile(dir=ROOT/'fixtures') as f:
        f.write(content);f.flush()
        text=subprocess.check_output(['readelf','--dyn-syms','--wide',f.name],timeout=15).decode()
    rows=set()
    for line in text.splitlines():
        values=line.split()
        if len(values)>=8 and values[4] in ('GLOBAL','WEAK') and values[6]!='UND':rows.add(values[7].replace('@@','@'))
    assert rows
    return rows


def template_records(blob):
    result={}
    for paragraph in blob.decode().strip().split('\n\n'):
        fields=dict(line.split(': ',1) for line in paragraph.splitlines() if ': ' in line)
        assert fields.get('Name') and fields['Name'] not in result
        result[fields['Name']]=fields
    return result


for key in sys.argv[1:]:
    row=next(r for r in inputs['rows'] if r['key']==key);out=ROOT/'vendor-debian'/key
    build=json.loads((out/'build.json').read_text());assert build['passed'] and build['base']==row['base']
    assert not (out/'scope.json').exists(),'Preserve completed scope evidence'
    old,new=row['base'],build['imageId'];before,after=[helper.export_manifest(i) for i in (old,new)]
    olddb,newdb=[records(helper.image_file(i,'/var/lib/dpkg/status')) for i in (old,new)]
    selected=set(row['packages']);assert olddb.keys()==newdb.keys()
    assert {n:v for n,v in olddb.items() if n not in selected}=={n:v for n,v in newdb.items() if n not in selected}
    allowed={'var/lib/dpkg/status','var/lib/dpkg/status-old','var/log/dpkg.log','var/log/alternatives.log','etc/ld.so.cache','var/cache/ldconfig/aux-cache'}
    payload=set()
    for name,p in row['packages'].items():
        assert re.fullmatch('[a-z0-9.+-]+',name)
        pin=inputs['packages'][p['package']]
        assert '\nVersion: '+p['installed']+'\n' in olddb[name]+'\n'
        assert '\nVersion: '+pin['version']+'\n' in newdb[name]+'\n'
        for image in (old,new):
            for path in filelist(image,name):
                assert path.startswith('/') and '..' not in path.split('/')
                payload.add(path.lstrip('/'))
        pattern=re.compile(r'^var/lib/dpkg/info/'+re.escape(name)+r'(?::amd64)?\.[a-z0-9-]+$')
        allowed.update(p for p in before.keys()|after.keys() if pattern.fullmatch(p))
    allowed.update(payload)
    changed={p:{'before':before.get(p),'after':after.get(p)} for p in sorted(before.keys()|after.keys()) if before.get(p)!=after.get(p)}
    (out/'changes.json').write_text(json.dumps(changed,indent=2)+'\n')
    if 'var/cache/debconf/templates.dat' in changed:
        assert 'libc6' in selected
        path='/var/cache/debconf/templates.dat'
        a,b=[template_records(helper.image_file(i,path)) for i in (old,new)]
        assert a.keys()==b.keys()
        changed_templates={n for n in a if a[n]!=b[n]}
        assert changed_templates=={'libraries/restart-without-asking'}
        # Only translated package-manager question text changed. Answers and
        # restart policy live in config.dat, which is outside the allowed scope.
        for name in changed_templates:
            assert {k:v for k,v in a[name].items() if not k.lower().startswith(('description','extended_description'))}=={k:v for k,v in b[name].items() if not k.lower().startswith(('description','extended_description'))}
            assert b[name]['Default']=='false' and b[name]['Type']=='boolean'
        allowed.add(path.lstrip('/'))
        backup='var/cache/debconf/templates.dat-old'
        if backup in changed:
            assert helper.image_file(new,'/'+backup)==helper.image_file(new,path)
            allowed.add(backup)
    assert changed and set(changed)<=allowed,'Unexpected file scope: '+repr(set(changed)-allowed)
    assert all(before[p]==after.get(p) for p in before if p.startswith('etc/') and p!='etc/ld.so.cache'),'Existing configuration changed'
    abi=[]
    for p in sorted(payload):
        if p not in changed or before.get(p,{}).get('type')!='0' or after.get(p,{}).get('type')!='0':continue
        if re.search(r'(?:^|/)(?:lib[^/]+|ld-linux[^/]*)\.so(?:\.[^/]+)?$',p):
            a,b=symbols(old,p),symbols(new,p);assert a<=b,'Exported ABI removed: '+p
            abi.append({'path':p,'before':len(a),'after':len(b),'preserved':True})
    proof={'passed':True,'base':old,'imageId':new,'allUnrelatedImageFilesUnchanged':True,'unrelatedDpkgRecordsUnchanged':True,
           'configurationUnchanged':True,'exportedLibraryAbi':abi,'changesSha256':hashlib.sha256((out/'changes.json').read_bytes()).hexdigest(),
           'scope':'Full content/type/mode/uid/gid/link comparison; exact vendor payload and package/loader bookkeeping only. Timestamps excluded.'}
    (out/'scope.json').write_text(json.dumps(proof,indent=2)+'\n');print(key+': full file scope and library ABI passed',flush=True)
