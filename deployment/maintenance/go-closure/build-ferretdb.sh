#!/bin/sh
# A pinned existing compiler, two CPUs / 2 GiB RAM, private disposable build root.
set -eu
EXPECTED_GO=${EXPECTED_GO:-1.26.9}
PHASE=${UTILIBRE_PHASE:-legacy}
LOCKS=${UTILIBRE_LOCKS:-/reviewed/ferretdb}
case "$EXPECTED_GO:$PHASE" in 1.26.9:legacy|1.26.10:download|1.26.10:build) ;; *) exit 2;; esac
test "$(go version)" = "go version go${EXPECTED_GO} linux/amd64"
export GOTOOLCHAIN=local GOTELEMETRY=off CGO_ENABLED=0 GOAMD64=v1 GOMAXPROCS=2 GOMEMLIMIT=512MiB GOGC=50
export GOPATH=/build/gopath GOCACHE=/build/gocache GOMODCACHE=/build/mod GOTMPDIR=/tmp TMPDIR=/tmp
export GOPROXY=https://proxy.golang.org
if [ "$PHASE" != legacy ]; then export GOMODCACHE=/modules; test -f ${LOCKS}/go.mod; fi
if [ "$PHASE" = build ]; then export GOPROXY=off GOSUMDB=off; fi
echo '7f17d04d55e272365208291473045cbc3d8e460033a94b8085c373b22a57f5c1  /input/source.tar.gz' | sha256sum -c -
cd /build/source
# Upstream testutil locates its fixture root by the .git directory. The signed
# source archive has no checkout metadata; this marker is only for test paths.
mkdir -p .git
cp /previous/go.mod /previous/go.sum .
test -f internal/mcp/utilibre_contract_test.go
grep -q 'mcp.CallToolRequest' internal/mcp/find.go
if [ -f ${LOCKS}/go.mod ]; then
 cp ${LOCKS}/go.mod ${LOCKS}/go.sum .
else
 go get github.com/modelcontextprotocol/go-sdk@v1.4.1
 go mod tidy
fi
if [ "$PHASE" = download ]; then go mod download; fi
go mod verify > /output/ferretdb-modules.txt
cp go.mod /output/ferretdb-go.mod
cp go.sum /output/ferretdb-go.sum
if [ "$PHASE" = download ]; then exit 0; fi
for name in version commit branch package; do cp "/previous/$name.txt" "build/version/$name.txt"; done
go test -p 1 -mod=readonly ./internal/mcp -run '^TestUtilibre' -count=1 > /output/ferretdb-mcp-tests.txt 2>&1
go test -p 1 -mod=readonly ./build/version ./internal/util/ctxutil ./internal/util/hex ./internal/util/logging ./internal/util/observability ./internal/util/xiter > /output/ferretdb-native-tests.txt 2>&1
go build -p 1 -mod=readonly -trimpath -o /output/ferretdb ./cmd/ferretdb
go version -m /output/ferretdb > /output/ferretdb-buildinfo.txt
/output/ferretdb --version > /output/ferretdb-version.txt
sha256sum /output/ferretdb
