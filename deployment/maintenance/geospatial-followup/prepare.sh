#!/bin/sh
# Only run in the disposable builder created by build.mjs. Never on the host.
set -eu
test "$(cat /etc/debian_version)" = '12.15'
test "$(dpkg-query -W -f='${Version}' postgresql-17-postgis-3)" = '3.6.0+dfsg-3.pgdg12+1'
export DEBIAN_FRONTEND=noninteractive
dpkg-query -W -f='${Package}\t${Version}\n' > /work/before-packages.tsv
# No package-managed daemon is allowed to start during builder preparation.
printf '#!/bin/sh\nexit 101\n' > /usr/sbin/policy-rc.d
chmod 755 /usr/sbin/policy-rc.d
apt-get update -qq
apt-mark unhold postgresql-common postgresql-client-common
# Preserve the native Bookworm GDAL ABI. Development dependencies exist only
# in this disposable builder; they are never installed in the candidate image.
apt-get install -y --allow-downgrades --no-install-recommends \
  build-essential dpkg-dev fakeroot debhelper autoconf automake libtool \
  bison flex libcunit1-dev libgdal-dev=3.6.2+dfsg-1+b2 \
  libgeos-dev=3.11.1-1 libjson-c-dev libpcre2-dev \
  libproj-dev=9.8.1-1.pgdg12+1 libprotobuf-c-dev libsfcgal-dev \
  pkgconf po-debconf postgresql-common postgresql-common-dev dctrl-tools lsb-release \
  postgresql-client-common=293.pgdg12+1 \
  postgresql-server-dev-17=17.11-1.pgdg12+2 \
  protobuf-c-compiler rdfind gpgv patch \
  libaom3=3.6.0-1+deb12u3 libsqlite3-0=3.40.1-2+deb12u2
# The two explicit development-header version downgrades above are restricted
# to this throwaway builder. Neither library is copied to the candidate. Its
# production package inventory gate must preserve both patched runtime versions.
cd /work/source
gpg --batch --yes --dearmor --output /work/pgdg.gpg /usr/local/share/keyrings/postgres.gpg.asc
gpgv --keyring /work/pgdg.gpg InRelease
printf '%s\n' AUTHENTICATED_RELEASE
