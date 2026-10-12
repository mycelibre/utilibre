#!/bin/sh
set -eu
TASK=/var/lib/utilibre-maintenance/qga-native-followup-20261012
RECIPE=/home/ubuntu/freetools/deployment/maintenance/qga-native-followup
test "$(df -B1 --output=avail / | tail -1)" -ge 8589934592
node "$RECIPE/verify-source.mjs"
test ! -e "$TASK/build/SHA256SUMS"
mkdir -p "$TASK/build" "$TASK/work"
docker run -d --name maintenance-qga-native-20261012 --cpus 2 --memory 4g --memory-swap 4g \
 --pids-limit 256 --ulimit core=0 --log-driver none \
 --tmpfs /var/lib/apt/lists:rw,size=128m --tmpfs /var/cache/apt:rw,size=512m \
 --mount type=bind,src="$TASK/work",dst=/work \
 --mount type=bind,src="$TASK/inputs",dst=/inputs,readonly \
 --mount type=bind,src="$RECIPE",dst=/recipes,readonly \
 --mount type=bind,src="$TASK/build",dst=/output \
 --entrypoint sleep debian@sha256:a29215f6a35e51e22adffa17f89e9d2ef06214e64a2bad10d765c46aea49f11f infinity >/dev/null
trap 'code=$?; if test "$code" = 0; then docker rm -f -v maintenance-qga-native-20261012 >/dev/null; else echo "Isolated compiler retained for diagnosis; host agent untouched."; fi' EXIT
docker exec maintenance-qga-native-20261012 sh /recipes/inner.sh prepare > "$TASK/build/prepare.log" 2>&1
docker network disconnect bridge maintenance-qga-native-20261012
docker exec maintenance-qga-native-20261012 sh /recipes/inner.sh build > "$TASK/build/runner.log" 2>&1
test "$(df -B1 --output=avail / | tail -1)" -ge 8589934592
