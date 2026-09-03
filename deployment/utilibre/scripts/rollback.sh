#!/bin/sh
set -eu

root_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$root_dir"

case "${1:-stop}" in
  stop)
    docker compose stop
    echo "Stopped only utilibre-services; data and containers are preserved."
    ;;
  --remove-containers)
    docker compose down
    echo "Removed only utilibre-services containers and networks; bind-mounted data is preserved."
    ;;
  *)
    echo "Usage: $0 [stop|--remove-containers]" >&2
    echo "Data purge is deliberately manual and is not performed by this script." >&2
    exit 2
    ;;
esac
