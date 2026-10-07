#!/bin/sh
set -eu
root=/home/ubuntu/freetools
source=/opt/utilibre/src/whitebophir
revision=f37875a6b427397e579e2a869caf073ae87ee264
test "$(git -C "$source" rev-parse HEAD)" = "$revision"
stage=$(mktemp -d /opt/utilibre/source-update-wbo-XXXXXX)
git -C "$source" archive --format=tar --output="$stage/wbo.tar" "$revision"
tar -rf "$stage/wbo.tar" -C "$root" deployment/community/wbo deployment/community/compose.collaboration.yaml deployment/community/compose.collaboration-lan.yaml deployment/community/Caddyfile.collaboration-pilot deployment/community/check-collaboration.mjs deployment/community/publish-wbo-source.sh docs/next-features.md
gzip "$stage/wbo.tar"
archive=/opt/utilibre/toolbox-public/wbo-utilibre.tar.gz
if test -f "$archive"; then cp "$archive" "$stage/previous-wbo.tar.gz"; fi
mv "$stage/wbo.tar.gz" "$archive"
chmod 644 "$archive"
sha256sum "$archive"
