#!/bin/sh
# Isolated native Bookworm build. No production volumes or application changes.
set -eu
umask 077
VERSION=8.22.0
TASK=/var/lib/utilibre-maintenance/bookworm-curl-followup-20261012
case "${1:-}" in "") ;; --oct28) VERSION=8.23.0; TASK=/var/lib/utilibre-maintenance/security-20261028/curl-bookworm ;; *) exit 2 ;; esac
PRIOR=/var/lib/utilibre-maintenance/closure-followup-20261012
SOURCE="$PRIOR/sources"
if [ "$VERSION" = 8.23.0 ]; then SOURCE=/var/lib/utilibre-maintenance/security-20261028/curl-source; fi
RECIPE=/home/ubuntu/freetools/deployment/maintenance/bookworm-curl-followup
COMPILER=maintenance-bookworm-curl-build
test "$(df -B1 --output=avail / | tail -1)" -ge 8589934592
test ! -e "$TASK/build/SHA256SUMS"
mkdir -p "$TASK/build"
chmod 777 "$TASK/build"
if [ "$VERSION" = 8.23.0 ]; then
 printf '%s  %s\n' 8dadd7d2536a314f982ad05a651b713f426bf7d02cc2c76cffb9796f2218e6c5 "$SOURCE/curl-8.23.0.tar.xz" 8f24b0c09bde25bb4c2fab6ec177336aa60ac73f737d5c06c93841241fa058d8 "$SOURCE/curl_8.23.0-1.debian.tar.xz" | sha256sum -c -
else
printf '%s  %s\n' f7ef3ae8a22e521f289803fe93543eb64c329b58aa73a9e224dfd915a2a5f4f7 "$PRIOR/sources/curl-8.22.0.tar.xz" \
 5c20c1b4eab8a991d1a4a543d36c96c56291bf36337452756796765506b8821c "$PRIOR/sources/curl_8.22.0-1.debian.tar.xz" | sha256sum -c -
fi
test "$(sqv --keyring "$PRIOR/sources/curl-8.14.1/debian/upstream/signing-key.asc" --signature-file "$SOURCE/curl-$VERSION.tar.xz.asc" "$SOURCE/curl-$VERSION.tar.xz")" = 27EDEAF22F3ABCEB50DB9A125CC908FDB71E12C2
docker run -d --name "$COMPILER" --cpus 2 --memory 4g --memory-swap 4g --pids-limit 512 --log-driver none --ulimit core=0 \
 --tmpfs /work:rw,exec,nosuid,nodev,size=2500m,mode=1777 \
 --tmpfs /var/lib/apt/lists:rw,nosuid,nodev,size=128m \
 --tmpfs /var/cache/apt:rw,nosuid,nodev,size=256m \
 --mount type=bind,src="$SOURCE",dst=/inputs,readonly \
 --mount type=bind,src="$PRIOR",dst=/prior,readonly \
 --mount type=bind,src="$RECIPE",dst=/recipe,readonly \
 --mount type=bind,src=/home/ubuntu/freetools/deployment/maintenance/closure-followup/curl-preserve-features.patch,dst=/preserve-features.patch,readonly \
 --mount type=bind,src="$TASK/build",dst=/output \
 -e UTILIBRE_CURL_VERSION="$VERSION" --entrypoint sleep node@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 infinity >/dev/null
docker exec "$COMPILER" sh -c 'mkdir -p /work/recipe && cp -a /recipe/. /work/recipe/'
# All dependency acquisition is signed native Bookworm APT, not sid binaries.
docker exec "$COMPILER" sh /work/recipe/inner.sh prepare > "$TASK/build/prepare.log" 2>&1
docker network disconnect bridge "$COMPILER"
docker exec "$COMPILER" sh /work/recipe/inner.sh build > "$TASK/build/runner.log" 2>&1
docker rm -f "$COMPILER" >/dev/null
chmod 700 "$TASK/build"
printf '%s\n' BOOKWORM_CURL_BUILD_AND_TESTS_PASSED
