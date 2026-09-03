# Utilibre services deployment

This directory is the reproducible deployment definition for the additional
Utilibre public-service applications. It deliberately does not contain or
manage the existing Cobalt, SearXNG, Redlib, or portal containers.

## Current state

As of 2026-08-30, ten approved applications and their two private data services
are running and healthy on the application VM. Every published container port
is bound to `APP_BIND_IP`; PostgreSQL and Valkey have no host port.

The ten applications have working public HTTPS routes through the separate
edge VM, and their cards are integrated into the existing portal. The additive
Caddy fragment and generated catalog remain here as reproducible records.
Crab Fit was intentionally deferred after its current source and deployment
path failed the maintenance and security review.

| Service | Intended URL | Private port | State |
|---|---|---:|---|
| ntfy | `https://notify.utilibre.org` | 2586 | Publicly operational |
| BentoPDF | `https://pdf.utilibre.org` | 3101 | Publicly operational; browser isolation verified |
| VERT | `https://convert.utilibre.org` | 3102 | Publicly operational |
| OmniTools | `https://tools.utilibre.org` | 3103 | Publicly operational |
| Healthchecks | `https://monitor.utilibre.org` | 3104 | Publicly operational; registration closed |
| PairDrop | `https://send.utilibre.org` | 3105 | Publicly operational; no TURN relay |
| FreshRSS | `https://rss.utilibre.org` | 3106 | Publicly operational; registration closed |
| RSSHub | `https://feeds.utilibre.org` | 3107 | Publicly operational |
| PrivateBin | `https://paste.utilibre.org` | 3108 | Publicly operational |
| Wakapi | `https://wakapi.utilibre.org` | 3109 | Publicly operational; signup closed |
| Crab Fit | `https://when.utilibre.org` | — | Deferred; no listener or active edge route |

“Publicly operational” means the private endpoint and public HTTPS route both
responded during the 2026-08-30 acceptance check. It is not an uptime promise.

On 2026-09-03, ntfy was moved onto its deployed dedicated egress network and
protected by a persistent application-VM `DOCKER-USER` rule allowing only the
verified `EDGE_PROXY_IP` to reach the original destination
`${APP_BIND_IP}:${NTFY_PORT}`. A private-hop capture confirmed one normalized public
address in `X-Forwarded-For`, matching the requester's address observed through
Cloudflare. This verifies the ntfy path, not the edge VM's full Caddyfile or
firewall. Cloudflare NEL and Bot Fight Mode were disabled on 2026-09-03;
accepted public responses checked afterward contained no managed challenge,
`NEL`, or `Report-To`. These conditions must remain release gates because a
host-specific custom skip rule cannot bypass Bot Fight Mode.

## Design boundaries

- One Compose project, explicitly named `utilibre-services`.
- A normal `frontend` Docker network for applications that need the Internet,
  a dedicated non-internal `ntfy-egress` network for ntfy alone, and an
  `internal: true` backend network for PostgreSQL and Valkey.
- No host reverse proxy, host networking, privileged container, Docker socket
  mount, database port, or cache port.
- Immutable image digests and one exact VERT source revision; no `latest` tag in
  the production definition.
- Application timezone `America/Guatemala`; the host remains on UTC.
- No analytics, ad system, public SMTP listener, Browserless, Chromium,
  Puppeteer, Coturn, Watchtower, Portainer, or telemetry platform.
- Owner credentials and generated operational topics stay in
  `/opt/utilibre/secrets/admin-credentials.txt` (root:root, mode `0600`).
- Docker `json-file` logs rotate at 10 MiB, retaining three files per
  container.

## Directory map

The installed copy lives at `/opt/utilibre`:

```text
compose.yaml             pinned runtime definition
.env                     root-only settings and secrets
.env.example             non-secret template
config/                  application configuration
data/                    persistent data and local backups
src/                     retained corresponding source/build context
secrets/                 root-only operator credentials
scripts/                 health, status, backup, update, and rollback tools
systemd/                 reviewed backup and ntfy-firewall unit sources
edge/                    retained Caddy and DNS records; public routes are live
portal/                  retained portal catalog integration record
reports/                 preflight and acceptance evidence
docs/                    operational documentation
```

VERT is a pinned Git submodule. Clone the parent repository with
`--recurse-submodules`, or run `git submodule update --init --recursive` before
building the deployment. GitHub-generated ZIP archives do not contain the
submodule source.

## Safe operator commands

Run these as root from the installed directory:

```sh
cd /opt/utilibre
docker compose config --quiet
./scripts/status.sh
./scripts/healthcheck.sh
sh scripts/check-ntfy-public.sh
sh scripts/check-rsshub-public.sh
docker compose up -d
docker compose stop
```

`check-ntfy-public.sh` is the release check for the complete public ntfy path.
It deliberately performs one no-cache/no-Firebase publish on an unguessable
ephemeral topic and verifies live JSON and SSE delivery; see
[`docs/OPERATIONS.md`](docs/OPERATIONS.md#ntfy-public-compatibility-check).
`check-rsshub-public.sh` fetches a real public feed and verifies that its Atom
self-link preserves the public HTTPS URL rather than the private HTTP hop.

Operate on one application without disturbing the rest:

```sh
cd /opt/utilibre
docker compose restart rsshub
docker compose logs --tail=100 rsshub
docker compose stop rsshub
docker compose up -d rsshub
```

Do not run `docker compose down -v`, volume pruning, or system-wide Docker
cleanup. Do not run any Compose command for this stack from the existing
`public-utility` project directory.

## Launch gates

Before advertising any new URL:

1. Make Caddy replace ntfy's `X-Forwarded-For` header with one normalized
   client address. Keep ntfy's `proxy-trusted-hosts` empty; it strips known
   intermediaries from a chain and does not authenticate the connecting proxy.
2. Set the exact `EDGE_PROXY_IP`, then install and enable the reviewed ntfy
   firewall helper and systemd unit from this deployment. It restricts the
   original destination `APP_BIND_IP:NTFY_PORT` in `DOCKER-USER` without
   affecting host-local output. Apply equivalent exact-source controls to the
   other private ports at the network firewall.
3. Add and verify the DNS records described in `edge/DNS-RECORDS.md`.
4. Review, merge, format, validate, and reload only the additive Caddy blocks in
   `edge/Caddyfile.utilibre-apps` on the separate edge VM.
5. Run public HTTPS, proxy-header, WebSocket, and BentoPDF cross-origin
   isolation tests.
6. Publish corresponding source for the AGPL deployment materials, especially
   the VERT build recipe, before public network use.
7. Review and incorporate `portal/services.generated.json`, then rebuild the
   existing portal with its own tested process.
8. Decide whether BentoPDF and VERT's observed jsDelivr runtime fetches are
   acceptable, disclose them as `EXTERNAL`, or self-host those assets in a
   separately reviewed change.

The nightly backup timer is enabled. The initial checksummed backup and a
Healthchecks database restore into a temporary database passed on 2026-08-30.
An ntfy SQLite integrity rehearsal also passed under the original policy; ntfy
message and attachment caches are now excluded to preserve their configured
retention. These same-VM copies are useful for operational recovery but are not
disaster recovery.

The absence of a donation URL is intentional: no verified existing destination
was found, so none was invented.

## Documentation

- [Deployment](docs/DEPLOYMENT.md)
- [Operations](docs/OPERATIONS.md)
- [Backup and restore](docs/BACKUP-RESTORE.md)
- [Update procedure](docs/UPDATE-PROCEDURE.md)
- [Rollback](docs/ROLLBACK.md)
- [Resource limits](docs/RESOURCE-LIMITS.md)
- [Source and licenses](SOURCE_MANIFEST.md)
