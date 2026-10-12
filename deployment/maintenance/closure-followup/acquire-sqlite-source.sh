#!/bin/sh
# Source-only ephemeral container. Does not change the VM's package sources.
set -eu
printf '%s\n' 'deb-src http://deb.debian.org/debian trixie main' > /etc/apt/sources.list.d/maintenance-source.list
apt-get update -qq
cd /output
apt-get source --download-only sqlite3=3.46.1-7+deb13u2
sha256sum sqlite3_3.46.1-7+deb13u2.dsc sqlite3_3.46.1-7+deb13u2.debian.tar.xz
