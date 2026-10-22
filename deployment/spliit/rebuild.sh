#!/bin/sh
set -eu
src=/opt/utilibre/community-src/spliit-utilibre-1.29.0-p1
repo=/home/ubuntu/freetools
if [ ! -d "$src/.git" ] && [ ! -f "$src/.git" ]; then
  git clone --branch 1.29.0 --depth 1 https://github.com/spliit-app/spliit.git "$src"
  test "$(git -C "$src" rev-parse HEAD)" = d3b1e1e6787ffe13c6dfe0b6a2fcfc403d81686a
fi
test "$(git -C "$src" rev-parse HEAD)" = d3b1e1e6787ffe13c6dfe0b6a2fcfc403d81686a
# A previous prepared checkout is not necessarily using the current approved
# lock. Accept the exact already-patched files, or a clean supported baseline.
# Refuse stale/overlapping local changes; never resolve conflicts automatically.
if ! git -C "$src" apply --reverse --check "$repo/deployment/spliit/security-dependencies.patch"; then
  git -C "$src" diff --quiet HEAD -- Dockerfile package.json package-lock.json src/components/currency-selector.tsx
  git -C "$src" apply --check "$repo/deployment/spliit/security-dependencies.patch"
  git -C "$src" apply "$repo/deployment/spliit/security-dependencies.patch"
fi
git -C "$src" apply --reverse --check "$repo/deployment/spliit/security-dependencies.patch"
node -e 'const p=require(process.argv[1]);if(p.dependencies.next!=="16.4.1")process.exit(1)' "$src/package.json"
docker build -t utilibre-spliit:1.29.0-p1 "$src"
