#!/bin/sh
# Full Debian build/check; only libldap-2.5-0 is eligible for application overlay.
set -eu
test -e /work/openldap-followup/openldap_2.5.13+dfsg.orig.tar.xz || ln /work/openldap-followup/source/openldap_2.5.13+dfsg.orig.tar.xz /work/openldap-followup/openldap_2.5.13+dfsg.orig.tar.xz
cd /work/openldap-followup/tree
export LC_ALL=C.UTF-8
test "$(dpkg-parsechangelog -S Version)" = '2.5.13+dfsg-5'
for commit in 752d320cf96e46f24c0900f1a8f6af0a3fc3c4ce 6563fab9e2feccb0a684d0398e78571d09fb808b; do
  cp "../source/$commit.patch" "debian/patches/utilibre-$commit.patch"
  printf '%s\n' "utilibre-$commit.patch" >> debian/patches/series
done
QUILT_PATCHES=debian/patches QUILT_PATCH_OPTS='--fuzz=0' quilt push -a
DEBFULLNAME='Utilibre maintenance' DEBEMAIL=admin@utilibre.org debchange --newversion '2.5.13+dfsg-5+utilibre1' --distribution bookworm --force-distribution 'Backport exact OpenLDAP 2.5 ITS#9904 allocation checks (CVE-2023-2953); preserve native ABI and Debian patches.'
dpkg-buildpackage -b -us -uc -j2
cc -O2 -Wall -Wextra -Werror -Iinclude -Idebian/build/include ../recipe/native.c -Ldebian/build/libraries/libldap/.libs -Ldebian/build/libraries/liblber/.libs -lldap -llber -o ../native
LD_LIBRARY_PATH=debian/build/libraries/libldap/.libs:debian/build/libraries/liblber/.libs ../native
printf 'OPENLDAP_BINARY_NATIVE_PASSED\n'
sh ../recipe/source.sh > ../source-build.log 2>&1
