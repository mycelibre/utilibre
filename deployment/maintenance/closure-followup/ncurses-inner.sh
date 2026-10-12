#!/bin/sh
set -eu
export DEBIAN_FRONTEND=noninteractive DEB_BUILD_OPTIONS=parallel=1
export DEB_BUILD_PROFILES=nobiarch,pkg.ncurses.noexamples
printf '%s\n' 'deb-src [signed-by=/usr/share/keyrings/debian-archive-keyring.gpg] http://deb.debian.org/debian bookworm main' > /etc/apt/sources.list.d/utilibre-source.list
apt-get update -qq
apt-get install -y --no-install-recommends build-essential debhelper libgpm-dev pkgconf autoconf-dickey debian-keyring gpgv
cd /work
cp /source/ncurses_6.4.orig.tar.gz /source/ncurses_6.4-4.debian.tar.xz /source/ncurses_6.4-4.dsc .
# The historical uploader key is absent from this keyring. Authenticate the
# source against Debian's signed Release/Sources index, not an unknown key.
apt-get source --download-only ncurses=6.4-4 > /output/source-authentication.log 2>&1
cmp ncurses_6.4-4.dsc /source/ncurses_6.4-4.dsc
printf '%s\n' '6931283d9ac87c5073f30b6290c4c75f21632bb4fc3603ac8100812bed248159  ncurses_6.4.orig.tar.gz' '97218f48c32e375121d33ebc8a0f53afadb776ddace9003f032970749a33677d  ncurses_6.4-4.debian.tar.xz' | sha256sum -c -
echo 'dac2bb148b13bec5d9bc72a4b0c02efcc0155277944067062a430aaffc65fa7d  /source/ncurses-CVE-2025-69720.patch' | sha256sum -c -
dpkg-source -x ncurses_6.4-4.dsc
cd ncurses-6.4
# The earlier Bookworm comp_parse layout lacks the optional DEBUG trace hunk.
# Keep both exact security fixes (infocmp and tic), omit only that debug trace.
sed -n '/^--- a\/progs\/infocmp.c/,$p' /source/ncurses-CVE-2025-69720.patch > /work/cli-security.patch
patch --dry-run --fuzz=0 -p1 < /work/cli-security.patch > /output/patch.log
cp /work/cli-security.patch debian/patches/utilibre-CVE-2025-69720.patch
printf '\nutilibre-CVE-2025-69720.patch\n' >> debian/patches/series
{ printf 'ncurses (6.4-4+utilibre1) bookworm; urgency=high\n\n  * Backport upstream 20251213 infocmp bounds and tic lifetime fixes,\n    using checksum-pinned Docker Hardened Images patch.\n\n -- Utilibre maintainers <admin@utilibre.org>  Mon, 12 Oct 2026 04:00:00 +0000\n\n'; cat debian/changelog; } > /work/changelog
mv /work/changelog debian/changelog
dpkg-source --before-build .
dpkg-source -b . > /output/source-package.log 2>&1
dpkg-query -W -f='${binary:Package}=${Version}\n' | sort > /output/build-packages.lock
dpkg-buildpackage -B -us -uc -Pnobiarch,pkg.ncurses.noexamples > /output/build.log 2>&1
cp /work/ncurses-bin_6.4-4+utilibre1_amd64.deb /work/ncurses_6.4.orig.tar.gz /work/ncurses_6.4-4+utilibre1.dsc /work/ncurses_6.4-4+utilibre1.debian.tar.xz /output/
dpkg-deb -x /output/ncurses-bin_6.4-4+utilibre1_amd64.deb /work/candidate
ldd -r /work/candidate/usr/bin/infocmp > /output/imports.log
! grep -E 'not found|undefined symbol' /output/imports.log
/work/candidate/usr/bin/infocmp -i xterm > /output/native-xterm.txt
/work/candidate/usr/bin/infocmp -I xterm > /work/fictional.ti
mkdir /work/terminfo
/work/candidate/usr/bin/tic -o /work/terminfo /work/fictional.ti
TERMINFO=/work/terminfo /work/candidate/usr/bin/infocmp -I xterm > /work/reopened.ti
# Reconstructed capability data excludes only the comment naming its file.
sed '/^#/d' /work/fictional.ti > /work/expected
sed '/^#/d' /work/reopened.ti > /work/actual
cmp /work/expected /work/actual
sha256sum /output/*.deb /output/*.dsc /output/*.tar.* > /output/SHA256SUMS
echo NATIVE_NCURSES_BUILD_PASSED
