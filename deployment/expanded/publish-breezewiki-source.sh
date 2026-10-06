#!/bin/sh
set -eu
root=/home/ubuntu/freetools
source=/opt/utilibre/expanded-src/breezewiki-utilibre-p1
test "$(git -C "$source" rev-parse HEAD)" = 6d09507b6e7ecec0cbac4c2c4eb223c10ccc23a4
cp "$root/deployment/expanded/Dockerfile.breezewiki-source" "$source/Dockerfile.utilibre"
mkdir -p "$source/deployment"
cp "$root/deployment/expanded/wiki-gateway.conf" "$root/deployment/expanded/wiki-firewall.sh" "$source/deployment/"
docker run --rm --network none --entrypoint raco utilibre-breezewiki:6d09507-p2 pkg show --all --long --full-checksum > "$source/UTILIBRE-RACKET-PACKAGES.txt"
git -C "$source" add -N .dockerignore utilibre-transport.py test_utilibre_transport.py test_proxy_response.py UTILIBRE-SOURCE.txt UTILIBRE-RACKET-PACKAGES.txt Dockerfile.utilibre deployment
git -C "$source" diff HEAD --binary > "$root/deployment/expanded/breezewiki-source.patch"
if test -f /opt/utilibre/toolbox-public/breezewiki-utilibre.tar.gz; then
  backup=$(mktemp -d /opt/utilibre/source-update-breezewiki-XXXXXX)
  cp /opt/utilibre/toolbox-public/breezewiki-utilibre.tar.gz "$backup/"
fi
tar --exclude=.git --exclude=compiled --exclude=storage --exclude=__pycache__ -czf /opt/utilibre/toolbox-public/breezewiki-utilibre.tar.gz -C "$source" .
chmod 644 /opt/utilibre/toolbox-public/breezewiki-utilibre.tar.gz
sha256sum /opt/utilibre/toolbox-public/breezewiki-utilibre.tar.gz
