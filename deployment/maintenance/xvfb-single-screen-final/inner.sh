#!/bin/sh
set -eu
role=${1:?host or dhi}
case "$role" in host|dhi) ;; *) exit 2;; esac
umask 022
test -f "/work/source-$role/debian/rules.flags"
cd "/work/source-$role"
# DHI's native source carries its vendor fixes as an unapplied quilt series;
# upstream Debian's build explicitly uses dh --with quilt. Do not omit it.
if test -f debian/patches/series; then
  export QUILT_PATCHES=debian/patches
  export QUILT_PATCH_OPTS=--fuzz=0
  quilt push -a || test "$?" -eq 2
  awk '!/^[[:space:]]*(#|$)/ {print $1}' debian/patches/series > /tmp/utilibre-xvfb-expected-series
  cmp /tmp/utilibre-xvfb-expected-series .pc/applied-patches
fi
for fix in 88812 93521 93523; do
  patch --force --batch --reverse --dry-run --fuzz=0 -p1 -i "/output/CVE-2026-$fix.patch"
done
# The native Debian recipe runs dh_autoreconf before configuration. In particular
# DHI patches configure.ac, so its old generated Automake 1.16 files need renewal.
autoreconf -fi
make -f /recipes/build.mk configure-single ROLE="$role"
make -C "/work/build-$role" -j2
make -C "/work/build-$role" -j1 check VERBOSE=1
install -m 0755 "/work/build-$role/hw/vfb/Xvfb" "/output/Xvfb-$role"
strip --strip-unneeded "/output/Xvfb-$role"
cp "/work/build-$role/include/dix-config.h" "/output/dix-config-$role.h"
cp "/work/build-$role/config.log" "/output/config-$role.log"
readelf -d "/output/Xvfb-$role" >"/output/dynamic-$role.txt"
readelf -V "/output/Xvfb-$role" >"/output/versions-$role.txt"
sha256sum "/output/Xvfb-$role"
