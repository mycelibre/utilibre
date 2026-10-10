#!/bin/sh
set -eu
source_dir=${1:?Pass the exact patched upstream checkout}
recipe_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
[ "$(git -C "$source_dir" rev-parse HEAD)" = 856b1edfe81a735fce4b544c2e16a6518cebf164 ]
git -C "$source_dir" apply --reverse --check "$recipe_dir/restricted.patch" "$recipe_dir/dependencies.patch" "$recipe_dir/rendering.patch"
# Build-time registry access only. Runtime has the separate restrictive boundary.
mkdir -p "$source_dir/utilibre-wheels"
cp "$recipe_dir/runtime-wheels.txt" "$source_dir/utilibre-wheels/requirements.txt"
docker run --rm --memory=512m --cpus=1 --entrypoint python \
 -v "$source_dir/utilibre-wheels:/wheels" \
 ghcr.io/itskovacs/trip@sha256:97525201a9bffcae86d4aa7468709317c84789bf9ad55b686bdae78605bad91c \
 -m pip download --disable-pip-version-check --no-deps --no-cache-dir --only-binary=:all: \
 --require-hashes -r /wheels/requirements.txt --dest /wheels
docker run --rm --memory=1536m --cpus=2 --pids-limit=256 \
 -e npm_config_cache=/tmp/npm-cache -e NG_CLI_ANALYTICS=false \
 -v "$source_dir/src:/work" -w /work \
 node@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 \
 sh -c 'npm ci --ignore-scripts --no-audit --no-fund && npm run build'
docker build --network=none -f "$recipe_dir/Dockerfile" -t utilibre-trip:1.50.1-p2 "$source_dir"
