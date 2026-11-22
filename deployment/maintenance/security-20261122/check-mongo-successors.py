"""Run upstream's offline crypto example against old and vendor runtime bytes.

Uses the original example state machine and fictional file-based KMS replies;
no provider is contacted. Existing source-patch comparison and full file/ABI
scope are separate gates. This is not rerunning the statically linked suite
against a different binary and claiming it covers the installed vendor library.
"""
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
os.umask(0o077)
HERE=Path(__file__).resolve().parent
ROOT=Path('/var/lib/utilibre-maintenance/security-20261122/successors')
prior=Path('/var/lib/utilibre-maintenance/security-20261104/mongocrypt')
spec=json.loads((HERE/'successor-runtime-inputs.json').read_text());row=spec['rows'][0]
oldspec=json.loads((HERE.parent/'security-20261104/mongocrypt-inputs.json').read_text())
out=ROOT/'vendor-debian'/row['key'];b=json.loads((out/'build.json').read_text())
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert b['passed'] and b['base']==row['base']
assert not (out/'crypto-example.json').exists()
fixture=ROOT/'crypto-example';fixture.mkdir(exist_ok=False);fixture.chmod(0o755)
headers=fixture/'headers';headers.mkdir()
def run(args,timeout=120):return subprocess.run(args,capture_output=True,timeout=timeout,check=True)
for package in ['libbson-dev']:
 pin=next(p for p in oldspec['acquiredBuildPackages'] if p['file'].startswith(package+'_'))
 file=prior/'output/debs'/pin['file'];assert sha(file)==pin['sha256'];run(['dpkg-deb','-x',str(file),str(headers)])
# Previously verified native dev package supplies the public generated headers.
file=prior/'output/libmongocrypt-dev_1.13.2-1+deb13u1+utilibre1_amd64.deb'
source=prior/'verified-source';assert (source/'test/example-state-machine.c').is_file()
run(['dpkg-deb','-x',str(file),str(headers)])
import shutil
shutil.copytree(source/'test/example',fixture/'test/example')
shutil.copy2(source/'test/example-state-machine.c',fixture/'example.c')
libs=fixture/'libraries';libs.mkdir()
for name in ('libmongocrypt0','libbson-1.0-0t64'):
 pin=spec['packages']['trixie/'+name];p=ROOT/'debian-acquisition'/pin['file'];assert sha(p)==pin['sha256']
 run(['dpkg-deb','-x',str(p),str(libs)])
libdir=libs/'usr/lib/x86_64-linux-gnu'
for name,target in [('libbson-1.0.so','libbson-1.0.so.0'),('libmongocrypt.so','libmongocrypt.so.0')]:
 (libdir/name).symlink_to(target)
for p in fixture.rglob('*'):
 if not p.is_symlink():p.chmod(0o755 if p.is_dir() else 0o644)
compiled=ROOT/'crypto-binary';compiled.mkdir(exist_ok=False);compiled.chmod(0o755);os.chown(compiled,65534,65534)
limits=['--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges',
 '--cpus','1','--memory','384m','--memory-swap','384m','--pids-limit','64','--log-driver','none','--ulimit','core=0']
compiler=oldspec['compilerBase']
args=['docker','run','--rm',*limits,'--user','65534:65534','--tmpfs','/tmp:rw,size=32m,mode=1777',
 '-v',str(fixture)+':/fixture:ro','-v',str(compiled)+':/output','--entrypoint','cc',compiler,
 '-O2','-D_FORTIFY_SOURCE=2','-fstack-protector-strong','-Wl,-z,relro,-z,now',
 '-I/fixture/headers/usr/include/libbson-1.0','-I/fixture/headers/usr/include/mongocrypt',
 '/fixture/example.c','-L/fixture/libraries/usr/lib/x86_64-linux-gnu',
 '-Wl,-rpath-link,/fixture/libraries/usr/lib/x86_64-linux-gnu','-lmongocrypt','-lbson-1.0','-o','/output/example']
try:p=run(args)
except subprocess.CalledProcessError as e:
 (out/'crypto-compile.log').write_bytes(e.stdout+e.stderr);raise
(out/'crypto-compile.log').write_bytes(p.stdout+p.stderr)
proofs=[]
for phase,image in [('before',row['base']),('after',b['imageId'])]:
 p=run(['docker','run','--rm',*limits,'--user','65534:65534',
  '-v',str(fixture)+':/fixture:ro','-v',str(compiled/'example')+':/native:ro',
  '--workdir','/fixture','--entrypoint','/native',image])
 (out/(phase+'-crypto-example.log')).write_bytes(p.stdout+p.stderr)
 text=p.stdout.decode();assert all(s in text for s in ['ENCRYPTION','DECRYPTION','EXPLICIT ENCRYPTION','EXPLICIT DECRYPTION','hello'])
 proofs.append({'imageId':image,'passed':True,'checks':['automatic encryption/decryption','explicit encryption/decryption','file-based synthetic KMS replies']})
(out/'crypto-example.json').write_text(json.dumps({'passed':True,'date':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'base':row['base'],'imageId':b['imageId'],'upstreamSource':'libmongocrypt 1.13.2 test/example-state-machine.c',
 'sourceSha256':sha(fixture/'example.c'),'devPackageSha256':sha(file),'compiler':compiler,'binarySha256':sha(compiled/'example'),
 'fixtureHashes':{str(p.relative_to(fixture)):sha(p) for p in sorted((fixture/'test').rglob('*')) if p.is_file()},
 'checks':proofs,'network':'none','productionChanged':False,
 'limitation':'Original public API example against installed shared libraries; not the full static upstream suite or exploit reproduction.'},indent=2)+'\n')
print('Mongo vendor runtime: upstream encryption/decryption example passed on old and candidate libraries')
