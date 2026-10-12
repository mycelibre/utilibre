#!/bin/sh
set -eu
TASK_ROOT=/var/lib/utilibre-maintenance/penpot-native-followup-20261012
mkdir -p "$TASK_ROOT/sources" "$TASK_ROOT/output"
chmod 700 "$TASK_ROOT"
fetch() {
  name=$1 checksum=$2 url=$3
  if ! test -s "$TASK_ROOT/sources/$name"; then
    curl --fail --location --silent --show-error --retry 2 --max-time 180 "$url" -o "$TASK_ROOT/sources/$name"
  fi
  printf '%s  %s\n' "$checksum" "$TASK_ROOT/sources/$name" | sha256sum -c -
}
fetch librsvg-2.60.3.tar.xz ca7d206d37426147e92299a0e59acb5b5f1d8bd7da20ff23d7642885a89feab4 https://download.gnome.org/sources/librsvg/2.60/librsvg-2.60.3.tar.xz
fetch librsvg_2.60.0+dfsg-1.debian.tar.xz 58db12d59958016e3b114de74ebe137255da9a900593f0a9d5b3392709a7cbe7 https://deb.debian.org/debian/pool/main/libr/librsvg/librsvg_2.60.0+dfsg-1.debian.tar.xz
fetch rustc-1.89.0-x86_64-unknown-linux-gnu.tar.xz b42c254e1349df86bd40bc28fdf386172a1a46f2eeabe3c7a08a75cf1fb60e27 https://static.rust-lang.org/dist/rustc-1.89.0-x86_64-unknown-linux-gnu.tar.xz
fetch rust-std-1.89.0-x86_64-unknown-linux-gnu.tar.xz 2719470dcd78b3f97d78b978c8f85a1a58d84ff11b62558294621c01bca34d49 https://static.rust-lang.org/dist/rust-std-1.89.0-x86_64-unknown-linux-gnu.tar.xz
fetch cargo-1.89.0-x86_64-unknown-linux-gnu.tar.xz 99fc10be2aeedf2c23a484f217bfa76458494495a0eee33e280d3616bb08282d https://static.rust-lang.org/dist/cargo-1.89.0-x86_64-unknown-linux-gnu.tar.xz
fetch cargo-c-0.10.16-x86_64-unknown-linux-musl.tar.gz 4cfff0a2d599b6588e9bca4ec7d3c8fba57fd019914060f51174d04cc91f3ae4 https://github.com/lu-zero/cargo-c/releases/download/v0.10.16/cargo-c-x86_64-unknown-linux-musl.tar.gz
