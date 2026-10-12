#!/bin/sh
set -eu
export DEBIAN_FRONTEND=noninteractive DEB_BUILD_OPTIONS=parallel=2
cp /reviewed/debian-source.sources /etc/apt/sources.list.d/utilibre-source.sources
apt-get update -qq
apt-get build-dep -y --no-install-recommends openssh=1:10.0p1-7+deb13u4
cd /build/openssh-10.0p1
test "$(dpkg-parsechangelog -SVersion)" = '1:10.0p1-7+deb13u4'
# Record an explicit local backport version without pretending to be 10.4.
sed -i '1s/1:10.0p1-7+deb13u4/1:10.0p1-7+deb13u4+utilibre1/' debian/changelog
dpkg-buildpackage -us -uc -b
cd /build
sha256sum ./*.deb > packages.sha256
