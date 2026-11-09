"""Bind existing isolated native proxy checks to exact libc ABI evidence."""
import hashlib, json, os, subprocess, sys, tempfile
from pathlib import Path
os.umask(0o077)
root=Path('/var/lib/utilibre-maintenance/security-20261109/musl')
here=Path(__file__).resolve().parent
fixture=here.parent/'go-final/check-native.mjs'
keys={'rimgo-rimgo':4,'reader-evaluation-gothub':3,
      'reader-evaluation-safetwitch-backend':2,'reader-evaluation-anonymousoverflow':1}
apps={'community-ntfy':('check-ntfy.py',['anonymousPublishAndPoll','oneHourExpiry','noCacheHonoured','attachmentsDisabled','registrationDisabled','metricsDisabled','ramCacheClearedOnRestart','networkIsolated','onlySyntheticData']),
      'opengist-opengist':('check-opengist.py',['blankRamOnlySqlite','twoNativeAccountsLogin','privateAnonymousAndOtherAccountDenied','createEditCommitsZip','privateGitClonePushReopen','gistsAndAccountsDeletedNatively'])}
keys.update({k:len(v[1]) for k,v in apps.items()})
for key in sys.argv[1:]:
    assert key in keys
    d=root/key;b=json.loads((d/'build.json').read_text())
    fixture=here.parent/'go-final/check-native.mjs'
    if key in apps:
        name,fields=apps[key];fixture=here.parent/'go-leaf-final'/name
        proofs=[json.loads((d/(p+'-native.json')).read_text()) for p in ['before','after']]
        assert [r['imageId'] for r in proofs]==[b['base'],b['imageId']] and all(r['passed'] for r in proofs)
        assert all(r[f] is True for r in proofs for f in fields)
        if key=='community-ntfy':
            config=here.parent.parent/'community/ntfy.yml'
            assert all(r['configurationSha256']==hashlib.sha256(config.read_bytes()).hexdigest() for r in proofs)
        a={'passed':True,'base':b['base'],'imageId':b['imageId'],'network':'internal',
           'fixtureSha256':hashlib.sha256(fixture.read_bytes()).hexdigest(),
           'variants':[[{f:r[f]} for f in fields] for r in proofs],
           'limitation':proofs[0].get('limitation',proofs[0].get('limitations'))}
    else:a=json.loads((d/'application.json').read_text())
    assert b['passed'] and b['configurationUnchanged'] and b['unrelatedPackagesUnchanged']
    assert a['passed'] and a['imageId']==b['imageId'] and a['base']==b['base'] and a['network']=='internal'
    assert a['fixtureSha256']==hashlib.sha256(fixture.read_bytes()).hexdigest()
    assert a['variants'][0]==a['variants'][1] and len(a['variants'][0])==keys[key]
    abi=[]
    with tempfile.TemporaryDirectory(dir=d) as tmp:
        for n,image in enumerate([b['base'],b['imageId']]):
            data=subprocess.check_output(['docker','run','--rm','--network','none','--read-only','--cap-drop','ALL',
                '--security-opt','no-new-privileges','--memory','128m','--cpus','1','--log-driver','none',
                '--entrypoint','cat',image,'/lib/ld-musl-x86_64.so.1'],timeout=60,stderr=subprocess.PIPE)
            path=Path(tmp)/str(n);path.write_bytes(data)
            symbols=subprocess.check_output(['readelf','--dyn-syms','--wide',str(path)],text=True,timeout=30)
            abi.append({p[7] for l in symbols.splitlines() if len(p:=l.split())>=8 and p[4] in ('GLOBAL','WEAK') and p[6]!='UND'})
    assert len(abi[0])>1000 and abi[0]<=abi[1]
    result={'passed':True,'profile':'native-app' if key in apps else 'proxy-native','base':b['base'],'imageId':b['imageId'],
            'abiPreserved':True,'baselineExportedSymbols':len(abi[0]),'nativeRows':b['nativeRows'],
            'rows':[{'imageId':im,'passed':True,'checks':keys[key],'runtime':'unchanged-native-proxy',
                     'responses':responses} for im,responses in zip([b['base'],b['imageId']],a['variants'])],
            'fixtureSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            'applicationFixtureSha256':a['fixtureSha256'],'applicationFixture':str(fixture.relative_to(here.parent)),'network':'internal; no upstream requests',
            'limitation':a['limitation']}
    assert not (d/'consumer.json').exists()
    (d/'consumer.json').write_text(json.dumps(result,indent=2)+'\n')
    print(key+': native proxy parity and ABI passed',flush=True)
