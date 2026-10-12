#!/bin/sh
# Disposable Trixie build only. No production configuration or data mounts.
set -eu
export DEBIAN_FRONTEND=noninteractive
export DEBFULLNAME='Utilibre maintainers' DEBEMAIL=admin@utilibre.org
export DEB_BUILD_OPTIONS='parallel=2 nopgo nolto nocheck'
case "${1:-}" in
 prepare)
  apt-get update -qq
  apt-get install -y --no-install-recommends build-essential devscripts ca-certificates
  cd /work
  tar -xf /source/Python-3.13.16.tar.xz
  cd Python-3.13.16
  tar -xf /source/python3.13_3.13.15-1.debian.tar.xz
  # Context-only refresh: upstream rewrote turtle's docstring. Preserve the
  # exact Debian ImportError suggestion; no application/security logic patch.
  patch --fuzz=0 -p1 < /recipes/python-tk-packaging-context.patch
  patch --fuzz=0 -p1 < /recipes/python-build-imp.patch
  # The newer tarball has updated obsolete 3.1 error definitions. Debian's
  # patch switches _ssl.c to its 3.4 header; retain the now-unused 3.1 source
  # header instead of forcing deletion of nonmatching upstream source bytes.
  test "$(grep -c '^--- a/Modules/_ssl_data_31.h$' debian/patches/issue127330.diff)" = 1
  test "$(grep -c '^--- /dev/null$' debian/patches/issue127330.diff)" = 1
  awk '/^--- a\/Modules\/_ssl_data_31.h$/ { skip=1 } /^--- \/dev\/null$/ { skip=0 } !skip { print }' \
   debian/patches/issue127330.diff > /work/issue127330.diff
  mv /work/issue127330.diff debian/patches/issue127330.diff
  apt-get build-dep -y --arch-only --no-install-recommends .
  dpkg --install /source/libexpat1_2.9.0-1_amd64.deb /source/libexpat1-dev_2.9.0-1_amd64.deb
  test -z "$(dpkg --audit)"
  dpkg-query -W -f='${binary:Package}=${Version}\n' | sort > /output/build-packages.lock
  ;;
 build)
  cd /work/Python-3.13.16
  # Same upstream maintenance branch, native Debian installation layout.
  dch --newversion '3.13.16-1~deb13u1+utilibre1' --distribution trixie \
   'Native rebuild of upstream 3.13.16 security release, with Debian 3.13.15 packaging and system Expat 2.9.0.'
  cp /source/Python-3.13.16.tar.xz /work/python3.13_3.13.16.orig.tar.xz
  dpkg-source --before-build . > /output/patch.log 2>&1
  dpkg-source -b . > /output/source-package.log 2>&1
  chown -R 65534:65534 /work /output
  # Upstream's very broad, multi-variant Debian suite is not implied here.
  # Focused security/compatibility suites below are explicit release gates.
  setpriv --reuid=65534 --regid=65534 --clear-groups env HOME=/work \
   DEBFULLNAME='Utilibre maintainers' DEBEMAIL=admin@utilibre.org \
   dpkg-buildpackage -B -us -uc > /output/build.log 2>&1
  setpriv --reuid=65534 --regid=65534 --clear-groups env HOME=/work dpkg-source --before-build .
  cd build-static
  setpriv --reuid=65534 --regid=65534 --clear-groups env HOME=/work \
   ./python -m test -j2 --timeout=180 test_htmlparser test_ssl test_tarfile \
   test_pyexpat test_xml_etree test_xml_etree_c test_minidom test_sax \
   test_sqlite3 test_ctypes test_venv test_asyncio > /output/security-tests.log 2>&1
  cd /work
  # Preserve packages and source, but not the large temporary compiler tree.
  cp ./*.deb ./*.dsc ./python3.13_3.13.16*.tar.xz /output/
  tar -C Python-3.13.16 -czf /output/test-library.tar.gz Lib/test
  sha256sum /output/*.deb /output/*.dsc /output/*.tar.* > /output/SHA256SUMS
  echo NATIVE_PYTHON_SYSTEM_BUILD_AND_FOCUSED_TESTS_PASSED
  ;;
 *) exit 2 ;;
esac
