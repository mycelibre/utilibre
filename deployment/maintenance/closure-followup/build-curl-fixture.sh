#!/bin/sh
set -eu
TASK=/var/lib/utilibre-maintenance/closure-followup-20261012
RECIPE=/home/ubuntu/freetools/deployment/maintenance/closure-followup
mkdir -p "$TASK/curl-fixture"
docker run --rm --network none --cpus 1 --memory 512m --log-driver none \
 --tmpfs /work:rw,exec,nosuid,nodev,size=128m \
 --mount type=bind,src="$TASK/sources/curl-8.22.0.tar.xz",dst=/source.tar.xz,readonly \
 --mount type=bind,src="$RECIPE/curl-native.c",dst=/fixture.c,readonly \
 --mount type=bind,src="$TASK/curl-fixture",dst=/output \
 --entrypoint sh utilibre-curl-native-builder:trixie-20261012 -ec '
 cd /work
 tar -xf /source.tar.xz curl-8.22.0/include
 cc -Wall -Wextra -Werror -O2 -I /work/curl-8.22.0/include /fixture.c -ldl -o /output/curl-native
 openssl req -x509 -newkey rsa:2048 -nodes -days 2 -keyout /output/key.pem -out /output/cert.pem -subj /CN=localhost -addext subjectAltName=DNS:localhost >/dev/null 2>&1
 chmod 600 /output/key.pem
 chmod 644 /output/cert.pem
 chmod 755 /output/curl-native
 sha256sum /output/curl-native
 '
