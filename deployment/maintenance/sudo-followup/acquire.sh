#!/bin/sh
set -eu
umask 077
TASK=/var/lib/utilibre-maintenance/sudo-followup-20261012
RECIPE=/home/ubuntu/freetools/deployment/maintenance/sudo-followup
test "$(df -B1 --output=avail / | tail -1)" -ge 10737418240
mkdir -p "$TASK/sources" "$TASK/apt-lists/partial"
apt-get -o Dir::Etc::sourcelist="$RECIPE/review.sources" -o Dir::Etc::sourceparts=- -o Dir::State::lists="$TASK/apt-lists" -o APT::Update::Error-Mode=any update > "$TASK/apt-update.log" 2>&1
apt-cache -o Dir::Etc::sourcelist="$RECIPE/review.sources" -o Dir::Etc::sourceparts=- -o Dir::State::lists="$TASK/apt-lists" showsrc sudo > "$TASK/source-index.txt"
cd "$TASK/sources"
for version in 1.9.16p2-3+deb13u2 1.9.13p3-1+deb12u4; do
 apt-get -o Dir::Etc::sourcelist="$RECIPE/review.sources" -o Dir::Etc::sourceparts=- -o Dir::State::lists="$TASK/apt-lists" source --download-only "sudo=$version" > "$TASK/download-$version.log" 2>&1
 apt-cache -o Dir::Etc::sourcelist="$RECIPE/review.sources" -o Dir::Etc::sourceparts=- -o Dir::State::lists="$TASK/apt-lists" show "sudo=$version" > "$TASK/package-$version.txt"
 apt-get -o Dir::Etc::sourcelist="$RECIPE/review.sources" -o Dir::Etc::sourceparts=- -o Dir::State::lists="$TASK/apt-lists" download "sudo=$version" > "$TASK/rollback-$version.log" 2>&1
done
for commit in db669167ca599f2a94cd8a4c5fae9e473c81a2fd 1820a349687522f51023d1ae5925125f59679a8c; do
 curl --fail --location --proto '=https' --max-time 90 "https://github.com/sudo-project/sudo/commit/$commit.patch" --output "$commit.patch"
done
sha256sum ./* > "$TASK/acquired-sha256.txt"
printf 'Native Debian sudo baselines acquired through authenticated APT.\n'
