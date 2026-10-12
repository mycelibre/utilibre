#!/bin/sh
set -eu
umask 077
TASK=/var/lib/utilibre-maintenance/tiff-bookworm-followup-20261012
RECIPE=/home/ubuntu/freetools/deployment/maintenance/sudo-followup
LISTS=/var/lib/utilibre-maintenance/sudo-followup-20261012/apt-lists
test "$(df -B1 --output=avail / | tail -1)" -ge 10737418240
mkdir -p "$TASK/sources" "$TASK/output"
apt-cache -o Dir::Etc::sourcelist="$RECIPE/review.sources" -o Dir::Etc::sourceparts=- -o Dir::State::lists="$LISTS" showsrc tiff > "$TASK/source-index.txt"
cd "$TASK/sources"
apt-get -o Dir::Etc::sourcelist="$RECIPE/review.sources" -o Dir::Etc::sourceparts=- -o Dir::State::lists="$LISTS" source --download-only tiff=4.5.0-6+deb12u4 > "$TASK/source-download.log" 2>&1
apt-cache -o Dir::Etc::sourcelist="$RECIPE/review.sources" -o Dir::Etc::sourceparts=- -o Dir::State::lists="$LISTS" show libtiff6=4.5.0-6+deb12u4 > "$TASK/package-index.txt"
apt-get -o Dir::Etc::sourcelist="$RECIPE/review.sources" -o Dir::Etc::sourceparts=- -o Dir::State::lists="$LISTS" download libtiff6=4.5.0-6+deb12u4 > "$TASK/rollback-download.log" 2>&1
for commit in ba2b04b114c5dd945107ccc613cedfcca3af73bb 51fa6dfe93f20da0d38f079fbc61c7c960bcbc16 f9bda11bf2fc819b971517582666d56f18b1bc3f 90601d9a23382d98f3695ec14441145c37a77574 eedba405d3695b52faae65994c5904f228eca0bf; do
 curl --fail --location --proto '=https' --max-time 90 "https://gitlab.com/libtiff/libtiff/-/commit/$commit.patch" --output "$commit.patch"
done
sha256sum ./* > "$TASK/acquired-sha256.txt"
