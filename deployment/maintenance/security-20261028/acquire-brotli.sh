#!/bin/sh
# Disposable downloader only. Never run on the host or in a production container.
set -eu
test -f /.dockerenv
test "$#" = 1
case "$1" in
 trixie) version=1.1.0-2+deb13u1; source='deb [signed-by=/usr/share/keyrings/debian-archive-keyring.gpg] https://security.debian.org/debian-security trixie-security main';;
 bookworm) version=1.0.9-2+deb12u1; source='deb [signed-by=/usr/share/keyrings/debian-archive-keyring.gpg] https://security.debian.org/debian-security bookworm-security main';;
 jammy) version=1.0.9-2ubuntu0.1; source='deb [signed-by=/usr/share/keyrings/ubuntu-archive-keyring.gpg] https://security.ubuntu.com/ubuntu jammy-security main universe';;
 *) exit 2;;
esac
rm -f /etc/apt/sources.list.d/*.sources /etc/apt/sources.list.d/*.list
printf '%s\n' "$source" > /etc/apt/sources.list
apt-get -o APT::Sandbox::User=root -o Acquire::https::CaInfo=/vendor-ca.crt -o APT::Update::Error-Mode=any update > /output/index.log 2>&1
cd /output
apt-get -o APT::Sandbox::User=root -o Acquire::https::CaInfo=/vendor-ca.crt download "libbrotli1=$version" > download.log 2>&1
apt-cache show "libbrotli1=$version" > package-index.txt
mkdir signed-lists
cp /var/lib/apt/lists/*InRelease signed-lists/
cp /var/lib/apt/lists/*Packages* signed-lists/
sha256sum ./*.deb
