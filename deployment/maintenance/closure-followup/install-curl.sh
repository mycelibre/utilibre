#!/bin/sh
set -eu
# Debian's renamed provider omits the old .so.3 alias. Preserve it only where
# the original installation already supplied this exact compatibility link.
legacy_gnutls_alias=no
if test -L /usr/lib/x86_64-linux-gnu/libcurl-gnutls.so.3; then
 test "$(readlink /usr/lib/x86_64-linux-gnu/libcurl-gnutls.so.3)" = libcurl-gnutls.so.4
 legacy_gnutls_alias=yes
fi
# The native GnuTLS transitional package and new provider are installed together.
# No repository, libc, TLS implementation or unrelated application is changed.
dpkg --force-confold --auto-deconfigure --install /tmp/utilibre-curl-packages/*.deb
if test "$legacy_gnutls_alias" = yes; then
 test -f /usr/lib/x86_64-linux-gnu/libcurl-gnutls.so.4
 if test -L /usr/lib/x86_64-linux-gnu/libcurl-gnutls.so.3; then
  test "$(readlink /usr/lib/x86_64-linux-gnu/libcurl-gnutls.so.3)" = libcurl-gnutls.so.4
 else
  test ! -e /usr/lib/x86_64-linux-gnu/libcurl-gnutls.so.3
  ln -s libcurl-gnutls.so.4 /usr/lib/x86_64-linux-gnu/libcurl-gnutls.so.3
 fi
fi
test -z "$(dpkg --audit)"
for file in /tmp/utilibre-curl-packages/*.deb; do
 package=$(dpkg-deb -f "$file" Package)
 version=$(dpkg-deb -f "$file" Version)
 case "$package" in curl|libcurl4t64|libcurl3t64-gnutls|libcurl4-gnutls|libnghttp3-9|libngtcp2-16|libngtcp2-crypto-gnutls8|libngtcp2-crypto-ossl0) ;; *) exit 1 ;; esac
 test "$(dpkg-query -W -f='${Version}' "$package")" = "$version"
 record="/var/lib/dpkg/status.d/$package"
 if test -e "$record"; then
  test -f "$record" && test ! -L "$record"
  test "$(sed -n 's/^Package: //p' "$record")" = "$package"
  rm "$record"
 fi
done
