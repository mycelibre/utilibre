#!/bin/sh
set -eu
source_dir=${1:?Pass the reviewed patched BreezeWiki checkout}
recipe_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
[ "$(git -C "$source_dir" rev-parse HEAD)" = 6d09507b6e7ecec0cbac4c2c4eb223c10ccc23a4 ]
[ "$(docker image inspect utilibre-breezewiki:6d09507-p2 --format '{{.Id}}')" = sha256:413a48b827bd43ab54b83bfc8a32fc41f4135d5f718c8f3c4e33c9c59c0b06be ]
docker build --network=none -f "$recipe_dir/Dockerfile.breezewiki-tabs" -t utilibre-breezewiki:6d09507-p3 "$source_dir"
