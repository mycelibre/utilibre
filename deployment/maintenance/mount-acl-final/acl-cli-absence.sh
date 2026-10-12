#!/bin/sh
# Read-only native CLI/package inventory. Prints no user files or path contents.
set -eu
test "$(dpkg-query -W -f='${Status}' libacl1)" = 'install ok installed'
dpkg-query -W -f='version=${Version}\n' libacl1
state=$(dpkg-query -W -f='${Status}' acl 2>/dev/null || true)
case "$state" in *' installed') echo 'acl-package-present'; exit 1;; esac
for cmd in getfacl setfacl chacl; do
  if command -v "$cmd" >/dev/null 2>&1; then echo 'acl-command-present'; exit 1; fi
done
# Walk only the native executable roots on the host. In a container, inspect
# its complete root filesystem but never traverse mounted data/proc/sys trees.
if test "${1:-}" = host; then
  found=$(find /usr /bin /sbin /opt -xdev \( -type f -o -type l \) \( -name getfacl -o -name setfacl -o -name chacl \) -print -quit)
elif test "${1:-}" = live; then
  # Production containers can intentionally drop DAC override. Inspect their
  # package and command state without relaxing those privileges. A separate
  # read-only container checks the exact image filesystem, without user mounts.
  found=''
else
  found=$(find / -xdev \( -path /var/lib/apt/lists/partial -o -path /var/cache/apt/archives/partial \) -prune -o \( -type f -o -type l \) \( -name getfacl -o -name setfacl -o -name chacl \) -print -quit)
fi
test -z "$found" || { echo 'acl-file-present'; exit 1; }
# bind the runtime library payload, not only the dpkg version string.
dpkg-query -L libacl1 | while IFS= read -r p; do
  case "$p" in */libacl.so.*) if test -f "$p" && ! test -L "$p"; then sha256sum "$p"; fi;; esac
done
printf '%s\n' 'acl-package-and-commands-absent'
