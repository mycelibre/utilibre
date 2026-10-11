#!/usr/bin/env bash
set -euo pipefail
# Do not run cleanup against a fallback directory on the backed-up root disk.
/usr/bin/mountpoint -q /opt/utilibre/temporary
[[ -f /opt/utilibre/temporary/privatebin/.utilibre-temporary-volume ]]
# Native 2.0.6 may print a caught purge error and still exit zero. Check its
# exact success-only output; never persist document identifiers or errors.
result=$(/usr/bin/docker exec utilibre-services-privatebin-1 php /srv/bin/administration --purge 2>/dev/null)
[[ "$result" == 'purging of expired documents concluded' ]]
