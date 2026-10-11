#!/bin/sh
# Build upstream source with reviewed, pinned dependencies; no runtime downloads.
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
source_dir=${LIBRESPEED_SOURCE_DIR:-/opt/utilibre/evaluation-src/librespeed-20261011}
revision=7bbfadeeed710500752496f952bbcfb66ab3bdb9
if [ ! -d "$source_dir/.git" ]; then
  git clone https://github.com/librespeed/speedtest-go "$source_dir"
  git -C "$source_dir" checkout --detach "$revision"
fi
[ "$(git -C "$source_dir" rev-parse HEAD)" = "$revision" ]
cp "$repo/deployment/librespeed/go.mod" "$source_dir/go.mod"
cp "$repo/deployment/librespeed/go.sum" "$source_dir/go.sum"
docker run --rm --cpus 2 --memory 4g -e GOTOOLCHAIN=local -e GOTELEMETRY=off \
  -v "$source_dir:/src" -w /src \
  golang:1.26.9-alpine@sha256:3082400e369fa24d5fc60bca20edab3f6d604e0c5a690ec66b295eff4dd87ade \
  sh -c 'go test ./... && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o speedtest . && go run golang.org/x/vuln/cmd/govulncheck@v1.9.0 ./...'
docker build -t utilibre-librespeed:1.1.6-p1 -f "$repo/deployment/librespeed/Dockerfile" "$source_dir"
node "$repo/deployment/librespeed/prepare.mjs" "$source_dir" /opt/utilibre/toolbox-public/apps/librespeed
node "$repo/deployment/librespeed/publish-source.mjs" "$source_dir"
