#!/bin/sh
# Build the existing stable package with the upstream stable-branch repairs.
# Never run the inner recipe on the VM package set.
set -eu
TASK=/var/lib/utilibre-maintenance/closure-followup-20261012
RECIPE=/home/ubuntu/freetools/deployment/maintenance/closure-followup
BASE=debian@sha256:a29215f6a35e51e22adffa17f89e9d2ef06214e64a2bad10d765c46aea49f11f
test "$(df -B1 --output=avail / | tail -1)" -ge 8589934592
mkdir -p "$TASK/util-linux-trixie"
docker run --rm --name maintenance-util-linux-trixie-build --cpus 2 --memory 3g --memory-swap 3g --pids-limit 192 --log-driver none \
 --tmpfs /work:rw,exec,nosuid,nodev,size=1536m \
 --tmpfs /var/lib/apt/lists:rw,nosuid,nodev,size=128m \
 --tmpfs /var/cache/apt:rw,nosuid,nodev,size=256m \
 --mount type=bind,src="$TASK/sources",dst=/source,readonly \
 --mount type=bind,src="$RECIPE/util-linux-inner.sh",dst=/build.sh,readonly \
 --mount type=bind,src="$RECIPE",dst=/recipe,readonly \
 --mount type=bind,src="$TASK/util-linux-trixie",dst=/output \
 --entrypoint sh "$BASE" -ec 'sh /build.sh > /output/runner.log 2>&1'
