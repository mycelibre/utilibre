#!/bin/sh
# Disposable Trixie builder only. No privileged mounts, host devices or data.
set -eu
export DEBIAN_FRONTEND=noninteractive DEB_BUILD_OPTIONS=parallel=2
export DEBFULLNAME='Utilibre maintainers' DEBEMAIL=admin@utilibre.org
apt-get update -qq
apt-get install -y --no-install-recommends build-essential devscripts ca-certificates
cd /work
cp /source/util-linux_2.41.5-0+deb13u1.dsc /source/util-linux_2.41.5.orig.tar.xz /source/util-linux_2.41.5-0+deb13u1.debian.tar.xz .
printf '%s\n' \
 '43e9b2cbebd10fdc598c4ad10217c8202c28de53af6eafc892c8e9b5cbf3a3a5  util-linux_2.41.5-0+deb13u1.dsc' \
 'f586e35d320ff537aab3ffeca37e9ecd482ccbe013590db4429a414d8aa6a728  util-linux_2.41.5.orig.tar.xz' \
 '5b327ccd22f0f4ed28a389870aa51d04ecedb8693e52a1d122850f2b3188cbf6  util-linux_2.41.5-0+deb13u1.debian.tar.xz' | sha256sum -c -
dpkg-source -x util-linux_2.41.5-0+deb13u1.dsc
cd util-linux-2.41.5
apt-get build-dep -y --no-install-recommends --arch-only .
# Two other v2.41.6 source-pinning fixes are already in Debian's patch series.
# These five are the missing stable-branch commits, applied without edits.
printf '%s\n' \
 'cf12a53cd8bf86d729c14929ab00d589aa996b6479a42523c96cbbb5c1b817d1  /source/util-linux-43ec8a89f6c99130727084b3496a2ffd2b4200f0.patch' \
 '95a3ecfea9c019a7e68b86589f54cfdc6e5f938b9186d9e7a9cc7b10da96a9a3  /source/util-linux-4cccf4edc256507734e3484cfaedf5980945c2fa.patch' \
 '10da28197f417a69904370cc11135b8d4f5d1601ab0e2fe18f8e8e4d1246339a  /source/util-linux-71ff1c94be2fd2577bf600accb5c6ad2782276ef.patch' \
 '86dc6819c9465d829849734605cfe586404607fd7612f3f05ad5c829a33d0bb6  /source/util-linux-9fcb98bf08d9119d07ba3a3c709b1a85e4a1bbcb.patch' \
 '874e91ef452c086c94192eec0bf94b324a4e6c4b8f23bcc2e26fafe828edad91  /source/util-linux-a15c00a9e545aa8b9cf6ec0f888ff6c7b3eaeedc.patch' | sha256sum -c -
for commit in 43ec8a89f6c99130727084b3496a2ffd2b4200f0 4cccf4edc256507734e3484cfaedf5980945c2fa 71ff1c94be2fd2577bf600accb5c6ad2782276ef 9fcb98bf08d9119d07ba3a3c709b1a85e4a1bbcb a15c00a9e545aa8b9cf6ec0f888ff6c7b3eaeedc; do
 patch --dry-run --fuzz=0 -p1 < "/source/util-linux-$commit.patch" >> /output/patch.log
 cp "/source/util-linux-$commit.patch" "debian/patches/upstream/utilibre-$commit.patch"
 printf '\nupstream/utilibre-%s.patch\n' "$commit" >> debian/patches/series
 dpkg-source --before-build . >> /output/patch.log 2>&1
done
dch --local '+utilibre' 'Backport exact upstream stable-branch mount hook, pinned-path and nsenter descriptor repairs. Preserve the stable library ABI.'
test "$(dpkg-parsechangelog -SVersion)" = '2.41.5-0+deb13u1+utilibre1'
dpkg-query -W -f='${binary:Package}=${Version}\n' | sort > /output/build-packages.lock
dpkg-source -b . > /output/source-package.log 2>&1
dpkg-buildpackage -B -us -uc > /output/build.log 2>&1
# The packaging invokes --nonroot tests, which intentionally skip under root.
# Run them for real as nobody in this disposable, unprivileged container.
chown -R 65534:65534 /work/util-linux-2.41.5
runuser -u nobody -- ./tests/run.sh --nonroot --parallel=2 --show-diff > /output/native-suite.log 2>&1
cp /work/*_amd64.deb /work/util-linux_2.41.5.orig.tar.xz /work/util-linux_2.41.5-0+deb13u1+utilibre1.dsc /work/util-linux_2.41.5-0+deb13u1+utilibre1.debian.tar.xz /output/
sha256sum /output/*.deb /output/*.dsc /output/*.tar.* > /output/SHA256SUMS
echo NATIVE_UTIL_LINUX_BUILD_PASSED
