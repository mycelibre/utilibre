"""Native upstream Xserver fixes, retaining each vendor branch and MAXSCREENS=1."""
import json,hashlib,os,subprocess,sys
from pathlib import Path
os.umask(0o077)
HERE=Path(__file__).resolve().parent;R=Path('/var/lib/utilibre-maintenance/security-20261114/xserver');OLD=Path('/var/lib/utilibre-maintenance/xvfb-single-screen-final-20261012')
assert sys.argv[1:] and all(x in ('host','dhi') for x in sys.argv[1:])
compiler=json.load(open(R.parent/'native-builder/build.json'));assert compiler['passed'];inputs=json.load(open(HERE/'xserver-inputs.json'))
for p in inputs['patches']:assert hashlib.sha256((R/p['file']).read_bytes()).hexdigest()==p['sha256']
for role in sys.argv[1:]:
 source=Path('/dev/shm/utilibre-xserver-20261114/source-'+role);assert source.exists();out=R/role;out.mkdir(exist_ok=True);assert not (out/'build.json').exists()
 # Old vendor patches must be applied before the new complete finite sequence.
 script='''set -eu
umask 022
cp -a /input/. /work/source
cd /work/source
if test -f debian/patches/series; then
 export QUILT_PATCHES=debian/patches QUILT_PATCH_OPTS=--fuzz=0
 quilt push -a || test "$?" -eq 2
 awk '!/^[[:space:]]*(#|$)/ {print $1}' debian/patches/series >/tmp/expected
 cmp /tmp/expected .pc/applied-patches
fi
'''
 for old in ('88812','93521','93523'):script+='patch --force --batch --reverse --dry-run --fuzz=0 -p1 -i /previous/CVE-2026-'+old+'.patch\n'
 script+='find . -type f -print0 | sort -z | xargs -0 sha256sum > /output/source-before.sha256\n'
 for p in inputs['patches']:
  patch=p['file']
  if role=='dhi' and p['advisory']=='CVE-2026-109095':
   backport=inputs['dhiBackport'];patch=backport['patch'];assert hashlib.sha256((R/patch).read_bytes()).hexdigest()==backport['sha256']
   script+='echo '+backport['sourceBeforeSha256']+'  glamor/glamor_xv.c | sha256sum --check\n'
  script+='patch --force --batch --no-backup-if-mismatch --fuzz=0 -p1 -i /patches/'+patch+'\n'
  if role=='dhi' and p['advisory']=='CVE-2026-109095':script+='echo '+backport['sourceAfterSha256']+'  glamor/glamor_xv.c | sha256sum --check\n'
 script+='''find . -type f -print0 | sort -z | xargs -0 sha256sum > /output/source-after.sha256
autoreconf -fi
make -f /recipes/build.mk configure-single ROLE=native
make -C /work/build-native -j2
make -C /work/build-native -j1 check VERBOSE=1
install -m 0755 /work/build-native/hw/vfb/Xvfb /output/Xvfb
strip --strip-unneeded /output/Xvfb
cp /work/build-native/include/dix-config.h /output/dix-config.h
cp /work/build-native/config.log /output/config.log
readelf -d /output/Xvfb >/output/dynamic.txt
readelf -V /output/Xvfb >/output/versions.txt
'''
 (out/'inner.sh').write_text(script);(out/'inner.sh').chmod(0o644)
 # Retained build.mk expects /work/source-ROLE; keep that native path explicitly.
 script=script.replace('/work/source','/work/source-native');(out/'inner.sh').write_text(script)
 command=['docker','run','--rm','--name','utilibre-xserver-build-'+role+'-nov14','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','2','--memory','3g','--memory-swap','3g','--pids-limit','256','--log-driver','none','--tmpfs','/work:rw,exec,size=2g,mode=1777','--tmpfs','/tmp:rw,exec,size=128m,mode=1777','-v',str(source)+':/input:ro','-v',str(R)+':/patches:ro','-v',str(OLD/'output')+':/previous:ro','-v',str(HERE.parent/'xvfb-single-screen-final')+':/recipes:ro','-v',str(out)+':/output','--entrypoint','sh',compiler['imageId'],'/output/inner.sh']
 with (out/'build.log').open('wb') as f:result=subprocess.run(command,stdout=f,stderr=f,timeout=1800)
 assert result.returncode==0,'Private '+role+' build log retained'
 before=dict(l.split('  ',1)[::-1] for l in (out/'source-before.sha256').read_text().splitlines());after=dict(l.split('  ',1)[::-1] for l in (out/'source-after.sha256').read_text().splitlines())
 changed=sorted(p for p in before.keys()|after.keys() if before.get(p)!=after.get(p));allowed=['./Xext/xtest.c','./Xext/xvdisp.c','./glamor/glamor_xv.c','./hw/xfree86/modes/xf86EdidModes.c','./test/xfree86.c'];assert changed==sorted(allowed),changed
 assert '-DMAXSCREENS=1' in (out/'config.log').read_text()
 proof={'passed':True,'role':role,'compilerImage':compiler['imageId'],'binarySha256':hashlib.sha256((out/'Xvfb').read_bytes()).hexdigest(),'patches':inputs['patches'],'changedSourceFiles':changed,'nativeUpstreamCheckPassed':True,'oneScreenBuildPreserved':True,'network':'none','productionChanged':False}
 (out/'build.json').write_text(json.dumps(proof,indent=2)+'\n');print(role+': native Xvfb fixes built and upstream checks passed',flush=True)
