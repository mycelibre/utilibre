#!/bin/sh
set -eu
export DEBIAN_FRONTEND=noninteractive
export DEB_BUILD_OPTIONS='parallel=2 nocheck nodoc'
export DEB_BUILD_PROFILES=nocheck
export DEBFULLNAME='Utilibre maintainers' DEBEMAIL=admin@utilibre.org
case "$1" in
 prepare|prepare-frozen)
  cp -a /source/. /work/
  cd /work/krb5-1.22.3
  if test "$1" = prepare; then
   apt-get update -qq
   apt-get install -y --no-install-recommends devscripts quilt git liblmdb-dev
   apt-get build-dep -y --no-install-recommends --arch-only --build-profiles=nocheck .
  fi
  dch --newversion "1.22.3-0+utilibre1~deb${DEBIAN_SUITE_NUMBER}u1" --distribution "${DEBIAN_SUITE_NAME}" 'Build authenticated MIT 1.22.3 with Debian integration patches and native stable ABI. Ordinary isolated compatibility checks are separate from this nocheck build.'
  dpkg-source --before-build .
  dpkg-source -b . > /output/source.log 2>&1
  dpkg-query -W -f='${binary:Package}=${Version}\n' | sort > /output/build-packages.lock
  chown -R 65534:65534 /work /output
  ;;
 build)
  cd /work/krb5-1.22.3
  runuser -u nobody -- env DEB_BUILD_OPTIONS='parallel=2 nocheck nodoc' DEB_BUILD_PROFILES=nocheck dpkg-buildpackage -B -us -uc > /output/build.log 2>&1
  cc -O2 -fstack-protector-strong -D_FORTIFY_SOURCE=2 -Wl,-z,relro,-z,now -Ibuild/include -Isrc/include /recipe/kerberos-native.c -Lbuild/lib -lkrb5 -lk5crypto -lgssapi_krb5 -lkrb5support -lcom_err -o /output/kerberos-native
  runuser -u nobody -- python3 /recipe/kerberos-realm.py > /output/realm.json
  cd /work
  cp ./*.dsc ./*.tar.* ./*.buildinfo ./*.changes /output/
  for file in ./*.deb; do case "$file" in *-dbg_*|*-dbgsym_*) ;; *) cp "$file" /output/ ;; esac; done
  sha256sum /output/*.deb /output/*.dsc /output/*.tar.* > /output/SHA256SUMS
  ;;
 *) exit 2 ;;
esac
