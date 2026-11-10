"""Exact ABI checks for the authenticated stable Debian library candidates."""
import hashlib,json,os,subprocess,sys,tempfile
from pathlib import Path
from datetime import datetime,timezone
os.umask(0o077)
here=Path(__file__).resolve().parent
kerberos='--kerberos-nov10' in sys.argv
if kerberos:sys.argv.remove('--kerberos-nov10')
root=Path('/var/lib/utilibre-maintenance/security-'+('20261110' if kerberos else '20261109')+'/vendor-debian')
inputs=json.loads((here/('../security-20261110/kerberos-inputs.json' if kerberos else 'vendor-debian-inputs.json')).read_text())
def run(args):return subprocess.check_output(args,stderr=subprocess.PIPE,timeout=60)
for key in sys.argv[1:]:
    spec=next(r for r in inputs['rows'] if r['key']==key)
    d=root/key;b=json.loads((d/'build.json').read_text())
    assert b['passed'] and b['configurationUnchanged'] and b['unrelatedPackagesUnchanged']
    assert not (d/'consumer.json').exists()
    paths=[]
    for name in spec['packages']:
        if name=='zlib1g':paths.append('/usr/lib/x86_64-linux-gnu/libz.so.1')
        elif name.startswith('libapt-pkg'):paths.append('/usr/lib/x86_64-linux-gnu/libapt-pkg.so.'+name.removeprefix('libapt-pkg').removesuffix('t64'))
    if kerberos:paths=[{'libkrb5-3':'/usr/lib/x86_64-linux-gnu/libkrb5.so.3','libk5crypto3':'/usr/lib/x86_64-linux-gnu/libk5crypto.so.3','libkrb5support0':'/usr/lib/x86_64-linux-gnu/libkrb5support.so.0','libgssapi-krb5-2':'/usr/lib/x86_64-linux-gnu/libgssapi_krb5.so.2','libgssrpc4t64':'/usr/lib/x86_64-linux-gnu/libgssrpc.so.4','libkadm5clnt-mit12':'/usr/lib/x86_64-linux-gnu/libkadm5clnt_mit.so.12'}[p] for p in spec['packages']]
    assert paths
    abi=[]; removed_symbols=[]
    if kerberos:
        linked=json.loads((d/'linked-consumers.json').read_text())
        assert linked['passed'] and linked['imageId']==b['imageId'] and linked['elfFiles']
        assert not linked['undefinedReferences'] and not linked['symbolLiterals']
        allowed_removed={'libkrb5support.so.0':{'krb5int_utf8_next@@krb5support_0_MIT'},'libgssapi_krb5.so.2':{'gss_krb5int_unseal_token_v3@@gssapi_krb5_2_MIT'}}
    with tempfile.TemporaryDirectory(dir=d) as t:
        for path in paths:
            pair=[]
            for i,image in enumerate([b['base'],b['imageId']]):
                data=run(['docker','run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','128m','--cpus','1','--log-driver','none','--entrypoint','cat',image,path])
                file=Path(t)/str(i);file.write_bytes(data)
                symbols=sorted({p[7] for l in run(['readelf','--dyn-syms','--wide',str(file)]).decode().splitlines() if len(p:=l.split())>=8 and p[4] in ('GLOBAL','WEAK') and p[6]!='UND'})
                needed=sorted(l[l.index('('):] for l in run(['readelf','-d',str(file)]).decode().splitlines() if '(NEEDED)' in l or '(SONAME)' in l)
                assert len(symbols)>(10 if kerberos else 50)
                pair.append({'imageId':image,'path':path,'sha256':hashlib.sha256(data).hexdigest(),'symbols':symbols,'needed':needed})
            removed=set(pair[0]['symbols'])-set(pair[1]['symbols'])
            if kerberos:
                assert removed<=allowed_removed.get(Path(path).name,set()),'Unexpected ABI removal'
                removed_symbols.extend(sorted(removed))
            else:assert not removed
            assert pair[0]['needed']==pair[1]['needed']
            abi.extend(pair)
    assert len(b['nativeRows'])==2 and all(r['passed'] for r in b['nativeRows'])
    result={'date':datetime.now(timezone.utc).isoformat(),'passed':True,'base':b['base'],'imageId':b['imageId'],'abiPreserved':True,'neededPreserved':True,'abi':abi,'nativeRows':b['nativeRows'],'fixtureSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'network':'none','limitation':'Stable vendor package compatibility, not a new full application workflow or exploit reproduction.'}
    if kerberos:
        result.update(abiPreserved=not removed_symbols,publicApiPreserved=True,removedPrivateSymbols=removed_symbols,linkedConsumersSha256=hashlib.sha256((d/'linked-consumers.json').read_bytes()).hexdigest(),limitation='Two private upstream helpers may be removed; all image ELF consumers were inspected for imports and literal symbol names. Mounted plugins and future downloads are not covered. Ordinary API checks passed; full workflows are separate.')
    (d/'consumer.json').write_text(json.dumps(result,indent=2)+'\n')
    print(key+': '+('public API and installed ELF consumers compatible' if kerberos else 'native ABI preserved'),flush=True)
