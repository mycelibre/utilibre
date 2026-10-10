#!/bin/sh
set -eu

# Penpot's original entrypoint generates this file before invoking our command.
# Its frontend has a one-CPU quota; auto creates 16 workers on this VM and
# exhausted the 256 MiB limit. Keep the upstream proxy and application config.
config=/etc/nginx/nginx.conf
grep -Eq '^worker_processes [^;]+;' "$config"
grep -Eq 'worker_connections [0-9]+;' "$config"
sed -i \
  -e 's/^worker_processes [^;]*;/worker_processes 1;/' \
  -e 's/worker_connections [0-9]*;/worker_connections 4096;/' "$config"
nginx -t
exec nginx -g 'daemon off;'
