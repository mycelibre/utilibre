#!/bin/sh
# Images only: hash unrelated native/application files, never live user data.
set -eu
dpkg-query -L libperl5.38t64 perl perl-base perl-modules-5.38 | sort -u > /tmp/perl-owned
find /usr /etc /opt -xdev \( -type f -o -type l \) -print > /tmp/all-files
sort -u /tmp/all-files | grep -F -x -v -f /tmp/perl-owned | while IFS= read -r p; do
  test -L "$p" && printf 'link|%s|%s\n' "$p" "$(readlink "$p")"
  if test ! -L "$p"; then sha256sum "$p"; fi
  stat -c '%a|%u|%g|%n' "$p"
done
