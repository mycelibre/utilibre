#!/bin/sh
set -eu
cd /work
printf '%s\n' \
  'ce85a947bb8b3c0204dbeff79aec39bcb46371c6fafb64ba5b8726c71e038d5f  /inputs/glib-2.86.5.tar.xz' \
  '4c8234794e8d92d12dced8d9d74725aa6a2cc2b80fac106e0c69b3d743d8b176  /inputs/glib-parser-assertions.patch' \
  '107db223dcb3d4c1b937c3f4ff55e92267d04bb1ba835c2f43d932a7e79246ad  /inputs/glib-node-nesting.patch' | sha256sum -c -
tar -xJf /inputs/glib-2.86.5.tar.xz
cd glib-2.86.5
git apply --check /inputs/glib-parser-assertions.patch
git apply /inputs/glib-parser-assertions.patch
git apply --check /inputs/glib-node-nesting.patch
git apply /inputs/glib-node-nesting.patch
apk list --installed > /output/compiler-packages.lock
meson setup /work/build --prefix=/usr --libdir=lib --buildtype=release \
  --wrap-mode=nodownload -Ddefault_library=shared -Dman-pages=disabled \
  -Dintrospection=disabled -Dlibmount=enabled -Dnls=enabled -Dtests=true \
  > /output/glib-configure.log 2>&1
ninja -C /work/build -j2 gio/libgio-2.0.so.0.8600.5 \
  gio/tests/gdbus-introspection gio/tests/gdbus-testserver > /output/glib-compile.log 2>&1
# Upstream tests include the original five malformed XML regression vectors.
meson test -C /work/build --no-rebuild --print-errorlogs gdbus-introspection \
  > /output/glib-upstream-tests.log 2>&1
cp /work/build/meson-logs/testlog.json /output/glib-upstream-testlog.json
cp /work/build/gio/libgio-2.0.so.0.8600.5 /output/
nm -D --defined-only /output/libgio-2.0.so.0.8600.5 | awk '{print $3}' | sort > /output/gio-symbols.txt
readelf -d /output/libgio-2.0.so.0.8600.5 > /output/gio-dynamic.txt
sha256sum /output/libgio-2.0.so.0.8600.5 > /output/gio.sha256
