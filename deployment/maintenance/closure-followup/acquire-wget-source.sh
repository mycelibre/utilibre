#!/bin/sh
# Run only inside a disposable source-download container.
set -eu
printf '%s\n' 'deb-src http://deb.debian.org/debian trixie main' > /etc/apt/sources.list.d/maintenance-source.list
apt-get update -qq
cd /output
apt-get source --download-only wget=1.25.0-2
apt-get download wget=1.25.0-2
sha256sum wget_1.25.0-2.dsc wget_1.25.0.orig.tar.gz wget_1.25.0-2.debian.tar.xz wget_1.25.0-2_amd64.deb
