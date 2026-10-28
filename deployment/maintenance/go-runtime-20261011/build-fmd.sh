#!/bin/sh
set -eu
test "$(go version)" = "go version go${EXPECTED_GO:-1.26.9} linux/amd64"
echo '750bd9e56d2ab77434a88b0167b2495c5399d5c5390946be736595c80cc6ff40  /input/fmd-source.tar' | sha256sum -c -
echo 'c89b6f8d1510edbf67355521039e64c08a3721dedff70dd5639bd7c5967716d6  /input/fmd-server-v0.17.0.zip' | sha256sum -c -
mkdir -p /work/tmp
export TMPDIR=/work/tmp GOTMPDIR=/work/tmp
cd /work
if ! command -v git >/dev/null; then test -z "${GO_PHASE:-}"; apk add --no-cache git=2.54.0-r0 >/dev/null; fi
git clone --quiet --shared --no-checkout /source-git source
cd source
git checkout --quiet --detach 224b60c0756ff363bc19063082a8a1543559cf96
test "$(git archive HEAD | sha256sum | cut -d' ' -f1)" = 750bd9e56d2ab77434a88b0167b2495c5399d5c5390946be736595c80cc6ff40
if [ -d /web-assets/web/dist ]; then cp -a /web-assets/web .; else unzip -q /input/fmd-server-v0.17.0.zip 'web/dist/*'; fi
if [ -n "${UTILIBRE_TEXT_LOCKS:-}" ]; then cp "$UTILIBRE_TEXT_LOCKS/go.mod" go.mod; cp "$UTILIBRE_TEXT_LOCKS/go.sum" go.sum; fi
export GOTOOLCHAIN=local GOTELEMETRY=off GOFLAGS=-mod=readonly
export GOMAXPROCS=2 GOMEMLIMIT=2GiB GOCACHE=/work/cache GOMODCACHE=${MODULE_CACHE:-/work/mod}
export CGO_ENABLED=0 GOOS=linux GOARCH=amd64
if [ "${GO_PHASE:-}" = download ]; then go mod download all; go mod verify; exit; fi
if [ "${GO_PHASE:-}" != build ]; then go mod download; fi
go mod verify
if [ "${GO_PHASE:-}" = build ]; then export GOPROXY=off GOSUMDB=off; fi
sha256sum go.mod go.sum > /output/fmd-locks.txt
go build -buildvcs=true -ldflags='-w -s -buildid=' -trimpath -o /output/fmd-server .
go build -buildvcs=true -ldflags='-w -s -buildid=' -trimpath -o /output/fmd-server-ctl ./ctl
go version -m /output/fmd-server /output/fmd-server-ctl > /output/fmd-buildinfo.txt
sha256sum /output/fmd-server /output/fmd-server-ctl
