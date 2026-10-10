#!/bin/sh
set -eu
src=/opt/utilibre/community-src/kill-the-newsletter-2.1.3
repo=/home/ubuntu/freetools
# Apply only on the pinned clean checkout; git apply --check prevents duplicate application.
if git -C "$src" apply --check "$repo/deployment/newsletters/operator-copy.patch" 2>/dev/null; then
  git -C "$src" apply "$repo/deployment/newsletters/operator-copy.patch"
elif ! git -C "$src" apply --reverse --check "$repo/deployment/newsletters/operator-copy.patch" 2>/dev/null; then
  printf '%s\n' 'Source differs from the reviewed patch; use the pinned clean checkout.' >&2
  exit 1
fi
test "$(git -C "$src" rev-parse HEAD)" = c2d7cf8f7d9927fd19a36ea9beaf0ced67afcefc
docker build -f "$repo/deployment/newsletters/Dockerfile" -t utilibre-newsletters:2.1.3-p2 "$src"
container=$(docker create utilibre-newsletters:2.1.3-p2)
trap 'docker rm "$container" >/dev/null' EXIT
docker cp "$container:/app/build/static/." /opt/utilibre/newsletters/assets/
