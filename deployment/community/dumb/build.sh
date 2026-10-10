#!/bin/sh
set -eu
root=/home/ubuntu/freetools
source=/opt/utilibre/community-src/dumb
revision=f5581074850bc31ed7df1ce96e8f428179bf0abb
recipe="$root/deployment/community/dumb"
builder=golang@sha256:8ac98ca534ac3f51e1f420a1dd2c15e74c75cfa0f23f3ad27eb5d7236c349a0c
stage=$(mktemp -d /opt/utilibre/dumb-build-XXXXXX)
mkdir -p "$stage/src" "$stage/modules" "$stage/cache"
git -C "$source" archive "$revision" | tar -x -C "$stage/src"
git -C "$stage/src" apply --unidiff-zero "$recipe/source.patch"
docker run --rm --cpus 2 --memory 768m -e GOTOOLCHAIN=local -e GOCACHE=/buildcache -v "$stage/src:/work" -v "$stage/modules:/go/pkg/mod" -v "$stage/cache:/buildcache" -w /work "$builder" go mod download
docker run --rm --network none --cpus 2 --memory 768m -e GOTOOLCHAIN=local -e GOCACHE=/buildcache -v "$stage/src:/work" -v "$stage/modules:/go/pkg/mod" -v "$stage/cache:/buildcache" -w /work "$builder" sh -ec 'go tool templ generate; cat style/*.css | go tool esbuild --loader=css --minify > static/style.css; go test -run TestUtilibre ./data ./handlers; go build -ldflags="-X github.com/rramiachraf/dumb/data.Version=f558107-p1 -s -w" -o dumb .'
docker build --network none -f "$recipe/Dockerfile" -t utilibre-dumb:f558107-p1 "$stage/src"
# Keep the exact patched source/binary; remove only this build's downloaded modules/cache.
rm -rf "$stage/modules" "$stage/cache"
printf 'Prepared private image; source and binary retained at %s/src\n' "$stage"
