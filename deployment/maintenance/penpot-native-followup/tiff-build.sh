#!/bin/sh
set -eu
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
TASK_ROOT=/var/lib/utilibre-maintenance/penpot-native-followup-20261012
test "$(df -B1 --output=avail / | tail -1)" -ge 12884901888
sh "$SCRIPT_DIR/tiff-acquire.sh"
mkdir -p "$TASK_ROOT/tiff/recipes"
cp "$SCRIPT_DIR/tiff-inner.sh" "$SCRIPT_DIR/tiff-native.c" "$TASK_ROOT/tiff/recipes/"
docker run --name maintenance-penpot-tiff-native-build --cpus 1 --memory 2500m \
  --pids-limit 128 --user 0 --entrypoint /bin/sh --log-driver none \
  --tmpfs /work:rw,exec,nosuid,size=1000m \
  --tmpfs /var/lib/apt/lists:rw,nosuid,noexec,size=200m \
  --tmpfs /var/cache/apt:rw,nosuid,noexec,size=300m \
  -v "$TASK_ROOT/tiff/recipes:/recipes:ro" -v "$TASK_ROOT/tiff/sources:/sources:ro" \
  -v "$TASK_ROOT/tiff/output:/output" \
  sha256:8b822a4d33272059d4be9b6023246a449b7ae6c9a4faf931d7477f168c7623b8 \
  -ec 'exec sh /recipes/tiff-inner.sh'
