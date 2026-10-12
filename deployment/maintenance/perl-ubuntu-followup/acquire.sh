#!/bin/sh
# Disposable exact-base image only; no host APT or production volumes.
set -eu
umask 077
cd /output
version=5.38.2-3.2ubuntu0.6
apt-get -o Dir::Etc::sourcelist=/recipe/ubuntu.sources -o Dir::Etc::sourceparts=- update
apt-get -o Dir::Etc::sourcelist=/recipe/ubuntu.sources -o Dir::Etc::sourceparts=- --simulate --no-install-recommends install "perl=$version" "perl-base=$version" "perl-modules-5.38=$version" "libperl5.38t64=$version" > simulation.txt
for package in perl perl-base perl-modules-5.38 libperl5.38t64; do
  apt-cache -o Dir::Etc::sourcelist=/recipe/ubuntu.sources -o Dir::Etc::sourceparts=- show "$package=$version" > "$package.index"
  apt-get -o Dir::Etc::sourcelist=/recipe/ubuntu.sources -o Dir::Etc::sourceparts=- download "$package=$version"
done
apt-get -o Dir::Etc::sourcelist=/recipe/ubuntu.sources -o Dir::Etc::sourceparts=- source --download-only "perl=$version"
cp /var/lib/apt/lists/*InRelease .
cp /var/lib/apt/lists/security.ubuntu.com_ubuntu_dists_noble-security_main_binary-amd64_Packages.lz4 .
cp /var/lib/apt/lists/security.ubuntu.com_ubuntu_dists_noble-security_main_source_Sources.lz4 .
cp /usr/share/keyrings/ubuntu-archive-keyring.gpg .
sha256sum ./*.deb ./*.dsc ./*.tar.* > SHA256SUMS
