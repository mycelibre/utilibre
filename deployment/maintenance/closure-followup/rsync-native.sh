#!/bin/sh
# Small fictional transfer only; run in a disposable no-network container.
set -eu
TASK_RSYNC_TMP=$(mktemp -d /tmp/utilibre-rsync-XXXXXXXX)
TASK_RSYNC_PID=
trap 'if test -n "$TASK_RSYNC_PID"; then kill "$TASK_RSYNC_PID" 2>/dev/null || true; wait "$TASK_RSYNC_PID" 2>/dev/null || true; fi; rm -r -- "$TASK_RSYNC_TMP"' EXIT HUP INT TERM
cd "$TASK_RSYNC_TMP"
rsync --version | head -1 | grep -q 'version 3.5.1'
ldd -r /usr/bin/rsync > imports
! grep -E 'not found|undefined symbol' imports
mkdir source destination daemon-copy
printf 'Fictional transfer; no personal data.\n' > source/example.txt
printf 'Original version\n' > source/change.txt
ln -s example.txt source/safe-link
ln -s ../outside.txt source/outside-link
printf 'Fictional outside sentinel\n' > outside.txt
rsync -a --safe-links source/ destination/
cmp source/example.txt destination/example.txt
test "$(readlink destination/safe-link)" = example.txt
test ! -e destination/outside-link
printf 'Changed fictional text\n' > source/change.txt
rsync -ac --safe-links source/ destination/
cmp source/change.txt destination/change.txt
printf 'Synthetic delete target\n' > destination/extra.txt
rsync -a --delete --safe-links source/ destination/
test ! -e destination/extra.txt
test -f outside.txt
printf 'address = 127.0.0.1\nport = 18739\npid file = %s/daemon.pid\nuse chroot = no\n[fixture]\npath = %s/source\nread only = yes\nlist = no\nhosts allow = 127.0.0.1\n' "$TASK_RSYNC_TMP" "$TASK_RSYNC_TMP" > rsyncd.conf
rsync --daemon --no-detach --config="$TASK_RSYNC_TMP/rsyncd.conf" > daemon-output 2>&1 &
TASK_RSYNC_PID=$!
i=0
until rsync --timeout=3 rsync://127.0.0.1:18739/fixture/example.txt daemon-copy/ > client-output 2>&1; do
 i=$((i+1));test "$i" -lt 10;sleep 0.1
done
cmp source/example.txt daemon-copy/example.txt
if rsync --timeout=3 source/example.txt rsync://127.0.0.1:18739/fixture/forbidden.txt > denied 2>&1; then exit 1; fi
grep -q 'read only' denied
test ! -e source/forbidden.txt
echo NATIVE_RSYNC_LOCAL_INCREMENTAL_SAFE_LINKS_LOOPBACK_READ_ONLY_PASSED
