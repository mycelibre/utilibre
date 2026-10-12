#!/bin/sh
# Run in the exact retained exporter image. Never run against the live container.
set -eu
umask 077
test -e /.dockerenv
mkdir /proof/dhi
sed -i 's/^Types: deb$/Types: deb deb-src/' /etc/apt/sources.list.d/dhi.sources
apt-get -o APT::Update::Error-Mode=any update > /proof/dhi/apt-update.log 2>&1
apt-cache show xvfb=2:21.1.16-1.3+deb13u4+dhi1 xserver-common=2:21.1.16-1.3+deb13u4+dhi1 > /proof/dhi/package-index.txt
apt-cache showsrc xorg-server > /proof/dhi/source-index.txt
cd /proof/dhi
apt-get download xvfb=2:21.1.16-1.3+deb13u4+dhi1 xserver-common=2:21.1.16-1.3+deb13u4+dhi1 > package-download.log 2>&1
apt-get source --download-only xorg-server=2:21.1.16-1.3+deb13u4+dhi1 > source-download.log 2>&1
cp /usr/share/keyrings/dhi-deb-main.gpg .
for file in /var/lib/apt/lists/*InRelease; do cp "$file" .; done
mkdir authenticated-indexes
for file in /var/lib/apt/lists/dhi.io_*; do cp "$file" authenticated-indexes/; done
sha256sum ./*.deb ./*.dsc ./*.tar.* > SHA256SUMS
