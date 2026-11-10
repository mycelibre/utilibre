"""Read-only signed-payload and residual-metadata proof for two APT overlays.

No deletion of old metadata and no scanner exclusions. Candidate containers
have no network, production mounts, credentials or writable application state.
"""
import hashlib,json,os,re,subprocess,sys,tempfile
from datetime import datetime,timezone
from pathlib import Path
os.umask(0o077)
root=Path('/var/lib/utilibre-maintenance/security-20261109')
inputs=json.loads(Path(__file__).with_name('vendor-debian-inputs.json').read_text())
sha=lambda b:hashlib.sha256(b).hexdigest()
def run(args):return subprocess.check_output(args,stderr=subprocess.PIPE,timeout=45)
def native(image,script):
    return run(['docker','run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','128m','--cpus','1','--pids-limit','32','--log-driver','none','--entrypoint','sh',image,'-ec',script])
for key in sys.argv[1:]:
    assert key in ['apt-penpot-frontend','apt-penpot-exporter']
    spec=next(s for s in inputs['rows'] if s['key']==key);assert spec['acquisition']=='dhi'
    out=root/'vendor-debian'/key;build=json.loads((out/'build.json').read_text())
    assert build['passed'] and build['base']==spec['base'] and build['configurationUnchanged'] and build['unrelatedPackagesUnchanged']
    assert not (out/'dhi-payload.json').exists(),'Preserve completed evidence'
    rows=[]
    for package in ['apt','libapt-pkg7.0']:
        pin=inputs['packages'][spec['packages'][package]['package']]
        archive=root/'debian-acquisition'/pin['file'];assert sha(archive.read_bytes())==pin['sha256']
        assert pin['version']=='3.0.4+dhi0'
        with tempfile.TemporaryDirectory(dir=out) as tmp:
            run(['dpkg-deb','-x',str(archive),tmp]);entries=[];commands=[]
            for path in sorted(Path(tmp).rglob('*')):
                name='/'+str(path.relative_to(tmp));assert re.fullmatch(r'/[A-Za-z0-9/_.+@:-]+',name)
                if path.is_symlink():
                    value=os.readlink(path);kind='symlink';command="readlink '"+name+"'"
                elif path.is_file():
                    value=sha(path.read_bytes());kind='file';command="sha256sum '"+name+"' | cut -d ' ' -f1"
                else:assert path.is_dir();continue
                entries.append({'path':name,'type':kind,'value':value});commands.append(command)
            assert len(entries)>10
            observed=native(build['imageId'],'\n'.join(commands)).decode().splitlines()
            assert observed==[e['value'] for e in entries],'Actual installed package differs from signed fixed payload'
        fragment='/var/lib/dpkg/status.d/'+package
        before=native(build['base'],"cat '"+fragment+"'");after=native(build['imageId'],"cat '"+fragment+"'")
        assert before==after,'Residual metadata was altered'
        assert re.search('^Package: '+re.escape(package)+'$',after.decode(),re.M)
        stale=re.search(r'^Version: (.+)$',after.decode(),re.M)[1]
        assert stale==('3.0.3+dhi1' if key.endswith('frontend') else '3.0.3+dhi2')
        assert native(build['imageId'],"dpkg-query -W -f='${Version}' '"+package+"'").decode()==pin['version']
        rows.append({'package':package,'version':pin['version'],'archiveSha256':pin['sha256'],'files':entries,'residual':{'path':fragment,'version':stale,'sha256':sha(after)},'payloadExact':True})
    report={'date':datetime.now(timezone.utc).isoformat(),'passed':True,'base':build['base'],'imageId':build['imageId'],'fixtureSha256':sha(Path(__file__).read_bytes()),'rows':rows,'network':'none','productionChanged':False,'metadataPreserved':True}
    (out/'dhi-payload.json').write_text(json.dumps(report,indent=2)+'\n');print(key+': complete signed payload verified; original metadata retained',flush=True)
