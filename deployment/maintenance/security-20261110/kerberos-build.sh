#!/bin/sh
set -eu
umask 077
SUITE=$1
case "$SUITE" in
 bookworm) BASE=sha256:dffee2a31557ade04fbc579f44d466fb6d14419a4bc3a3440e64b3253ca5482b; NUMBER=12 ;;
 trixie) BASE=sha256:0aa7f81d9268988debf996645427f83e9e72dbc5f1030fa5ec080510edab9994; NUMBER=13 ;;
 *) exit 2 ;;
esac
ROOT=/var/lib/utilibre-maintenance/security-20261110/kerberos/$SUITE
RECIPE=/home/ubuntu/freetools/deployment/maintenance/security-20261110
NAME=utilibre-krb5-build-$SUITE-20261110
test "$(df -B1 --output=avail / | tail -1)" -ge 12884901888
test ! -e "$ROOT/output/SHA256SUMS"
mkdir -p "$ROOT/output"
CID=$(docker run -d --name "$NAME" --pull=never --network none --cpus 2 --memory 4g --memory-swap 4g --pids-limit 256 --log-driver none --ulimit core=0 \
 --tmpfs /work:rw,exec,nosuid,nodev,size=2500m,mode=1777 \
 --tmpfs /var/lib/apt/lists:rw,size=256m --tmpfs /var/cache/apt:rw,size=256m \
 --mount type=bind,src="$ROOT/candidate-source",dst=/source,readonly \
 --mount type=bind,src="$RECIPE",dst=/recipe,readonly \
 --mount type=bind,src="$ROOT/output",dst=/output \
 -e DEBIAN_SUITE_NUMBER="$NUMBER" -e DEBIAN_SUITE_NAME="$SUITE" \
 --entrypoint sleep "$BASE" infinity)
# Retain failed isolated builders for diagnosis; never remove unrelated state.
cleanup() { docker stop --time 10 "$CID" >/dev/null 2>&1 || :; }
trap cleanup EXIT HUP INT TERM
timeout 300 docker exec "$CID" sh /recipe/kerberos-inner.sh prepare-frozen > "$ROOT/output/prepare.log" 2>&1
timeout 1800 docker exec "$CID" sh /recipe/kerberos-inner.sh build > "$ROOT/output/runner.log" 2>&1
printf '%s\n' "Native $SUITE packages built; compatibility, application and release checks still required."
