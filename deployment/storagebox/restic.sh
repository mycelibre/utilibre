#!/bin/sh
# Thin native Restic wrapper. Retention is scoped by retention.mjs; no mounts.
set -eu
umask 077
base=/opt/utilibre/storagebox/private
if [ "$(id -u)" != 0 ]; then
    echo 'Run with sudo; backup credentials remain root-only.' >&2
    exit 1
fi
case "${1:-}" in
    init|backup|check|snapshots|stats|restore|ls|forget|prune) ;;
    *) echo 'Use: restic.sh init|backup|check|snapshots|stats|restore|ls|forget|prune [native options]' >&2; exit 2 ;;
esac
for name in id_ed25519 restic-password repository ssh_config known_hosts; do
    if [ ! -s "$base/$name" ]; then
        echo "Missing private setup file: $name. Complete the README activation gates." >&2
        exit 1
    fi
done
# These are conservative transfer caps, not claims about purchased capacity.
# Disable the disk cache to preserve VM headroom. Restic can recreate it later.
export GOMAXPROCS=2
exec flock -n /run/lock/utilibre-storagebox.lock nice -n 10 ionice -c 2 -n 7 \
    restic --repository-file "$base/repository" --password-file "$base/restic-password" \
    --no-cache --retry-lock 1m --limit-upload 4096 --limit-download 4096 \
    -o sftp.connections=2 \
    -o "sftp.command=ssh -F $base/ssh_config utilibre-storagebox -s sftp" "$@"
