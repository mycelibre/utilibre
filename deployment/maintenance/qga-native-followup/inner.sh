#!/bin/sh
set -eu
export DEBIAN_FRONTEND=noninteractive PYTHONDONTWRITEBYTECODE=1
case "${1:-}" in
 prepare)
  apt-get update -qq
  apt-get install -y --no-install-recommends build-essential dpkg-dev python3 python3-venv python3-packaging meson ninja-build pkgconf libglib2.0-dev libudev-dev libnuma-dev liburing-dev zlib1g-dev flex bison ca-certificates socat
  cd /work
  dpkg-source -x /inputs/qemu_10.0.13+ds-0+deb13u1.dsc source
  dpkg-deb -x /inputs/qemu-guest-agent_10.0.13+ds-0+deb13u1_amd64.deb native
  dpkg-query -W -f='${binary:Package}=${Version}\n' | sort > /output/build-packages.lock
  test -z "$(dpkg --audit)"
  ;;
 build)
  cd /work/source
  patch --dry-run --batch --fuzz=0 -p1 -i /inputs/guest-agent-332ab334bc6b0b43bc17c90820fec068b63a666b.patch > /output/patch-dry-run.log
  test -z "$(grep -Ei 'offset|fuzz' /output/patch-dry-run.log || true)"
  patch --batch --fuzz=0 -p1 -i /inputs/guest-agent-332ab334bc6b0b43bc17c90820fec068b63a666b.patch > /output/patch.log
  mkdir /work/compiled
  chown -R 65534:65534 /work /output
  runuser -u nobody -- sh /recipes/inner.sh compile
  python3 /recipes/package.py
  sh /recipes/inner.sh check
  ;;
 compile)
  cd /work/compiled
  /work/source/configure --prefix=/usr --sysconfdir=/etc --libdir=/usr/lib/x86_64-linux-gnu --libexecdir=/usr/lib/qemu --localstatedir=/var --mandir=/usr/share/man \
   --with-pkgversion='Debian 1:10.0.13+ds-0+deb13u1+utilibre1' \
   --disable-download --disable-containers --disable-relocatable --disable-docs --disable-strip --disable-install-blobs \
   --disable-system --disable-user --enable-tools --enable-guest-agent --without-default-features \
   --enable-modules --enable-libudev --enable-numa --enable-linux-io-uring \
   --extra-cflags="$(dpkg-buildflags --get CFLAGS) $(dpkg-buildflags --get CPPFLAGS) -ffile-prefix-map=/work/source=. -ffile-prefix-map=/work/compiled=." \
   --extra-ldflags="$(dpkg-buildflags --get LDFLAGS) -Wl,--as-needed" > /output/configure.log 2>&1
  ninja -j2 > /output/compiler.log 2>&1
  meson test --suite unit --num-processes 2 --print-errorlogs > /output/unit.log 2>&1
  cp meson-logs/testlog.json /output/unit-tests.jsonl
  cp config-host.h /output/config-host.h
  ;;
 check)
  dpkg-query -W -f='${binary:Package}=${Version}\n' | sort > /output/build-packages.lock
  python3 /recipes/rpc-check.py /work/native/usr/sbin/qemu-ga /work/package/usr/sbin/qemu-ga /output/rpc.json
  sha256sum /output/*.deb > /output/SHA256SUMS
  ;;
 *) exit 2 ;;
esac
