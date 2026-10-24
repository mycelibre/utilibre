#!/bin/sh
# Reuse upstream's MIT regression; isolated synthetic loopback endpoints only.
set -eu
export GOPATH=/work/gopath GOCACHE=/work/cache GOMODCACHE=/modules GOTOOLCHAIN=local GOTELEMETRY=off GOMAXPROCS=2 TMPDIR=/work
mkdir -p /work/echo
cd /work/echo
for pair in v4:v4.15.4:v4.16.1 v5:v5.3.1:v5.4.1; do
 major=${pair%%:*}; rest=${pair#*:}; old=${rest%%:*}; fixed=${rest#*:}
 if [ "$1" = download ]; then
  go mod download github.com/labstack/echo/$major@$old
  cp /modules/github.com/labstack/echo/$major@$fixed/go.mod /modules/github.com/labstack/echo/$major@$fixed/go.sum .
  go mod download
  continue
 fi
 for version in "$old" "$fixed"; do
  target=/work/$major-$version
  mkdir -p "$target"
  cp -a /modules/github.com/labstack/echo/$major@$version/. "$target/"
  chmod -R u+w "$target"
  cp /modules/github.com/labstack/echo/$major@$fixed/go.mod /modules/github.com/labstack/echo/$major@$fixed/go.sum "$target/"
  cp /modules/github.com/labstack/echo/$major@$fixed/middleware/proxy_security_test.go "$target/middleware/"
  cd "$target"
  export GOPROXY=off GOSUMDB=off
  status=0
  go test -mod=readonly -count=1 -timeout=45s ./middleware -run '^TestProxyRejectedUpgradeKeepsRouting$' > /out/$major-$version.txt 2>&1 || status=$?
  if [ "$version" = "$old" ]; then
   test "$status" = 1
   grep -q 'expected: 403' /out/$major-$version.txt
   grep -q 'actual  : 200' /out/$major-$version.txt
  else
   test "$status" = 0
  fi
 done
done
