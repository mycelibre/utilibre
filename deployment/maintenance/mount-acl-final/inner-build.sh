#!/bin/sh
set -eu
export LC_ALL=C.UTF-8 DEB_BUILD_OPTIONS=parallel=2
export DEBFULLNAME='Utilibre maintainers' DEBEMAIL=admin@utilibre.org
cd /work/mount-acl-final/source
test "$(dpkg-parsechangelog -SVersion)" = '2.38.1-5+deb12u3'
dch --newversion '2.38.1-5+deb12u3+utilibre1' --distribution bookworm \
 'Backport upstream restricted-target and legacy mount FD pinning for CVE-2026-53613 without changing the public ABI; preserve all Debian stable fixes.'
cp ../sources/util-linux_2.38.1.orig.tar.xz ../
dpkg-source -b . > ../output/source.log 2>&1
chown -R 65534:65534 /work/mount-acl-final
runuser -u nobody -- dpkg-buildpackage -b -us -uc -j2 > ../output/build.log 2>&1
printf 'NATIVE_MOUNT_BUILD_PASSED\n'
