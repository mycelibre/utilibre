#!/bin/sh
set -eu
# Read the canonical catalogue rather than a second, incomplete app inventory.
repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/../../.." && pwd)
if [ ! -f "$repo_dir/scripts/review-upstream-maintenance.mjs" ]; then
  repo_dir=/home/ubuntu/freetools
fi
exec node "$repo_dir/scripts/review-upstream-maintenance.mjs" "$@"
