#!/bin/sh
# Source-only acquisitions inside disposable containers, never host APT changes.
set -eu
umask 077
TASK=/var/lib/utilibre-maintenance/openssl-bookworm-followup-20261012
RECIPE=/home/ubuntu/freetools/deployment/maintenance/openssl-bookworm-followup
test "$(df -B1 --output=avail / | tail -1)" -ge 8589934592
mkdir -p "$TASK/ubuntu" "$TASK/bookworm"
docker run --rm --name maintenance-openssl-ubuntu-source --user 0 --cpus 1 --memory 512m --memory-swap 512m --pids-limit 64 --log-driver none \
 --tmpfs /var/lib/apt/lists:rw,size=128m --tmpfs /var/cache/apt:rw,size=128m \
 --mount type=bind,src="$RECIPE/ubuntu-review.list",dst=/etc/apt/sources.list.d/utilibre-review.list,readonly \
 --mount type=bind,src="$TASK/ubuntu",dst=/output \
 --entrypoint sh sha256:123ee629f394be73c61eda71d4974eb6aea92b2b234185c28015e1d670d112dc -ec \
 'apt-get update > /output/apt.log 2>&1; cd /output; apt-get source --download-only openssl=3.0.13-0ubuntu3.16 >> /output/apt.log 2>&1; apt-cache showsrc openssl > /output/source-index.txt; sha256sum ./*.dsc ./*.tar.* > /output/SHA256SUMS'
docker run --rm --name maintenance-openssl-bookworm-source --user 0 --cpus 1 --memory 512m --memory-swap 512m --pids-limit 64 --log-driver none \
 --tmpfs /var/lib/apt/lists:rw,size=128m --tmpfs /var/cache/apt:rw,size=128m \
 --mount type=bind,src="$RECIPE/bookworm-review.list",dst=/etc/apt/sources.list.d/utilibre-review.list,readonly \
 --mount type=bind,src="$TASK/bookworm",dst=/output \
 --entrypoint sh node@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 -ec \
 'apt-get update > /output/apt.log 2>&1; apt-get install -y --no-install-recommends ca-certificates >> /output/apt.log 2>&1; apt-get update -o APT::Update::Error-Mode=any >> /output/apt.log 2>&1; cd /output; apt-get source --download-only openssl=3.0.22-1~deb12u1 >> /output/apt.log 2>&1; apt-cache showsrc openssl > /output/source-index.txt; sha256sum ./*.dsc ./*.tar.* > /output/SHA256SUMS'
printf '%s\n' AUTHENTICATED_OPENSSL_SOURCE_ACQUIRED
