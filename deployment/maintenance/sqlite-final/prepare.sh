#!/bin/sh
# Disposable Bookworm builder only. Source authentication precedes all patching.
set -eu
export DEBIAN_FRONTEND=noninteractive
printf '%s\n' 'deb-src [signed-by=/usr/share/keyrings/debian-archive-keyring.gpg] http://deb.debian.org/debian bookworm main' > /etc/apt/sources.list.d/utilibre-source.list
apt-get update -qq
apt-get install -y --no-install-recommends build-essential dpkg-dev fakeroot debhelper autoconf libtool automake chrpath lynx libreadline-dev tcl8.6-dev debian-keyring gpgv patch ca-certificates
cd /work
apt-get source --download-only sqlite3=3.40.1-2+deb12u2
gpgv --keyring /usr/share/keyrings/debian-keyring.gpg sqlite3_3.40.1-2+deb12u2.dsc
dpkg-source -x sqlite3_3.40.1-2+deb12u2.dsc
cp sqlite3_3.40.1-2+deb12u2.dsc /out/
cp sqlite3_3.40.1-2+deb12u2.debian.tar.xz /out/
cp sqlite3-3.40.1/debian/rules /out/debian-rules.original
printf '%s\n' PREPARED
