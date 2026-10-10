#!/bin/sh
set -eu
src=/opt/utilibre/community-src/spliit-utilibre-1.29.0-p1
repo=/home/ubuntu/freetools
if [ ! -d "$src/.git" ] && [ ! -f "$src/.git" ]; then
  git clone --branch 1.29.0 --depth 1 https://github.com/spliit-app/spliit.git "$src"
  test "$(git -C "$src" rev-parse HEAD)" = d3b1e1e6787ffe13c6dfe0b6a2fcfc403d81686a
  git -C "$src" apply "$repo/deployment/spliit/security-dependencies.patch"
fi
test "$(git -C "$src" rev-parse HEAD)" = d3b1e1e6787ffe13c6dfe0b6a2fcfc403d81686a
docker build -t utilibre-spliit:1.29.0-p1 "$src"
