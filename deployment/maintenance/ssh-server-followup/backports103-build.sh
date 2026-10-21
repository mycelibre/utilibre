#!/bin/sh
set -eu
test -f /.dockerenv
test "$(stat -f -c %T /build)" = tmpfs
test ! -e /output/build-completed.json
export DEB_BUILD_OPTIONS=parallel=2 EDITOR=true
cp -a /input/. /build/
cd /build/openssh-10.3p1
test "$(dpkg-parsechangelog -SVersion)" = '1:10.3p1-1~bpo13+1+utilibre1'
dpkg-checkbuilddeps
dpkg-source --commit . utilibre-reviewed-repairs.patch
dpkg-source --build .
dpkg-buildpackage -us -uc -b
cd /build
for p in openssh-client openssh-server openssh-sftp-server; do
 cp "${p}_10.3p1-1~bpo13+1+utilibre1_amd64.deb" /output/
done
cp openssh_10.3p1-1~bpo13+1+utilibre1.dsc openssh_10.3p1-1~bpo13+1+utilibre1.debian.tar.xz openssh_10.3p1.orig.tar.gz openssh_10.3p1.orig.tar.gz.asc /output/
dpkg-query -W -f='${binary:Package}\t${Version}\n' > /output/build-packages.lock
cd /output
sha256sum ./*.deb ./*.dsc ./*.tar.* > SHA256SUMS
printf '%s\n' '{"status":"built-not-deployed","network":"none","productionChanged":false}' > build-completed.json
