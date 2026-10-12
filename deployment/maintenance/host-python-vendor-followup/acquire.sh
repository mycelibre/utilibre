#!/bin/sh
set -eu
umask 077
TASK=/var/lib/utilibre-maintenance/host-python-vendor-followup-20261012
RECIPE=/home/ubuntu/freetools/deployment/maintenance/host-python-vendor-followup
mkdir -p "$TASK/apt-lists/partial" "$TASK/sources"
apt-get -o Dir::Etc::sourcelist="$RECIPE/review.sources" -o Dir::Etc::sourceparts=- -o Dir::State::lists="$TASK/apt-lists" -o APT::Update::Error-Mode=any update > "$TASK/apt-update.log" 2>&1
apt-cache -o Dir::Etc::sourcelist="$RECIPE/review.sources" -o Dir::Etc::sourceparts=- -o Dir::State::lists="$TASK/apt-lists" showsrc setuptools > "$TASK/source-index.txt"
apt-cache -o Dir::Etc::sourcelist="$RECIPE/review.sources" -o Dir::Etc::sourceparts=- -o Dir::State::lists="$TASK/apt-lists" show python3-setuptools-whl=78.1.1-0.1 > "$TASK/package-index.txt"
cd "$TASK/sources"
apt-get -o Dir::Etc::sourcelist="$RECIPE/review.sources" -o Dir::Etc::sourceparts=- -o Dir::State::lists="$TASK/apt-lists" source --download-only setuptools=78.1.1-0.1 > "$TASK/source-download.log" 2>&1
apt-get -o Dir::Etc::sourcelist="$RECIPE/review.sources" -o Dir::Etc::sourceparts=- -o Dir::State::lists="$TASK/apt-lists" download python3-setuptools-whl=78.1.1-0.1 > "$TASK/rollback-download.log" 2>&1
sha256sum ./*.dsc ./*.tar.* ./*.deb
