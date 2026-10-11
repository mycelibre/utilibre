#!/bin/sh
set -eu
test "$(go version)" = 'go version go1.26.9 linux/amd64'
echo '750bd9e56d2ab77434a88b0167b2495c5399d5c5390946be736595c80cc6ff40  /input/fmd-source.tar' | sha256sum -c -
echo 'c89b6f8d1510edbf67355521039e64c08a3721dedff70dd5639bd7c5967716d6  /input/fmd-server-v0.17.0.zip' | sha256sum -c -
cd /work
apk add --no-cache git=2.54.0-r0 >/dev/null
git clone --quiet --shared --no-checkout /source-git source
cd source
git checkout --quiet --detach 224b60c0756ff363bc19063082a8a1543559cf96
test "$(git archive HEAD | sha256sum | cut -d' ' -f1)" = 750bd9e56d2ab77434a88b0167b2495c5399d5c5390946be736595c80cc6ff40
unzip -q /input/fmd-server-v0.17.0.zip 'web/dist/*'
export GOTOOLCHAIN=local GOTELEMETRY=off GOFLAGS=-mod=readonly
export GOMAXPROCS=2 GOMEMLIMIT=2GiB GOCACHE=/work/cache GOMODCACHE=/work/mod
export CGO_ENABLED=0 GOOS=linux GOARCH=amd64
go mod download
go mod verify
go build -buildvcs=true -ldflags='-w -s -buildid=' -trimpath -o /output/fmd-server .
go build -buildvcs=true -ldflags='-w -s -buildid=' -trimpath -o /output/fmd-server-ctl ./ctl
go version -m /output/fmd-server /output/fmd-server-ctl > /output/fmd-buildinfo.txt
sha256sum /output/fmd-server /output/fmd-server-ctl
