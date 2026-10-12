#!/bin/sh
set -eu
export DEBIAN_FRONTEND=noninteractive DEBFULLNAME='Utilibre maintainers' DEBEMAIL=admin@utilibre.org
export DEB_BUILD_OPTIONS='parallel=2 nodoc' DEB_BUILD_PROFILES=nodoc
export CARGO_BUILD_JOBS=2
finish_tests() {
  cd /work/source
  # dpkg-buildpackage unapplies quilt patches after packaging. Restore the exact
  # source/dependency patches before separately testing the Rust workspace.
  dpkg-source --before-build . > /output/patch-tests.log 2>&1
  chown -R 65534:65534 /work /output
  runuser -u nobody -- env CARGO_HOME=/work/source/debian/cargo_home cargo test --manifest-path src/rust/Cargo.toml --offline -p cryptography-x509-verification > /output/rust-tests.log 2>&1
  cp /work/python3-cryptography_*utilibre1*.deb /output/
  cp /work/python-cryptography_*utilibre1* /output/
  cp /work/python-cryptography_43.0.0.orig.tar.gz /output/
  sha256sum /output/*.deb /output/*.dsc /output/*.tar.* > /output/SHA256SUMS
  echo NATIVE_STABLE_CRYPTOGRAPHY_BUILD_PASSED
}
case "${1:-}" in
 prepare)
  apt-get update -qq
  apt-get install -y --no-install-recommends build-essential devscripts rpm2cpio cpio
  cd /work
  if test ! -d source; then dpkg-source -x /source/python-cryptography_43.0.0-3+deb13u1.dsc source; fi
  cd source
  apt-get build-dep -y --no-install-recommends --arch-only .
  dpkg-query -W -f='${binary:Package}=${Version}\n' | sort > /output/build-packages.lock
  test -z "$(dpkg --audit)"
  usermod --home /work nobody
  ;;
 build)
  cd /work
  cp /source/python-cryptography_43.0.0.orig.tar.gz .
  rpm2cpio /source/python-cryptography-43.0.0-4.el10_2.5.src.rpm | cpio --quiet -id './python-cryptography-43.0.0-CVE-2026-69249.patch'
  printf '%s\n' '73c1bab19c17e9d0b45cf4d2f4d5f2c202cae72c48ad3f016bc1749c447fe5af  python-cryptography-43.0.0-CVE-2026-69249.patch' | sha256sum -c -
  cd source
  patch --dry-run --batch --fuzz=0 -p1 -i /work/python-cryptography-43.0.0-CVE-2026-69249.patch > /output/patch-dry-run.log
  cp /work/python-cryptography-43.0.0-CVE-2026-69249.patch debian/patches/utilibre-verification-budget.patch
  printf '%s\n' utilibre-verification-budget.patch >> debian/patches/series
  cp /recipes/vendor-test-compat.patch debian/patches/utilibre-vendor-test-compat.patch
  printf '%s\n' utilibre-vendor-test-compat.patch >> debian/patches/series
  dpkg-source --before-build . > /output/patch.log 2>&1
  dch --newversion '43.0.0-3+deb13u1+utilibre1' --distribution trixie \
   'Apply maintained 43.0.0 CVE-2026-69249 signature-verification budget backport verbatim; retain stable API and existing Debian patches.'
  dpkg-source -b . > /output/source.log 2>&1
  chown -R 65534:65534 /work /output
  runuser -u nobody -- dpkg-buildpackage -B -us -uc > /output/build.log 2>&1
  finish_tests
  ;;
 tests)
  test -f /work/python3-cryptography_43.0.0-3+deb13u1+utilibre1_amd64.deb
  finish_tests
  ;;
 resume-test-fix)
  cd /work/source
  cp /recipes/vendor-test-compat.patch debian/patches/utilibre-vendor-test-compat.patch
  if ! grep -qxF utilibre-vendor-test-compat.patch debian/patches/series; then printf '%s\n' utilibre-vendor-test-compat.patch >> debian/patches/series; fi
  dpkg-source --before-build . > /output/patch-test-compat.log 2>&1
  # Normal Debian cleanup; keep compiler-cache scratch state outside the source
  # tree so the corresponding-source archive contains no cached binaries.
  debian/rules clean > /output/clean-resume.log 2>&1
  if test -d debian/cargo_home; then mv debian/cargo_home /work/cargo-home-pre-rebuild; fi
  dpkg-source -b . > /output/source.log 2>&1
  chown -R 65534:65534 /work /output
  runuser -u nobody -- dpkg-buildpackage -B -us -uc > /output/build.log 2>&1
  finish_tests
  ;;
 *) exit 2 ;;
esac
