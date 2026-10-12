#!/bin/sh
# Isolated native Bookworm build, never run directly on the host.
set -eu
export DEBIAN_FRONTEND=noninteractive DEB_BUILD_OPTIONS=parallel=1
apt-get update -qq
apt-get install -y --no-install-recommends build-essential debhelper texinfo less
cd /work
cp /source/gzip_1.14-1.dsc /source/gzip_1.14.orig.tar.xz /source/gzip_1.14.orig.tar.xz.asc /source/gzip_1.14-1.debian.tar.xz .
printf '%s\n' \
 '8c02e8f12a2f9f45db2fe4de1a65900f47311c2d1e49f839b00172d9c420ef03  gzip_1.14-1.dsc' \
 '01a7b881bd220bfdf615f97b8718f80bdfd3f6add385b993dcf6efd14e8c0ac6  gzip_1.14.orig.tar.xz' \
 '94634698bea42dad032a10fe66b8b38c4a2efacd36052410402c0c850faf1d1a  gzip_1.14.orig.tar.xz.asc' \
 'f3e0edcb4092dbcf62ff0b7ac068fddb4ba7b644c55edf005b25415f9d9ce628  gzip_1.14-1.debian.tar.xz' | sha256sum -c -
dpkg-source -x gzip_1.14-1.dsc
cd gzip-1.14
{ printf 'gzip (1.14-1~deb12u1+utilibre1) bookworm; urgency=high\n\n  * Rebuild unchanged upstream security release against Bookworm libraries.\n\n -- Utilibre maintainers <admin@utilibre.org>  Mon, 12 Oct 2026 06:30:00 +0000\n\n'; cat debian/changelog; } > /work/changelog
mv /work/changelog debian/changelog
dpkg-checkbuilddeps
dpkg-query -W -f='${binary:Package}=${Version}\n' | sort > /output/build-packages.lock
dpkg-source -b . > /output/source-package.log 2>&1
# Run upstream tests as an unprivileged user. The output directory contains
# only build artifacts and synthetic tests, never production mounts.
chown -R 65534:65534 /work /output
setpriv --reuid=65534 --regid=65534 --clear-groups env HOME=/work dpkg-buildpackage -B -us -uc > /output/build.log 2>&1
cp /work/gzip_1.14-1~deb12u1+utilibre1_amd64.deb /work/gzip_1.14.orig.tar.xz /work/gzip_1.14.orig.tar.xz.asc /work/gzip_1.14-1~deb12u1+utilibre1.dsc /work/gzip_1.14-1~deb12u1+utilibre1.debian.tar.xz /output/
sha256sum /output/*.deb /output/*.dsc /output/*.tar.* > /output/SHA256SUMS
echo NATIVE_GZIP_BUILD_AND_UPSTREAM_TESTS_PASSED
