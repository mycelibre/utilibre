#!/bin/sh
set -eu

# Compatibility entry point, not a second release engine. Ordinary rebuilds
# discard reviewed security overlays even when an upstream tag is immutable.
service=${1:-}
[ "$#" -eq 1 ] || { echo "Usage: scripts/update.sh SERVICE" >&2; exit 2; }
case "$service" in
  searxng)
    repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
    exec /usr/bin/python3 "$repo_dir/scripts/searxng-maintain.py" --apply
    ;;
  portal|valkey|anubis|redlib)
    echo "Refusing generic update of $service: it can discard reviewed local security repairs." >&2
    echo "Use the service's staged, exact-image maintenance release; see docs/updates.md (Local repair protection)." >&2
    exit 1
    ;;
  *) echo "Unknown service: $service" >&2; exit 2 ;;
esac
