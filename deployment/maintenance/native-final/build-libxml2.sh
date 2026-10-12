#!/bin/sh
set -eu
TASK_ROOT=/var/lib/utilibre-maintenance/native-final
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
BASE=utilibre-penpot-backend:2.18.3-runtime-hardening-20261011
test "$(docker image inspect "$BASE" --format '{{.Id}}')" = sha256:8b822a4d33272059d4be9b6023246a449b7ae6c9a4faf931d7477f168c7623b8
test "$(df -B1 --output=avail / | tail -1)" -ge 9663676416
test -s "$TASK_ROOT/penpot-no-exr.json"
mkdir -p "$TASK_ROOT/libxml2-output" "$TASK_ROOT/libxml-dhi-patches"
# Preserve every patch in the deployed DHI3 package; do not regress those fixes.
while read -r checksum filename; do
  curl -fLsS --max-time 60 "https://raw.githubusercontent.com/docker-hardened-images/catalog/4560b6ac143a58056b793efe2d6bcd5e92bf3682/package/deb/main/libxml2/patch/$filename" -o "$TASK_ROOT/libxml-dhi-patches/$filename"
  echo "$checksum  $TASK_ROOT/libxml-dhi-patches/$filename" | sha256sum -c -
done < "$SCRIPT_DIR/libxml-dhi-patches.sha256"
curl -fLsS --max-time 60 'https://git.launchpad.net/ubuntu/+source/libxml2/plain/debian/patches/CVE-2026-6653.patch?id=3df6dfb3e4528d6819b1d6f1cdf90d409bb86187' -o "$TASK_ROOT/libxml2-CVE-2026-6653.patch"
echo "6c2b8a7b6fa470efcb1854e5c73bd7e1ae1663d8b111e27ce9232bbc1fe44f54  $TASK_ROOT/libxml2-CVE-2026-6653.patch" | sha256sum -c -
curl -fLsS --max-time 60 'https://download.gnome.org/sources/libxml2/2.9/libxml2-2.9.14.tar.xz' -o "$TASK_ROOT/libxml2-upstream-tests.tar.xz"
echo "60d74a257d1ccec0475e749cba2f21559e48139efba6ff28224357c7c798dfee  $TASK_ROOT/libxml2-upstream-tests.tar.xz" | sha256sum -c -
docker run --rm --name maintenance-libxml2-native-build --cpus 1 --memory 2g \
  --pids-limit 128 --user 0 --entrypoint /bin/sh \
  --tmpfs /work:rw,exec,nosuid,size=1200m \
  --tmpfs /var/lib/apt/lists:rw,nosuid,noexec,size=200m \
  --tmpfs /var/cache/apt:rw,nosuid,noexec,size=160m \
  -v "$SCRIPT_DIR/libxml2-build-inner.sh:/build.sh:ro" \
  -v "$SCRIPT_DIR/libxml2-old-abi.c:/abi.c:ro" \
  -v "$SCRIPT_DIR/libxml-rsvg.c:/rsvg.c:ro" \
  -v "$SCRIPT_DIR/libxml-dhi-patches.sha256:/vendor-patches.sha256:ro" \
  -v "$TASK_ROOT/libxml-dhi-patches:/vendor-patches:ro" \
  -v "$TASK_ROOT/libxml2-CVE-2026-6653.patch:/security.patch:ro" \
  -v "$TASK_ROOT/libxml2-upstream-tests.tar.xz:/upstream-tests.tar.xz:ro" \
  -v "$TASK_ROOT/libxml2-output:/output" "$BASE" -ec 'cp /build.sh /work/build.sh; exec /bin/sh /work/build.sh'
test "$(df -B1 --output=avail / | tail -1)" -ge 8589934592
