#!/bin/sh
# Disposable original Ubuntu image only, no production mount or host APT edits.
set -eu
apt-get update -qq
cd /output
apt-get download gzip=1.12-1ubuntu3.2
apt-cache show gzip=1.12-1ubuntu3.2 > package-index.txt
sha256sum gzip_1.12-1ubuntu3.2_amd64.deb
