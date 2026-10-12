#!/bin/sh
# Disposable Bookworm compiler only; no production package installation.
set -eu
test "$(cat /etc/debian_version)" = 12.15
test -d /work/openldap-followup/source
export DEBIAN_FRONTEND=noninteractive
apt-get install -y --no-install-recommends build-essential debhelper groff-base dpkg-dev pkg-config po-debconf libltdl-dev unixodbc-dev libgnutls28-dev libsasl2-dev heimdal-multidev libargon2-dev libperl-dev libwrap0-dev nettle-dev devscripts quilt
cd /work/openldap-followup
test ! -d tree
dpkg-source -x source/openldap_2.5.13+dfsg-5.dsc tree
cd tree
dpkg-checkbuilddeps
