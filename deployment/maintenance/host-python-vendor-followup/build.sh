#!/bin/sh
set -eu
TASK=/var/lib/utilibre-maintenance/host-python-vendor-followup-20261012
RECIPE=/home/ubuntu/freetools/deployment/maintenance/host-python-vendor-followup
test "$(df -B1 --output=avail / | tail -1)" -ge 8589934592
test ! -e "$TASK/build/SHA256SUMS"
mkdir -p "$TASK/build"
node "$RECIPE/verify-source.mjs"
docker run -d --name maintenance-host-setuptools-build --cpus 2 --memory 3g --memory-swap 3g \
 --pids-limit 256 --ulimit core=0 --log-driver none \
 --tmpfs /work:rw,exec,nosuid,nodev,size=1500m \
 --tmpfs /var/lib/apt/lists:rw,size=128m --tmpfs /var/cache/apt:rw,size=256m \
 --mount type=bind,src="$TASK/sources",dst=/source,readonly \
 --mount type=bind,src="$RECIPE",dst=/recipes,readonly \
 --mount type=bind,src="$TASK/build",dst=/output \
 --entrypoint sleep debian@sha256:a29215f6a35e51e22adffa17f89e9d2ef06214e64a2bad10d765c46aea49f11f infinity >/dev/null
trap 'code=$?; if test "$code" = 0; then docker rm -f -v maintenance-host-setuptools-build >/dev/null; else echo "Isolated compiler retained for diagnosis; host untouched."; fi' EXIT
docker exec maintenance-host-setuptools-build sh /recipes/inner.sh prepare > "$TASK/build/prepare.log" 2>&1
docker network disconnect bridge maintenance-host-setuptools-build
docker exec maintenance-host-setuptools-build sh /recipes/inner.sh build > "$TASK/build/runner.log" 2>&1
test "$(df -B1 --output=avail / | tail -1)" -ge 8589934592
