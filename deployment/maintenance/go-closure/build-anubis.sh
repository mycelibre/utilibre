#!/bin/sh
set -eu
EXPECTED_GO=${EXPECTED_GO:-1.26.9}
PHASE=${UTILIBRE_PHASE:-legacy}
LOCKS=${UTILIBRE_LOCKS:-/reviewed/anubis}
case "$EXPECTED_GO:$PHASE" in 1.26.9:legacy|1.26.10:download|1.26.10:build) ;; *) exit 2;; esac
test "$(go version)" = "go version go${EXPECTED_GO} linux/amd64"
export GOTOOLCHAIN=local GOTELEMETRY=off CGO_ENABLED=0 GOOS=linux GOARCH=amd64 GOMAXPROCS=2 GOMEMLIMIT=512MiB GOGC=50
mkdir -p /build/tmp
export GOPATH=/build/gopath GOCACHE=/build/gocache GOMODCACHE=/build/mod GOTMPDIR=/build/tmp TMPDIR=/build/tmp
export GOPROXY=https://proxy.golang.org
if [ "$PHASE" != legacy ]; then export GOMODCACHE=/modules; test -f ${LOCKS}/go.mod; fi
if [ "$PHASE" = build ]; then export GOPROXY=off GOSUMDB=off; fi
mkdir -p /build/source
tar -C /source --exclude=.git --exclude=node_modules -cf - . | tar -C /build/source -xf -
cd /build/source
cp /previous/go.mod /previous/go.sum .
cp -a /assets/web/static web/
cp -a /assets/xess/static /assets/xess/xess.css /assets/xess/xess.min.css xess/
cp -a /assets/challenge/preact/static lib/challenge/preact/
cp -a /assets/challenge/proofofwork/static lib/challenge/proofofwork/
if [ -f ${LOCKS}/go.mod ]; then
 cp ${LOCKS}/go.mod ${LOCKS}/go.sum .
else
 go get github.com/go-git/go-billy/v5@v5.9.0 github.com/go-git/go-git/v5@v5.19.2 github.com/moby/go-archive@v0.3.0
 go mod tidy
fi
if [ "$PHASE" = download ]; then go mod download all; fi
go mod verify > /output/anubis-modules.txt
cp go.mod /output/anubis-go.mod
cp go.sum /output/anubis-go.sum
if [ "$PHASE" = download ]; then exit 0; fi
export GOFLAGS='-trimpath -mod=readonly'
go test -p 1 ./lib/config ./lib/challenge/... ./web > /output/anubis-runtime-tests.txt 2>&1
# Check developer/test callers, rather than removing their source findings just
# because the corresponding packages are absent from the production binary.
go test -p 1 -run '^$' ./lib/store/valkey > /output/anubis-testcontainers-compile.txt 2>&1
go build -p 1 -o /build/yeet github.com/TecharoHQ/yeet/cmd/yeet > /output/anubis-yeet-compile.txt 2>&1
go test -p 1 github.com/go-git/go-billy/v5/memfs github.com/go-git/go-billy/v5/helper/chroot > /output/anubis-billy-tests.txt 2>&1
go test -p 1 github.com/go-git/go-git/v5/storage/filesystem/dotgit -check.f '^SuiteDotGit.TestReferenceName' > /output/anubis-git-path-tests.txt 2>&1
go test -p 1 github.com/moby/go-archive -run '^Test(UntarParentTraversalContained|UntarSiblingPrefixContained|UntarHardlinkToSymlink|UntarInvalidHardlink|UntarInvalidSymlink|UntarSymlinkBreakout|TarUntar)$' > /output/anubis-archive-tests.txt 2>&1
go build -p 1 -trimpath -ldflags '-s -w -X github.com/TecharoHQ/anubis.Version=v1.27.0' -o /output/anubis ./cmd/anubis
go version -m /output/anubis > /output/anubis-buildinfo.txt
sha256sum /output/anubis
