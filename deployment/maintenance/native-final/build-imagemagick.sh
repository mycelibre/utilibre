#!/bin/sh
set -eu
# Disposable native build: one CPU, 2 GiB total; source/build tree in tmpfs.
TASK_ROOT=/var/lib/utilibre-maintenance/native-final
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
BASE=utilibre-penpot-backend:2.18.3-runtime-hardening-20261011
test "$(docker image inspect "$BASE" --format '{{.Id}}')" = sha256:8b822a4d33272059d4be9b6023246a449b7ae6c9a4faf931d7477f168c7623b8
test "$(df -B1 --output=avail / | tail -1)" -ge 8589934592
mkdir -p "$TASK_ROOT/imagemagick-output"
if ! test -s "$TASK_ROOT/imagemagick-7.1.2-27.tar.gz"; then
  curl -fL --max-time 120 https://github.com/ImageMagick/ImageMagick/archive/refs/tags/7.1.2-27.tar.gz -o "$TASK_ROOT/imagemagick-7.1.2-27.tar.gz"
fi
echo "485dad5226fda2417ea65f3eb6e3f63e7d5dfacacdf6f57f9c39b6ef1e3cb667  $TASK_ROOT/imagemagick-7.1.2-27.tar.gz" | sha256sum -c -
docker run --rm --name maintenance-imagemagick-native-build --cpus 1 --memory 2g \
  --pids-limit 128 --user 0 --entrypoint /bin/sh \
  --tmpfs /work:rw,exec,nosuid,size=1400m \
  --tmpfs /var/lib/apt/lists:rw,nosuid,noexec,size=160m \
  --tmpfs /var/cache/apt:rw,nosuid,noexec,size=160m \
  -v "$SCRIPT_DIR/imagemagick-build-inner.sh:/build.sh:ro" \
  -v "$TASK_ROOT/imagemagick-7.1.2-27.tar.gz:/source.tar.gz:ro" \
  -v "$TASK_ROOT/imagemagick-output:/output" "$BASE" /build.sh
test "$(df -B1 --output=avail / | tail -1)" -ge 8589934592
