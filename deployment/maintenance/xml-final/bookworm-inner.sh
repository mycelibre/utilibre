#!/bin/sh
# Exact Bookworm source, native Bookworm flags/ABI. No Trixie/DHI binaries.
set -eu
export DEBIAN_FRONTEND=noninteractive DEB_BUILD_PROFILES=nopython DEB_BUILD_OPTIONS=parallel=1
printf '%s\n' 'deb-src [signed-by=/usr/share/keyrings/debian-archive-keyring.gpg] http://deb.debian.org/debian bookworm main' > /etc/apt/sources.list.d/utilibre-source.list
apt-get update -qq
apt-get install -y --no-install-recommends build-essential debhelper libicu-dev liblzma-dev zlib1g-dev pkg-config rename libxml2-dev debian-keyring gpgv patch
cd /work
apt-get source --download-only libxml2=2.9.14+dfsg-1.3~deb12u6
echo 'd86ce3efb1b75d2781f72f5cdd187474c148a915d610295c85162681bb070a65  libxml2_2.9.14+dfsg-1.3~deb12u6.dsc' | sha256sum -c -
echo '4fe913dec8b1ab89d13b489b419a8203176ea39e931eaa0d25b17eafb9c279e9  libxml2_2.9.14+dfsg.orig.tar.xz' | sha256sum -c -
echo 'f33a99a0018cbb94aadc3bf26661e401cb90dff856aa170faf7239151ee9b9ac  libxml2_2.9.14+dfsg-1.3~deb12u6.debian.tar.xz' | sha256sum -c -
gpgv --keyring /usr/share/keyrings/debian-keyring.gpg libxml2_2.9.14+dfsg-1.3~deb12u6.dsc
dpkg-source -x libxml2_2.9.14+dfsg-1.3~deb12u6.dsc
cc -O2 /abi.c $(pkg-config --cflags --libs libxml-2.0) -o /output/old-abi-check
cc -O2 /rsvg.c -ldl -o /output/rsvg-check
/output/old-abi-check layout > /output/old-layout.txt
/output/old-abi-check > /output/old-native-check.txt
nm -D --defined-only /usr/lib/x86_64-linux-gnu/libxml2.so.2 | awk '{print $2,$3}' | sort > /output/old-symbols.txt
dpkg-query -W -f='${binary:Package}=${Version}\n' | sort > /output/build-packages.lock
cd /work/libxml2-2.9.14+dfsg
cp debian/rules /output/debian-rules.original
REVISION=1
if [ "${UTILIBRE_XML_FOLLOWUP:-0}" = 1 ]; then
  REVISION=2
  (cd /vendor-patches && sha256sum -c /vendor-patches.sha256) > /output/vendor-checksums.log
  while read -r checksum filename; do
    # Native Bookworm source, with the same reviewed upstream backports; no
    # newer-distribution library or compiler ABI is copied into the image.
    patch --dry-run --fuzz=0 -p1 < "/vendor-patches/$filename" >> /output/vendor-apply.log
    cp "/vendor-patches/$filename" "debian/patches/$filename"
    printf '\n%s\n' "$filename" >> debian/patches/series
    dpkg-source --before-build . >> /output/vendor-apply.log 2>&1
  done < /vendor-patches.sha256
fi
patch --dry-run --fuzz=0 -p1 < /security.patch > /output/patch.log
cp /security.patch debian/patches/utilibre-CVE-2026-6653.patch
printf '\nutilibre-CVE-2026-6653.patch\n' >> debian/patches/series
{ printf 'libxml2 (2.9.14+dfsg-1.3~deb12u6+utilibre1) bookworm; urgency=high\n\n  * Preserve Debian Bookworm security patches and build flags.\n  * Backport upstream entity-amplification fix using Ubuntu security patch\n    3df6dfb3e4528d6819b1d6f1cdf90d409bb86187 (CVE-2026-6653).\n\n -- Utilibre maintainers <admin@utilibre.org>  Sun, 11 Oct 2026 23:00:00 +0000\n\n'; cat debian/changelog; } > /work/changelog
mv /work/changelog debian/changelog
if [ "$REVISION" = 2 ]; then
  sed -i '1s/+utilibre1/+utilibre2/' debian/changelog
  sed -i '3a\  * Apply the nine checksum-pinned upstream DHI libxml2 backports.\n' debian/changelog
fi
printf '\noverride_dh_auto_test-arch:\n\t$(MAKE) -C builddir/main check\n' >> debian/rules
dpkg-source --before-build .
# Publish only the original DFSG source + exact patches, not excluded test data.
dpkg-source -b . > /output/source-package.log 2>&1
cp /work/libxml2_2.9.14+dfsg.orig.tar.xz /work/libxml2_2.9.14+dfsg-1.3~deb12u6.dsc /work/libxml2_2.9.14+dfsg-1.3~deb12u6.debian.tar.xz /output/
cp /work/libxml2_2.9.14+dfsg-1.3~deb12u6+utilibre${REVISION}.dsc /work/libxml2_2.9.14+dfsg-1.3~deb12u6+utilibre${REVISION}.debian.tar.xz /output/
# Restore only the exact upstream test corpus for this disposable build.
tar -xJf /upstream-tests.tar.xz --strip-components=1 --skip-old-files libxml2-2.9.14/test libxml2-2.9.14/result
dpkg-buildpackage -B -us -uc -Pnopython > /output/build.log 2>&1
cp /work/libxml2_*utilibre${REVISION}_amd64.deb /work/libxml2-utils_*utilibre${REVISION}_amd64.deb /work/libxml2-dev_*utilibre${REVISION}_amd64.deb /output/
mkdir /work/patched
dpkg-deb -x /output/libxml2_2.9.14+dfsg-1.3~deb12u6+utilibre${REVISION}_amd64.deb /work/patched
dpkg-deb -x /output/libxml2-dev_2.9.14+dfsg-1.3~deb12u6+utilibre${REVISION}_amd64.deb /work/patched
cc -O2 /abi.c -I/work/patched/usr/include/libxml2 -L/work/patched/usr/lib/x86_64-linux-gnu -lxml2 -o /output/new-abi-check
/output/new-abi-check layout > /output/new-layout.txt
cmp /output/old-layout.txt /output/new-layout.txt
nm -D --defined-only /work/patched/usr/lib/x86_64-linux-gnu/libxml2.so.2 | awk '{print $2,$3}' | sort > /output/new-symbols.txt
cmp /output/old-symbols.txt /output/new-symbols.txt
LD_LIBRARY_PATH=/work/patched/usr/lib/x86_64-linux-gnu /output/old-abi-check > /output/patched-old-abi-check.txt
LD_LIBRARY_PATH=/work/patched/usr/lib/x86_64-linux-gnu /output/new-abi-check > /output/patched-new-abi-check.txt
sha256sum /output/*utilibre${REVISION}_amd64.deb /output/*.dsc /output/*.tar.xz > /output/SHA256SUMS
printf '%s\n' BUILD_AND_NATIVE_GATES_PASSED
