#!/bin/sh
# Run in the pinned Go container; /work and compiler/module caches are tmpfs.
set -eu
test "$(go env GOVERSION)" = go1.26.9
test "$(go env GOARCH)" = amd64
export CGO_ENABLED=0 GOTOOLCHAIN=local GOTELEMETRY=off GOMAXPROCS=1
export GOCACHE=/work/cache GOMODCACHE=/work/mod
mkdir -p /work/src /out/notices
wget -q -O /work/source.tar.gz https://codeload.github.com/tianon/gosu/tar.gz/refs/tags/1.19
echo 'cd9719b775dbfedae53923c9b0dc792b66d42c51e0b36652ed6f747fbadc0164  /work/source.tar.gz' | sha256sum -c -
tar -xzf /work/source.tar.gz --strip-components=1 -C /work/src
cmp /recipe/go.mod /work/src/go.mod
cmp /recipe/go.sum /work/src/go.sum
if [ "${GOSU_DEPENDENCY_REVIEW:-0}" = 1 ]; then
  cp /recipe/dependency-review/go.mod /recipe/dependency-review/go.sum /work/src/
  cp /recipe/dependency-review/security_test.go /work/src/security_test.go
fi
cd /work/src
go mod download
go mod verify
go test -mod=readonly ./...
if [ "${GOSU_DEPENDENCY_REVIEW:-0}" = 1 ]; then
  # This single upstream test has invalid NUL/oversized-line fixtures. Its file
  # cap is covered by the unmodified parser + our explicit security_test.go.
  go test -mod=readonly -skip '^TestParseGroupFileCapsReads$' github.com/moby/sys/user
else
  go test -mod=readonly github.com/moby/sys/user
fi
go build -mod=readonly -trimpath -buildvcs=false -ldflags='-w -buildid=' -o /out/gosu .
chmod 0755 /out/gosu
/out/gosu --version
/out/gosu nobody id
go version -m /out/gosu > /out/notices/build-info.txt
cp LICENSE /out/notices/gosu-LICENSE
cp "$(go list -m -f '{{.Dir}}' github.com/moby/sys/user)/LICENSE" /out/notices/moby-user-LICENSE
cp "$(go list -m -f '{{.Dir}}' golang.org/x/sys)/LICENSE" /out/notices/x-sys-LICENSE
cp go.mod go.sum /out/notices/
sha256sum /out/gosu
