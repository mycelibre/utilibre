#!/bin/sh
# Disposable Bookworm builder only, never execute against the VM package set.
set -eu
export DEBIAN_FRONTEND=noninteractive DEB_BUILD_OPTIONS=parallel=1
apt-get update -qq
apt-get install -y --no-install-recommends build-essential debhelper libacl1-dev libpopt-dev liblz4-dev libxxhash-dev libzstd-dev zlib1g-dev libssl-dev libidn2-dev python3 python3-cmarkgfm acl attr
cd /work
cp /source/rsync_3.5.1+ds1-1.dsc /source/rsync_3.5.1+ds1.orig.tar.xz /source/rsync_3.5.1+ds1-1.debian.tar.xz .
printf '%s\n' '13b5d432d7fdd917c8b150c97bef64828f18f0c33df225f93d6bd472d991237b  rsync_3.5.1+ds1-1.dsc' '23e1a1a9586024869c424cb0554b24919f04b4f13aa81b41f652a80abf97baf1  rsync_3.5.1+ds1.orig.tar.xz' 'd2373b05dde488babc7d5e6f58f79d6b3a5999c1c1f48395980abaf1cd1af75e  rsync_3.5.1+ds1-1.debian.tar.xz' | sha256sum -c -
# Exact artifacts were obtained with APT's signed sid Sources index, outside
# host APT configuration. Build/run against Bookworm libraries, not sid libc.
dpkg-source -x rsync_3.5.1+ds1-1.dsc
cd rsync-3.5.1+ds1
{ printf 'rsync (3.5.1+ds1-1~deb12u1+utilibre1) bookworm; urgency=high\n\n  * Rebuild unchanged upstream security release against Bookworm libraries.\n\n -- Utilibre maintainers <admin@utilibre.org>  Mon, 12 Oct 2026 04:45:00 +0000\n\n'; cat debian/changelog; } > /work/changelog
mv /work/changelog debian/changelog
dpkg-query -W -f='${binary:Package}=${Version}\n' | sort > /output/build-packages.lock
dpkg-source -b . > /output/source-package.log 2>&1
dpkg-buildpackage -B -us -uc > /output/build.log 2>&1
cp /work/rsync_3.5.1+ds1-1~deb12u1+utilibre1_amd64.deb /work/rsync_3.5.1+ds1.orig.tar.xz /work/rsync_3.5.1+ds1-1~deb12u1+utilibre1.dsc /work/rsync_3.5.1+ds1-1~deb12u1+utilibre1.debian.tar.xz /output/
sha256sum /output/*.deb /output/*.dsc /output/*.tar.* > /output/SHA256SUMS
echo NATIVE_RSYNC_BUILD_PASSED
