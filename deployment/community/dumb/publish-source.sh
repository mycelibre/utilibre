#!/bin/sh
set -eu
root=/home/ubuntu/freetools
revision=f5581074850bc31ed7df1ce96e8f428179bf0abb
stage=$(mktemp -d /opt/utilibre/source-dumb-XXXXXX)
mkdir -p "$stage/source" "$stage/utilibre-deployment"
git -C /opt/utilibre/community-src/dumb archive "$revision" | tar -x -C "$stage/source"
git -C "$stage/source" apply --unidiff-zero "$root/deployment/community/dumb/source.patch"
cp "$root"/deployment/community/dumb/* "$stage/utilibre-deployment/"
cp "$root/docs/dumb-repair-2026-10-09.md" "$stage/utilibre-deployment/"
cp "$root/docs/dumb-ipv6-readiness-2026-10-09.md" "$stage/utilibre-deployment/"
printf '%s\n' 'Dumb f558107-p1 PRIVATE evaluation: Genius access still blocked from this VM.' 'MIT source; see utilibre-deployment/dumb-repair-2026-10-09.md for exact native build and remaining gate.' 'Patched source is in source/. Do not apply source.patch a second time to that directory.' > "$stage/BUILD.txt"
archive=/opt/utilibre/toolbox-public/dumb-utilibre.tar.gz
if test -f "$archive"; then cp "$archive" "$stage/previous-source.tar.gz"; fi
tar --exclude=previous-source.tar.gz -czf "$stage/current.tar.gz" -C "$stage" source utilibre-deployment BUILD.txt
install -m 644 "$stage/current.tar.gz" "$archive"
sha256sum "$archive"
