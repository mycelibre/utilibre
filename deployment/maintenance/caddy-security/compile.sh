#!/bin/sh
# Exact upstream release's buildable source+vendor tree, new patched compiler.
set -eu
test "$(go env GOVERSION)" = go1.26.9
export CGO_ENABLED=0 GOTOOLCHAIN=local GOTELEMETRY=off GOMAXPROCS=1
export GOMEMLIMIT=256MiB GOCACHE=/work/cache TMPDIR=/work/tmp GOPROXY=off GOSUMDB=off
mkdir -p /work/src /work/tmp /out/notices
wget -q -O /work/source.tar.gz https://github.com/caddyserver/caddy/releases/download/v2.11.7/caddy_2.11.7_buildable-artifact.tar.gz
echo 'b430516910839fbaf35c0a9e9df80d1e2e30aa792530293c39f4a97a1b2c9060  /work/source.tar.gz' | sha256sum -c -
tar -xzf /work/source.tar.gz -C /work/src
cd /work/src
if [ "${CADDY_NET_REVIEW:-0}" = 1 ]; then
  # Only the reviewed x/net source tree changes; its go.mod requires the same
  # crypto/sys/term/text versions already vendored by this Caddy release.
  wget -q -O /work/net.zip https://proxy.golang.org/golang.org/x/net/@v/v0.60.0.zip
  echo '052e0453db47a96ae9567503e7c95ea925ab52682cb1cec31250541f7160107e  /work/net.zip' | sha256sum -c -
  unzip -q /work/net.zip -d /work/net-new
  mv vendor/golang.org/x/net /work/net-original
  cp -a /work/net-new/golang.org/x/net@v0.60.0 vendor/golang.org/x/net
  go mod edit -require=golang.org/x/net@v0.60.0
  sed -i 's/^# golang.org\/x\/net v0.59.0$/# golang.org\/x\/net v0.60.0/' vendor/modules.txt
  printf '%s\n' 'golang.org/x/net v0.60.0 h1:79p50tfZlm0J9YfoDsSi639qSXNGVwEzOPLCxM2FsYU=' 'golang.org/x/net v0.60.0/go.mod h1:2DA/G1UfVbCpQPeWTmMPGY7Cs2PkBkwu743bVX5PIVg=' >> go.sum
fi
go list -mod=vendor -tags=nobadger,nomysql,nopgx -deps . > /out/notices/linked-packages.txt
go build -mod=vendor -trimpath -buildvcs=false -tags=nobadger,nomysql,nopgx -ldflags='-s -w -buildid=' -o /out/caddy .
chmod 0755 /out/caddy
/out/caddy version
/out/caddy list-modules > /out/notices/modules.txt
go version -m /out/caddy > /out/notices/build-info.txt
cp go.mod go.sum vendor/modules.txt /out/notices/
cp /work/src/LICENSE /out/notices/LICENSE
cp /work/src/vendor/golang.org/x/net/LICENSE /out/notices/x-net-LICENSE
sha256sum /out/caddy
