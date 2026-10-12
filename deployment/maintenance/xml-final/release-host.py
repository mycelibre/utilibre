#!/usr/bin/env python3
"""Authorized exact one-package host update. Never restart services or engines."""
import datetime, hashlib, json, os, pathlib, subprocess
os.umask(0o077)
BASE=pathlib.Path('/var/lib/utilibre-maintenance/xml-final-20261011')
old=BASE/'host/libxml2_2.12.7+dfsg+really2.9.14-2.1+deb13u3_amd64.deb'
new=pathlib.Path('/var/lib/utilibre-maintenance/native-final/libxml2-output/libxml2_2.12.7+dfsg+really2.9.14-2.1+deb13u3+utilibre1_amd64.deb')
oldversion='2.12.7+dfsg+really2.9.14-2.1+deb13u3';newversion=oldversion+'+utilibre1'
lib=pathlib.Path('/usr/lib/x86_64-linux-gnu/libxml2.so.2.9.14')
sha=lambda file:hashlib.sha256(file.read_bytes()).hexdigest()
def run(args):
    try:return subprocess.run(args,text=True,capture_output=True,timeout=180,check=True).stdout.strip()
    except subprocess.CalledProcessError as error:
        (BASE/'host-release-error.log').write_text(error.stderr[:12000])
        raise RuntimeError('Host operation failed; private diagnostic retained') from None
def version():return run(['dpkg-query','-W','-f=${Version}','libxml2'])
def active():
    assert run(['systemctl','is-active','docker.service'])=='active'
    assert run(['systemctl','is-active','ssh.service'])=='active'
    return {name:run(['systemctl','show','-p','MainPID','--value',name]) for name in ['docker.service','ssh.service']}
def unmapped():
    namespace=os.readlink('/proc/1/ns/mnt')
    for proc in pathlib.Path('/proc').iterdir():
        if not proc.name.isdigit():continue
        try:
            if os.readlink(proc/'ns/mnt')==namespace:
                assert 'libxml2.so' not in (proc/'maps').read_text(),'A host process now maps libxml2; review before updating'
        except (FileNotFoundError,PermissionError,ProcessLookupError):pass
assert json.loads((BASE/'host-review.json').read_text())['status']=='passed'
assert sha(old)=='e0c6b63ce4602a036a526f60fe5e6c1586710688058d98fc1001b9b3147b7efd'
assert sha(new)=='b2ff4643de60160f0d80fbe617ce2aa6b92b9fa22d3f52cf02ab8cad7eb841e4'
assert version()==oldversion
assert run(['dpkg','--audit'])==''
oldroot=BASE/'host-rollback';oldroot.mkdir(exist_ok=True)
run(['dpkg-deb','-x',str(old),str(oldroot)])
oldhash=sha(lib);assert oldhash==sha(oldroot/'usr/lib/x86_64-linux-gnu/libxml2.so.2.9.14')
pids=active();unmapped()
report={'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'prepared','oldVersion':oldversion,'newVersion':newversion,
 'oldLibrarySha256':oldhash,'oldPackageSha256':sha(old),'newPackageSha256':sha(new),'oldPackage':str(old),'servicesNotRestarted':list(pids)}
path=BASE/'host-release.json'
def save():path.write_text(json.dumps(report,indent=2)+'\n')
save()
try:
    unmapped();report['status']='applying';save()
    run(['dpkg','--install',str(new)])
    assert version()==newversion
    assert sha(lib)=='ac980c0afed237e5f14a6749a9e57af772d388d009a93caf633c20db40840947'
    assert run(['dpkg','--audit'])==''
    assert active()==pids
    run(['python3','deployment/maintenance/xml-final/check-host.py','--installed'])
    report.update(status='passed',liveLibrarySha256=sha(lib),nativeInstalledChecks=True,servicesRemainSamePids=True)
except Exception:
    report['status']='failed';report['rollback']='unverified';save()
    try:
        run(['dpkg','--install',str(old)])
        assert version()==oldversion and sha(lib)==oldhash
        assert run(['dpkg','--audit'])=='' and active()==pids
        report['rollback']='exact-old-package-and-library-verified'
    finally:save()
    raise
finally:
    report['completedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();save()
print('Host libxml2 exact-package repair passed; installed native checks, clean package state, Docker/SSH same processes; no restart.')
