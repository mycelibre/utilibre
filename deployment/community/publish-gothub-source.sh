#!/bin/sh
set -eu
root=/home/ubuntu/freetools
source=/opt/utilibre/community-src/gothub-utilibre-p1
test "$(git -C "$source" rev-parse HEAD)" = 24bedc80bed5fc4f72a8f140c97cb38fc2e67ed2
cp "$root/deployment/community/Dockerfile.gothub" "$source/Dockerfile.utilibre"
# Include staged files from the original hardening pass as well as later edits.
git -C "$source" diff HEAD --binary > "$root/deployment/community/gothub-source.patch"
backup=$(mktemp -d /opt/utilibre/source-update-gothub-XXXXXX)
cp /opt/utilibre/toolbox-public/gothub-utilibre.tar.gz "$backup/"
tar --exclude=.git -czf /opt/utilibre/toolbox-public/gothub-utilibre.tar.gz -C "$source" .
chmod 644 /opt/utilibre/toolbox-public/gothub-utilibre.tar.gz
sha256sum /opt/utilibre/toolbox-public/gothub-utilibre.tar.gz
