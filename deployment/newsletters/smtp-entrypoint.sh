#!/bin/sh
set -eu
# A one-use FIFO permit is sent by the host only after namespace rules exist.
# No persistent ready flag can authorize an unfiltered container restart.
IFS= read -r permit < /smtp-startup/permit
[ "$permit" = ready ]
exec docker-entrypoint.sh "$@"
