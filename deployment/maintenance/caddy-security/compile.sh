#!/bin/sh
# Exact upstream release's buildable source+vendor tree, new patched compiler.
set -eu
EXPECTED_GO=${EXPECTED_GO:-1.26.9}
case "$EXPECTED_GO" in 1.26.9|1.26.10) ;; *) exit 2;; esac
test "$(go env GOVERSION)" = "go$EXPECTED_GO"
export CGO_ENABLED=0 GOTOOLCHAIN=local GOTELEMETRY=off GOMAXPROCS=1
export GOMEMLIMIT=256MiB GOCACHE=/work/cache TMPDIR=/work/tmp GOPROXY=off GOSUMDB=off
mkdir -p /work/src /work/tmp /out/notices
if [ "$EXPECTED_GO" = 1.26.10 ]; then cp /input/source.tar.gz /work/source.tar.gz; else
 wget -q -O /work/source.tar.gz https://github.com/caddyserver/caddy/releases/download/v2.11.7/caddy_2.11.7_buildable-artifact.tar.gz
fi
echo 'b430516910839fbaf35c0a9e9df80d1e2e30aa792530293c39f4a97a1b2c9060  /work/source.tar.gz' | sha256sum -c -
tar -xzf /work/source.tar.gz -C /work/src
cd /work/src
if [ "${CADDY_NET_REVIEW:-0}" = 1 ]; then
  # Only the reviewed x/net source tree changes; its go.mod requires the same
  # crypto/sys/term/text versions already vendored by this Caddy release.
  if [ "$EXPECTED_GO" = 1.26.10 ]; then cp /input/net.zip /work/net.zip; else
   wget -q -O /work/net.zip https://proxy.golang.org/golang.org/x/net/@v/v0.60.0.zip
  fi
  echo '052e0453db47a96ae9567503e7c95ea925ab52682cb1cec31250541f7160107e  /work/net.zip' | sha256sum -c -
  unzip -q /work/net.zip -d /work/net-new
  mv vendor/golang.org/x/net /work/net-original
  cp -a /work/net-new/golang.org/x/net@v0.60.0 vendor/golang.org/x/net
  go mod edit -require=golang.org/x/net@v0.60.0
  sed -i 's/^# golang.org\/x\/net v0.59.0$/# golang.org\/x\/net v0.60.0/' vendor/modules.txt
  printf '%s\n' 'golang.org/x/net v0.60.0 h1:79p50tfZlm0J9YfoDsSi639qSXNGVwEzOPLCxM2FsYU=' 'golang.org/x/net v0.60.0/go.mod h1:2DA/G1UfVbCpQPeWTmMPGY7Cs2PkBkwu743bVX5PIVg=' >> go.sum
fi
if [ "${UTILIBRE_CADDY_JOSE:-0}" = 1 ]; then
  echo '62506f3369fc124682356bbe8eb442f982422401dda99ace200694efc962da76  /input/jose-v4.zip' | sha256sum -c -
  echo '33ef78dec914e0329666bc9d8d3d4ac6dac8e716f5f4a07370c2f27caa725abf  /input/jose-v3.patch' | sha256sum -c -
  echo '79f510a4b97fa2e34ec37932cab57e64dfdc9fa6c314654d1ccc2dd93898a532  vendor/github.com/go-jose/go-jose/v3/jwk.go' | sha256sum -c -
  # The exact checked patch postimage is prepared outside this compiler image,
  # which intentionally has no Git/package installation during compilation.
  cp /input/jose-v3-jwk.go vendor/github.com/go-jose/go-jose/v3/jwk.go
  echo '7593d1576566ed8330ceb98c8f0d077a82e6ab2fa5801f60abd24533e1e9293b  vendor/github.com/go-jose/go-jose/v3/jwk.go' | sha256sum -c -
  unzip -q /input/jose-v4.zip -d /work/jose-new
  mv vendor/github.com/go-jose/go-jose/v4 /work/jose-v4-original
  cp -a /work/jose-new/github.com/go-jose/go-jose/v4@v4.1.6 vendor/github.com/go-jose/go-jose/v4
  go mod edit -require=github.com/go-jose/go-jose/v4@v4.1.6
  test "$(grep -c '^# github.com/go-jose/go-jose/v4 v4.1.5$' vendor/modules.txt)" = 1
  sed -i 's@^# github.com/go-jose/go-jose/v4 v4.1.5$@# github.com/go-jose/go-jose/v4 v4.1.6@' vendor/modules.txt
  cat /input/jose-v4.sums >> go.sum
  cp /input/jose-v3.patch /out/notices/
  cp vendor/github.com/go-jose/go-jose/v3/LICENSE /out/notices/go-jose-v3-LICENSE
  cp vendor/github.com/go-jose/go-jose/v4/LICENSE /out/notices/go-jose-v4-LICENSE
fi
if [ "${UTILIBRE_CADDY_CODEC:-0}" = 1 ]; then
  test "${UTILIBRE_CADDY_JOSE:-0}" = 1
  echo 'f85b4729a966a3d0313310482a11b585f0be445a20b2ea0c967937fe14c17acc  /input/codec.zip' | sha256sum -c -
  test "$(grep -c '^# github.com/klauspost/compress v1.20.1$' vendor/modules.txt)" = 1
  unzip -q /input/codec.zip -d /work/codec-new
  mv vendor/github.com/klauspost/compress /work/codec-original
  cp -a /work/codec-new/github.com/klauspost/compress@v1.20.2 vendor/github.com/klauspost/compress
  go mod edit -require=github.com/klauspost/compress@v1.20.2
  sed -i 's@^# github.com/klauspost/compress v1.20.1$@# github.com/klauspost/compress v1.20.2@' vendor/modules.txt
  printf '%s\n' 'github.com/klauspost/compress v1.20.2 h1:v5tiZvm1KGLyg5d5oXdXe3lsSPrbEUiKoXGia//I7Qo=' 'github.com/klauspost/compress v1.20.2/go.mod h1:LUdAzn7YLVvxLpc7y3V1m40wESHTgc1422pwwBSKYuI=' >> go.sum
  cp vendor/github.com/klauspost/compress/LICENSE /out/notices/compress-LICENSE
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
