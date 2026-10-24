#!/bin/sh
set -eu
name="$1"
phase="$2"
export GOTOOLCHAIN=local GOTELEMETRY=off GOMAXPROCS=2 GOMEMLIMIT=1GiB GOGC=50
export GOPATH=/work/gopath GOCACHE=/work/cache GOMODCACHE=/modules GOTMPDIR=/work/tmp TMPDIR=/work/tmp
export GOOS=linux GOARCH=amd64
test "$(go version)" = 'go version go1.27.3 linux/amd64'
mkdir -p /work/src /work/tmp
tar -xf /input/source.tar -C /work/src
cd /work/src
if [ "$phase" = resolve ]; then
 cp /previous/go.mod /previous/go.sum .
 # Published locks are the reviewed resolution. Replay never resolves latest.
 grep -q 'github.com/labstack/echo/v4 v4.16.1' go.mod
 if [ "$name" = vikunja ]; then grep -q 'github.com/labstack/echo/v5 v5.4.1' go.mod; fi
 go mod download
 cp go.mod go.sum /input/
 go mod verify
 exit
fi
cp /input/go.mod /input/go.sum .
export GOPROXY=off GOSUMDB=off
go mod verify
case "$name" in
 opengist)
  export CGO_ENABLED=0 GOFLAGS='-mod=readonly -trimpath -tags=fs_embed'
  cp -a /assets/assets /assets/.vite public/
  flags='-X github.com/thomiceli/opengist/internal/config.OpengistVersion=v1.15.2'
  go test -p 1 ./internal/config ./internal/render ./internal/i18n/...
  ;;
 vikunja)
  export CGO_ENABLED=1 GOFLAGS='-mod=readonly -trimpath -tags=osusergo,netgo'
  cp -a /assets/dist frontend/
  flags='-linkmode=external -extldflags=-static -X code.vikunja.io/api/pkg/version.Version=v2.7.0 -X "main.Tags=osusergo netgo"'
  go test -p 1 ./pkg/config ./pkg/utils
  ;;
 *) exit 2;;
esac
go test -p 1 github.com/labstack/echo/v4/middleware
if [ "$name" = vikunja ]; then go test -p 1 github.com/labstack/echo/v5/middleware; fi
go build -p 1 -trimpath -ldflags "$flags" -o /input/binary .
go version -m /input/binary > /input/buildinfo.txt
sha256sum /input/binary
