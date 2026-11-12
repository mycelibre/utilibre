#!/bin/sh
# Reviewed Restic source + frozen native Go locks; no moving resolution in build.
set -eu
umask 077
task=/var/lib/utilibre-maintenance/host-tools-20261112
recipe=/home/ubuntu/freetools/deployment/maintenance/host-tools
compiler=sha256:942720fe0171599572cc00a947269179ed3eb7f0cfa5591dbb621766df35022b
source=$task/downloads/restic-6aa3a516ce654808a1f28f9fa21e9b7c8e6e90bf
case "${1:-}" in
 download)
  test ! -e "$source"
  mkdir -p "$task/downloads" "$task/restic-build"
  curl --proto '=https' --tlsv1.2 -fsSL --max-time 180 \
    https://codeload.github.com/restic/restic/tar.gz/6aa3a516ce654808a1f28f9fa21e9b7c8e6e90bf -o "$task/downloads/restic-source.tar.gz"
  printf '%s  %s\n' 6318c51f187bafbaf33d1ab6dcb5abde9a94de11476651cbb2982f1ba89ca8a8 "$task/downloads/restic-source.tar.gz" | sha256sum -c -
  tar -xf "$task/downloads/restic-source.tar.gz" -C "$task/downloads"
  cp "$recipe/restic/go.mod" "$source/go.mod"
  cp "$recipe/restic/go.sum" "$source/go.sum"
  docker run --rm --network bridge --read-only --cpus 2 --memory 2g --memory-swap 2g \
    --pids-limit 128 --cap-drop ALL --security-opt no-new-privileges --log-driver none \
    --tmpfs /tmp:rw,exec,size=512m -e GOPATH=/tmp/gopath -e GOTOOLCHAIN=local -e GOTELEMETRY=off \
    -e GOMODCACHE=/modules -v "$source:/work:ro" -v "$task/restic-build/modules:/modules" \
    -w /work "$compiler" go mod download
  ;;
 build)
  cmp "$recipe/restic/go.mod" "$source/go.mod"
  cmp "$recipe/restic/go.sum" "$source/go.sum"
  test ! -e "$task/restic-build/restic"
  docker run --rm --network none --read-only --cpus 2 --memory 4g --memory-swap 4g \
    --pids-limit 256 --cap-drop ALL --security-opt no-new-privileges --log-driver none \
    --tmpfs /tmp:rw,exec,size=3g -e GOPATH=/tmp/gopath -e GOTOOLCHAIN=local -e GOTELEMETRY=off \
    -e GOMODCACHE=/modules -e GOCACHE=/tmp/go-build -e GOPROXY=off -e GOSUMDB=off \
    -e GOMAXPROCS=2 -e CGO_ENABLED=0 -v "$source:/work:ro" -v "$task/restic-build/modules:/modules:ro" \
    -v "$task/restic-build:/output" -w /work "$compiler" sh -ec '
      go build -mod=readonly -trimpath -ldflags "-s -w -X main.version=0.19.1+utilibre1" -o /output/restic ./cmd/restic
      go test -mod=readonly -timeout=5m ./internal/backend/local ./internal/backend/sftp ./internal/repository ./internal/restic
    '
  ;;
 *) echo 'Use build-restic.sh download|build; neither activates the candidate.' >&2; exit 2 ;;
esac
