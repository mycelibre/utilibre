#!/bin/sh
set -eu
export DEBIAN_FRONTEND=noninteractive LC_ALL=C.UTF-8
export DEBFULLNAME='Utilibre maintainers' DEBEMAIL=admin@utilibre.org
export DEB_BUILD_OPTIONS=parallel=2
cd /work/mount-acl-final/acl-source
case "${1:-}" in
 prepare)
  apt-get update -qq
  apt-get build-dep -y --no-install-recommends .
  ;;
 build)
  test "$(dpkg-parsechangelog -SVersion)" = 2.4.0-1
  dch -b --newversion '2.4.0-1~deb12u1+utilibre1' --distribution bookworm \
   'Build the official safe-API and CLI release against Bookworm libc; retain Debian patches. Existing pathname APIs preserve their upstream contract and require caller review.'
  cp ../sources/acl_2.4.0.orig.tar.xz ../
  cp ../sources/acl_2.4.0.orig.tar.xz.asc ../
  dpkg-source -b . > ../acl-output/source.log 2>&1
  chown -R 65534:65534 /work/mount-acl-final/acl-source /work/mount-acl-final/acl-output
  runuser -u nobody -- dpkg-buildpackage -b -us -uc -j2 > ../acl-output/build.log 2>&1
  ;;
 *) exit 2 ;;
esac
