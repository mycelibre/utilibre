#!/bin/sh
# Build reproducible-to-inspect source artifacts from the reviewed checkout.
set -eu
root=/home/ubuntu/freetools
source=/opt/utilibre/community-src/binternet-utilibre-p1
test "$(git -C "$source" rev-parse HEAD)" = 9bb70ef26c8b79a315e77b79bfd346433d55cbb6
cp "$root/deployment/community/Dockerfile.binternet" "$source/Dockerfile.utilibre"
mkdir -p "$source/deployment"
cp "$root/deployment/community/compose.binternet.yaml" "$root/deployment/community/binternet-fpm.conf" "$root/deployment/community/binternet-gateway.conf" "$root/deployment/community/additions-firewall.sh" "$root/deployment/toolbox/firewall.sh" "$source/deployment/"
cp "$root/deployment/community/compose.binternet-onion.yaml" "$root/deployment/community/binternet-onion-fpm.conf" "$root/deployment/community/binternet-onion-gateway.conf" "$root/deployment/community/binternet-torrc" "$root/deployment/community/Dockerfile.tor" "$source/deployment/"
git -C "$source" add -N misc/utilibre-http.php tests/utilibre-http.php UTILIBRE-SOURCE.txt Dockerfile.utilibre deployment
git -C "$source" diff --binary > "$root/deployment/community/binternet-source.patch"
tar --exclude=.git --exclude=.github -czf /opt/utilibre/toolbox-public/binternet-utilibre.tar.gz -C "$source" .
chmod 644 /opt/utilibre/toolbox-public/binternet-utilibre.tar.gz
sha256sum /opt/utilibre/toolbox-public/binternet-utilibre.tar.gz
