#!/bin/sh
# Source-only acquisition in an ephemeral container; never add testing to the host.
set -eu
printf '%s\n' 'deb-src http://deb.debian.org/debian forky main' > /etc/apt/sources.list.d/maintenance-source.list
apt-get update -qq
cd /output
apt-get source --download-only curl=8.22.0-1
sha256sum curl_8.22.0-1.dsc curl_8.22.0.orig.tar.gz curl_8.22.0-1.debian.tar.xz
