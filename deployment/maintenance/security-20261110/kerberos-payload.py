"""Exact built package payload verification for the finite Kerberos batch.

No deletion of old metadata and no scanner exclusions. Candidate containers
have no network, production mounts, credentials or writable application state.
"""
import hashlib,json,os,re,subprocess,sys,tempfile
from datetime import datetime,timezone
from pathlib import Path
os.umask(0o077)
root=Path('/var/lib/utilibre-maintenance/security-20261110')
inputs=json.loads(Path(__file__).with_name('kerberos-inputs.json').read_text())
sha=lambda b:hashlib.sha256(b).hexdigest()
def run(args):return subprocess.check_output(args,stderr=subprocess.PIPE,timeout=45)
def native(image,script):
    return run(['docker','run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','128m','--cpus','1','--pids-limit','32','--log-driver','none','--entrypoint','sh',image,'-ec',script])
for key in sys.argv[1:]:
    spec=next(s for s in inputs['rows'] if s['key']==key)
    out=root/'vendor-debian'/key;build=json.loads((out/'build.json').read_text())
    assert build['passed'] and build['base']==spec['base'] and build['configurationUnchanged'] and build['unrelatedPackagesUnchanged']
    assert not (out/'payload.json').exists(),'Preserve completed evidence'
    rows=[]
    for package in spec['packages']:
        pin=inputs['packages'][spec['packages'][package]['package']]
        archive=root/'debian-acquisition'/pin['file'];assert sha(archive.read_bytes())==pin['sha256']
        assert pin['version']=='1.22.3-0+utilibre1~deb'+('12' if spec['suite']=='bookworm' else '13')+'u1'
        with tempfile.TemporaryDirectory(dir=out) as tmp:
            run(['dpkg-deb','-x',str(archive),tmp]);entries=[];commands=[]
            for path in sorted(Path(tmp).rglob('*')):
                name='/'+str(path.relative_to(tmp));assert re.fullmatch(r'/[A-Za-z0-9/_.+@:-]+',name)
                if path.is_symlink():
                    value=os.readlink(path);kind='symlink';command="readlink '"+name+"'"
                elif path.is_file():
                    value=sha(path.read_bytes());kind='file';command="if test -f '"+name+"'; then sha256sum '"+name+"' | cut -d ' ' -f1; else echo ABSENT; fi"
                else:assert path.is_dir();continue
                entries.append({'path':name,'type':kind,'value':value});commands.append(command)
            assert len(entries)>2
            observed=native(build['imageId'],'\n'.join(commands)).decode().splitlines()
            assert len(observed)==len(entries)
            retained=[]
            for entry,value,command in zip(entries,observed,commands):
                if value==entry['value']:continue
                assert entry['path'] in [f'/usr/share/doc/{package}/changelog.Debian.gz',f'/usr/share/lintian/overrides/{package}'],'Unexpected payload difference: '+entry['path']
                cfg=native(build['base'],'cat /etc/dpkg/dpkg.cfg.d/*').decode()
                assert ('path-exclude /usr/share/lintian/overrides/*' if '/lintian/' in entry['path'] else 'path-exclude /usr/share/doc/*') in cfg
                assert native(build['base'],command).decode().strip()==value,'Changelog unexpectedly changed'
                retained.append({'path':entry['path'],'retainedValue':value,'reason':'Existing Debian slim dpkg documentation exclusion; not executable code'})
        residual=None
        if key=='krb5-expanded-penpot-exporter':
            fragment='/var/lib/dpkg/status.d/'+package
            before=native(build['base'],"cat '"+fragment+"'");after=native(build['imageId'],"cat '"+fragment+"'")
            assert before==after,'Residual metadata altered'
            residual={'path':fragment,'sha256':sha(after),'version':spec['packages'][package]['installed']}
        rows.append({'package':package,'version':pin['version'],'archiveSha256':pin['sha256'],'files':entries,'residual':residual,'payloadExact':not retained,'runtimePayloadExact':True,'retainedDocumentation':retained})
    report={'date':datetime.now(timezone.utc).isoformat(),'passed':True,'base':build['base'],'imageId':build['imageId'],'fixtureSha256':sha(Path(__file__).read_bytes()),'rows':rows,'network':'none','productionChanged':False,'metadataPreserved':True}
    (out/'payload.json').write_text(json.dumps(report,indent=2)+'\n');print(key+': complete built payload verified; metadata preserved',flush=True)
