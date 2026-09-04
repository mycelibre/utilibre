# Rollback

Rollback applies to the retained five-service stack only. Do not restore the
services removed by the 2026-09-03 strategic prune as an incidental rollback.

For a configuration or image regression:

1. Identify the last reviewed Git revision or explicit Compose copy.
2. Restore only the affected retained configuration.
3. Run `docker compose config --quiet`.
4. Recreate only the affected service with `docker compose up -d --no-deps`.
5. Run `scripts/healthcheck.sh`.

Use `scripts/restore.sh` for FreshRSS or PrivateBin data, always rehearsing
first. The generic `scripts/rollback.sh stop` preserves containers and data;
`scripts/rollback.sh --remove-containers` removes only this Compose project's
containers and networks.

Edge rollback is manual on the edge VM. Back up its real Caddyfile, change only
the exact intended site blocks, run `caddy fmt` and `caddy validate`, then reload
rather than restart. Preserve the portal and unrelated sites.
