#!/bin/sh
# Run only inside the bounded disposable Debian builder, not on the host.
set -eu
export DEBIAN_FRONTEND=noninteractive DEB_BUILD_OPTIONS=parallel=2
case "${1:-}" in
 --oct28) version=9.20.30 ;;
 '') version=9.20.29 ;;
 *) exit 2 ;;
esac
test -d "/build/bind9-$version"
if test "$version" = 9.20.29; then
apt-get update -qq
apt-get install -y --no-install-recommends build-essential devscripts
apt-get build-dep -y --no-install-recommends --arch-only /build/bind9-9.20.29
apt-get install -y --no-install-recommends python3-sphinx python3-sphinx-rtd-theme
fi
# October 28 prerequisites are acquired separately and pinned by image ID;
# this build runs with networking disabled.
cd "/build/bind9-$version"
# Native upstream configuration: LMDB is optional server zone storage. This VM
# has only the host(1) DNS client, not named. Keep every other configure option.
if test "$(dpkg-parsechangelog -SVersion)" = "1:$version-1~deb13u1"; then
 test "$(grep -c -- '--with-lmdb=/usr' debian/rules)" = 1
 sed -i 's/--with-lmdb=\/usr/--without-lmdb/' debian/rules
 dch --local '+utilibre' 'Disable unused optional LMDB server zone backend; retain DNS client functionality.'
fi
test "$(dpkg-parsechangelog -SVersion)" = "1:$version-1~deb13u1+utilibre1"
grep -q -- '--without-lmdb' debian/rules
# Upstream correctly omits this LMDB conversion tool when the backend is off.
# It is in the uninstalled server package, not either shipped client package.
sed -i '/^usr\/bin\/named-nzd2nzf$/d; /^usr\/share\/man\/man1\/named-nzd2nzf.1$/d' debian/bind9.install
dpkg-buildpackage -us -uc -B
! readelf -d debian/bind9-libs/usr/lib/x86_64-linux-gnu/libdns-*.so | grep -q liblmdb
cd /build
sha256sum ./*.deb > bind-packages.sha256
