# Deployment

## Status and scope

This document describes the separately named `utilibre-services` Compose
project. Ten application services plus PostgreSQL and Valkey are healthy on the
private application interface, and the ten application hostnames have working
public HTTPS routes through Cloudflare and the separate Caddy edge. On
2026-09-03 the ntfy path received additional client-address, network-isolation,
firewall, retention, and Cloudflare NEL validation described below. This does
not imply that the edge VM's complete Caddyfile or firewall was directly
inspected.

The pre-existing `public-utility` Compose project—including Cobalt, SearXNG,
its Valkey, Redlib, and the portal—is outside this deployment's ownership. Its
preflight container IDs, image IDs, start times, networks, published ports, and
health states are saved in the root-only report under
`/opt/utilibre/reports/preflight-20260830-034945.txt`. Never target that project
with commands in this document.

## Assessed host

| Item | Observed value |
|---|---|
| Operating system | Debian 13-compatible installation |
| Architecture | `x86_64` |
| CPU | 8 virtual CPUs; no GPU assumed |
| RAM | approximately 15 GiB usable |
| Root filesystem | 99 GiB total; approximately 85 GiB free before this stack (less than the stated 500 GB) |
| Swap | 4 GiB secure swapfile added; `vm.swappiness=10` |
| Docker | 29.7.2 |
| Docker Compose | 5.5.0 |
| Host timezone | UTC |
| Application timezone | `America/Guatemala` |
| Private bind | `APP_BIND_IP`, the exact private application address set in the live root-only `.env` |
| Edge address | `EDGE_PROXY_IP`, ntfy's verified private edge source recorded in the live root-only `.env` |

The host has no Tailscale client. The application and edge addresses above are
RFC1918 addresses, not public interfaces. Other detailed host inventory remains
only in the internal preflight report.

## Architecture

```text
Internet
   |
separate Caddy edge VM (TLS, public client identity)
   |
private network
   |
APP_BIND_IP on application VM
   +-- ntfy / BentoPDF / VERT / OmniTools / PairDrop / PrivateBin
   +-- Healthchecks / FreshRSS / Wakapi ----+
   +-- RSSHub ------------------------------|---- internal backend network
                                            +---- PostgreSQL (no host port)
                                            +---- dedicated Valkey (no host port)
```

The `frontend` Docker network is not marked internal because several services
legitimately fetch upstream data. ntfy runs alone on the separate,
non-internal `ntfy-egress` network so it retains DNS/HTTPS egress for supported
iOS delivery without sharing a container network with the other applications.
The `backend` network is `internal: true`. PostgreSQL and Valkey attach only to
`backend`; they do not publish ports.

## Port and hostname allocation

Every mapping has the form `${APP_BIND_IP}:HOST_PORT:CONTAINER_PORT`.

| Service | Host port | Container port | Protocol | Intended hostname | Health path |
|---|---:|---:|---|---|---|
| ntfy | 2586 | 80 | HTTP/WebSocket | `notify.utilibre.org` | `/v1/health` |
| BentoPDF | 3101 | 8080 | HTTP | `pdf.utilibre.org` | `/` |
| VERT | 3102 | 80 | HTTP | `convert.utilibre.org` | `/` |
| OmniTools | 3103 | 80 | HTTP | `tools.utilibre.org` | `/` |
| Healthchecks | 3104 | 8000 | HTTP | `monitor.utilibre.org` | `/api/v3/status/` |
| PairDrop | 3105 | 3000 | HTTP/WebSocket | `send.utilibre.org` | `/` |
| FreshRSS | 3106 | 80 | HTTP | `rss.utilibre.org` | `/i/` |
| RSSHub | 3107 | 1200 | HTTP | `feeds.utilibre.org` | `/healthz` |
| PrivateBin | 3108 | 8080 | HTTP | `paste.utilibre.org` | `/` |
| Wakapi | 3109 | 3000 | HTTP | `wakapi.utilibre.org` | `/api/health` |
| Crab Fit frontend | — | — | — | `when.utilibre.org` | deferred |
| Crab Fit API | — | — | — | `when-api.utilibre.org` | deferred |

Ports 3110 and 3111 remain reserved in `.env.example` but are not present in
Compose and must not have active edge routes.

## Installed layout and permissions

The deployment root is `/opt/utilibre`. Important permissions are:

- `/opt/utilibre/.env`: root-owned, mode `0600`;
- `/opt/utilibre/secrets`: root-owned, mode `0700`;
- `/opt/utilibre/secrets/admin-credentials.txt`: root-owned, mode `0600`;
- `/usr/local/sbin/utilibre-ntfy-firewall`: root-owned, mode `0755`, installed
  from the deployment's reviewed helper;
- `/etc/systemd/system/utilibre-ntfy-firewall.service`: root-owned, mode `0644`,
  installed from the deployment's reviewed unit;
- application-readable configuration: read-only mounts where supported;
- generated reports and backups: root-only by default (`umask 077`).

Do not copy `.env`, credentials, reports containing host inventory, or backups
into the Git repository.

## Persistence

| Path | Contents | Required backup |
|---|---|---|
| `data/postgres/` | PostgreSQL cluster for four isolated databases | use logical dumps; do not copy live files |
| `data/ntfy/` | 12-hour message cache database and three-hour attachment cache | configuration only; both caches deliberately excluded |
| `data/freshrss/data/` | FreshRSS configuration, users, cache metadata | yes |
| `data/freshrss/extensions/` | installed extensions (none added initially) | yes |
| `data/privatebin/` | encrypted paste payloads | yes |
| `data/backups/` | root-only same-host backups | rotate; copy encrypted off host |
| Valkey tmpfs | disposable RSSHub cache | no |
| static client apps | images/source build artifacts only | rebuild from manifest/source |

Healthchecks, FreshRSS, Wakapi, and the reserved unused Crab Fit database each
have a distinct database and role. Application containers do not receive the
PostgreSQL superuser password. The Valkey instance is dedicated to RSSHub and
does not reuse SearXNG state.

## Service posture

- **ntfy:** anonymous unguessable topics remain usable; signup, login, topic
  reservation, SMTP, email publishing, and Twilio are off. Messages and
  attachments are cached for 12 hours and three hours respectively, and neither
  cache enters longer-lived backups. Caddy supplies one normalized client
  address, so `proxy-trusted-hosts` is empty. A persistent application-VM
  `DOCKER-USER` rule allows forwarded traffic to `${APP_BIND_IP}:${NTFY_PORT}`
  only from the verified `EDGE_PROXY_IP`. ntfy is the only container on its
  dedicated non-internal network.
- **BentoPDF:** the upstream application build remains intact. PDF processing is intended to
  happen in the browser; there is no application database or upload volume.
  The tested operation fetched executable runtime assets from jsDelivr without
  uploading the PDF, so its honest labels are `LOCAL` and `EXTERNAL`.
  A public test on 2026-09-03 generated a valid PDF locally, but the live edge
  appended COOP/COEP to the upstream values. The response therefore contained
  duplicate COOP and conflicting COEP (`require-corp` plus `credentialless`),
  leaving `window.crossOriginIsolated` false and `SharedArrayBuffer` absent.
  Utilibre's local Nginx include overrides omit the upstream COOP/COEP fields so
  the edge is the sole authority for them. The generated edge fragment also
  normalizes both fields with `header_down`, making that invariant explicit.
  After the correction was applied, the public browser check passed with one
  COOP value, one COEP value, `window.crossOriginIsolated === true`, and
  `SharedArrayBuffer` available. Keep this check as a release gate after either
  application or edge changes.
- **VERT:** static build from an exact source revision. Plausible, Stripe,
  donation, and server conversion endpoints are empty; supported external
  integration settings are disabled at build time. No `vertd` exists. The
  upstream FFmpeg loader nevertheless fetched JavaScript/WASM from jsDelivr
  during testing, so VERT is also `LOCAL` plus `EXTERNAL`.
- **OmniTools:** unchanged static upstream image; no user-data volume.
- **Healthchecks:** production mode and closed registration. Outbound mail uses
  the trusted `mx.mailgt.dev:26` relay over STARTTLS without authentication;
  the application resolves that certificate name to the private relay address.
  No inbound SMTP is exposed. The owner account exists. Its supported
  `SITE_NAME` and `SITE_LOGO_URL` settings use the locally mounted Utilibre
  wordmark; no upstream interface patch or remote asset request is involved.
  Proxy HTTPS handling is enabled, but the edge must overwrite forwarded
  headers.
- **PairDrop:** WebSocket signaling and standard STUN behavior; no Coturn or
  bundled TURN relay. Direct transfer can fail for difficult NAT combinations.
- **FreshRSS:** installed and owner provisioned; the web installer is closed.
  Refresh runs at minutes 13 and 43. API support is retained. Bootstrap
  passwords are no longer present in Compose environment blocks.
- **RSSHub:** dedicated disposable Valkey cache, two retries, 30-second request
  timeout, conservative cache expiries, and unsafe user-supplied domains off.
  No Browserless, Chromium, Puppeteer, or third-party credentials. A narrow
  derived-image patch builds feed self-links from `RSSHUB_PUBLIC_URL`; this is
  necessary because the pinned Hono Node adapter sees the private plain-HTTP
  proxy hop and does not infer its URL scheme from forwarded headers. The patch
  never trusts a client-supplied host or protocol header.
- **PrivateBin:** two MiB text limit, no file uploads or discussions, one-day
  default and one-week maximum expiry, automatic purge, upstream CSP preserved.
  Encryption/decryption occurs in the browser; the server stores ciphertext.
- **Wakapi:** production mode, owner provisioned, signup disabled after
  bootstrap, email and metrics exposure off, 12-month retention target. The
  upstream promotional front page is disabled, so anonymous root requests go
  directly to login without fetching its third-party statistics badge or
  presenting claims about the upstream hosted service as Utilibre's own.
- **Crab Fit:** deferred for the audited reasons in `SOURCE_MANIFEST.md`. A
  2026-08-30 retry confirmed that amd64 works; stale dependencies, one critical
  and 16 high frontend audit findings, analytics, secret logging, fixed upstream
  URLs, and proxy-unaware rate limiting are the blockers.

## Reproducing a fresh installation

These are fresh-host steps, not an instruction to overwrite the live tree.
Stop if `/opt/utilibre` already belongs to any deployment.

1. Run the complete read-only preflight and choose an unused RFC1918/Tailscale
   address reachable from the edge. Never use a public address or `0.0.0.0`.
2. Clone the parent repository with its pinned VERT source submodule (or
   initialize that submodule in an existing clone), copy this deployment tree
   to `/opt/utilibre`, create the documented data directories, and set the
   permissions above:

   ```sh
   git submodule update --init --recursive
   ```
3. Initialize secrets without printing them. The script prompts for the private
   SMTP relay address and the three operator-selected account identifiers; it
   generates the passwords itself:

   ```sh
   cd /opt/utilibre
   umask 077
   ./scripts/init-secrets.sh PRIVATE_RFC1918_ADDRESS
   ```

4. Review the generated identifiers, but never place a password or a real
   private address in `.env.example`. Leave `DONATION_URL` blank unless an
   existing verified Utilibre destination is available.
5. Keep the VERT submodule at its recorded gitlink and retain or link the exact
   upstream source for the other deployed applications:

   - BentoPDF `f96cd4e5166f3d51393dfe9f3c440b5bb77802f1`;
   - VERT `e0ffd34310f9c988b16e22334b13e18de030b0ae`;
   - PairDrop `4862ba3067be1a0f2e0d1e94861dc9200b5bfeea`;
   - FreshRSS `b2c50115baa36c217e939ee3ea8ecfae52f91abd`;
   - RSSHub `40aca9548e99eefd519ff7abbb937560fc037c95`.

6. Set data ownership expected by the pinned images: PostgreSQL UID/GID 70,
   ntfy UID/GID 1000, FreshRSS UID/GID 33, and PrivateBin UID 65534/GID 82.
7. Validate and build VERT, then start the stack:

   ```sh
   cd /opt/utilibre
   docker compose config --quiet
   docker compose build vert
   docker compose up -d
   ./scripts/healthcheck.sh
   ```

8. Bootstrap owner accounts in a private maintenance window, then remove the
   FreshRSS bootstrap environment and restore `WAKAPI_ALLOW_SIGNUP=false` before
   recreating only those services. See `OPERATIONS.md`.
9. Run functional, persistence, backup, exposure, and existing-service
   regression tests before adding DNS or edge routes.
10. After recording the exact edge IPv4 address in `.env`, install and enable
    the ntfy firewall helper and unit from this deployment. Follow
    `OPERATIONS.md`; do not improvise a broad source range.

## Initial private validation completed on 2026-08-30

The following have been demonstrated without involving third-party attack
traffic:

- all 12 new containers running healthy on the private interface;
- Compose resolution without unresolved variables or port collisions;
- ntfy anonymous publish and poll/receive on a random undisclosed topic;
- Healthchecks owner login and create/ping/up/delete flow;
- FreshRSS owner bootstrap, fetch of ten items from an official stable release
  feed, and test-feed removal;
- RSSHub public route response plus a confirmed Valkey cache hit;
- Wakapi owner bootstrap, closed-signup posture, synthetic heartbeat
  persistence, and test-data removal;
- successful VERT production build on the non-AVX virtual CPU using pinned Bun
  1.3.14 and `--ignore-scripts`, after optional native postinstall probes under
  the newer builder hit `SIGILL`;
- BentoPDF text-to-PDF produced a valid PDF with no mutation request or content
  marker transmission; it made bodyless jsDelivr runtime GETs;
- VERT completed local SVG-to-PNG and Markdown conversion with no mutation
  request, marker transmission, or conversion-daemon contact; it made bodyless
  jsDelivr runtime GETs;
- OmniTools validated marked JSON with no post-load network request;
- PairDrop opened WebSockets in two isolated sessions, discovered both peers,
  and transferred matching text and a small file over the private endpoint;
- PrivateBin created browser-encrypted burn-after-reading content, stored no
  plaintext marker, decrypted in a second session, removed the payload after
  reading, and left no test paste.

Detailed browser evidence is retained in `reports/browser-acceptance.md`.
The project-only restart recovered all 12 new containers to healthy state;
Healthchecks, FreshRSS, and Wakapi owner/database state persisted. The initial
checksummed backup passed, as did a Healthchecks restore into a temporary
database. An ntfy SQLite integrity rehearsal also passed under the original
2026-08-30 policy; ntfy caches are no longer backed up or restored. The nightly
systemd timer is enabled.

The final protected-service comparison found unchanged Cobalt and SearXNG
container IDs, image IDs/digests, port bindings, Docker network IDs, health,
restart counts, and OOM state. Their `StartedAt` timestamps and ephemeral
frontend-network addresses did change because the host and Docker daemon
restarted unexpectedly after the preflight snapshot. The prior journal ends
without a clean shutdown sequence. This was not a container recreation or
update, but it is an operational anomaly that must remain in the deployment
record.

At that private-validation cutoff, public HTTPS, certificates, forwarding
headers, WebSockets through Caddy, and BentoPDF `crossOriginIsolated` had not
yet been tested. Later public-route work supersedes that historical state where
explicitly recorded below; BentoPDF's exact public cross-origin combination is
not implied by the ntfy validation.

## ntfy and edge validation addendum, 2026-09-03

- The edge's private ntfy source is recorded as `EDGE_PROXY_IP` in the live
  root-only `.env`.
- ntfy runs alone on the deployed, non-internal `ntfy-egress` Docker network;
  it retains outbound DNS/HTTPS access for supported iOS delivery.
- The persistent application-VM firewall rule matches the original forwarded
  destination `${APP_BIND_IP}:${NTFY_PORT}` and drops traffic not sourced from
  `EDGE_PROXY_IP`. Host-local output is outside `DOCKER-USER`.
- A private-hop capture for a public ntfy request contained one
  `X-Forwarded-For` address, equal to the requester's public address observed
  independently through Cloudflare. This validates the normalized address on
  this path without claiming inspection of the edge VM's full Caddyfile or
  firewall.
- Cloudflare Network Error Logging was disabled for the zone. Accepted public
  responses checked afterward contained neither `NEL` nor `Report-To`.
  Cloudflare remains the public proxy and processor of connection metadata;
  both headers must remain absent in release and regression checks.
- Cloudflare Bot Fight Mode initially returned a managed challenge to
  non-browser clients. It was disabled on 2026-09-03 because custom Skip rules
  cannot bypass that zone feature. Stock curl and Node health requests then
  returned 200 without `cf-mitigated`, `NEL`, or `Report-To`.
- `sh scripts/check-ntfy-public.sh` is the continuing release gate. It rejects
  non-2xx and `cf-mitigated` responses, verifies `/v1/health` JSON and the
  absence of `NEL`/`Report-To`, and confirms live JSON/SSE delivery without
  caching the random test message or forwarding it through Firebase.

## Public launch wiring

The original 2026-08-30 deployment did not modify an edge file or DNS provider;
that is historical setup context. Public routes were subsequently applied
outside this repository. The edge VM's complete live configuration was not
directly inspected during the 2026-09-03 ntfy validation. These generated files
remain the reproducible intended records:

- `/opt/utilibre/edge/Caddyfile.utilibre-apps`;
- `/opt/utilibre/edge/DNS-RECORDS.md`;
- `/opt/utilibre/portal/services.generated.json`.

On the edge VM, back up the real Caddyfile, merge only active non-Crab-Fit site
blocks, run `caddy fmt` and `caddy validate`, then reload—not restart. Test the
existing Cobalt and SearXNG routes immediately before and after the reload.
