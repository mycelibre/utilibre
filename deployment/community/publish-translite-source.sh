#!/bin/sh
set -eu
root=/home/ubuntu/freetools
source=/opt/utilibre/community-src/translite-utilibre-p1
test "$(git -C "$source" rev-parse HEAD)" = 7b4b8e51359338219463f14c2a06211b6998a11e
cp "$root/deployment/community/Dockerfile.translite" "$source/Dockerfile.utilibre"
mkdir -p "$source/deployment"
cp "$root/deployment/community/compose.translite.yaml" "$root/deployment/community/translite-fpm.conf" "$root/deployment/community/translite-gateway.conf" "$root/deployment/community/additions-firewall.sh" "$root/deployment/toolbox/firewall.sh" "$source/deployment/"
git -C "$source" add -N parsers/utilibre-http.php tests/utilibre.php .dockerignore UTILIBRE-SOURCE.txt Dockerfile.utilibre deployment
git -C "$source" diff HEAD --binary > "$root/deployment/community/translite-source.patch"
if test -f /opt/utilibre/toolbox-public/translite-utilibre.tar.gz; then
  backup=$(mktemp -d /opt/utilibre/source-update-translite-XXXXXX)
  cp /opt/utilibre/toolbox-public/translite-utilibre.tar.gz "$backup/"
fi
tar --exclude=.git -czf /opt/utilibre/toolbox-public/translite-utilibre.tar.gz -C "$source" .
chmod 644 /opt/utilibre/toolbox-public/translite-utilibre.tar.gz
sha256sum /opt/utilibre/toolbox-public/translite-utilibre.tar.gz
