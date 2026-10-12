#!/bin/sh
set -eu
RECIPE=/home/ubuntu/freetools/deployment/maintenance/xml-final
SHARED=/home/ubuntu/freetools/deployment/maintenance/native-final
ASSETS=/var/lib/utilibre-maintenance/native-final
OUT=/var/lib/utilibre-maintenance/xml-final-20261011/bookworm
BASE=node@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20
test "$(df -B1 --output=avail / | tail -1)" -ge 9234179686
mkdir -p "$OUT"
echo "6c2b8a7b6fa470efcb1854e5c73bd7e1ae1663d8b111e27ce9232bbc1fe44f54  $ASSETS/libxml2-CVE-2026-6653.patch" | sha256sum -c -
echo "60d74a257d1ccec0475e749cba2f21559e48139efba6ff28224357c7c798dfee  $ASSETS/libxml2-upstream-tests.tar.xz" | sha256sum -c -
docker run --rm --name maintenance-libxml2-bookworm-build --cpus 1 --memory 2g --memory-swap 2g --pids-limit 128 --log-driver none \
  --tmpfs /work:rw,exec,nosuid,nodev,size=1200m --tmpfs /var/lib/apt/lists:rw,nosuid,nodev,size=128m --tmpfs /var/cache/apt:rw,nosuid,nodev,size=192m \
  --mount type=bind,src="$RECIPE/bookworm-inner.sh",dst=/build.sh,readonly \
  --mount type=bind,src="$SHARED/libxml2-old-abi.c",dst=/abi.c,readonly \
  --mount type=bind,src="$SHARED/libxml-rsvg.c",dst=/rsvg.c,readonly \
  --mount type=bind,src="$ASSETS/libxml2-CVE-2026-6653.patch",dst=/security.patch,readonly \
  --mount type=bind,src="$ASSETS/libxml2-upstream-tests.tar.xz",dst=/upstream-tests.tar.xz,readonly \
  --mount type=bind,src="$OUT",dst=/output --entrypoint sh "$BASE" -ec 'sh /build.sh > /output/runner.log 2>&1'
test "$(df -B1 --output=avail / | tail -1)" -ge 8589934592
