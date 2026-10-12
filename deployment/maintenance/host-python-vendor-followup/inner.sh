#!/bin/sh
set -eu
export DEBIAN_FRONTEND=noninteractive DEBFULLNAME='Utilibre maintainers' DEBEMAIL=admin@utilibre.org
export DEB_BUILD_OPTIONS=parallel=2
case "${1:-}" in
 prepare)
  apt-get update -qq
  apt-get install -y --no-install-recommends build-essential devscripts python3-venv
  cd /work
  dpkg-source -x /source/setuptools_78.1.1-0.1.dsc source
  cd source
  apt-get build-dep -y --no-install-recommends .
  dpkg-query -W -f='${binary:Package}=${Version}\n' | sort > /output/build-packages.lock
  test -z "$(dpkg --audit)"
  usermod --home /work nobody
  ;;
 build)
  cd /work
  cp /source/setuptools_78.1.1.orig.tar.gz .
  cd source
  cp /recipes/context.patch debian/patches/utilibre-jaraco-extraction.patch
  printf '%s\n' utilibre-jaraco-extraction.patch >> debian/patches/series
  dpkg-source --before-build . > /output/patch.log 2>&1
  dch --newversion '78.1.1-0.1+utilibre1' --distribution trixie \
   'Apply upstream jaraco.context extraction-filter fix to the bundled module; keep stable setuptools API and all distro patches.'
  dpkg-source -b . > /output/source.log 2>&1
  chown -R 65534:65534 /work /output
  runuser -u nobody -- dpkg-buildpackage -b -us -uc > /output/build.log 2>&1
  cp /work/python3-setuptools-whl_78.1.1-0.1+utilibre1_all.deb /output/
  cp /work/setuptools_78.1.1* /output/
  sha256sum /output/*.deb /output/*.dsc /output/*.tar.* > /output/SHA256SUMS
  echo NATIVE_STABLE_SETUPTOOLS_WHEEL_BUILD_PASSED
  ;;
 *) exit 2 ;;
esac
