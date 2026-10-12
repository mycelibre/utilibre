#!/bin/sh
set -eu
export DEBIAN_FRONTEND=noninteractive DEB_BUILD_OPTIONS=parallel=2
test "$(df -B1 --output=avail /build | tail -1)" -gt 8589934592
cp /reviewed/deployment/maintenance/closure-review/debian-source.sources /etc/apt/sources.list.d/utilibre-source.sources
apt-get update -qq
apt-get build-dep -y --no-install-recommends openssh=1:10.0p1-7+deb13u4
apt-get install -y --no-install-recommends python3-paramiko krb5-kdc krb5-admin-server iproute2
mkdir /tmp/authenticated-openssh
cd /tmp/authenticated-openssh
apt-get source --download-only openssh=1:10.0p1-7+deb13u4
for archive in openssh_10.0p1-7+deb13u4.dsc openssh_10.0p1-7+deb13u4.debian.tar.xz openssh_10.0p1.orig.tar.gz openssh_10.0p1.orig.tar.gz.asc; do
 cmp "$archive" "/build/$archive"
done
cd /build/openssh-10.0p1
test "$(dpkg-parsechangelog -SVersion)" = '1:10.0p1-7+deb13u4+utilibre2'
dpkg-buildpackage -us -uc -b
cd /build
sha256sum ./*.deb > packages.sha256
test "$(df -B1 --output=avail /build | tail -1)" -gt 8589934592
