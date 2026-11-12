#!/bin/sh
# An isolated stage, not the host source tree. Separate downloads from offline tests.
set -eu
umask 077
recipe=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
stage=${2:?Usage: build.sh prepare|build /absolute/new-stage}
case "$stage" in /var/lib/utilibre-maintenance/*) ;; *) exit 2;; esac
revision=63837fb778d6a39f02be0ce76ff89f2bc8d74bdc
builder=sha256:942720fe0171599572cc00a947269179ed3eb7f0cfa5591dbb621766df35022b
case "${1:-}" in
 prepare)
  test ! -e "$stage"
  mkdir -p "$stage/modules" "$stage/output"
  curl --proto '=https' -fsSL --max-time 180 "https://codeload.github.com/cli/cli/tar.gz/$revision" -o "$stage/cli-source.tar.gz"
  curl --proto '=https' -fsSL --max-time 180 https://go.dev/dl/go1.27.4.linux-amd64.tar.gz -o "$stage/go1.27.4.linux-amd64.tar.gz"
  printf '%s  %s\n' 1a64dc5be667fa8c6458c0e639292ee1a5e215854705db267882e1bcf865b335 "$stage/cli-source.tar.gz" 7226736c2339719cda28fbf3a54d71aa63bcefe376e98cef00034268dab24840 "$stage/go1.27.4.linux-amd64.tar.gz" | sha256sum -c -
  tar -xf "$stage/cli-source.tar.gz" -C "$stage"
  tar -xf "$stage/go1.27.4.linux-amd64.tar.gz" -C "$stage"
  cp "$recipe/go.mod" "$recipe/go.sum" "$stage/cli-$revision/"
  docker run --rm --network bridge --read-only --cpus 2 --memory 2g --memory-swap 2g --pids-limit 128 --cap-drop ALL --security-opt no-new-privileges --log-driver none \
   --tmpfs /tmp:rw,exec,size=512m -e GOROOT=/sdk -e GOTOOLCHAIN=local -e GOTELEMETRY=off -e GOCACHE=/tmp/cache -e GOMODCACHE=/modules \
   -v "$stage/go:/sdk:ro" -v "$stage/cli-$revision:/work:ro" -v "$stage/modules:/modules" -w /work "$builder" /sdk/bin/go mod download
  ;;
 build)
  cmp "$recipe/go.mod" "$stage/cli-$revision/go.mod"
  cmp "$recipe/go.sum" "$stage/cli-$revision/go.sum"
  test ! -e "$stage/output/gh"
  docker run --rm --network none --read-only --cpus 2 --memory 4g --memory-swap 4g --pids-limit 256 --cap-drop ALL --security-opt no-new-privileges --log-driver none \
   --tmpfs /tmp:rw,exec,size=3g -e GOROOT=/sdk -e GOTOOLCHAIN=local -e GOTELEMETRY=off -e GOCACHE=/tmp/cache -e GOMODCACHE=/modules \
   -e GOPROXY=off -e GOSUMDB=off -e CGO_ENABLED=0 -e GOMAXPROCS=2 -e GH_TELEMETRY=disabled -e GH_CONFIG_DIR=/tmp/gh-config -e XDG_CACHE_HOME=/tmp/gh-cache \
   -v "$stage/go:/sdk:ro" -v "$stage/cli-$revision:/work:ro" -v "$stage/modules:/modules:ro" -v "$stage/output:/output" -w /work "$builder" sh -ec '
    /sdk/bin/go build -mod=readonly -trimpath -ldflags "-s -w -X github.com/cli/cli/v2/internal/build.Version=2.103.3+utilibre1 -X github.com/cli/cli/v2/internal/build.Date=2026-11-12" -o /output/gh ./cmd/gh
    /sdk/bin/go test -mod=readonly -timeout=5m ./pkg/cmd/api ./pkg/cmd/completion ./api ./internal/telemetry
    /output/gh --version
    /output/gh completion --shell bash > /output/gh-completion.bash
   '
  ;;
 *) exit 2;;
esac
