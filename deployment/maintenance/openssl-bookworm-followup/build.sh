#!/bin/sh
set -eu
umask 077
TASK=/var/lib/utilibre-maintenance/openssl-bookworm-followup-20261012
RECIPE=/home/ubuntu/freetools/deployment/maintenance/openssl-bookworm-followup
COMPILER=maintenance-openssl-bookworm-build
test "$(df -B1 --output=avail / | tail -1)" -ge 8589934592
test ! -e "$TASK/build/SHA256SUMS"
mkdir -p "$TASK/build"
printf '%s  %s\n' \
 9eb196075ff65fed9512c743d5ccf918b77c3c637f6d518e4be550cf9065c655 "$TASK/bookworm/openssl_3.0.22-1~deb12u1.dsc" \
 08ee68527218d6d9a0fa4741ec8ffef47646cdcad0ed0822b84bf11677c66108 "$TASK/bookworm/openssl_3.0.22-1~deb12u1.debian.tar.xz" \
 67ebca7e50d17383028045486653492195b83db95f8558709701bb47b5c1ef81 "$TASK/bookworm/openssl_3.0.22.orig.tar.gz" \
 77893129922c917792dd187c2853fb36ce1c98597c442b42d8190252959b7f6c "$TASK/ubuntu/openssl_3.0.13-0ubuntu3.16.debian.tar.xz" | sha256sum -c -
docker run -d --name "$COMPILER" --cpus 2 --memory 7g --memory-swap 7g --pids-limit 256 --log-driver none --ulimit core=0 \
 --tmpfs /work:rw,exec,nosuid,nodev,size=5500m,mode=1777 \
 --tmpfs /var/lib/apt/lists:rw,size=128m --tmpfs /var/cache/apt:rw,size=192m \
 --mount type=bind,src="$TASK/bookworm",dst=/source,readonly \
 --mount type=bind,src="$TASK/ubuntu",dst=/ubuntu,readonly \
 --mount type=bind,src="$RECIPE",dst=/recipe,readonly \
 --mount type=bind,src="$TASK/build",dst=/output \
 --entrypoint sleep node@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 infinity >/dev/null
docker exec "$COMPILER" cp -a /recipe /work/recipe
docker exec "$COMPILER" sh /work/recipe/inner.sh prepare > "$TASK/build/prepare.log" 2>&1
docker network disconnect bridge "$COMPILER"
docker exec "$COMPILER" sh /work/recipe/inner.sh build > "$TASK/build/runner.log" 2>&1
docker rm -f "$COMPILER" >/dev/null
printf '%s\n' NATIVE_OPENSSL_BOOKWORM_BUILD_AND_TESTS_PASSED
