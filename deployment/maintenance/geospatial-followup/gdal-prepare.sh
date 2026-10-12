#!/bin/sh
# Reuses the disposable Bookworm builder, never runs in production.
set -eu
test "$(cat /etc/debian_version)" = 12.15
export DEBIAN_FRONTEND=noninteractive
apt-get install -y --no-install-recommends debian-keyring cmake dh-python doxygen graphviz chrpath bash-completion pkg-kde-tools python3-all-dev python3-numpy swig netcdf-bin libcurl4-gnutls-dev
cd /work/gdal-source
gpgv --keyring /usr/share/keyrings/debian-keyring.gpg gdal_3.6.2+dfsg-1.dsc
if [ ! -d /work/gdal-tree ]; then dpkg-source -x gdal_3.6.2+dfsg-1.dsc /work/gdal-tree; fi
cd /work/gdal-tree
dpkg-checkbuilddeps
