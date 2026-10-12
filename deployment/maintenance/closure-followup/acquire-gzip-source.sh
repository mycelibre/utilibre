#!/bin/sh
# Disposable source-download container only; never change host APT sources.
set -eu
printf '%s\n' 'deb-src http://deb.debian.org/debian forky main' > /etc/apt/sources.list.d/maintenance-source.list
apt-get update -qq
cd /output
apt-get source --download-only gzip=1.14-1
sha256sum gzip_1.14-1.dsc gzip_1.14.orig.tar.xz gzip_1.14-1.debian.tar.xz
