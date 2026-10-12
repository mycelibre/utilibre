#!/bin/sh
# Isolated native Bookworm build. No production volumes or application changes.
set -eu
umask 077
TASK=/var/lib/utilibre-maintenance/bookworm-curl-followup-20261012
PRIOR=/var/lib/utilibre-maintenance/closure-followup-20261012
RECIPE=/home/ubuntu/freetools/deployment/maintenance/bookworm-curl-followup
COMPILER=maintenance-bookworm-curl-build
test "$(df -B1 --output=avail / | tail -1)" -ge 8589934592
test ! -e "$TASK/build/SHA256SUMS"
mkdir -p "$TASK/build"
chmod 777 "$TASK/build"
printf '%s  %s\n' f7ef3ae8a22e521f289803fe93543eb64c329b58aa73a9e224dfd915a2a5f4f7 "$PRIOR/sources/curl-8.22.0.tar.xz" \
 5c20c1b4eab8a991d1a4a543d36c96c56291bf36337452756796765506b8821c "$PRIOR/sources/curl_8.22.0-1.debian.tar.xz" | sha256sum -c -
test "$(sqv --keyring "$PRIOR/sources/curl-8.14.1/debian/upstream/signing-key.asc" --signature-file "$PRIOR/sources/curl-8.22.0.tar.xz.asc" "$PRIOR/sources/curl-8.22.0.tar.xz")" = 27EDEAF22F3ABCEB50DB9A125CC908FDB71E12C2
docker run -d --name "$COMPILER" --cpus 2 --memory 4g --memory-swap 4g --pids-limit 512 --log-driver none --ulimit core=0 \
 --tmpfs /work:rw,exec,nosuid,nodev,size=2500m,mode=1777 \
 --tmpfs /var/lib/apt/lists:rw,nosuid,nodev,size=128m \
 --tmpfs /var/cache/apt:rw,nosuid,nodev,size=256m \
 --mount type=bind,src="$PRIOR/sources",dst=/inputs,readonly \
 --mount type=bind,src="$PRIOR",dst=/prior,readonly \
 --mount type=bind,src="$RECIPE",dst=/recipe,readonly \
 --mount type=bind,src=/home/ubuntu/freetools/deployment/maintenance/closure-followup/curl-preserve-features.patch,dst=/preserve-features.patch,readonly \
 --mount type=bind,src="$TASK/build",dst=/output \
 --entrypoint sleep node@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 infinity >/dev/null
docker cp "$RECIPE/." "$COMPILER:/work/recipe"
# All dependency acquisition is signed native Bookworm APT, not sid binaries.
docker exec "$COMPILER" sh /work/recipe/inner.sh prepare > "$TASK/build/prepare.log" 2>&1
docker network disconnect bridge "$COMPILER"
docker exec "$COMPILER" sh /work/recipe/inner.sh build > "$TASK/build/runner.log" 2>&1
docker rm -f "$COMPILER" >/dev/null
chmod 700 "$TASK/build"
printf '%s\n' BOOKWORM_CURL_BUILD_AND_TESTS_PASSED
