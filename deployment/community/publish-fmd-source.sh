#!/bin/sh
# Publish the exact native FMD source plus the small disclosure patch and recipe.
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
source=/opt/utilibre/community-src/fmd-server-utilibre-p1
revision=224b60c0756ff363bc19063082a8a1543559cf96
[ "$(git -C "$source" rev-parse HEAD)" = "$revision" ]
output=/opt/utilibre/toolbox-public/fmd-utilibre.tar.gz
stage=$(mktemp -d /opt/utilibre/fmd-source-XXXXXX)
trap 'rm -rf "$stage"' EXIT HUP INT TERM
git -C "$source" archive --prefix=fmd-server/ "$revision" | tar -x -C "$stage"
git -C "$stage/fmd-server" apply "$repo/deployment/community/fmd-privacy-source.patch"
git -C "$stage/fmd-server" apply "$repo/deployment/community/fmd-export-zero-source.patch"
git -C "$stage/fmd-server" apply "$repo/deployment/community/fmd-map-policy-source.patch"
mkdir "$stage/fmd-server/utilibre-deployment"
cp "$repo/deployment/community/fmd-privacy-source.patch" "$repo/deployment/community/prepare-fmd-web.mjs" "$repo/deployment/community/publish-fmd-source.sh" "$repo/deployment/community/check-fmd-privacy.mjs" "$repo/deployment/community/compose.additions.yaml" "$repo/deployment/community/fmd-gateway.conf" "$stage/fmd-server/utilibre-deployment/"
cp "$repo/deployment/community/fmd-export-zero-source.patch" "$repo/deployment/community/check-fmd-export.mjs" "$repo/docs/fmd-export-verification-2026-10-09.md" "$stage/fmd-server/utilibre-deployment/"
cp "$repo/deployment/community/fmd-map-policy-source.patch" "$stage/fmd-server/utilibre-deployment/"
tar -czf "$stage/fmd-utilibre.tar.gz" -C "$stage" fmd-server
chmod 644 "$stage/fmd-utilibre.tar.gz"
mv "$stage/fmd-utilibre.tar.gz" "$output"
sha256sum "$output"
