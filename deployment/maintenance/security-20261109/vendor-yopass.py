"""Exact signed zlib payload for the existing distroless Yopass runtime.

No shell/package manager is installed in the runtime. Preparation only; the
existing vendor scan, approval and release gates remain separate.
"""
import hashlib, json, os, shutil, subprocess, tarfile, tempfile
from pathlib import Path
from datetime import datetime, timezone

os.umask(0o077)
here = Path(__file__).resolve().parent
root = Path('/var/lib/utilibre-maintenance/security-20261109')
inputs = json.loads((here / 'vendor-debian-inputs.json').read_text())
s = next(r for r in inputs['rows'] if r['key'] == 'community-yopass')
assert list(s['packages']) == ['zlib1g'] and s['suite'] == 'trixie'
d = root / 'vendor-debian/community-yopass'
d.mkdir(exist_ok=True)
assert not (d / 'build.json').exists(), 'Preserve existing evidence'
def run(a, **kw):
    return subprocess.check_output(a, stderr=subprocess.PIPE, timeout=180, **kw)
def sha(b): return hashlib.sha256(b).hexdigest()
def docker(*a): return run(['docker', *a]).decode().strip()
def config(image): return json.loads(docker('image','inspect',image))[0]['Config']
assert docker('inspect','--format','{{.Image}}',s['containers'][0]) == s['base']
p = inputs['packages']['trixie/zlib1g']
deb = root / 'debian-acquisition' / p['file']
assert sha(deb.read_bytes()) == p['sha256']
assert run(['dpkg-deb','-f',str(deb),'Package']).decode().strip() == 'zlib1g'
assert run(['dpkg-deb','-f',str(deb),'Version']).decode().strip() == p['version']
context = d / 'context'; context.mkdir(exist_ok=True)
overlay = context / 'overlay'; control = d / 'control'
run(['dpkg-deb','-x',str(deb),str(overlay)])
run(['dpkg-deb','-e',str(deb),str(control)])
assert not any((control / n).exists() for n in ['preinst','postinst','prerm','postrm'])
status = overlay / 'var/lib/dpkg/status.d'; status.mkdir(parents=True)
shutil.copy2(control/'control',status/'zlib1g')
shutil.copy2(control/'md5sums',status/'zlib1g.md5sums')
run(['md5sum','--check',str(status/'zlib1g.md5sums')],cwd=overlay)
allowed = {'/'+str(f.relative_to(overlay)) for f in overlay.rglob('*') if not f.is_dir()}
def inventory(image):
    cid = docker('create', image)
    try:
        archive = d / 'inventory.tar'; run(['docker','export','-o',str(archive),cid])
        with tarfile.open(archive) as tar:
            values = {}
            for member in tar:
                path = '/'+member.name.lstrip('./')
                if member.isdir() or path in ['/etc/hostname','/etc/hosts','/etc/resolv.conf','.dockerenv','/.dockerenv']: continue
                values[path] = [member.type.decode(), member.mode, member.uid, member.gid, member.linkname,
                                sha(tar.extractfile(member).read()) if member.isfile() else None]
            return values
    finally:
        docker('rm',cid)
        (d/'inventory.tar').unlink(missing_ok=True)
before = inventory(s['base'])
assert '/var/lib/dpkg/status.d/zlib1g' in before
(context/'Dockerfile').write_text(f"FROM {s['base']}\nCOPY overlay/ /\n")
run(['docker','build','--network','none','--pull=false','-t',s['candidate'],str(context)],env={**os.environ,'DOCKER_BUILDKIT':'0'})
image = docker('image','inspect','--format','{{.Id}}',s['candidate'])
assert config(image) == config(s['base'])
after = inventory(image)
changed = {p for p in before.keys() | after.keys() if before.get(p) != after.get(p)}
assert changed <= allowed and any('libz.so' in p for p in changed)
native=[]; abi=[]
binary=root/'vendor-debian/zlib-native'
assert sha(binary.read_bytes())==inputs['fixture']['binarySha256']
for image_id in [s['base'],image]:
    answer=docker('run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','128m','--pids-limit','32','--log-driver','none','-v',str(binary)+':/native:ro','--entrypoint','/native',image_id)
    assert answer=='ZLIB_NATIVE_PASSED checks=7'; native.append({'imageId':image_id,'passed':True,'checks':7})
    cid=docker('create',image_id)
    try:
        lib=d/'libz.so.1';run(['docker','cp','-L',cid+':/usr/lib/x86_64-linux-gnu/libz.so.1',str(lib)])
        symbols=sorted({fields[7] for line in run(['readelf','--dyn-syms','--wide',str(lib)]).decode().splitlines() if len(fields:=line.split())>=8 and fields[4] in ('GLOBAL','WEAK') and fields[6]!='UND'})
        needed=sorted(line[line.index('('):] for line in run(['readelf','-d',str(lib)]).decode().splitlines() if '(NEEDED)' in line or '(SONAME)' in line)
        abi.append({'imageId':image_id,'path':'/usr/lib/x86_64-linux-gnu/libz.so.1','sha256':sha(lib.read_bytes()),'symbols':symbols,'needed':needed})
    finally: docker('rm',cid)
assert len(abi[0]['symbols'])>50 and set(abi[0]['symbols'])<=set(abi[1]['symbols']) and abi[0]['needed']==abi[1]['needed']
common={'date':datetime.now(timezone.utc).isoformat(),'passed':True,'base':s['base'],'imageId':image,'fixtureSha256':sha(Path(__file__).read_bytes()),'nativeRows':native}
b={**s,**common,'configurationUnchanged':True,'unrelatedPackagesUnchanged':True,'pins':[p],'changedFiles':sorted(changed),'deployed':False}
c={**common,'abiPreserved':True,'neededPreserved':True,'abi':abi,'network':'none','limitation':'Stable vendor native zlib/ABI checks; no hostile exploit reproduction claimed.'}
(d/'build.json').write_text(json.dumps(b,indent=2)+'\n');(d/'consumer.json').write_text(json.dumps(c,indent=2)+'\n')
print('Distroless Yopass: signed zlib payload, unchanged unrelated files/configuration, seven native checks and ABI passed')
