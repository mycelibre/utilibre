#!/bin/sh
set -eu
TASK=/var/lib/utilibre-maintenance/host-cryptography-followup-20261012
RECIPE=/home/ubuntu/freetools/deployment/maintenance/host-cryptography-followup
test "$(df -B1 --output=avail / | tail -1)" -ge 8589934592
test ! -e "$TASK/build/SHA256SUMS"
mkdir -p "$TASK/build" "$TASK/work"
node "$RECIPE/verify-source.mjs"
docker run -d --name maintenance-host-cryptography-build --cpus 2 --memory 4g --memory-swap 4g \
 --pids-limit 256 --ulimit core=0 --log-driver none \
 --tmpfs /var/lib/apt/lists:rw,size=128m --tmpfs /var/cache/apt:rw,size=768m \
 --mount type=bind,src="$TASK/work",dst=/work \
 --mount type=bind,src="$TASK/sources",dst=/source,readonly \
 --mount type=bind,src="$RECIPE",dst=/recipes,readonly \
 --mount type=bind,src="$TASK/build",dst=/output \
 --entrypoint sleep debian@sha256:a29215f6a35e51e22adffa17f89e9d2ef06214e64a2bad10d765c46aea49f11f infinity >/dev/null
trap 'code=$?; if test "$code" = 0; then docker rm -f -v maintenance-host-cryptography-build >/dev/null; else echo "Isolated compiler retained for diagnosis; host untouched."; fi' EXIT
docker exec maintenance-host-cryptography-build sh /recipes/inner.sh prepare > "$TASK/build/prepare.log" 2>&1
docker network disconnect bridge maintenance-host-cryptography-build
docker exec maintenance-host-cryptography-build sh /recipes/inner.sh build > "$TASK/build/runner.log" 2>&1
test "$(df -B1 --output=avail / | tail -1)" -ge 8589934592
