#!/bin/sh
set -eu
EXPECTED_GO=${EXPECTED_GO:-1.26.9}
case "$EXPECTED_GO" in 1.26.9|1.26.10) ;; *) exit 2 ;; esac
test "$(go version)" = "go version go$EXPECTED_GO linux/amd64"
PHASE=${UTILIBRE_PHASE:-legacy}
case "$PHASE" in legacy|download|build) ;; *) exit 2 ;; esac
export GOTOOLCHAIN=local GOTELEMETRY=off GOFLAGS='-mod=readonly -trimpath'
export GOMAXPROCS=1 GOMEMLIMIT=512MiB GOGC=25 GOCACHE=/work/cache GOMODCACHE=${UTILIBRE_MODULE_CACHE:-/work/mod}
mkdir -p /work/tmp
export GOTMPDIR=/work/tmp
export CGO_ENABLED=0 GOOS=linux GOARCH=amd64
if [ "$#" = 0 ]; then set -- rimgo galene safetwitch gothub anonymousoverflow; fi
for name do
  case "$name" in rimgo|galene|safetwitch|gothub|anonymousoverflow) ;; *) exit 2;; esac
  mkdir "/work/$name"
  tar -C "/source/$name" --exclude=.git --exclude=node_modules -cf - . | tar -C "/work/$name" -xf -
  cd "/work/$name"
  if [ "$name" = rimgo ]; then cp /input/rimgo-app.css static/app.css; fi
  sha256sum go.mod go.sum > "/output/$name-locks-before.txt"
  # Never resolve a new dependency graph during a production rebuild.
  cp "/recipe/locks/$name/go.mod" go.mod
  cp "/recipe/locks/$name/go.sum" go.sum
  mkdir -p "/output/locks/$name"
  cp go.mod go.sum "/output/locks/$name/"
  sha256sum go.mod go.sum > "/output/$name-locks-final.txt"
  if [ "$PHASE" != build ]; then go mod download; else export GOPROXY=off GOSUMDB=off; fi
  go mod verify > "/output/$name-mod-verify.txt"
  if [ "$PHASE" = download ]; then continue; fi
  case "$name" in
    galene) go test -p 1 ./group ./token ./ice > "/output/$name-tests.txt"; flags='-s -w';;
    rimgo) go test -p 1 ./... > "/output/$name-tests.txt"; flags='-s -w -X codeberg.org/rimgo/rimgo/pages.VersionInfo=d2be8e2-utilibre-p3';;
    gothub) go test -p 1 ./... > "/output/$name-tests.txt"; flags='-s -w -X codeberg.org/gothub/gothub/utils.Branch=24bedc8-utilibre-p2';;
    *) go test -p 1 ./... > "/output/$name-tests.txt"; flags='-s -w';;
  esac
  go build -p 1 -trimpath -ldflags="$flags" -o "/output/$name" .
  sha256sum -c "/output/$name-locks-final.txt"
  go version -m "/input/$name-original" > "/output/$name-before-buildinfo.txt"
  go version -m "/output/$name" > "/output/$name-buildinfo.txt"
  sha256sum "/output/$name"
  go clean -cache
done
