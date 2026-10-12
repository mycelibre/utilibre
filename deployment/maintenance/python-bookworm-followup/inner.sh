#!/bin/sh
# Disposable Bookworm compiler only. No production mounts or package mutation.
set -eu
export DEBIAN_FRONTEND=noninteractive
export DEBFULLNAME='Utilibre maintainers' DEBEMAIL=admin@utilibre.org
export DEB_BUILD_OPTIONS='parallel=2 nopgo nolto nocheck'
case "${1:-}" in
 prepare)
  apt-get update -qq
  apt-get install -y --no-install-recommends build-essential devscripts ca-certificates
  cd /work
  dpkg-source -x /source/python3.11_3.11.2-6+deb12u9.dsc python
  dpkg-source -x /source/expat_2.9.0-1.dsc expat
  cd /work/python
  apt-get build-dep -y --arch-only --no-install-recommends .
  cd /work/expat
  apt-get build-dep -y --arch-only --no-install-recommends .
  dpkg-query -W -f='${binary:Package}=${Version}\n' | sort > /output/build-packages.lock
  test -z "$(dpkg --audit)"
  ;;
 build)
  cd /work
  cp /source/expat_2.9.0.orig.tar.gz /source/python3.11_3.11.2.orig.tar.gz .
  cd expat
  dch -b --newversion '2.9.0-1~deb12u1+utilibre1' --distribution bookworm \
   'Native Bookworm rebuild of upstream Expat 2.9.0; preserve ABI and Debian packaging.'
  dpkg-source -b . > /output/expat-source.log 2>&1
  chown -R 65534:65534 /work /output
  setpriv --reuid=65534 --regid=65534 --clear-groups env HOME=/work \
   dpkg-buildpackage -B -us -uc > /output/expat-build.log 2>&1
  setpriv --reuid=65534 --regid=65534 --clear-groups env HOME=/work \
   make -C build check > /output/expat-tests.log 2>&1
  cp build/tests/runtests.log /output/expat-native-tests.log
  dpkg --install /work/libexpat1_2.9.0-1~deb12u1+utilibre1_amd64.deb \
   /work/libexpat1-dev_2.9.0-1~deb12u1+utilibre1_amd64.deb
  cc -shared -fPIC -O2 /recipes/entropy-probe.c -Wl,--no-as-needed -lexpat -ldl \
   -o /output/entropy-probe.so
  cd /work/python
  cp /recipes/entropy.patch debian/patches/utilibre-expat-128bit.patch
  printf '%s\n' utilibre-expat-128bit.patch >> debian/patches/series
  dpkg-source --before-build . > /output/python-patch.log 2>&1
  dch --newversion '3.11.2-6+deb12u9+utilibre1' --distribution bookworm \
   'Backport upstream CVE-2026-7210 entropy fix with system Expat 2.9.0. Retain Debian Python ABI and every existing distro security patch.'
  dpkg-source -b . > /output/python-source.log 2>&1
  chown -R 65534:65534 /work/python
  setpriv --reuid=65534 --regid=65534 --clear-groups env HOME=/work \
   dpkg-buildpackage -B -us -uc > /output/python-build.log 2>&1
  exec sh /recipes/inner.sh finalize
  ;;
 finalize)
  # Re-runnable completion after a successfully built package set. Never
  # bypass tests, and keep source/package creation separate from image release.
  cd /work/python
  # Debian cleans patches after its binary build; restore for the explicit suite.
  setpriv --reuid=65534 --regid=65534 --clear-groups env HOME=/work dpkg-source --before-build .
  cd build-static
  setpriv --reuid=65534 --regid=65534 --clear-groups env HOME=/work \
   ./python -m test -j2 --timeout=180 test_pyexpat test_xml_etree test_xml_etree_c \
   test_minidom test_sax test_tarfile test_ssl test_sqlite3 test_ctypes test_asyncio \
   > /output/python-tests.log 2>&1
  cd /work
  cp expat/build/tests/runtests.log /output/expat-native-tests.log
  cc -shared -fPIC -O2 /recipes/entropy-probe.c -Wl,--no-as-needed -lexpat -ldl \
   -o /output/entropy-probe.so
  # Only runtime/dev packages needed for native integration, not debug packages.
  for name in libexpat1 libexpat1-dev libpython3.11 libpython3.11-minimal \
   libpython3.11-stdlib libpython3.11-dev python3.11 python3.11-minimal python3.11-venv; do
   cp "${name}"_*_amd64.deb /output/
  done
  cp ./*.dsc ./expat_2.9.0*.tar.* ./python3.11_3.11.2*.tar.* /output/
  tar -C python -czf /output/test-library.tar.gz Lib/test
  sha256sum /output/*.deb /output/*.dsc /output/*.tar.* /output/entropy-probe.so > /output/SHA256SUMS
  echo BOOKWORM_PYTHON_EXPAT_BUILD_AND_FOCUSED_TESTS_PASSED
  ;;
 *) exit 2 ;;
esac
