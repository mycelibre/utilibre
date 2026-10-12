#!/bin/sh
set -eu
# Grist intentionally supplies a minimal child environment. This supported
# GRIST_SANDBOX command wrapper disables Deno's CLI update fetch explicitly.
export DENO_NO_UPDATE_CHECK=1
export DENO_NO_PROMPT=1
export DENO_DIR=/tmp/grist-deno-cache
exec /grist/sandbox/pyodide/worker/node_modules/@deno/linux-x64-glibc/deno "$@"
