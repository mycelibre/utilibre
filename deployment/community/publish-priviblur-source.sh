#!/bin/sh
set -eu
root=/home/ubuntu/freetools/deployment/community
upstream=/opt/utilibre/community-src/priviblur
test "$(git -C "$upstream" rev-parse HEAD)" = 251a8e67c64d792b3c8c141860ccaa227ce62e4d
test -z "$(git -C "$upstream" status --porcelain)"
test "$(git -C "$upstream" remote get-url origin)" = https://github.com/syeopite/priviblur.git
stage=$(mktemp -d /opt/utilibre/priviblur-source-XXXXXX)
chmod 755 "$stage"
cp -a "$upstream" "$stage/upstream"
for file in Dockerfile.priviblur priviblur-requirements.txt priviblur-source-notice.patch priviblur-SOURCE.txt; do
  cp "$root/$file" "$stage/$file"
done
docker exec utilibre-priviblur-priviblur-1 pip freeze > "$stage/build-requirements.txt"
tar -C "$stage" -czf "$stage/priviblur-utilibre.tar.gz" upstream Dockerfile.priviblur priviblur-requirements.txt priviblur-source-notice.patch priviblur-SOURCE.txt build-requirements.txt
install -m 644 "$stage/priviblur-utilibre.tar.gz" /opt/utilibre/toolbox-public/priviblur-utilibre.tar.gz
sha256sum /opt/utilibre/toolbox-public/priviblur-utilibre.tar.gz
printf 'Source staging retained at %s\n' "$stage"
