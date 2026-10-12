#!/bin/sh
set -eu
TASK=/var/lib/utilibre-maintenance/closure-followup-20261012
RECIPE=/home/ubuntu/freetools/deployment/maintenance/closure-followup
test "$(df -B1 --output=avail / | tail -1)" -ge 8589934592
test ! -e "$TASK/wget-trixie/SHA256SUMS"
mkdir -p "$TASK/wget-trixie"
docker run -d --name maintenance-wget-build --cpus 1 --memory 2g --memory-swap 2g --pids-limit 128 --ulimit core=0 --log-driver none \
 --tmpfs /work:rw,exec,nosuid,nodev,size=768m \
 --tmpfs /var/lib/apt/lists:rw,size=128m --tmpfs /var/cache/apt:rw,size=128m \
 --mount type=bind,src="$TASK/sources",dst=/source,readonly \
 --mount type=bind,src="$RECIPE/wget-inner.sh",dst=/recipe.sh,readonly \
 --mount type=bind,src="$TASK/wget-trixie",dst=/output \
 --entrypoint sleep debian@sha256:a29215f6a35e51e22adffa17f89e9d2ef06214e64a2bad10d765c46aea49f11f infinity >/dev/null
trap 'docker rm -f -v maintenance-wget-build >/dev/null' EXIT
docker exec maintenance-wget-build sh /recipe.sh prepare > "$TASK/wget-trixie/prepare.log" 2>&1
docker network disconnect bridge maintenance-wget-build
docker exec maintenance-wget-build sh /recipe.sh build > "$TASK/wget-trixie/runner.log" 2>&1
