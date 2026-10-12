#!/bin/sh
set -eu
TASK=/var/lib/utilibre-maintenance/closure-followup-20261012
RECIPE=/home/ubuntu/freetools/deployment/maintenance/closure-followup
BASE=node@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20
test "$(df -B1 --output=avail / | tail -1)" -ge 8589934592
mkdir -p "$TASK/rsync-bookworm"
docker run --rm --name maintenance-rsync-bookworm-build --cpus 1 --memory 1g --memory-swap 1g --pids-limit 128 --log-driver none \
 --tmpfs /work:rw,exec,nosuid,nodev,size=512m \
 --tmpfs /var/lib/apt/lists:rw,nosuid,nodev,size=128m \
 --tmpfs /var/cache/apt:rw,nosuid,nodev,size=128m \
 --mount type=bind,src="$TASK/sources",dst=/source,readonly \
 --mount type=bind,src="$RECIPE/rsync-inner.sh",dst=/build.sh,readonly \
 --mount type=bind,src="$TASK/rsync-bookworm",dst=/output \
 --entrypoint sh "$BASE" -ec 'sh /build.sh > /output/runner.log 2>&1'
