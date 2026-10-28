#!/bin/sh
# The source and patch are prepared with pinned pre/post hashes before this
# disconnected compiler starts. No dependency resolution or runtime changes.
set -eu
test "$(cmake --version | head -1)" = 'cmake version 3.31.6'
cp -a /input/source /work/source
printf '1.30.4\n' > /work/source/VERSION_CURRENT
export DEB_BUILD_MAINT_OPTIONS=hardening=+all
export CFLAGS="$(dpkg-buildflags --get CFLAGS) $(dpkg-buildflags --get CPPFLAGS)"
export LDFLAGS="$(dpkg-buildflags --get LDFLAGS) -lpthread"
cmake -S /work/source -B /work/build -DCMAKE_BUILD_TYPE=RelWithDebInfo \
 -DENABLE_AUTOMATIC_INIT_AND_CLEANUP=OFF -DENABLE_MONGOC=OFF \
 -DENABLE_TESTS=OFF -DENABLE_STATIC=OFF -DENABLE_SHARED=ON \
 -DENABLE_MAN_PAGES=OFF -DENABLE_HTML_DOCS=OFF -DENABLE_MAINTAINER_FLAGS=ON
cmake --build /work/build --target bson_shared --parallel 2
cp /work/build/src/libbson/libbson-1.0.so.0.0.0 /output/
cc -O2 -Wall -Wextra /recipe/bson-native.c \
 -I/work/source/src/libbson/src -I/work/build/src/libbson/src \
 -L/work/build/src/libbson -lbson-1.0 -o /output/bson-native
LD_LIBRARY_PATH=/work/build/src/libbson /output/bson-native after
sha256sum /output/libbson-1.0.so.0.0.0 /output/bson-native
