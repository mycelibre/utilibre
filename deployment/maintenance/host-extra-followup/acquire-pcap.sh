#!/bin/sh
set -eu
umask 077
TASK=/var/lib/utilibre-maintenance/host-extra-followup-20261012
RECIPE=/home/ubuntu/freetools/deployment/maintenance/host-extra-followup
mkdir -p "$TASK/apt-lists/partial" "$TASK/pcap"
apt-get -o Dir::Etc::sourcelist="$RECIPE/review.sources" -o Dir::Etc::sourceparts=- -o Dir::State::lists="$TASK/apt-lists" -o APT::Get::List-Cleanup=0 -o APT::Update::Error-Mode=any update > "$TASK/apt-update.log" 2>&1
apt-cache -o Dir::Etc::sourcelist="$RECIPE/review.sources" -o Dir::Etc::sourceparts=- -o Dir::State::lists="$TASK/apt-lists" show libpcap0.8t64 > "$TASK/pcap/package-index.txt"
cd "$TASK/pcap"
apt-get -o Dir::Etc::sourcelist="$RECIPE/review.sources" -o Dir::Etc::sourceparts=- -o Dir::State::lists="$TASK/apt-lists" download libpcap0.8t64=1.10.5-2 libpcap0.8t64=1.10.7-1 > "$TASK/pcap/download.log" 2>&1
sha256sum ./*.deb
