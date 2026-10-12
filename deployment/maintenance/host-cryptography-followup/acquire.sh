#!/bin/sh
set -eu
umask 077
TASK=/var/lib/utilibre-maintenance/host-cryptography-followup-20261012
RECIPE=/home/ubuntu/freetools/deployment/maintenance/host-cryptography-followup
mkdir -p "$TASK/sources" "$TASK/apt-lists/partial"
apt-get -o Dir::Etc::sourcelist="$RECIPE/review.sources" -o Dir::Etc::sourceparts=- -o Dir::State::lists="$TASK/apt-lists" -o APT::Update::Error-Mode=any update > "$TASK/apt-update.log" 2>&1
apt-cache -o Dir::Etc::sourcelist="$RECIPE/review.sources" -o Dir::Etc::sourceparts=- -o Dir::State::lists="$TASK/apt-lists" showsrc python-cryptography > "$TASK/source-index.txt"
apt-cache -o Dir::Etc::sourcelist="$RECIPE/review.sources" -o Dir::Etc::sourceparts=- -o Dir::State::lists="$TASK/apt-lists" show python3-cryptography=43.0.0-3+deb13u1 > "$TASK/package-index.txt"
cd "$TASK/sources"
apt-get -o Dir::Etc::sourcelist="$RECIPE/review.sources" -o Dir::Etc::sourceparts=- -o Dir::State::lists="$TASK/apt-lists" source --download-only python-cryptography=43.0.0-3+deb13u1 > "$TASK/source-download.log" 2>&1
apt-get -o Dir::Etc::sourcelist="$RECIPE/review.sources" -o Dir::Etc::sourceparts=- -o Dir::State::lists="$TASK/apt-lists" download python3-cryptography=43.0.0-3+deb13u1 > "$TASK/rollback-download.log" 2>&1
curl --fail --location --proto '=https' --max-time 180 https://oss.oracle.com/ol10/SRPMS-updates/python-cryptography-43.0.0-4.el10_2.5.src.rpm --output python-cryptography-43.0.0-4.el10_2.5.src.rpm
node "$RECIPE/verify-source.mjs"
