#!/bin/sh
set -eu
TASK=/var/lib/utilibre-maintenance/xlib-followup-20261012
RECIPE=/home/ubuntu/freetools/deployment/maintenance/xlib-followup
case "$1" in
 trixie) IMAGE=debian@sha256:a29215f6a35e51e22adffa17f89e9d2ef06214e64a2bad10d765c46aea49f11f; VARIANTS='trixie dhi';;
 bookworm) IMAGE=node@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20; VARIANTS=bookworm;;
 *) exit 2;;
esac
NAME=maintenance-xlib-build-$1
test "$(df -B1 --output=avail / | tail -1)" -ge 8589934592
test -e "$TASK/prepared.json"
mkdir -p "$TASK/build/$1"
docker run -d --name "$NAME" --cpus 2 --memory 4g --memory-swap 4g \
 --pids-limit 256 --ulimit core=0 --log-driver none \
 --tmpfs /var/lib/apt/lists:rw,size=128m --tmpfs /var/cache/apt:rw,size=512m \
 --mount type=bind,src="$TASK/work",dst=/work \
 --mount type=bind,src="$RECIPE",dst=/recipes,readonly \
 --mount type=bind,src="$TASK/build/$1",dst=/output \
 --entrypoint sleep "$IMAGE" infinity >/dev/null
trap 'code=$?; if test "$code" = 0; then docker rm -f -v "$NAME" >/dev/null; else echo "Isolated build retained for diagnosis; nothing deployed."; fi' EXIT
docker exec "$NAME" sh /recipes/inner.sh prepare > "$TASK/build/$1/prepare.log" 2>&1
docker network disconnect bridge "$NAME"
docker exec "$NAME" sh /recipes/inner.sh build "$VARIANTS" > "$TASK/build/$1/runner.log" 2>&1
test "$(df -B1 --output=avail / | tail -1)" -ge 8589934592
