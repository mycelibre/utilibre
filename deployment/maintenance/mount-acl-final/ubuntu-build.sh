#!/bin/sh
set -eu
export DEBIAN_FRONTEND=noninteractive LC_ALL=C.UTF-8
export DEBFULLNAME='Utilibre maintainers' DEBEMAIL=admin@utilibre.org
export DEB_BUILD_OPTIONS=parallel=2
cd /work/ubuntu-source
case "${1:-}" in
 prepare)
  apt-get update -qq
  apt-get install -y --no-install-recommends build-essential devscripts equivs quilt fakeroot
  apt-get build-dep -y --no-install-recommends .
  apt-get clean
  ;;
 build)
  if test "$(dpkg-parsechangelog -SVersion)" = '2.39.3-9ubuntu6.6'; then
   QUILT_PATCHES=debian/patches QUILT_PATCH_OPTS=--fuzz=0 quilt push
   dch --newversion '2.39.3-9ubuntu6.6+utilibre1' --distribution noble \
    'Complete upstream restricted legacy mount target pinning and pre-canonicalization checks; keep Ubuntu vendor fixes and public ABI. Restricted paths require openat2 and procfs.'
  fi
  test "$(dpkg-parsechangelog -SVersion)" = '2.39.3-9ubuntu6.6+utilibre1'
  # Keep private /work permissions unchanged. Only public source goes into
  # a disposable, unprivileged compiler workspace (about 100 MiB unpacked).
  test ! -e /build
  mkdir /build
  cp -a /work/ubuntu-source /build/source
  cp /work/ubuntu-input/util-linux_2.39.3.orig.tar.xz /build/
  cd /build/source
  dpkg-source -b . > /work/ubuntu-output/source.log 2>&1
  chown -R 65534:65534 /build
  runuser -u nobody -- dpkg-buildpackage -b -us -uc -j2 > /work/ubuntu-output/build.log 2>&1
  ;;
 *) exit 2 ;;
esac
