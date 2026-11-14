"""Exact existing QEMU source plus the upstream websocket bounds repair; tools only."""
from pathlib import Path
import os,json,hashlib,subprocess
os.umask(0o077)
h=Path(__file__).resolve().parent;r=Path('/var/lib/utilibre-maintenance/security-20261114/qemu');old=Path('/var/lib/utilibre-maintenance/security-20261103/remaining/qemu-components');s=json.loads((h.parent/'security-20261103/qemu-components.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for f in s['files']:assert sha(old/f['file'])==f['sha256']
for p,digest in s['sourceFiles'].items():assert sha(old/'source'/p)==digest
patch=r/'68df2cefcfe6eb3df4c0531cea4d9125742bc9df.patch';assert sha(patch)=='1c80743b9d52d6da0cb5589e11335652d33ff2d234dc179259f40cffaecfaeb4'
wheel=json.load(open(r/'qmp-wheel.json'));assert sha(r/wheel['file'])==wheel['sha256']
compiler=json.load(open(r.parent/'qemu-builder-complete/build.json'));out=r/'native';out.mkdir(exist_ok=True);assert not (out/'build.json').exists()
script='''set -eu
umask 022
cp -a /input /work/source
cd /work/source
cp /wheels/qemu_qmp-0.0.6-py3-none-any.whl python/wheels/
patch --force --batch --fuzz=0 --no-backup-if-mismatch -p1 -i /fix.patch
mkdir /work/build
cd /work/build
/work/source/configure --prefix=/usr --libdir=/usr/lib/x86_64-linux-gnu --libexecdir=/usr/lib/qemu --sysconfdir=/etc --localstatedir=/var --disable-download --disable-containers --disable-install-blobs --disable-relocatable --disable-docs --disable-system --disable-user --disable-linux-user --disable-guest-agent --enable-tools --enable-modules --enable-linux-aio --enable-linux-io-uring --enable-curl --enable-gnutls --enable-nettle --enable-libssh --enable-libiscsi --enable-libnfs --enable-rbd --enable-fuse --enable-zstd --enable-libpmem --enable-blkio --extra-cflags="$(dpkg-buildflags --get CFLAGS) $(dpkg-buildflags --get CPPFLAGS)" --extra-ldflags="$(dpkg-buildflags --get LDFLAGS)" --with-pkgversion='Debian 1:11.1.2+ds-3~bpo13+4; Utilibre websocket bounds'
ninja -j2 qemu-img qemu-io qemu-nbd storage-daemon/qemu-storage-daemon tests/unit/test-io-channel-websock
meson test --no-rebuild --print-errorlogs 'test-io-channel-websock'
for name in qemu-img qemu-io qemu-nbd; do install -m755 "$name" "/output/$name"; strip --strip-unneeded "/output/$name"; done
install -m755 storage-daemon/qemu-storage-daemon /output/qemu-storage-daemon
strip --strip-unneeded /output/qemu-storage-daemon
cp config-host.h config-host.mak compile_commands.json /output/
cp meson-info/intro-buildoptions.json /output/
cp meson-logs/testlog.json /output/
'''
(out/'inner.sh').write_text(script)
args=['docker','run','--rm','--name','utilibre-qemu-tools-nov14','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','2','--memory','3g','--memory-swap','3g','--pids-limit','256','--log-driver','none','--tmpfs','/work:rw,exec,size=3g,mode=1777','--tmpfs','/tmp:rw,exec,size=128m,mode=1777','-v',str(old/'source')+':/input:ro','-v',str(patch)+':/fix.patch:ro','-v',str(r)+':/wheels:ro','-v',str(out)+':/output','--entrypoint','sh',compiler['imageId'],'/output/inner.sh']
with (out/'build.log').open('wb') as f:p=subprocess.run(args,stdout=f,stderr=f,timeout=1800)
assert p.returncode==0,'Private QEMU build log retained'
(out/'build.json').write_text(json.dumps({'passed':True,'compiler':compiler['imageId'],'patchSha256':sha(patch),'sourceReceiptSha256':sha(h.parent/'security-20261103/qemu-components.json'),'binaries':{n:sha(out/n) for n in ('qemu-img','qemu-io','qemu-nbd','qemu-storage-daemon')},'network':'none','productionChanged':False},indent=2)+'\n')
print('Native QEMU block tools prepared; guest agent unchanged')
