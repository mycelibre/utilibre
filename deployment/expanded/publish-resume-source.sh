#!/bin/sh
# Exact pinned native source with the small visitor-statistics removal and build recipe.
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
source=/opt/utilibre/expanded-src/resume-utilibre-p1
revision=bc71f636c02a80ac6d731e17d2ee13501275295c
[ "$(git -C "$source" rev-parse HEAD)" = "$revision" ]
stage=$(mktemp -d /opt/utilibre/resume-source-XXXXXX)
trap 'rm -rf "$stage"' EXIT HUP INT TERM
git -C "$source" archive --prefix=reactive-resume/ "$revision" | tar -x -C "$stage"
git -C "$stage/reactive-resume" apply "$repo/deployment/expanded/resume-no-tracking-source.patch"
mkdir "$stage/reactive-resume/utilibre-deployment"
for file in Dockerfile.resume prepare-resume-no-tracking.mjs resume-no-tracking-source.patch check-resume-no-tracking.mjs check-resume-no-tracking-start.mjs check-resume-public.mjs resume-public-qa.py publish-resume-source.sh resume-start.mjs; do
 cp "$repo/deployment/expanded/$file" "$stage/reactive-resume/utilibre-deployment/"
done
tar -czf "$stage/reactive-resume-utilibre.tar.gz" -C "$stage" reactive-resume
chmod 644 "$stage/reactive-resume-utilibre.tar.gz"
mv "$stage/reactive-resume-utilibre.tar.gz" /opt/utilibre/toolbox-public/reactive-resume-utilibre.tar.gz
sha256sum /opt/utilibre/toolbox-public/reactive-resume-utilibre.tar.gz
