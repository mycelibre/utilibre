#!/bin/sh
# Run in a bounded, disposable Go builder. /work is tmpfs; /output is a
# dedicated artifact directory, never an application data directory.
set -eu
sha256sum -c /reviewed/source.sha256
mkdir -p /work/source
tar -xzf /input/source.tar.gz -C /work/source --strip-components=1
cd /work/source
mkdir -p .git
patch --batch --fuzz=0 -p1 -i /reviewed/mcp-v1.patch
export GOPATH=/work/gopath GOCACHE=/work/gocache GOTOOLCHAIN=local
export CGO_ENABLED=0 GOAMD64=v1 GOMAXPROCS=2 GOMEMLIMIT=2GiB
export GOPROXY=https://proxy.golang.org
if [ -f /reviewed/go.mod ]; then
  cp /reviewed/go.mod /reviewed/go.sum .
else
  # Initial reviewed resolution; subsequent builds use committed go.mod/sum.
  go get github.com/jackc/pgx/v5@v5.9.2 \
    go.mongodb.org/mongo-driver@v1.17.7 go.mongodb.org/mongo-driver/v2@v2.4.2 \
    go.opentelemetry.io/otel@v1.45.0 \
    go.opentelemetry.io/otel/sdk@v1.45.0 \
    go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp@v1.45.0 \
    golang.org/x/crypto@v0.57.0 golang.org/x/net@v0.60.0 \
    golang.org/x/sys@v0.48.0 golang.org/x/text@v0.42.0 \
    google.golang.org/grpc@v1.83.2
  go mod tidy
fi
# The four-handler SDK 1.4.1 signature adapter is reviewed and tested in
# ../go-closure/. The production MCP listener remains disabled.
go mod download
go mod verify
cp go.mod go.sum /output/
cp /reviewed/version.txt build/version/version.txt
cp /reviewed/commit.txt build/version/commit.txt
cp /reviewed/branch.txt build/version/branch.txt
cp /reviewed/package.txt build/version/package.txt
go build -mod=readonly -trimpath -o /output/ferretdb ./cmd/ferretdb
# Focused portable tests. The full upstream suite assumes a Git checkout,
# non-root permission semantics and older compiler-specific stack locations;
# native isolated Gathio restore/create/edit/import/export is the release gate.
go test -mod=readonly ./build/version ./internal/util/ctxutil ./internal/util/hex ./internal/util/logging ./internal/util/observability ./internal/util/xiter
cp go.mod go.sum /output/
go version -m /output/ferretdb
/output/ferretdb --version
