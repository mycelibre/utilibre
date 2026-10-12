#!/bin/sh
set -eu
export DEBIAN_FRONTEND=noninteractive DEB_BUILD_PROFILES=nopython DEB_BUILD_OPTIONS=parallel=1
unset LD_LIBRARY_PATH
# Native signed Debian source and build dependencies, not Ubuntu binary packages.
sed -i 's/^Types: deb$/Types: deb deb-src/' /etc/apt/sources.list.d/debian.sources
apt-get -qq update
apt-get -qqy --no-install-recommends install build-essential debhelper-compat rename liblzma-dev zlib1g-dev pkg-config libxml2-dev
cd /work
apt-get source libxml2=2.12.7+dfsg+really2.9.14-2.1+deb13u3 > /output/source-download.log 2>&1
echo '04b1da890535b11e3db231f39114ee09e643badceff79441d749d0ca78efaaa5  libxml2_2.12.7+dfsg+really2.9.14-2.1+deb13u3.dsc' | sha256sum -c -
echo '4fe913dec8b1ab89d13b489b419a8203176ea39e931eaa0d25b17eafb9c279e9  libxml2_2.12.7+dfsg+really2.9.14.orig.tar.xz' | sha256sum -c -
echo '3b6d265f482d6a8fbe3c056d2006fb3b563b4a838f7258b388ac5f0b29206921  libxml2_2.12.7+dfsg+really2.9.14-2.1+deb13u3.debian.tar.xz' | sha256sum -c -
cc -O2 /abi.c $(pkg-config --cflags --libs libxml-2.0) -o /output/old-abi-check
cc -O2 /rsvg.c -ldl -o /output/rsvg-check
/output/old-abi-check layout > /output/old-layout.txt
/output/old-abi-check > /output/old-native-check.txt
nm -D --defined-only /usr/lib/x86_64-linux-gnu/libxml2.so.2 | awk '{print $2,$3}' | sort > /output/old-symbols.txt
dpkg-query -W -f='${binary:Package}=${Version}\n' | sort > /output/build-packages.lock
cd /work/libxml2-2.12.7+dfsg+really2.9.14
# Debian deliberately strips the test/result corpus from its DFSG archive.
# Restore only exact upstream test fixtures, preserving newer Debian fixtures.
# These files are used only for testing and are not shipped in runtime packages.
tar -xJf /upstream-tests.tar.xz --strip-components=1 --skip-old-files libxml2-2.9.14/test libxml2-2.9.14/result
# Keep DHI3's exact nine upstream backports before adding the entity fix.
(cd /vendor-patches && sha256sum -c /vendor-patches.sha256) > /output/vendor-checksums.log
while read -r checksum filename; do
  cp "/vendor-patches/$filename" "debian/patches/$filename"
  printf '\n%s\n' "$filename" >> debian/patches/series
done < /vendor-patches.sha256
dpkg-source --before-build . > /output/vendor-apply.log 2>&1
patch --dry-run --fuzz=0 -p1 < /security.patch > /output/patch.log
cp /security.patch debian/patches/utilibre-CVE-2026-6653.patch
printf '\nutilibre-CVE-2026-6653.patch\n' >> debian/patches/series
# Genuine local package revision accompanies the actual rebuilt library.
{ printf 'libxml2 (2.12.7+dfsg+really2.9.14-2.1+deb13u3+utilibre1) trixie; urgency=high\n\n  * Preserve all nine DHI3 security patches from Docker catalog commit\n    4560b6ac143a58056b793efe2d6bcd5e92bf3682.\n  * Backport upstream entity-amplification fix using Ubuntu security patch\n    3df6dfb3e4528d6819b1d6f1cdf90d409bb86187 (CVE-2026-6653).\n\n -- Utilibre maintainers <admin@utilibre.org>  Sun, 11 Oct 2026 22:00:00 +0000\n\n'; cat debian/changelog; } > /work/changelog
mv /work/changelog debian/changelog
# Debian's generic test discovery does not see this out-of-tree build directory.
# Make the existing upstream regression suite an explicit native package gate.
printf '\noverride_dh_auto_test-arch:\n\t$(MAKE) -C builddir/main check\n' >> debian/rules
dpkg-buildpackage -B -us -uc -Pnopython > /output/build.log 2>&1
cp /work/libxml2_*utilibre1_amd64.deb /work/libxml2-utils_*utilibre1_amd64.deb /work/libxml2-dev_*utilibre1_amd64.deb /output/
mkdir /work/patched
dpkg-deb -x /output/libxml2_*utilibre1_amd64.deb /work/patched
dpkg-deb -x /output/libxml2-dev_*utilibre1_amd64.deb /work/patched
cc -O2 /abi.c -I/work/patched/usr/include/libxml2 -L/work/patched/usr/lib/x86_64-linux-gnu -lxml2 -o /output/new-abi-check
/output/new-abi-check layout > /output/new-layout.txt
cmp /output/old-layout.txt /output/new-layout.txt
nm -D --defined-only /work/patched/usr/lib/x86_64-linux-gnu/libxml2.so.2 | awk '{print $2,$3}' | sort > /output/new-symbols.txt
cmp /output/old-symbols.txt /output/new-symbols.txt
LD_LIBRARY_PATH=/work/patched/usr/lib/x86_64-linux-gnu /output/old-abi-check > /output/patched-old-abi-check.txt
LD_LIBRARY_PATH=/work/patched/usr/lib/x86_64-linux-gnu /output/new-abi-check > /output/patched-new-abi-check.txt
sha256sum /output/*utilibre1_amd64.deb > /output/SHA256SUMS
