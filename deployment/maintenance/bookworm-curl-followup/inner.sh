#!/bin/sh
set -eu
RECIPE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
case "$1" in
 prepare)
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y --no-install-recommends build-essential devscripts debhelper autoconf automake ca-certificates gnutls-bin groff-base libbrotli-dev libgnutls28-dev libidn2-dev libkrb5-dev libldap2-dev libnghttp2-dev libpsl-dev librtmp-dev libssh2-1-dev libssl-dev libtool libzstd-dev locales-all openssh-server python3-impacket python3 stunnel4 zlib1g-dev
  dpkg-query -W -f='${binary:Package}=${Version}\n' > /output/build-packages.lock
  cd /work
  cp /inputs/curl-8.22.0.tar.xz curl_8.22.0.orig.tar.xz
  tar -xf curl_8.22.0.orig.tar.xz
  cd curl-8.22.0
  tar -xf /inputs/curl_8.22.0-1.debian.tar.xz
  patch --fuzz=0 -p1 < /preserve-features.patch
  node "$RECIPE/packaging.mjs" /work/curl-8.22.0
  export DEBFULLNAME='Utilibre maintainers' DEBEMAIL=admin@utilibre.org
  dch --force-bad-version --newversion '8.22.0-1~deb12u1+utilibre1' --distribution bookworm 'Native Bookworm build of signed upstream security release, retaining native package names and ABI; no QUIC feature addition.'
  dpkg-checkbuilddeps
  dpkg-source --before-build . > /output/patch.log 2>&1
  dpkg-source -b . > /output/source-package.log 2>&1
  chown -R 65534:65534 /work
  # Curl's loopback SSH fixtures execute the builder account's login shell.
  # Debian's nobody normally has nologin, which would skip all SSH checks.
  # Only this disposable, subsequently network-none compiler is changed.
  usermod --home /work --shell /bin/sh nobody
  ;;
 build)
  cd /work/curl-8.22.0
  cc -Wall -Wextra -Werror -O2 -I include "$RECIPE/native.c" -ldl -o /output/curl-native
  runuser -u nobody -- env DEB_BUILD_OPTIONS=parallel=2 DEBFULLNAME='Utilibre maintainers' DEBEMAIL=admin@utilibre.org dpkg-buildpackage -b -us -uc > /output/build.log 2>&1
  for tls in openssl gnutls; do
   runuser -u nobody -- sh -c 'cd "/work/curl-8.22.0/debian/build-$1" && make test TFLAGS="-n -j1 1725 2036 2504"' sh "$tls" > "/output/security-regressions-$tls.log" 2>&1
  done
  cp /work/*.dsc /work/*.tar.* /output/
  # Keep installable packages, not large detached debugging archives.
  for file in /work/*.deb; do case "$file" in *-dbgsym_*) ;; *) cp "$file" /output/ ;; esac; done
  sha256sum /output/*.deb /output/*.dsc /output/*.tar.* > /output/SHA256SUMS
  printf '%s\n' NATIVE_BOOKWORM_CURL_UPSTREAM_SUITES_PASSED
  ;;
 *) exit 2 ;;
esac
