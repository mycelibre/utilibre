#!/bin/sh
# Same-ABI native Debian source rebuild; download and compile are separate.
set -eu
umask 077
task=/var/lib/utilibre-maintenance/host-tools-20261112/python
builder=maintenance-python-31318-replay
case "${1:-}" in
 prepare)
  test ! -e "$task/replay-output/SHA256SUMS"
  image=sha256:53f0cb1d3d6a36a39290caedc32bfd4ddf6d4dcec26bd0476beb58bcf6c29c69
  # Frozen native build dependencies; no new package resolution during replay.
  test "$(docker image inspect --format '{{.Id}}' "$image")" = "$image"
  cd "$task/build"
  printf '%s\n' \
   'abb0102e6d4ae027509bcb82327d9dd85515b44a3ba8ad538cfc5e9847029f68  python3.13_3.13.18.orig.tar.xz' \
   '8f12d82b3cedd95970133622a48a3c3309a3ce8560e5c026d3438d3aecc8ef8b  python3.13_3.13.18-1.debian.tar.xz' \
   'b6ba67e05744b11615fb41390ef13aa1ca3035a5425909bcde46e053f4d77892  python3.13_3.13.18-1.dsc' | sha256sum -c -
  mkdir -p "$task/replay-output"
  docker run -d --name "$builder" --network none --cpus 2 --memory 5g --memory-swap 5g --pids-limit 256 \
    --ulimit core=0 --log-driver none --tmpfs /work:rw,exec,nosuid,nodev,size=3500m \
    -v "$task/build:/source:ro" -v "$task/replay-output:/output" --entrypoint sleep "$image" infinity >/dev/null
  docker exec -i "$builder" sh -s <<'SH'
set -eu
mkdir -p /work/vendor-source
cd /work/vendor-source
cp /source/python3.13_3.13.18.orig.tar.xz /source/python3.13_3.13.18.orig.tar.xz.asc /source/python3.13_3.13.18-1.dsc /source/python3.13_3.13.18-1.debian.tar.xz .
dpkg-source -x python3.13_3.13.18-1.dsc python-source
cd python-source
dpkg-checkbuilddeps -B
dpkg-query -W -f='${binary:Package}=${Version}\n' | sort > /output/build-packages.lock
SH
  ;;
 build)
  test "$(docker inspect --format '{{.HostConfig.NetworkMode}}' "$builder")" = none
  docker exec -i "$builder" sh -s <<'SH'
set -eu
export DEBFULLNAME='Utilibre maintainers' DEBEMAIL=admin@utilibre.org
export DEB_BUILD_OPTIONS='parallel=2 nopgo nolto nocheck'
cd /work/vendor-source/python-source
dch -b --newversion '3.13.18-1~deb13u1+utilibre1' --distribution trixie 'Native rebuild of Debian Python 3.13.18-1 for Trixie; existing system Expat retained.'
dpkg-checkbuilddeps -B
dpkg-source -b . > /output/vendor-source-package.log 2>&1
chown -R 65534:65534 /work/vendor-source /output
setpriv --reuid=65534 --regid=65534 --clear-groups env HOME=/work dpkg-buildpackage -B -us -uc > /output/vendor-build.log 2>&1
cd build-static
setpriv --reuid=65534 --regid=65534 --clear-groups env HOME=/work ./python -m test -j2 --timeout=180 test_json test_decimal test_datetime test_configparser test_codecs > /output/compatibility-tests.log 2>&1
cd /work/vendor-source
cp ./*.deb ./*.dsc ./*.tar.xz /output/
sha256sum /output/*.deb /output/*.dsc /output/*.tar.xz > /output/SHA256SUMS
SH
  ;;
 *) echo 'Use build-python.sh prepare|build; host installation is separate.' >&2; exit 2 ;;
esac
