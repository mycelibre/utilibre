# Utilibre application services

This directory defines the small stateful application stack on the Utilibre
application VM. It is intentionally separate from the root Compose project,
which owns the portal, SearXNG, Redlib/Anubis, and their Valkey instance.

## Active scope

| Service | Exposure | Purpose |
|---|---|---|
| FreshRSS | `${APP_BIND_IP}:3106` | Operator-issued hosted feed-reader accounts |
| PrivateBin | `${APP_BIND_IP}:3108` | Small ancillary encrypted-paste service |
| RSSHub | internal backend only | Feed-generation support for FreshRSS |
| PostgreSQL | internal backend only | FreshRSS database |
| Valkey | internal backend only | Disposable RSSHub cache |

RSSHub has no host port, public hostname, or portal entry. FreshRSS reaches it
as `http://rsshub:1200` on the internal Compose network; a separate network
gives RSSHub outbound access to the upstream sites from which it builds feeds.

The separate edge VM and Cloudflare are not managed from this directory. The
real edge still needs its retired Caddy site blocks and DNS records removed;
the intended retained state is documented under `edge/`.

## Routine commands

```sh
cd /opt/utilibre
docker compose config --quiet
docker compose up -d
./scripts/status.sh
./scripts/healthcheck.sh
./scripts/backup.sh
```

On a fresh deployment, run `scripts/init-secrets.sh` once and then
`scripts/bootstrap-freshrss.sh` before the first full `docker compose up`. The
bootstrap consumes the generated root-only credentials without printing them.
It is safe to rerun for verification: existing FreshRSS configuration and
account settings are preserved, while inconsistent state fails closed. See
`docs/DEPLOYMENT.md` for the complete order and ownership prerequisites.

Published ports must bind only to the exact private `APP_BIND_IP`. PostgreSQL,
Valkey, and RSSHub must never receive host ports. See `docs/` for deployment,
operations, backup, update, and rollback procedures.
