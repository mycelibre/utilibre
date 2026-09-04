#!/bin/sh
set -eu

if [ ! -f .env ]; then
  echo "Missing .env" >&2
  exit 1
fi

env_value() {
  awk -F= -v key="$1" '$1 == key { sub(/^[^=]*=/, ""); value=$0 } END { print value }' .env
}

task_bind_ip=$(env_value PRIVATE_BIND_IP)
task_portal_port=$(env_value PORTAL_PORT)
task_search_port=$(env_value SEARXNG_PORT)
task_redlib_port=$(env_value REDLIB_PORT)
task_enabled_services=$(env_value ENABLED_SERVICES)
task_portal_port=${task_portal_port:-8080}
task_search_port=${task_search_port:-8888}
task_redlib_port=${task_redlib_port:-3002}

case "${task_bind_ip}" in
  ""|0.0.0.0|::|"[::]")
    echo "PRIVATE_BIND_IP is unset or wildcard; refusing verification." >&2
    exit 1
    ;;
esac

docker compose config --quiet

verify_bound_port() {
  task_port=$1
  task_label=$2
  task_expected="${task_bind_ip}:${task_port}"
  case "${task_bind_ip}" in
    *:*) task_expected="[${task_bind_ip}]:${task_port}" ;;
  esac

  if ! ss -H -lnt | awk -v port="${task_port}" -v expected="${task_expected}" '
    $4 ~ (":" port "$") { found=1; if ($4 != expected) bad=1 }
    END { exit !found ? 2 : bad ? 3 : 0 }
  '; then
    echo "${task_label} is missing or is listening somewhere other than the exact PRIVATE_BIND_IP:${task_port}." >&2
    exit 1
  fi
  printf '%s: exact private bind on port %s\n' "${task_label}" "${task_port}"
}

verify_bound_port "${task_portal_port}" portal
verify_bound_port "${task_search_port}" searxng

case ",${task_enabled_services}," in
  *,redlib,*) verify_bound_port "${task_redlib_port}" redlib-anubis ;;
esac

if ss -lnt | grep -Eq ":(5432|6379)[[:space:]]"; then
  echo "A database/cache port is listening on the host. Determine its owner; this project does not publish those ports." >&2
  exit 1
fi

echo "No host listener was found on the usual PostgreSQL or Valkey ports."
