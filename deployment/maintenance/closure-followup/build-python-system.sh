#!/bin/sh
set -eu
TASK=/var/lib/utilibre-maintenance/closure-followup-20261012
RECIPE=/home/ubuntu/freetools/deployment/maintenance/closure-followup
test "$(df -B1 --output=avail / | tail -1)" -ge 8589934592
test ! -e "$TASK/python-system/build/SHA256SUMS"
mkdir -p "$TASK/python-system/build"
cd "$TASK/sources"
printf '%s\n' \
 'f4b1bfb3c79b5bb11b8d228a12504163b4c0dab4d679828d8f5f26b6cb6ab35d  Python-3.13.16.tar.xz' \
 '1cf592dd51de735ff73644743e8959fb16bd50714168855509b709fdeede8342  python3.13_3.13.15-1.debian.tar.xz' \
 '190d7f5e45f070c42a12f708fe417d6636cb45fae71175203168bb5c3695081b  libexpat1_2.9.0-1_amd64.deb' \
 '3300a594215607672236055c109974b6d8e90114f178edd76149e17d60323bb2  libexpat1-dev_2.9.0-1_amd64.deb' | sha256sum -c -
docker run -d --name maintenance-python-system-build --cpus 2 --memory 5g --memory-swap 5g \
 --pids-limit 256 --ulimit core=0 --log-driver none \
 --tmpfs /work:rw,exec,nosuid,nodev,size=3500m \
 --tmpfs /var/lib/apt/lists:rw,size=128m --tmpfs /var/cache/apt:rw,size=256m \
 --mount type=bind,src="$TASK/sources",dst=/source,readonly \
 --mount type=bind,src="$RECIPE/python-system-inner.sh",dst=/recipe.sh,readonly \
 --mount type=bind,src="$RECIPE",dst=/recipes,readonly \
 --mount type=bind,src="$TASK/python-system/build",dst=/output \
 --entrypoint sleep debian@sha256:a29215f6a35e51e22adffa17f89e9d2ef06214e64a2bad10d765c46aea49f11f infinity >/dev/null
trap 'code=$?; if test "$code" = 0; then docker rm -f -v maintenance-python-system-build >/dev/null; else echo "Build failed; isolated compiler retained for diagnosis, never deployed."; fi' EXIT
docker exec maintenance-python-system-build sh /recipe.sh prepare > "$TASK/python-system/build/prepare.log" 2>&1
docker network disconnect bridge maintenance-python-system-build
docker exec maintenance-python-system-build sh /recipe.sh build > "$TASK/python-system/build/runner.log" 2>&1
