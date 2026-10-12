#!/bin/sh
set -eu
TASK=/var/lib/utilibre-maintenance/sudo-followup-20261012
RECIPE=/home/ubuntu/freetools/deployment/maintenance/sudo-followup
case "${1:-}" in
 trixie) BASE=debian@sha256:a29215f6a35e51e22adffa17f89e9d2ef06214e64a2bad10d765c46aea49f11f ;;
 bookworm) BASE=node@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 ;;
 *) echo 'Usage: build.sh trixie|bookworm' >&2; exit 2 ;;
esac
SUITE=$1
test "$(df -B1 --output=avail / | tail -1)" -ge 10737418240
node "$RECIPE/verify-source.mjs"
test ! -e "$TASK/$SUITE/output/SHA256SUMS"
mkdir -p "$TASK/$SUITE/output" "$TASK/$SUITE/work"
docker run -d --name "maintenance-sudo-$SUITE-build" --cpus 2 --memory 2g --memory-swap 2g \
 --pids-limit 128 --ulimit core=0 --log-driver none \
 --tmpfs /var/lib/apt/lists:rw,size=128m --tmpfs /var/cache/apt:rw,size=256m \
 --mount "type=bind,src=$TASK/$SUITE/work,dst=/work" \
 --mount "type=bind,src=$TASK/sources,dst=/source,readonly" \
 --mount "type=bind,src=$RECIPE,dst=/recipes,readonly" \
 --mount "type=bind,src=$TASK/$SUITE/output,dst=/output" \
 --entrypoint sleep "$BASE" infinity >/dev/null
docker exec "maintenance-sudo-$SUITE-build" sh /recipes/inner.sh "$SUITE" prepare > "$TASK/$SUITE/output/prepare.log" 2>&1
docker network disconnect bridge "maintenance-sudo-$SUITE-build"
docker exec "maintenance-sudo-$SUITE-build" sh /recipes/inner.sh "$SUITE" build > "$TASK/$SUITE/output/runner.log" 2>&1
test "$(df -B1 --output=avail / | tail -1)" -ge 8589934592
printf 'Native sudo candidate built; isolated compiler retained for checks; production untouched.\n'
