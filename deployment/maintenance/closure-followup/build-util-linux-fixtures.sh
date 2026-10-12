#!/bin/sh
# Reproduce only the test ELFs using the already installed native compiler.
set -eu
TASK=/var/lib/utilibre-maintenance/closure-followup-20261012
RECIPE=/home/ubuntu/freetools/deployment/maintenance/closure-followup
TASK_HEADERS=$(mktemp -d /dev/shm/utilibre-mount-headers-XXXXXX)
trap 'rm -r "$TASK_HEADERS"' EXIT
dpkg-deb -x "$TASK/util-linux-trixie/libmount-dev_2.41.5-0+deb13u1+utilibre2_amd64.deb" "$TASK_HEADERS"
mkdir -p "$TASK/util-linux-test-fixtures"
cc -Wall -Wextra -Werror -O2 -I"$TASK_HEADERS/usr/include" "$RECIPE/mount-helper-regression.c" -l:libmount.so.1 -o "$TASK/util-linux-test-fixtures/mount-helper-regression"
cc -Wall -Wextra -Werror -O2 -fPIC -shared "$RECIPE/nsenter-fd-regression.c" -ldl -o "$TASK/util-linux-test-fixtures/nsenter-fd-shim.so"
cc -Wall -Wextra -Werror -O2 "$RECIPE/check-inherited-fd.c" -o "$TASK/util-linux-test-fixtures/check-inherited-fd"
sha256sum "$TASK/util-linux-test-fixtures/"* > "$TASK/util-linux-test-fixtures/SHA256SUMS"
