#!/bin/sh
# Isolated Bookworm compiler only, after authenticated acquisition and network
# disconnection. No production mounts, secrets or service control.
# Applies only the exact, checksum-pinned legacy metadata compatibility patch.
set -eu
test -f /.dockerenv
test "$(id -u)" = 65534
test ! -e /work/build
cd /work/source
printf '%s\n' '2e25abd12f90e9acec7e093a5ea254d3b5f744324aae2c2d65c526787598053f  libheif/compression_zlib.cc' '9fc1bb2cc0dd1b05c9eaf827a2d7e231e98018e764d588f82b0ff9093e8c4499  /work/heif-legacy-metadata.patch' | sha256sum -c -
patch --batch --fuzz=0 -p1 < /work/heif-legacy-metadata.patch
printf '%s\n' '3fa84e1a5f4ecffa76ec7474682874089cc9acc6524138fda9203ac8a700e948  libheif/compression_zlib.cc' | sha256sum -c -
export DEB_BUILD_MAINT_OPTIONS=hardening=+all
export CFLAGS="$(dpkg-buildflags --get CFLAGS) $(dpkg-buildflags --get CPPFLAGS)"
export CXXFLAGS="$(dpkg-buildflags --get CXXFLAGS) $(dpkg-buildflags --get CPPFLAGS)"
export LDFLAGS="$(dpkg-buildflags --get LDFLAGS)"
cmake -S . -B /work/build -DCMAKE_BUILD_TYPE=Release \
 -DCMAKE_INSTALL_PREFIX=/usr -DCMAKE_INSTALL_LIBDIR=lib/x86_64-linux-gnu \
 -DCMAKE_COMPILE_WARNING_AS_ERROR=OFF -DBUILD_SHARED_LIBS=ON \
 -DWITH_REDUCED_VISIBILITY=ON -DBUILD_TESTING=ON \
 -DWITH_EXAMPLES=OFF -DWITH_GDK_PIXBUF=OFF -DBUILD_DOCUMENTATION=OFF \
 -DENABLE_PLUGIN_LOADING=OFF -DWITH_UNCOMPRESSED_CODEC=OFF \
 -DWITH_LIBDE265=ON -DWITH_LIBDE265_PLUGIN=OFF \
 -DWITH_X265=ON -DWITH_X265_PLUGIN=OFF \
 -DWITH_DAV1D=ON -DWITH_DAV1D_PLUGIN=OFF \
 -DWITH_AOM_DECODER=ON -DWITH_AOM_DECODER_PLUGIN=OFF \
 -DWITH_AOM_ENCODER=ON -DWITH_AOM_ENCODER_PLUGIN=OFF \
 -DWITH_X264=OFF -DWITH_OpenH264_DECODER=OFF -DWITH_LIBSHARPYUV=OFF \
 -DWITH_HEADER_COMPRESSION=ON -DCMAKE_DISABLE_FIND_PACKAGE_Brotli=TRUE \
 > /output/configure.log 2>&1
cmake --build /work/build -j2 > /output/build.log 2>&1
set +e
ctest --test-dir /work/build --output-on-failure --timeout 45 -j1 \
 --output-junit /output/upstream-tests.xml > /output/upstream-tests.log 2>&1
result=$?
set -e
printf '%s\n' "$result" > /output/upstream-tests.exit
test "$result" -eq 0
DESTDIR=/work/install cmake --install /work/build > /output/install.log 2>&1
mkdir -p /output/package/DEBIAN /output/package/usr/lib/x86_64-linux-gnu \
 /output/package/usr/share/doc/libheif1
cp -a /work/install/usr/lib/x86_64-linux-gnu/libheif.so.* /output/package/usr/lib/x86_64-linux-gnu/
strip --strip-unneeded /output/package/usr/lib/x86_64-linux-gnu/libheif.so.1.23.7
cp debian/copyright /output/package/usr/share/doc/libheif1/copyright
printf '%s\n' 'Upstream 1.23.7, built on Debian Bookworm with the existing builtin HEVC/AV1 codecs and zlib metadata compression. One bounded legacy XMP compatibility correction; all upstream decompression limits retained. Complete recipe/source supplied by Utilibre.' > /output/package/usr/share/doc/libheif1/README.Utilibre
depends=$(dpkg-shlibdeps -O -e/output/package/usr/lib/x86_64-linux-gnu/libheif.so.1.23.7 | sed -n 's/^shlibs:Depends=//p')
test -n "$depends"
cat > /output/package/DEBIAN/control <<EOF
Package: libheif1
Source: libheif
Version: 1.23.7-0+utilibre1~deb12
Architecture: amd64
Section: libs
Priority: optional
Multi-Arch: same
Maintainer: Utilibre maintainers <admin@utilibre.org>
Depends: $depends
Homepage: https://github.com/strukturag/libheif
Description: HEIF and AVIF file format decoder and encoder - shared library
 Locally compiled upstream security release with existing builtin codecs.
EOF
printf '%s\n' 'activate-noawait ldconfig' > /output/package/DEBIAN/triggers
dpkg-deb --root-owner-group --build /output/package /output/libheif1_1.23.7-0+utilibre1~deb12_amd64.deb > /output/package.log 2>&1
dpkg-query -W -f='${binary:Package}=${Version}\n' | sort > /output/build-packages.lock
printf '%s\n' passed > /output/build-passed
