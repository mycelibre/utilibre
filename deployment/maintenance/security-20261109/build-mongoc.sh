#!/bin/sh
# Offline build of the existing source plus two exact upstream cursor fixes.
set -eu
test "$(cmake --version | head -1)" = 'cmake version 3.31.6'
cp -a /input/source /work/source
cd /work/source
patch --batch --dry-run --fuzz=0 -p1 < /recipe/mongoc-9e5423f88208.patch
patch --batch --fuzz=0 -p1 < /recipe/mongoc-9e5423f88208.patch
patch --batch --dry-run --fuzz=0 -p1 < /recipe/mongoc-4fdc5d553801.patch
patch --batch --fuzz=0 -p1 < /recipe/mongoc-4fdc5d553801.patch
printf '1.30.4\n' > VERSION_CURRENT
export DEB_BUILD_MAINT_OPTIONS=hardening=+all
export CFLAGS="$(dpkg-buildflags --get CFLAGS) $(dpkg-buildflags --get CPPFLAGS)"
export LDFLAGS="$(dpkg-buildflags --get LDFLAGS)"
cmake -S . -B /work/build -DCMAKE_BUILD_TYPE=RelWithDebInfo -DCMAKE_SKIP_RPATH=ON \
 -DENABLE_AUTOMATIC_INIT_AND_CLEANUP=OFF -DENABLE_MONGOC=ON \
 -DENABLE_TESTS=OFF -DENABLE_STATIC=OFF -DENABLE_SHARED=ON \
 -DENABLE_MAN_PAGES=OFF -DENABLE_HTML_DOCS=OFF -DENABLE_MAINTAINER_FLAGS=ON \
 -DENABLE_ZLIB=SYSTEM -DUSE_BUNDLED_UTF8PROC=OFF
cmake --build /work/build --target mongoc_shared --parallel 2
cp /work/build/src/libmongoc/libmongoc-1.0.so.0.0.0 /output/
# Reuse the exact retained ordinary consumer compiled against the old headers.
cp /ordinary-binary/mongo-native /output/mongo-native
sha256sum src/libmongoc/src/mongoc/mongoc-cursor.c /output/libmongoc-1.0.so.0.0.0 /output/mongo-native
