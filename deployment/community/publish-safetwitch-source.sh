#!/bin/sh
set -eu
root=/home/ubuntu/freetools
source=/opt/utilibre/community-src/safetwitch-utilibre-p1
test "$(git -C "$source" rev-parse HEAD)" = ddee63ebbe8b7b74d8f6ed3869cd7958934746d7
cp "$root/deployment/community/Dockerfile.safetwitch" "$source/Dockerfile.utilibre"
mkdir -p "$source/deployment"
cp "$root/deployment/community/safetwitch-evaluation.conf" "$root/deployment/community/check-safetwitch.mjs" "$source/deployment/"
git -C "$source" add -N Dockerfile.utilibre UTILIBRE-SOURCE.txt deployment/safetwitch-evaluation.conf deployment/check-safetwitch.mjs
git -C "$source" diff HEAD --binary > "$root/deployment/community/safetwitch-source.patch"
stage=$(mktemp -d /opt/utilibre/source-update-safetwitch-XXXXXX)
cp /opt/utilibre/toolbox-public/safetwitch-utilibre.tar.gz "$stage/previous-safetwitch-utilibre.tar.gz"
tar --exclude=.git --exclude=node_modules --exclude=dist --exclude='.env*' --exclude='*.tsbuildinfo' --exclude='*.log' -czf "$stage/safetwitch-utilibre.tar.gz" -C "$source" .
chmod 644 "$stage/safetwitch-utilibre.tar.gz"
mv "$stage/safetwitch-utilibre.tar.gz" /opt/utilibre/toolbox-public/safetwitch-utilibre.tar.gz
printf 'SafeTwitch source published; previous archive: %s\n' "$stage"
