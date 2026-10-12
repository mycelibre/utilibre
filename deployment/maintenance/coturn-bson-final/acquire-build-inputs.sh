#!/bin/sh
# Disposable compiler only; production containers/config/credentials untouched.
set -eu
umask 077
task=/var/lib/utilibre-maintenance/coturn-bson-final-20261012
builder=maintenance-sudo-trixie-build
test "$(df -B1 --output=avail / | tail -1)" -ge 10737418240
mkdir -p "$task/input" "$task/output"
docker inspect "$builder" --format '{{.HostConfig.Memory}}' | awk '$1<=2147483648 && $1>0 {ok=1} END {exit !ok}'
docker exec "$builder" sh -ec 'test ! -e /work/coturn-bson-final; mkdir -p /work/coturn-bson-final/input /work/coturn-bson-final/output'
docker network connect bridge "$builder"
trap 'docker network disconnect bridge "$builder" || true' EXIT
docker exec "$builder" sh -ec '
 set -eu
 export DEBIAN_FRONTEND=noninteractive
 sed -i "s/^Types: deb$/Types: deb deb-src/" /etc/apt/sources.list.d/debian.sources
 apt-get -o APT::Update::Error-Mode=any update > /work/coturn-bson-final/output/apt-update.log 2>&1
 cd /work/coturn-bson-final/input
 apt-get source --download-only mongo-c-driver=1.30.4-1+deb13u3 > ../output/source-download.log 2>&1
 apt-cache showsrc mongo-c-driver > ../output/source-index.txt
 apt-get -y --no-install-recommends build-dep mongo-c-driver=1.30.4-1+deb13u3 > ../output/build-deps.log 2>&1
 apt-get -y --no-install-recommends install libmongoc-dev=1.30.4-1+deb13u3 libbson-dev=1.30.4-1+deb13u3 quilt > ../output/native-deps.log 2>&1
 mkdir ../output/apt-lists
 cp /var/lib/apt/lists/*InRelease ../output/apt-lists/
 for file in /var/lib/apt/lists/*Sources*; do cp "$file" ../output/apt-lists/; done
 cp /usr/share/keyrings/debian-archive-keyring.pgp ../output/
 dpkg-query -W -f="\${binary:Package}=\${Version}\n" | sort > ../output/build-packages.lock
 sha256sum ./* > ../output/input.sha256
'
docker network disconnect bridge "$builder"
trap - EXIT
docker cp "$builder:/work/coturn-bson-final/input/." "$task/input/"
docker cp "$builder:/work/coturn-bson-final/output/." "$task/output/"
printf '%s\n' 'Authenticated source/build dependencies acquired in isolated compiler only.'
