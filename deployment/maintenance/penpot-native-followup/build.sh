#!/bin/sh
set -eu
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
TASK_ROOT=/var/lib/utilibre-maintenance/penpot-native-followup-20261012
# Build-only native Trixie base, before custom runtime packages. The live image
# cannot install distro -dev packages whose exact runtime Depends would downgrade
# our repaired libxml/Expat. Final candidates layer only on current live images.
BASE=sha256:8b822a4d33272059d4be9b6023246a449b7ae6c9a4faf931d7477f168c7623b8
test "$(df -B1 --output=avail / | tail -1)" -ge 12884901888
sh "$SCRIPT_DIR/acquire.sh"
mkdir -p "$TASK_ROOT/recipes"
cp "$SCRIPT_DIR/inner.sh" "$SCRIPT_DIR/rsvg-native.c" "$SCRIPT_DIR/entity-audit.c" "$TASK_ROOT/recipes/"
docker run --name maintenance-penpot-librsvg-native-build --cpus 2 --memory 7g \
  --pids-limit 256 --user 0 --entrypoint /bin/sh --log-driver none \
  --tmpfs /work:rw,exec,nosuid,size=5500m \
  --tmpfs /var/lib/apt/lists:rw,nosuid,noexec,size=240m \
  --tmpfs /var/cache/apt:rw,nosuid,noexec,size=240m \
  -v "$TASK_ROOT/recipes:/recipes:ro" -v "$TASK_ROOT/sources:/sources:ro" \
  -v "$TASK_ROOT/output:/output" "$BASE" -ec 'exec sh /recipes/inner.sh'
