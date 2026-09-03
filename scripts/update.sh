#!/bin/sh
set -eu

service=${1:-}
if [ -z "${service}" ]; then
  echo "Usage: scripts/update.sh SERVICE" >&2
  exit 1
fi

case "${service}" in
  portal|cobalt|searxng|valkey|anubis|redlib|rimgo) ;;
  *) echo "Unknown service: ${service}" >&2; exit 1 ;;
esac

if [ "${service}" = redlib ]; then
  # Redlib is a locally tagged, patched source build. Never ask a public
  # registry for that name, and do not rebuild it during an ordinary stack up.
  docker compose build redlib
  docker compose up -d --no-deps redlib
  docker compose ps redlib
  exit 0
fi

if [ "${service}" = portal ]; then
  configured_image=${PORTAL_IMAGE:-}
  if [ -z "${configured_image}" ] && [ -f .env ]; then
    configured_image=$(awk -F= '$1 == "PORTAL_IMAGE" { sub(/^[^=]*=/, ""); value=$0 } END { print value }' .env)
  fi
  case "${configured_image:-public-utility-portal:0.1.0}" in
    public-utility-portal:0.1.0) ;;
    *) echo "PORTAL_IMAGE selects a retained/rollback tag; reset it before rebuilding the portal." >&2; exit 1 ;;
  esac
fi

docker compose pull "${service}" || [ "${service}" = portal ]
docker compose up -d --no-deps --build "${service}"
docker compose ps "${service}"
