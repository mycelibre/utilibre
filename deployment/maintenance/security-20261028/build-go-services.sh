#!/bin/sh
# Existing Donetick/LibreSpeed source, locks, regression tests and build flags.
set -eu
key=$1
case "$key" in donetick|librespeed) ;; *) exit 2;; esac
test "$(go env GOVERSION)" = "go$EXPECTED_GO"
echo "$SOURCE_SHA  /input/source.tar.gz" | sha256sum -c -
mkdir -p /work/src /work/tmp
export TMPDIR=/work/tmp GOTMPDIR=/work/tmp GOCACHE=/work/cache GOPATH=/work/gopath GOMODCACHE=/modules GOTOOLCHAIN=local GOTELEMETRY=off GOMAXPROCS=2 CGO_ENABLED=0 GOFLAGS=-mod=readonly
cd /work/src
tar -xzf /input/source.tar.gz
if [ "$PHASE" = download ]; then go mod download all; go mod verify; exit; fi
go mod verify
if [ "$key" = donetick ]; then
 go test -p 2 ./internal/storage ./internal/user ./internal/auth > /output/tests.txt
 go build -trimpath -buildvcs=false -ldflags='-s -w -X donetick.com/core/config.Version=0.1.80-utilibre-p3 -X donetick.com/core/config.Commit=e88d8bea62405ca02288f93dd70efab8c0f1ff2c -X donetick.com/core/config.BuildDate=2026-10-09' -o /output/donetick .
else
 go test -p 2 ./... > /output/tests.txt
 go build -trimpath -buildvcs=false -ldflags='-s -w' -o /output/speedtest .
fi
if [ "$key" = donetick ]; then go version -m /output/donetick; else go version -m /output/speedtest; fi > /output/build-info.txt
