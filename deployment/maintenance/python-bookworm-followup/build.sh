#!/bin/sh
set -eu
TASK=/var/lib/utilibre-maintenance/python-bookworm-followup-20261012
RECIPE=/home/ubuntu/freetools/deployment/maintenance/python-bookworm-followup
test "$(df -B1 --output=avail / | tail -1)" -ge 8589934592
test ! -e "$TASK/build/SHA256SUMS"
mkdir -p "$TASK/build" "$TASK/work"
node "$RECIPE/verify-source.mjs"
cd "$TASK/sources"
printf '%s\n' \
 '49c0d6e1f0d3aeef542de2e908da11bcbcb9343654fb70b51fe4f80865c9dc92  python3.11_3.11.2-6+deb12u9.dsc' \
 'c40df926f2856785028b4a40478e90382b84e2c7b2d22e3b8e49e79377586627  python3.11_3.11.2-6+deb12u9.debian.tar.xz' \
 '2411c74bda5bbcfcddaf4531f66d1adc73f247f529aee981b029513aefdbf849  python3.11_3.11.2.orig.tar.gz' \
 'b5ad165baca0f2f2ac2a02b6b4b66d68ee890f582df398da9f86399679ca9c29  expat_2.9.0-1.dsc' \
 'd23e632b05f10e269ee5426ff1ea962b4aec17fcd179c4dec14390a6793da764  expat_2.9.0-1.debian.tar.xz' \
 '6e8ce7b52ebbaa423c59becc7cf1e6875c42e49228c062ac8123c10e700cec27  expat_2.9.0.orig.tar.gz' \
 '362704a609a85ae95ebd08b58fb31f1c3e7d3d4604f7421f35c9d1885ced5082  CVE-2026-7210.patch' | sha256sum -c -
docker run -d --name maintenance-python-bookworm-build --cpus 2 --memory 4g --memory-swap 4g \
 --pids-limit 256 --ulimit core=0 --log-driver none \
 --tmpfs /var/lib/apt/lists:rw,size=128m --tmpfs /var/cache/apt:rw,size=256m \
 --mount type=bind,src="$TASK/work",dst=/work \
 --mount type=bind,src="$TASK/sources",dst=/source,readonly \
 --mount type=bind,src="$RECIPE",dst=/recipes,readonly \
 --mount type=bind,src="$TASK/build",dst=/output \
 --entrypoint sleep node@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 infinity >/dev/null
trap 'code=$?; if test "$code" = 0; then docker rm -f -v maintenance-python-bookworm-build >/dev/null; else echo "Native isolated compiler retained for diagnosis; nothing deployed."; fi' EXIT
docker exec maintenance-python-bookworm-build sh /recipes/inner.sh prepare > "$TASK/build/prepare.log" 2>&1
docker network disconnect bridge maintenance-python-bookworm-build
docker exec maintenance-python-bookworm-build sh /recipes/inner.sh build > "$TASK/build/runner.log" 2>&1
test "$(df -B1 --output=avail / | tail -1)" -ge 8589934592
