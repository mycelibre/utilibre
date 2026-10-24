#!/bin/sh
set -eu
root=/home/ubuntu/freetools
source=/opt/utilibre/community-src/degoog
revision=4a9bcc74f0fceaa33efbab4777f063274cce23d6
test "$(git -C "$source" rev-parse "$revision")" = "$revision"
stage=$(mktemp -d /opt/utilibre/source-degoog-XXXXXX)
git -C "$source" archive "$revision" | tar -x -C "$stage"
git -C "$stage" apply --check "$root/deployment/community/degoog-security.patch"
git -C "$stage" apply "$root/deployment/community/degoog-security.patch"
mkdir -p "$stage/utilibre-deployment" "$stage/utilibre-searx-engines"
cp "$root/deployment/community/configure-degoog.mjs" "$root/deployment/community/init-degoog.mjs" "$root/deployment/community/compose.evaluation.yaml" "$root/deployment/community/degoog-gateway.conf" "$root/deployment/community/check-degoog.mjs" "$stage/utilibre-deployment/"
cp "$root/deployment/community/check-degoog-settings.mjs" "$root/deployment/community/configure-degoog-search.mjs" "$root/deployment/community/check-degoog-search.mjs" "$stage/utilibre-deployment/"
cp "$root/deployment/community/degoog-security.patch" "$root/deployment/maintenance/security-20261022/build-degoog.mjs" "$root/deployment/maintenance/security-20261022/build-degoog.sh" "$stage/utilibre-deployment/"
mkdir -p "$stage/utilibre-deployment/php-20261022"
for file in specs.mjs inputs.v1.json checks.mjs build.mjs check-degoog.mjs; do
 cp "$root/deployment/maintenance/php-20261022/$file" "$stage/utilibre-deployment/php-20261022/"
done
cp "$root/docs/records/degoog-settings-2026-10-09.md" "$root/docs/records/degoog-search-2026-10-09.md" "$stage/utilibre-deployment/"
cp /opt/utilibre/community-src/degoog-searx-engines/*.traits.json /opt/utilibre/community-src/degoog-searx-engines/*.py /opt/utilibre/community-src/degoog-searx-engines/LICENSE /opt/utilibre/community-src/degoog-searx-engines/SOURCE.json "$stage/utilibre-searx-engines/"
archive=/opt/utilibre/toolbox-public/degoog-utilibre.tar.gz
if test -f "$archive"; then cp "$archive" "$stage/previous-source.tar.gz"; fi
tar --exclude=previous-source.tar.gz -czf "$archive" -C "$stage" .
chmod 644 "$archive"
sha256sum "$archive"
