#!/bin/sh
set -eu
root=/home/ubuntu/freetools
for project in rimgo kittygram qr-offline; do
  source=/opt/utilibre/community-src/$project-utilibre-p1
  case "$project" in
    rimgo) revision=d2be8e221522dfe7a06452e2002dcf6dad569d1a ;;
    kittygram) revision=5931c21c0990d4b216e97166dd78c03c9965567a ;;
    qr-offline) revision=0fde7004a08aac6a218e5d5e03c8a3c760eec1fa ;;
  esac
  test "$(git -C "$source" rev-parse HEAD)" = "$revision"
  cp "$root/deployment/community/Dockerfile.$project" "$source/Dockerfile.utilibre"
  mkdir -p "$source/deployment"
  cp "$root/deployment/community/compose.$project.yaml" "$root/deployment/community/additions-firewall.sh" "$root/deployment/toolbox/firewall.sh" "$source/deployment/"
  if test "$project" = qr-offline; then
    cp "$root/deployment/community/qr-offline-nginx.conf" "$source/deployment/"
  else
    cp "$root/deployment/community/$project-gateway.conf" "$source/deployment/"
  fi
  if test "$project" = kittygram; then
    cp "$root/deployment/community/init-kittygram.mjs" "$source/deployment/"
    docker run --rm --network none --entrypoint cat utilibre-kittygram:5931c21-p1 /usr/share/UTILIBRE-LUA-PACKAGES.txt > "$source/UTILIBRE-LUA-PACKAGES.txt"
  fi
  git -C "$source" add -N .
  git -C "$source" diff HEAD --binary > "$root/deployment/community/$project-source.patch"
  archive=/opt/utilibre/toolbox-public/$project-utilibre.tar.gz
  if test -f "$archive"; then
    backup=$(mktemp -d "/opt/utilibre/source-update-$project-XXXXXX")
    cp "$archive" "$backup/"
  fi
  tar --exclude=.git --exclude=node_modules --exclude=.env --exclude=runtime.env --exclude=nginx.conf.compiled --exclude=logs --exclude='*.sqlite*' -czf "$archive" -C "$source" .
  chmod 644 "$archive"
  sha256sum "$archive"
done
