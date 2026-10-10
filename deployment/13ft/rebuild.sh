#!/bin/sh
set -eu
repo=/home/ubuntu/freetools
src=/opt/utilibre/community-src/13ft-utilibre-0.5.0-public
stage=$(mktemp -d /opt/utilibre/13ft-build.XXXXXX)
trap 'rm -rf "$stage"' EXIT
cp "$repo/deployment/13ft/requirements.lock" "$stage/requirements.lock"
cp "$repo/deployment/13ft/Dockerfile" "$stage/Dockerfile"
mkdir "$stage/source"
git -C "$src" archive d03b120c41d2558d3ce2a45e049ccbea8785ff7a | tar -x -C "$stage/source"
(cd "$stage/source" && patch --batch -p1 < "$repo/deployment/13ft/public-reader.patch")
docker build -t utilibre-13ft:0.5.0-public1 "$stage"
