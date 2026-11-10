"""Reuse bounded native fixtures for the two remaining pinned OAuth candidates."""
import hashlib,json,os,subprocess,sys,datetime
from pathlib import Path
os.umask(0o077)
here=Path(__file__).resolve().parent
root=Path('/var/lib/utilibre-maintenance/security-20261109/oauth')
specs=json.loads((here/'oauth-inputs.json').read_text())['rows']
key=sys.argv[1];assert len(sys.argv)==2 and key in ['trip','simplelogin']
s=next(s for s in specs if s['key']==key);out=root/key
b=json.loads((out/'build.json').read_text());assert b['passed'] and b['base']==s['base']
assert not (out/'stage.json').exists()
def run(args,**kw):
    return subprocess.run(args,check=True,capture_output=True,text=True,timeout=900,**kw)
assert run(['docker','image','inspect','--format','{{.Id}}',s['candidate']]).stdout.strip()==b['imageId']
rows=[]
fixtures={}
try:
    for image in [s['base'],b['imageId']]:
        if key=='trip':
            fixture=here/'oauth-trip.py';fixtures[str(fixture.relative_to(here.parent.parent.parent))]=hashlib.sha256(fixture.read_bytes()).hexdigest()
            result=run(['docker','run','--rm','-i','--network=none','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--cpus=1','--memory=512m','--pids-limit=96','--log-driver=none','--tmpfs','/tmp:rw,size=32m,mode=1777','--tmpfs','/app/storage:rw,size=64m,uid=1000,gid=1000','-e','UTILIBRE_SECURITY_DISPOSABLE=yes','-e','SQLITE_FILE=/app/storage/trip.sqlite','-e','SECRET_KEY=fictional-isolated-fixture-only','-e','REGISTER_ENABLE=false','-e','OIDC_CLIENT_ID=','-e','OIDC_CLIENT_SECRET=','--entrypoint',s['python'],image,'-B','-'],input=fixture.read_text())
            row=json.loads(result.stdout.strip().splitlines()[-1]);assert row['passed']
        else:
            fixture=here.parent.parent/'simplelogin/security/check-isolated.py'
            for f in ['check-isolated.py','native-regression.py','runtime-regression.py','fixture-cleanup.py']:
                p=fixture.with_name(f);fixtures[str(p.relative_to(here.parent.parent.parent))]=hashlib.sha256(p.read_bytes()).hexdigest()
            report=Path('/opt/utilibre/reports')/('oauth-20261109-simplelogin-'+image.split(':')[1][:12])
            run(['python3',str(fixture),image,str(report)])
            row=json.loads((report/'result.json').read_text());assert row['image']==image
            assert row['external_mail_sent'] is False and row['live_database_touched'] is False
            row.update(passed=True,evidence=str(report/'result.json'))
        rows.append({'imageId':image,**row})
    result={'date':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'passed','key':key,'newImage':b['imageId'],'oldImage':s['base'],'rows':rows,'fixtureSha256':fixtures,'network':'none; disposable native storage only','productionDataUsed':False}
    (out/'stage.json').write_text(json.dumps(result,indent=2)+'\n');print(key+': both isolated native application workflows passed')
except subprocess.CalledProcessError as e:
    (out/'stage-error.log').write_text((e.stdout or '')+(e.stderr or ''));raise SystemExit(key+': private fixture diagnostics retained; production unchanged')
