#!/bin/sh
# Separate authenticated APT indexes; no host repository or package changes.
set -eu
umask 077
TASK=/var/lib/utilibre-maintenance/xserver-followup-20261012
RECIPE=/home/ubuntu/freetools/deployment/maintenance/xserver-followup
test ! -e "$TASK"
mkdir -p "$TASK/apt-lists/partial" "$TASK/cache/archives/partial" "$TASK/packages" "$TASK/sources"
apt_review() {
 apt-get -o Dir::Etc::sourcelist="$RECIPE/review.sources" -o Dir::Etc::sourceparts=- -o Dir::State::lists="$TASK/apt-lists" -o Dir::Cache="$TASK/cache" "$@"
}
apt_review -o APT::Update::Error-Mode=any update > "$TASK/apt-update.log" 2>&1
apt-cache -o Dir::Etc::sourcelist="$RECIPE/review.sources" -o Dir::Etc::sourceparts=- -o Dir::State::lists="$TASK/apt-lists" -o Dir::Cache="$TASK/cache" show xvfb=2:21.1.25-1 xserver-common=2:21.1.25-1 > "$TASK/package-index.txt"
apt-cache -o Dir::Etc::sourcelist="$RECIPE/review.sources" -o Dir::Etc::sourceparts=- -o Dir::State::lists="$TASK/apt-lists" -o Dir::Cache="$TASK/cache" showsrc xorg-server > "$TASK/source-index.txt"
cd "$TASK/packages"
apt_review download xvfb=2:21.1.25-1 xserver-common=2:21.1.25-1 xvfb=2:21.1.16-1.3+deb13u4 xserver-common=2:21.1.16-1.3+deb13u4 > "$TASK/package-download.log" 2>&1
cd "$TASK/sources"
apt_review source --download-only xorg-server=2:21.1.25-1 > "$TASK/source-download.log" 2>&1
sha256sum ./*.dsc ./*.tar.* ./*.diff.gz ../packages/*.deb > "$TASK/SHA256SUMS"
