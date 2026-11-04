#!/bin/sh
# Inside the dedicated unprivileged Trixie compiler only, with network none.
set -eu
test -f /.dockerenv
test "$(id -u)" = 65534
cd /work
test ! -e candidate
dpkg-source --no-check -x libmongocrypt_1.13.2-1+deb13u1.dsc candidate > /output/extract.log 2>&1
cp -a candidate baseline
for commit in 556bcb70b6efecb7f568d824b03469df3a3bc91a 8bc580ea69eea13a932197221edf72830fbc38a1; do
 git -C candidate apply --check "../$commit.patch"
 cp "$commit.patch" "candidate/debian/patches/utilibre-$commit.patch"
 printf '%s\n' "utilibre-$commit.patch" >> candidate/debian/patches/series
 # Baseline gets the unchanged upstream regression tests, never the repair.
 git -C baseline apply --include='test/*' "../$commit.patch"
done
cd candidate
dpkg-source --before-build . > /output/patch-application.log 2>&1
export DEBFULLNAME='Utilibre maintainers' DEBEMAIL=admin@utilibre.org
dch -b --newversion '1.13.2-1+deb13u1+utilibre1' --distribution trixie \
 'Backport exact upstream duplicate-masterKey and atomic KEK parse fixes; preserve Debian patches.'
export DEB_BUILD_OPTIONS='parallel=2'
dpkg-buildpackage -us -uc > /output/build.log 2>&1
# Debian skips native tests in its packaging. Build the baseline here, then
# run test-mongocrypt.sh offline in this same compiler before native verification.
cd /work/baseline
cmake -S . -B build -DBUILD_VERSION=1.13.2 -DUSE_SHARED_LIBBSON=ON \
 -DMONGOCRYPT_MONGOC_DIR=USE-SYSTEM -DMONGOCRYPT_DFP_DIR=USE-SYSTEM \
 -DENABLE_ONLINE_TESTS=OFF -DCMAKE_BUILD_TYPE=RelWithDebInfo > /output/baseline-build.log 2>&1
cmake --build build --target test-mongocrypt -j2 >> /output/baseline-build.log 2>&1
cp /work/*.deb /work/*utilibre1*.dsc /work/*utilibre1*.tar.xz /output/
printf '%s\n' MONGOCRYPT_BUILDS_COMPLETE
