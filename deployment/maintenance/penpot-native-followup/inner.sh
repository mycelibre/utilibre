#!/bin/sh
set -eu
unset LD_LIBRARY_PATH
export DEBIAN_FRONTEND=noninteractive CARGO_HOME=/work/cargo-cache CARGO_BUILD_JOBS=2
export CARGO_TARGET_DIR=/work/target CARGO_PROFILE_RELEASE_DEBUG=0
export CARGO_PROFILE_DEV_DEBUG=0 CARGO_INCREMENTAL=0
apt-get -qq update
apt-get -qqy --no-install-recommends install build-essential binutils pkg-config meson ninja-build \
  libcairo2-dev libdav1d-dev libfreetype-dev libglib2.0-dev libgdk-pixbuf-2.0-dev \
  libharfbuzz-dev libpango1.0-dev libxml2-dev librsvg2-dev fonts-dejavu-core \
  shared-mime-info ca-certificates > /output/build-dependencies.log 2>&1
dpkg-query -W -f='${binary:Package}=${Version}\n' | sort > /output/build-packages.lock
mkdir /work/toolchain
for component in rustc rust-std cargo; do
  tar -xJf /sources/$component-1.89.0-x86_64-unknown-linux-gnu.tar.xz -C /work
  /work/$component-1.89.0-x86_64-unknown-linux-gnu/install.sh --prefix=/work/toolchain --disable-ldconfig > /output/$component-install.log
done
tar -xzf /sources/cargo-c-0.10.16-x86_64-unknown-linux-musl.tar.gz -C /work/toolchain/bin
export PATH=/work/toolchain/bin:$PATH
rustc --version > /output/toolchain.txt
cargo --version >> /output/toolchain.txt
cargo cbuild --version >> /output/toolchain.txt
tar -xJf /sources/librsvg-2.60.3.tar.xz -C /work
cd /work/librsvg-2.60.3
tar -xJOf /sources/librsvg_2.60.0+dfsg-1.debian.tar.xz debian/patches/debian/Revert-ABI-breakage.patch > /output/debian-abi.patch
patch --fuzz=0 -p1 < /output/debian-abi.patch > /output/debian-abi-apply.log
save_source() {
  result=$?
  if test -f /work/build/meson-logs/testlog.json; then cp /work/build/meson-logs/testlog.json /work/build/meson-logs/testlog.txt /output/; fi
  tar -cJf /output/librsvg-2.60.3-vendored-source.tar.xz -C /work librsvg-2.60.3
  exit "$result"
}
trap save_source EXIT
sha256sum Cargo.lock > /output/cargo-lock.sha256
nm -D --defined-only /usr/lib/x86_64-linux-gnu/librsvg-2.so.2 | awk '{print $2,$3}' | sort > /output/old-symbols.txt
readelf -d /usr/lib/x86_64-linux-gnu/librsvg-2.so.2 > /output/old-dynamic.txt
cc -O2 -Wall /recipes/rsvg-native.c $(pkg-config --cflags --libs librsvg-2.0) -ldl -o /output/rsvg-native
cc -shared -fPIC -O2 -Wall /recipes/entity-audit.c $(pkg-config --cflags libxml-2.0) -ldl -o /output/entity-audit.so
mkdir -p .cargo
cargo vendor --locked vendor > .cargo/config.toml 2> /output/vendor.log
sha256sum -c /output/cargo-lock.sha256
mkdir -p /output/notices
find vendor -type f \( -iname 'license*' -o -iname 'copying*' -o -iname 'notice*' \) -exec cp --parents {} /output/notices/ \;
cp COPYING* /output/notices/
# All network-resolved inputs are retained; the compile and tests now use only
# the pinned lockfile and checked cached/vendored sources, not moving dependencies.
export CARGO_NET_OFFLINE=true
meson setup /work/build --prefix=/usr --libdir=lib/x86_64-linux-gnu --buildtype=release \
  -Ddefault_library=shared -Davif=enabled -Dpixbuf=enabled -Dpixbuf-loader=enabled \
  -Dintrospection=disabled -Dvala=disabled -Ddocs=disabled -Dtests=true > /output/configure.log 2>&1
meson compile -C /work/build -j 2 > /output/build.log 2>&1
meson test -C /work/build --num-processes 2 --print-errorlogs --timeout-multiplier 5 > /output/tests.log 2>&1
DESTDIR=/output/install meson install -C /work/build --no-rebuild > /output/install.log 2>&1
nm -D --defined-only /output/install/usr/lib/x86_64-linux-gnu/librsvg-2.so.2 | awk '{print $2,$3}' | sort > /output/new-symbols.txt
comm -23 /output/old-symbols.txt /output/new-symbols.txt > /output/missing-symbols.txt
test ! -s /output/missing-symbols.txt
readelf -d /output/install/usr/lib/x86_64-linux-gnu/librsvg-2.so.2 > /output/new-dynamic.txt
sha256sum /output/install/usr/lib/x86_64-linux-gnu/librsvg-2.so.2.60.3 > /output/SHA256SUMS
printf 'passed\n' > /output/build-passed
