#!/bin/sh
set -eu
test "$(go version)" = 'go version go1.27.2 linux/amd64'
echo 'd748b36307f59353836320cf2d6c1f46c737efb9afc3c8e2ec5bec39c835602f  /input/yopass-source.tar' | sha256sum -c -
cd /work
git clone --quiet --shared --no-checkout /source-git source
cd source
git checkout --quiet --detach 34d8bbcc4aac14dbf326d46dc69d26895b7f5282
test "$(git archive HEAD | sha256sum | cut -d' ' -f1)" = d748b36307f59353836320cf2d6c1f46c737efb9afc3c8e2ec5bec39c835602f
export GOTOOLCHAIN=local GOTELEMETRY=off GOFLAGS=-mod=readonly
export GOMAXPROCS=2 GOMEMLIMIT=2GiB GOCACHE=/work/cache GOMODCACHE=/work/mod
export CGO_ENABLED=1 GOOS=linux GOARCH=amd64
go mod download
go mod verify
go build -buildvcs=true -o /output/yopass ./cmd/yopass
go build -buildvcs=true -ldflags='-X main.version=14.10.0' -o /output/yopass-server ./cmd/yopass-server
go test -p 2 ./pkg/yopass ./cmd/yopass ./cmd/yopass-server > /output/yopass-tests.txt
go version -m /output/yopass /output/yopass-server > /output/yopass-buildinfo.txt
sha256sum /output/yopass /output/yopass-server
