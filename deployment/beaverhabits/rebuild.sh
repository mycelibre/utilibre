#!/bin/sh
# Apply only to the clean v0.10.0 source pin recorded in the dated deployment note.
set -eu
recipe=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
source_dir=$(realpath "${1:?clean pinned Beaver source directory}")
git -C "$source_dir" apply "$recipe/upstream.patch"
docker build --memory 2g --cpuset-cpus 0,1 -t utilibre-beaverhabits:0.10.0-p7 -f "$recipe/Dockerfile" "$source_dir"
