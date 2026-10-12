#!/bin/sh
# Produce a clean, complete Debian source package, without test credentials/logs.
set -eu
export EDITOR=true
test ! -e /build/source-offer
mkdir /build/source-offer
cd /build/source-offer
cp /build/openssh_10.0p1.orig.tar.gz /build/openssh_10.0p1.orig.tar.gz.asc .
dpkg-source -x /build/openssh_10.0p1-7+deb13u4.dsc openssh-10.0p1
cd openssh-10.0p1
patch -p1 --batch --forward < /build/openssh-client-lifetime.patch
patch -p1 --batch --forward < /build/openssh-server-backport.patch
cp /build/openssh-10.0p1/debian/changelog debian/changelog
dpkg-source --commit . utilibre-security-backports.patch
dpkg-source --build .
cd ..
sha256sum ./*.dsc ./*.tar.* > SHA256SUMS
dpkg-query -W -f='${binary:Package}\t${Version}\n' > build-packages.lock
