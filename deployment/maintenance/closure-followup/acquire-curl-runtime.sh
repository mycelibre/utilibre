#!/bin/sh
# Run only inside the authenticated native curl builder, never on the VM host.
set -eu
cd /output
for package in libnghttp3-9 libngtcp2-16 libngtcp2-crypto-gnutls8 libngtcp2-crypto-ossl0; do
 version=$(dpkg-query -W -f='${Version}' "$package")
 apt-get download "$package=$version"
done
sha256sum ./*.deb
