#!/bin/sh
set -eu

# Kept to fail safely for existing operator bookmarks/runbooks. A vendor
# digest is not evidence that our native-library and privacy fixes survive.
echo "Generic upstream image replacement is disabled: it can discard local security/privacy repairs." >&2
echo "Use update-check.sh for read-only discovery, then the service's exact-image staged release." >&2
echo "See docs/updates.md (Local repair protection); no image, configuration or data was changed." >&2
exit 1
