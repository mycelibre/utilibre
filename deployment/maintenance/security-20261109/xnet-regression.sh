#!/bin/sh
# Runs inside the pinned compiler container, with only offline modules/fixtures.
set -eu
test "$(go version)" = 'go version go1.26.10 linux/amd64'
export GOTOOLCHAIN=local GOTELEMETRY=off GOPROXY=off GOSUMDB=off
export GOMODCACHE=/modules GOCACHE=/work/cache GOTMPDIR=/work/tmp
export GOMAXPROCS=1 GOMEMLIMIT=512MiB GOGC=25 CGO_ENABLED=0 GOFLAGS='-mod=readonly -trimpath'
mkdir -p /work/tmp
cd /baseline
go run /recipe/xnet-native.go -expect vulnerable > /output/regression-before.json
cd /candidate
go run /recipe/xnet-native.go -expect fixed > /output/regression-after.json
go test -p 1 -count=1 -json golang.org/x/net/html > /output/html-upstream-tests.jsonl
