#!/bin/sh
# Isolated candidate only: read-only root, no capabilities, no network/devices.
set -eu
TASK_CHECK=$(mktemp -d /tmp/utilibre-utils-check-XXXXXX)
trap 'rm -r "$TASK_CHECK"' EXIT
for library in /usr/lib/x86_64-linux-gnu/libmount.so.1 /usr/lib/x86_64-linux-gnu/libblkid.so.1 /usr/lib/x86_64-linux-gnu/libuuid.so.1 /usr/lib/x86_64-linux-gnu/libsmartcols.so.1 /usr/lib/x86_64-linux-gnu/liblastlog2.so.2; do
 ldd -r "$library" > "$TASK_CHECK/imports"
 ! grep -E 'not found|undefined symbol' "$TASK_CHECK/imports"
done
findmnt --list --noheadings --output TARGET / >/dev/null
printf 'none /fictional-one tmpfs noauto 0 0\nnone /fictional-two tmpfs noauto 0 0\n' > "$TASK_CHECK/fstab"
findmnt --fstab --tab-file "$TASK_CHECK/fstab" --noheadings --output TARGET > "$TASK_CHECK/parsed"
test "$(wc -l < "$TASK_CHECK/parsed")" -eq 2
grep -q '^/fictional-one$' "$TASK_CHECK/parsed"
flock "$TASK_CHECK/lock" true
setpriv --no-new-privs sh -ec 'test "$(id -u)" -eq 0'
/native/mount-helper-regression 1
/native/mount-helper-regression 0
export UTILIBRE_CGROUP_FIXTURE
UTILIBRE_CGROUP_FIXTURE=$(mktemp /tmp/utilibre-cgroup-XXXXXX)
LD_PRELOAD=/native/nsenter-fd-shim.so nsenter --mount=/proc/self/ns/mnt --target $$ --join-cgroup /native/check-inherited-fd
rm "$UTILIBRE_CGROUP_FIXTURE"
echo NATIVE_UTIL_LINUX_REGRESSIONS_AND_PARSING_PASSED
