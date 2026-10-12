#!/bin/sh
set -eu
# Libraries must be configured before util-linux's exact Pre-Depends.
dpkg --force-confold --install /tmp/utilibre-util-linux-packages/lib*.deb
for file in /tmp/utilibre-util-linux-packages/*.deb; do
 case "${file##*/}" in lib*) continue ;; esac
 dpkg --force-confold --install "$file"
done
test -z "$(dpkg --audit)"
# Penpot's bundled ImageMagick loader also resolves these private copies.
# Keep its loader configuration; update only existing, matching-SONAME copies.
for library in libmount.so.1 libblkid.so.1; do
 private="/opt/imagick/lib/deps/$library"
 if test -f "$private"; then
  test ! -L "$private"
  cp "/usr/lib/x86_64-linux-gnu/$library" "$private"
 fi
done
# DHI status.d records describe the old image layer. Remove only records for
# packages just installed and represented by the real dpkg database; retain
# every unrelated record. This avoids duplicate old/new package inventories.
for file in /tmp/utilibre-util-linux-packages/*.deb; do
 package=$(dpkg-deb -f "$file" Package)
 case "$package" in bsdutils|bsdextrautils|libblkid1|liblastlog2-2|libmount1|libsmartcols1|libuuid1|login|mount|util-linux) ;; *) exit 1 ;; esac
 test "$(dpkg-query -W -f='${source:Version}' "$package")" = '2.41.5-0+deb13u1+utilibre2'
 record="/var/lib/dpkg/status.d/$package"
 if test -e "$record"; then
  test -f "$record" && test ! -L "$record"
  test "$(sed -n 's/^Package: //p' "$record")" = "$package"
  rm "$record"
 fi
done
