#!/bin/sh
set -eu
root=/home/ubuntu/freetools
source=/opt/utilibre/community-src/biblioreads-utilibre-p1
test "$(git -C "$source" rev-parse HEAD)" = 9508abc64c6b35eef366e041fef47554f0ee888a
cp "$root/deployment/community/Dockerfile.biblioreads" "$source/Dockerfile.utilibre"
mkdir -p "$source/deployment"
cp "$root/deployment/community/compose.biblioreads.yaml" "$root/deployment/community/biblioreads-gateway.conf" "$root/deployment/community/additions-firewall.sh" "$root/deployment/toolbox/firewall.sh" "$source/deployment/"
git -C "$source" add -N utilibre-preload.cjs pages/api/image.js middleware.js tests/utilibre.cjs .dockerignore UTILIBRE-SOURCE.txt Dockerfile.utilibre deployment
git -C "$source" diff HEAD --binary > "$root/deployment/community/biblioreads-source.patch"
if test -f /opt/utilibre/toolbox-public/biblioreads-utilibre.tar.gz; then
  backup=$(mktemp -d /opt/utilibre/source-update-biblioreads-XXXXXX)
  cp /opt/utilibre/toolbox-public/biblioreads-utilibre.tar.gz "$backup/"
fi
tar --exclude=.git --exclude=node_modules --exclude=.next --exclude='.env*' -czf /opt/utilibre/toolbox-public/biblioreads-utilibre.tar.gz -C "$source" .
chmod 644 /opt/utilibre/toolbox-public/biblioreads-utilibre.tar.gz
sha256sum /opt/utilibre/toolbox-public/biblioreads-utilibre.tar.gz
