#!/bin/sh
set -eu
test "$(go version)" = 'go version go1.27.2 linux/amd64'
export CGO_ENABLED=0 GO111MODULE=off GOTOOLCHAIN=local GOTELEMETRY=off GOMAXPROCS=1 GOMEMLIMIT=1536MiB GOCACHE=/work/cache
go build -p 1 -trimpath -ldflags '-s -w' -o /output/wakapi-healthcheck /source/scripts/healthcheck.go
go version -m /output/wakapi-healthcheck > /output/wakapi-healthcheck-buildinfo.txt
sha256sum /output/wakapi-healthcheck
