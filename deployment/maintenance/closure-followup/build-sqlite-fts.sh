#!/bin/sh
set -eu
TASK=/var/lib/utilibre-maintenance/closure-followup-20261012
RECIPE=/home/ubuntu/freetools/deployment/maintenance/closure-followup
test "$(df -B1 --output=avail / | tail -1)" -ge 8589934592
test ! -e "$TASK/sqlite-fts-bookworm/SHA256SUMS"
test ! -e "$TASK/sqlite-fts-bookworm/build.json"
mkdir -p "$TASK/sqlite-fts-bookworm"
docker run --rm --name maintenance-sqlite-fts-build --cpus 1 --memory 2g --memory-swap 2g --pids-limit 128 --log-driver none \
 --tmpfs /work:rw,exec,nosuid,nodev,size=1100m \
 --tmpfs /var/lib/apt/lists:rw,nosuid,nodev,size=128m \
 --tmpfs /var/cache/apt:rw,nosuid,nodev,size=192m \
 --mount type=bind,src=/var/lib/utilibre-maintenance/sqlite-final-20261011,dst=/prior,readonly \
 --mount type=bind,src="$TASK/sources",dst=/source,readonly \
 --mount type=bind,src="$RECIPE/sqlite-fts-inner.sh",dst=/build.sh,readonly \
 --mount type=bind,src="$RECIPE",dst=/recipe,readonly \
 --mount type=bind,src="$TASK/sqlite-fts-bookworm",dst=/output \
 --entrypoint sh node@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 -ec 'sh /build.sh > /output/runner.log 2>&1'
