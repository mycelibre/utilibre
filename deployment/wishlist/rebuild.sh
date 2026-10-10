#!/bin/sh
set -eu
src=/opt/utilibre/community-src/wishlist-utilibre-0.67.1-p1
repo=/home/ubuntu/freetools
if [ ! -d "$src/.git" ] && [ ! -f "$src/.git" ]; then
 git clone --branch v0.67.1 --depth 1 https://github.com/cmintey/wishlist.git "$src"
 test "$(git -C "$src" rev-parse HEAD)" = a5150c73620abb912a802afdcfb51e403230fff3
 for patch in security-dependencies local-icons log-privacy native-deletion; do git -C "$src" apply "$repo/deployment/wishlist/$patch.patch"; done
fi
test "$(git -C "$src" rev-parse HEAD)" = a5150c73620abb912a802afdcfb51e403230fff3
python3 "$repo/deployment/wishlist/vendor-icons.py" "$src"
docker build --build-arg VERSION=v0.67.1 --build-arg SHA=a5150c73620abb912a802afdcfb51e403230fff3 -t utilibre-wishlist:0.67.1-p2 "$src"
