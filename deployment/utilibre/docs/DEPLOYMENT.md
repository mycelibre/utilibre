# Deployment

## Topology

```text
Cloudflare -> separate Caddy edge -> APP_BIND_IP
                                      |-- FreshRSS :3106
                                      `-- PrivateBin :3108

FreshRSS -- internal backend --> PostgreSQL
         `-- internal backend --> RSSHub --> Valkey
                                      `-- dedicated egress --> upstream sites
```

Only FreshRSS and PrivateBin publish host ports, and both bind to one private
RFC1918 address. PostgreSQL, RSSHub, and Valkey have no host listener. RSSHub
joins both the internal backend and a dedicated outbound network so it can
fetch upstream sites without joining the host-published applications' network.

## Install

1. Copy this directory to `/opt/utilibre` without an existing `.env`.
2. Run `FRESHRSS_ADMIN_USERNAME=<name> scripts/init-secrets.sh <APP_BIND_IP>`.
3. Set `EDGE_PROXY_IP` in the root-only `.env` to the exact Caddy peer address.
4. Set the expected ownership: PostgreSQL data UID/GID 70, FreshRSS data UID/GID
   33, and PrivateBin data UID 65534/GID 82.
5. Validate the Compose model, bootstrap FreshRSS, then start the complete stack:

```sh
cd /opt/utilibre
docker compose config --quiet
./scripts/bootstrap-freshrss.sh
docker compose up --detach --wait
./scripts/healthcheck.sh
```

The bootstrap starts PostgreSQL, installs FreshRSS against its PostgreSQL
database, creates the configured operator account, enables the API, and starts
FreshRSS. It reads the generated values from the mode-`0600` `.env` and sends
only the values FreshRSS needs to a short-lived container over standard input.
The operator and API passwords are not added to the persistent FreshRSS service
environment, placed on the host command line, or printed. As required by
FreshRSS, its database credential is stored in FreshRSS's root-controlled
configuration after installation.

The step is idempotent. On an initialized installation it verifies that the
configured operator is still the FreshRSS default user, preserves the existing
configuration and account settings, and only starts the service. It refuses
partial state or a default-user mismatch instead of reconfiguring an existing
installation. Password rotation and account replacement are separate,
deliberate maintenance operations.

The real edge and DNS are separate operator-owned systems. Apply only the four
retained site mappings in `edge/Caddyfile.utilibre-apps` and
`edge/DNS-RECORDS.md`. Remove retired routes and records rather than leaving
dead proxy targets.
