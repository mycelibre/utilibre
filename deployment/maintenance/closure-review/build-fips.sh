#!/bin/sh
# Same vendor build metadata and Debian rules; existing FIPS module is retained
# in the final candidate, not rebuilt or replaced by these library packages.
set -eu
export DEBIAN_FRONTEND=noninteractive
cp /reviewed/debian-source.sources /etc/apt/sources.list.d/utilibre-source.sources
apt-get update -qq
apt-get build-dep -y --no-install-recommends openssl=3.5.7-1~deb13u3
cd /build
apt-get source --only-source openssl=3.5.7-1~deb13u3
cd openssl-3.5.7
test "$(dpkg-parsechangelog -SVersion)" = '3.5.7-1~deb13u3'
sed -i 's/^BUILD_METADATA=.*/BUILD_METADATA=ak-fips/' VERSION.dat
EDITOR=/bin/true dpkg-source -q --commit . ak-fips
export DEB_BUILD_OPTIONS=parallel=2
dpkg-buildpackage -us -uc -b
cd /build
sha256sum ./*.deb ./*.dsc ./*.tar.* > SHA256SUMS
