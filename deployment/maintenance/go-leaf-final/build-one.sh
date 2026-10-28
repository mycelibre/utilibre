#!/bin/sh
set -eu
name="$1"
PHASE=${UTILIBRE_PHASE:-legacy}
case "$PHASE" in legacy|download|build) ;; *) exit 2;; esac
test "$(go version)" = "go version go${EXPECTED_GO} linux/amd64"
export GOTOOLCHAIN=local GOTELEMETRY=off GOMAXPROCS=2 GOMEMLIMIT=512MiB GOGC=50
export CGO_ENABLED=0 GOOS=linux GOARCH=amd64 GOCACHE=/work/cache GOMODCACHE=/work/mod GOTMPDIR=/work/tmp TMPDIR=/work/tmp
export ZONEINFO=/usr/local/go/lib/time/zoneinfo.zip
if [ "$PHASE" != legacy ]; then export GOMODCACHE=/modules; fi
if [ "$PHASE" = build ]; then export GOPROXY=off GOSUMDB=off; fi
mkdir -p /work/src /work/tmp
if [ "$name" = mezzo ]; then
 tar -C /work/src -xf /source.tar
else
 tar -C /source --exclude=.git --exclude=node_modules -cf - . | tar -C /work/src -xf -
fi
cd /work/src
case "$name" in
 oauth2-proxy) target=.; flags='-X github.com/oauth2-proxy/oauth2-proxy/v7/pkg/version.VERSION=v7.15.5'; tests='./pkg/... ./providers';;
 wakapi) target=main.go; flags='-s -w'; tests='./utils ./helpers ./config'; export GOEXPERIMENT=jsonv2 GOFLAGS=-trimpath ZONEINFO=/usr/local/go/lib/time/zoneinfo.zip;;
 mezzo) target=./cmd/mezzo; flags='-s -w -X main.version=1.4.0'; tests='./...'; export GOEXPERIMENT=nodwarf5;;
 opengist) target=.; flags='-X github.com/thomiceli/opengist/internal/config.OpengistVersion=v1.15.2'; tests='./internal/config ./internal/render ./internal/i18n/...'; export GOFLAGS='-tags=fs_embed'; cp -a /assets/assets /assets/.vite public/;;
 anubis) target=./cmd/anubis; flags='-s -w -X github.com/TecharoHQ/anubis.Version=v1.27.0'; tests='./lib/config ./lib/challenge/... ./web'; export GOFLAGS=-trimpath; cp -a /assets/web/static web/; cp -a /assets/xess/static /assets/xess/xess.css /assets/xess/xess.min.css xess/; cp -a /assets/challenge/preact/static lib/challenge/preact/; cp -a /assets/challenge/proofofwork/static lib/challenge/proofofwork/;;
 ntfy) target=.; flags='-linkmode=external -extldflags=-static -s -w -X main.version=2.28.0 -X main.commit=10cb6506f836dbb00bb77e3b52669f6ace37f555 -X main.date=2026-08-27T20:25:10Z'; tests='./util ./client ./server'; export CGO_ENABLED=1 GOFLAGS='-trimpath -tags=sqlite_omit_load_extension,osusergo,netgo'; cp -a /assets/site /assets/docs server/;;
 vikunja) target=.; flags='-linkmode=external -extldflags=-static -X code.vikunja.io/api/pkg/version.Version=v2.7.0 -X "main.Tags=osusergo netgo"'; tests='./pkg/config ./pkg/utils'; export CGO_ENABLED=1 GOFLAGS='-trimpath -tags=osusergo,netgo'; cp -a /assets/dist frontend/;;
 *) exit 2;;
esac
cp go.mod "/output/$name-go.mod.before"
cp go.sum "/output/$name-go.sum.before"
if [ "$PHASE" != legacy ]; then test -f "/scripts/locks/$name/go.mod"; fi
if [ -f "/scripts/locks/$name/go.mod" ]; then
 cp "/scripts/locks/$name/go.mod" go.mod
 cp "/scripts/locks/$name/go.sum" go.sum
elif [ "$name" = anubis ]; then
 go get golang.org/x/net@v0.60.0 github.com/google/cel-go@v0.29.0 google.golang.org/grpc@v1.83.2
else
 go get golang.org/x/net@v0.60.0
fi
if [ "$PHASE" = download ]; then go mod download; fi
go mod verify > "/output/$name-mod-verify.txt"
if [ "$name" != mezzo ]; then
 grep -Eq 'golang.org/x/crypto v0\.57\.0' go.mod
 grep -Eq 'golang.org/x/text v0\.42\.0' go.mod
fi
cp go.mod "/output/$name-go.mod"
cp go.sum "/output/$name-go.sum"
if [ "$PHASE" = download ]; then exit 0; fi
export GOFLAGS="${GOFLAGS:-} -mod=readonly"
if [ "$name" = ntfy ]; then
 go test -p 1 ./util ./client > "/output/$name-tests.txt" 2>&1
 go test -p 1 ./server -run '^(TestServer_PublishAndPoll|TestServer_PublishAndSubscribe|TestServer_PublishNoCache|TestServer_Publish_Disallowed_Topic|TestServer_MetricsDisabled)$' >> "/output/$name-tests.txt" 2>&1
else
 go test -p 1 $tests > "/output/$name-tests.txt" 2>&1
fi
go build -p 1 -trimpath -ldflags "$flags" -o "/output/$name" "$target"
go version -m "/output/$name" > "/output/$name-buildinfo.txt"
sha256sum "/output/$name"
