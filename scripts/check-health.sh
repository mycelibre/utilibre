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
task_cobalt_port=$(env_value COBALT_PORT)
task_search_port=$(env_value SEARXNG_PORT)
task_redlib_port=$(env_value REDLIB_PORT)
task_enabled_services=$(env_value ENABLED_SERVICES)
task_portal_port=${task_portal_port:-8080}
task_cobalt_port=${task_cobalt_port:-9000}
task_search_port=${task_search_port:-8888}
task_redlib_port=${task_redlib_port:-3002}
task_url_host=${task_bind_ip}
case "${task_bind_ip}" in
  *:*) task_url_host="[${task_bind_ip}]" ;;
esac

curl --fail --silent --show-error --max-time 5 "http://${task_url_host}:${task_portal_port}/healthz"
printf '\n'
curl --fail --silent --show-error --max-time 5 "http://${task_url_host}:${task_cobalt_port}/" >/dev/null
curl --fail --silent --show-error --max-time 5 "http://${task_url_host}:${task_search_port}/healthz"
printf '\n'
case ",${task_enabled_services}," in
  *,redlib,*)
    # Anubis requires a trusted real-client header. This synthetic address is
    # used only for the local health request and never leaves the VM.
    curl --fail --silent --show-error --max-time 5 \
      -H 'CF-Connecting-IP: 192.0.2.1' \
      -H 'User-Agent: utilibre-health/1.0' \
      "http://${task_url_host}:${task_redlib_port}/settings" >/dev/null
    ;;
esac
docker compose ps
