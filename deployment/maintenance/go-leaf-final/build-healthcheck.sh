#!/bin/sh
set -eu
EXPECTED_GO=${EXPECTED_GO:-1.27.2}
case "$EXPECTED_GO" in 1.27.2|1.27.3) ;; *) exit 2;; esac
test "$(go version)" = "go version go${EXPECTED_GO} linux/amd64"
export CGO_ENABLED=0 GO111MODULE=off GOTOOLCHAIN=local GOTELEMETRY=off GOMAXPROCS=1 GOMEMLIMIT=1536MiB GOCACHE=/work/cache
mkdir -p /work/tmp
export GOTMPDIR=/work/tmp TMPDIR=/work/tmp
go build -p 1 -trimpath -ldflags '-s -w' -o /output/wakapi-healthcheck /source/scripts/healthcheck.go
go version -m /output/wakapi-healthcheck > /output/wakapi-healthcheck-buildinfo.txt
sha256sum /output/wakapi-healthcheck
