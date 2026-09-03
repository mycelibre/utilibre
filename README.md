# Utilibre

This repository provides a small, bilingual catalog and hosting stack for
privacy-respecting FOSS applications. Every public capability comes from an
independently maintained, self-hostable upstream application; Utilibre's own
code is limited to integration glue. Operators can configure the portal's
displayed site name with `PROJECT_NAME`; the deployment examples, service URLs,
and supplied identity assets use Utilibre.

The hardware was already available and underused. Instead of leaving that
capacity idle, this project puts it to useful public work.

Use is free. There are no advertisements, behavioral analytics, premium
features, donor-only features, or preferential limits. Healthchecks, FreshRSS,
and Wakapi require accounts, and public registration for those services is
closed. Donations are voluntary, do not unlock anything, and use a normal
external link only when `SUPPORT_URL` is configured. User information is not
sold.

Development disclosure: this repository was developed with extensive
assistance from OpenAI Codex, including code, configuration, tests, and
documentation. The documented checks were run during development, but no
independent human code review is claimed. Review the source, test evidence,
and known limitations before relying on or deploying it. The fuller disclosure
is in [`TRANSPARENCY.md`](TRANSPARENCY.md).

The mandatory admission and retroactive-removal rule is documented in
[`FOSS_POLICY.md`](FOSS_POLICY.md). If no reviewed upstream FOSS application
exists for a proposed capability, Utilibre does not offer it.

## Deployment state

Current public state was revalidated on 2026-09-03:

| Scope | Components | Verified state |
| --- | --- | --- |
| Public portal | Utilibre portal 0.1.0 | English/Spanish catalog, information pages, and two narrow upstream integration routes are live through Cloudflare and a separate Caddy edge. Original portal-native tools have been retired under the FOSS-only policy. |
| Core services | Cobalt 11.7.1, SearXNG 2026.8.22, Valkey 9.1.1 | Cobalt's public portal gateway is restricted to the tested provider allowlist. SearXNG's public URL, limiter state, query-log redaction, and pages 1–3 pagination pass. Valkey is internal and ephemeral. |
| Reddit frontend | Anubis 1.27.0 → locally patched Redlib `a4d36e9` | Public traffic passes through the bounded browser challenge before Docker-network-only Redlib. The gate raises common scraping cost; it is not a DDoS or availability guarantee. Reddit can change or block the upstream method. |
| Additional public services | ntfy, BentoPDF, VERT, OmniTools, Healthchecks, PairDrop, FreshRSS, RSSHub, PrivateBin, Wakapi | All ten public endpoints and their container health checks pass. PostgreSQL and the second Valkey instance remain internal. Healthchecks, FreshRSS, and Wakapi require provisioned accounts; public signup is closed. |
| Deliberately disabled | rimgo, Invidious, Crab Fit | These are evaluation or future-candidate material, not current catalog services. Their documented security, maintenance, resource, or integration gates remain unresolved. |

The latest post-deploy sample had all 18 deployed containers healthy with zero
restarts and all 13 public status entries operational. Representative real
operations passed for each application class, including upstream browser-side
file work, SearXNG pagination, ntfy delivery, RSSHub feed generation, BentoPDF/VERT
conversion, PairDrop transfer, and PrivateBin encryption/deletion. These are
bounded release checks, not uptime statistics or a promise about every input
and changing upstream.

The public edge and TLS termination remain on a separate Caddy VM; this
repository contains a reviewed configuration fragment, not that VM's complete
configuration. Cobalt's media listener remains a narrowly routed backend, not
a general public API. Cloudflare remains an external request processor. Its
Network Error Logging and Bot Fight Mode are disabled for this deployment;
accepted portal responses contain neither `NEL`/`Report-To` nor an injected
challenge-platform script.

The ten additional applications and their shared data services are managed as
the separate [`utilibre-services` deployment](deployment/utilibre/README.md).
Exact source, image, license, and local-modification facts are in
[`SOURCE_MANIFEST.md`](deployment/utilibre/SOURCE_MANIFEST.md); the original
prelaunch measurements and later corrections remain in
[the final report](docs/final-report.md).

## 1. Purpose

The portal catalogs and hosts selected upstream FOSS applications. Some reduce
direct contact with selected platforms; others perform file, text, or sharing
work in the visitor's browser through their own upstream interfaces.

It is a public utility, not a commercial SaaS product or a catalog padded for
search traffic. Server-side work is used only where it provides real value.

## 2. Principles

- Free use, no advertising, no behavioral tracking by this project, and no
  premium tier. Healthchecks, FreshRSS, and Wakapi require accounts, with
  public registration closed.
- Voluntary support only, with no priority, feature, or limit advantage.
- English and neutral Spanish as equal first-class interfaces.
- Every public capability supplied by an independently maintained,
  self-hostable FOSS application; original Utilibre code is glue only.
- Browser-side processing where the selected upstream supports it, with no
  upload claim beyond what has actually been tested.
- Minimal retention and bounded operational logs, without claiming “zero
  logs,” anonymity, or untraceability.
- Official, pinned upstream releases; no `latest` tags or unattended major
  upgrades.
- Honest service deferral when maintenance, credentials, bandwidth, licensing,
  or upstream behavior makes deployment unreasonable.
- FOSS source, dependency disclosure, and concrete data-flow explanations.
- No additional Caddy, nginx, Traefik, Apache, HAProxy, TLS terminator, or
  general-purpose reverse proxy on the application VM.

## 3. Architecture

```text
Internet
   |
Cloudflare (current public ingress; NEL disabled 2026-09-03)
   |
Caddy edge VM (public DNS, HTTPS, TLS, public routing)
   |
operator-controlled private network
   |
Application VM
   +-- portal: static catalog + narrow config/status/Cobalt-adapter endpoints
   +-- Cobalt: authenticated internal processing API
   +-- SearXNG -- internal-only, ephemeral Valkey limiter state
   +-- Anubis -> Redlib: challenge gate, then English-only Reddit frontend
   +-- rimgo: privately tested optional profile, disabled by policy
```

The edge VM is outside this repository and is never changed automatically. The
application VM publishes HTTP ports only on the exact `PRIVATE_BIND_IP`.
Valkey is reachable only on an internal Docker network. The portal's small Node
server serves this application and its fixed endpoints; it is not a generic
reverse proxy or network scanner.

Browser-side work is supplied by upstream applications such as BentoPDF, VERT,
OmniTools, and PrivateBin; each catalog record states its observed boundary and
any external runtime requests. The portal does not provide a generic HTTP,
webhook, DNS, WebSocket, or event-stream tester. Cobalt follows `Browser →
portal gateway → Cobalt → source platform`, after which delivery may use
this server or a direct upstream URL. SearXNG follows `Browser → edge →
SearXNG → selected search engines`. Redlib follows `Browser → Cloudflare
→ edge → Anubis → Redlib → Reddit`; accepted pages and media are
proxied through the application VM.

The explicit private-preview topology temporarily replaces the edge hop with
`trusted private client → direct HTTP → exact PRIVATE_BIND_IP ports`. It sets
no trusted edge proxy and creates no DNS/TLS/public route. That path is useful
for operator verification but does not satisfy the public HTTPS architecture.

See [architecture](docs/architecture.md), [edge routing](docs/edge-routing.md),
and [firewall design](docs/firewall.md).

## 4. Current services

### Portal and status

The TypeScript/Vite portal bundles self-hosted fonts and JavaScript, uses a
minimal Node server, no database, no account system, no analytics, and no
nonessential cookies. It includes directly linkable English and Spanish public
pages for About, Transparency, Privacy, Acceptable use, Support, Status,
Software/licenses, and privacy-label explanations.

The bilingual status page calls `/_portal/status`, which checks only a fixed
allowlist of health URLs and returns high-level states. Most targets are
internal; ntfy uses its exact configured public health URL so the isolated
client path is covered. It has no history database and exposes no internal
addresses, container names, stack traces, or resource figures.

English and Spanish dictionaries have exact-key parity. Automated tests cover
Spanish browser detection, configurable fallback, saved selection, correct
`lang`, translated routes/metadata/errors/accessibility names, current-tool
preservation when switching, accented text, and a 375-pixel mobile layout.
Both interfaces passed the recorded build/unit/browser run; a fluent human
review of the final deployed build remains a launch check.

### Cobalt media service

The custom bilingual “Download media” interface calls the portal's same-origin
`POST /_portal/media`. The gateway keeps the Cobalt key server-side, requires the
configured portal origin, accepts only HTTP(S) URLs from a strict service-host
allowlist, rejects credentials and explicit ports, limits the request body,
rate-limits by trusted client address, caps gateway work at two concurrent
requests by default, and maps backend errors to bilingual messages.

The default and current live provider allowlist is exactly `dailymotion.com,dai.ly`;
all other Cobalt providers are disabled. YouTube is specifically and temporarily
disabled after two live resolution failures on pinned Cobalt 11.7.1 that match
[official open Cobalt issue #1562](https://github.com/imputnet/cobalt/issues/1562).
Do not re-enable it until an upstream fix is released, pinned, and re-tested.

The documented Dailymotion example did resolve through the portal gateway and
Cobalt. Its tunnel delivered a first response chunk before a controlled client
cancellation, after which no media artifact was found in Cobalt's writable layer
or `/tmp`. This is useful resolution, streaming, cancellation, and limited
cleanup evidence; it is not a completed download, FFmpeg, active-resource, or
soak result. Those checks remain unperformed.

Cobalt itself requires a file-backed API key, rejects wildcard CORS, applies
documented duration/rate/tunnel limits, uses lower FFmpeg priority, and has no
persistent media volume or account-cookie configuration. The default duration
target is 30 minutes. Approximately 500 MB is a policy target only: this
Cobalt release has no supported hard output-size setting. The portal's two-job
gateway ceiling is not a supported global Cobalt tunnel/FFmpeg concurrency
limit either. Both gaps require bandwidth/resource observation. Playlists/
pickers, authenticated/private media, user cookies, DRM bypass, and local
browser processing are not supported.

The public media hostname must expose exact `GET /tunnel` only. It must never
expose Cobalt's root API or a catch-all route. The service is presented for
publicly accessible, non-DRM content the visitor is permitted to download and
does not claim affiliation with Cobalt.

### SearXNG

SearXNG provides private metasearch with a deliberately curated engine set.
General search uses Google CSE, Wikipedia, Bing, Fynd, and Wiby with explicit
weights. Fynd is first-page-only because its current upstream cursor otherwise
repeats rows, and anonymous engine fan-out stops after page five. Separate
image, news, video, IT, science, map, and dictionary engines restore useful
specialist tabs. HTML is the only enabled output format; the edge makes
`/search` POST-only and blocks configuration/statistics/metrics paths;
autocomplete and metrics are disabled; the official limiter uses internal
Valkey; the image proxy is enabled; and public mode trusts only the exact edge
address as a proxy. The edge must in turn derive a normalized client address
from exact Cloudflare peers before forwarding it; otherwise visitors share a
limiter bucket. Private preview leaves `EDGE_PROXY_IP` empty and renders no
edge trust entry, so only loopback remains trusted.
Upstream engines receive queries from the
application VM. The instance is not registered in a public instance directory
for milestone 1.

This set was selected with current public-instance research and bounded live
checks from the application VM. A broad English query and its Spanish
counterpart returned materially stronger result lists, and bounded probes
returned rows in every selected specialist category. Google CSE currently
provides the strongest bilingual general results, but its pinned implementation
uses an unofficial Google route with an upstream Blackle partner identifier;
that fragility and data flow are disclosed rather than disguised. Standard
Google worked only in the English canary, while Brave, DuckDuckGo, Qwant, and
Startpage were blocked and Mwmbl/Yahoo/Wikidata failed locally. Upstream
blocking can change over time. Read the full
[result-quality review](docs/searxng-engine-review.md) and troubleshooting
procedure before changing the set.

The official image bytes are pinned and unchanged, but the offered SearXNG
service is correctly marked **modified**: Compose mounts the original
AGPL-3.0-or-later
[config/searxng/sitecustomize.py](config/searxng/sitecustomize.py) through
`PYTHONPATH`. The hook redacts `q`/`query` values and URL query strings
from rendered Python operational log records before Docker captures them. It
does not alter search requests or results, and it is not a guarantee about
separate edge, daemon, or non-Python logs. The configured `SOURCE_CODE_URL`
must expose the exact hook and its Compose/deployment context alongside the
pinned upstream source.

Valkey disables snapshots and append-only persistence and keeps `/data` on a
size-bounded tmpfs. Limiter state is therefore lost when its container is
recreated or the VM restarts; no Valkey named volume is declared or backed up.

SearXNG manages its own English/Spanish preferences and may store a first-party
preference cookie. Its interface does not need to mirror the portal's language
switcher.

### Redlib and deferred frontends

Redlib is enabled through the `privacy-frontends` Compose profile after an
explicit operator policy exception. It is built from official commit
[`a4d36e954cf1bd64f209cd8868c5a29edc81b374`](https://github.com/redlib-org/redlib/tree/a4d36e954cf1bd64f209cd8868c5a29edc81b374),
with the small, source-visible redirect hardening patch in `config/redlib/`.
Redlib proxies public Reddit pages and media, uses no database or persistent
volume, and stores optional display preferences in first-party cookies.

Unmodified Anubis 1.27.0 now owns the private host ingress in front of Redlib.
A fresh ordinary browser normally solves the current mild difficulty-2
proof-of-work challenge; `/info` and exact official instance-updater requests
are narrowly allowed. Success sets a 24-hour host-only Secure, HttpOnly,
SameSite=Lax, Partitioned cookie. bbolt challenge records have a logical
30-minute TTL, normal logs are WARN/error only, and metrics remain on container
loopback. This increases the cost of common scraping; it does not make the
service immune to bots, DDoS, hotlinking, or Reddit-side blocking. Clients
without usable JavaScript may not be able to pass the challenge.

The exception is important: upstream deliberately emulates an official Reddit
Android client, obtains spoofed OAuth tokens, and emulates browser/TLS
fingerprints to keep requests working. It needs no personal account, personal
cookie, or operator-supplied Reddit token, but Reddit may block the technique
without notice. The upstream UI is English-only; the portal's descriptions,
status, privacy disclosures, and router remain bilingual. This is an honest
operational compromise, not a promise that Reddit has endorsed the service.

rimgo passed a small live gallery and media-range smoke test from this VM. It
remains disabled because the reviewed 1.4.2 `/search` rewrite can create a
visitor-controlled external redirect. An upstream fix and fresh review are
required in addition to adequate edge-side abuse control and explicit
acceptance of its English-only upstream UI and proxy-bandwidth risk. Invidious
has no Compose service, database, port, or live navigation destination. Its
configuration directory explains the deferral; future candidates are reviewed in
[frontend-candidates.md](docs/frontend-candidates.md).

## 5. Public capability policy

Every end-user capability must be provided by a complete, independently
maintained, self-hostable FOSS application. Utilibre's original code is limited
to catalog, configuration, routing, security, deployment, and narrow adapter
glue. A FOSS library or browser API is not a qualifying application provider.

This rule was applied retroactively on 2026-09-03. The 31 original portal tool
routes, including the custom webhook and DNS endpoints, were removed.
BentoPDF, VERT, and OmniTools already provide upstream alternatives for many
of those tasks. The Redlib-only URL router remains because it only validates a
Reddit URL and hands off to the configured Redlib application; the Cobalt page
remains a narrow adapter to the Cobalt application.

New capabilities must pass [the public capability policy](FOSS_POLICY.md), the
[service-admission process](docs/adding-a-service.md), and the automated
`npm run test:foss-policy` gate before they can appear in the catalog.

## 6. System requirements

- Linux with a stable private or Tailscale address reachable by the intended
  preview client or Caddy edge VM but not by the public Internet.
- Docker Engine and the `docker compose` plugin. The audited VM used Docker
  Engine 29.7.2 and Compose 5.5.0.
- Git, `curl`, OpenSSL, `ss`, and a POSIX shell for operator tasks.
- Node.js 24 or newer for local builds/tests and the configuration scripts.
  The production portal image contains its own digest-pinned Node 24.14.0
  runtime.
- Outbound DNS/HTTPS for image pulls and legitimate service upstream requests.
- No GPU. Cobalt FFmpeg bursts, SearXNG fan-out, and media egress need measured
  headroom; do not infer a universal minimum from the tested host.
- For public launch, four public DNS names on the edge for the portal, media
  tunnel, search service, and Redlib. They are not required for direct private
  preview. Do not provision an Imgur hostname for the pinned rimgo release; a
  future fixed and fully re-reviewed deployment would require a separate
  hostname.

The sanitized VM inventory and suitability decision are in
[host-assessment.md](docs/host-assessment.md); observed resource figures belong
in [resource-usage.md](docs/resource-usage.md).

## 7. Host-assessment process

Before modifying a new host, run read-only inventory commands and record only
sanitized conclusions:

```sh
git status --short --branch
find . -maxdepth 3 -type f -print
docker version
docker compose version
docker ps --all
docker system df
uname -m
nproc
free -h
swapon --show
df -hT
findmnt
lsblk -f
ip -brief address
ip route
if command -v tailscale >/dev/null 2>&1; then tailscale status; else printf '%s\n' 'Tailscale command not installed'; fi
ss -lntp
systemctl --type=service --state=running
timedatectl
```

Identify every existing container/listener before using a port. Do not send the
inventory externally, publish private addresses, delete unknown data, change
the firewall, or reboot. If the measured headroom is insufficient, defer a
service rather than destabilizing the VM. Record the result in
`docs/host-assessment.md`.

## 8. Installation

Obtain a reviewed release or clone the configured source repository with its
pinned submodule, enter its root, and ensure the worktree contains no
unreviewed local changes:

```sh
git submodule update --init --recursive
git status --short --branch
```

For a fresh direct private preview, with no existing `.env`, run from the
repository root:

```sh
node scripts/init-private-preview.mjs PRIVATE_BIND_IP
node scripts/init-secrets.mjs
node scripts/render-config.mjs
node scripts/validate-config.mjs
docker compose config --quiet
docker compose pull cobalt searxng valkey anubis
docker compose build --pull portal redlib
docker compose --profile privacy-frontends up -d portal cobalt searxng valkey redlib anubis
docker compose ps
sh scripts/check-health.sh
sh scripts/verify-network.sh
```

Replace `PRIVATE_BIND_IP` with one exact private address assigned to this VM.
The initializer's address argument is optional if the correct address is
unambiguous, but explicit selection is safer on a multihomed host. It creates a
mode-`0600` `.env`, generates the SearXNG secret, configures exact private HTTP
portal/media/search/Redlib URLs, leaves `EDGE_PROXY_IP` empty, and refuses to
overwrite an existing `.env`. The separate `init-secrets.mjs` command creates
the matching portal/Cobalt key pair and stable Anubis signing key without
printing them.

With default ports, use `http://PRIVATE_BIND_IP:8080/` for the portal,
`http://PRIVATE_BIND_IP:8888/` for SearXNG, and
`http://PRIVATE_BIND_IP:3002/` only as an Anubis ingress smoke endpoint with
the documented trusted-header test. The production Anubis policy assumes the
Cloudflare/Caddy path; do not advertise port 3002 as a direct LAN browser URL.
The browser reaches generated
`http://PRIVATE_BIND_IP:9000/tunnel?...` links only after media preparation
through the portal; do not treat port `9000` as a UI or expose its API root.
Private preview sends plaintext HTTP across the network, so allow only the
intended preview client(s). Use it to verify the catalog and fixed upstream
handoffs; HTTPS remains mandatory for public launch.

The normal edge-proxied/public preparation follows. Do not use the preview
initializer when `.env` already exists.

Create the ignored operator configuration:

```sh
umask 077
cp .env.example .env
chmod 600 .env
```

Edit `.env` and replace every `REPLACE_*` value. Generate a strong SearXNG
secret and place the output in `SEARXNG_SECRET` without committing or sharing
it:

```sh
openssl rand -hex 32
```

Generate the matching Cobalt key files and render the exact SearXNG trusted
proxy:

```sh
node scripts/init-secrets.mjs
node scripts/render-config.mjs
```

`init-secrets.mjs` makes `secrets/` mode `0700` and the Cobalt/portal and
Anubis bind-mounted secret files mode `0444`. The enclosing directory prevents other host users from
traversing it; read-only file mode lets the two non-root container users read
their separate mounts. The script validates an existing pair and never prints
or silently overwrites the key.

Complete instructions are in [deployment.md](docs/deployment.md).

## 9. Configuration

Never commit `.env`, `secrets/`, generated `runtime/`, private addresses,
tokens, or backup archives. The most important settings are:

| Setting | Meaning |
| --- | --- |
| `PROJECT_NAME`, `PROJECT_TAGLINE`, `PROJECT_TAGLINE_EN`, `PROJECT_TAGLINE_ES` | Public text; `Utilibre` is the built-in project-name fallback and `.env.example` still permits an explicit operator value. The public portal uses the supplied Utilibre logo kit. Prefer reviewed, parity-matched language-specific taglines that follow `docs/copy-style.md`; the unsuffixed value is only for genuinely language-neutral copy. |
| `SOURCE_CODE_URL` | Public source URL. Configure it before network use to satisfy this project's source offer and public Software link. |
| `SUPPORT_URL`, `CONTACT_URL` | Optional ordinary external links; absent links are hidden. Configure contact/abuse reporting before launch. |
| `PRIVATE_BIND_IP` | Exact application-VM private address. Wildcards are forbidden. |
| `PRIVATE_PREVIEW` | `1` permits only the validator's exact private-IP HTTP preview relationships; public launch requires `0`. |
| `EDGE_PROXY_IP` | One exact trusted edge peer for launch. It may be empty only in private preview; then the portal ignores forwarded client headers and the rendered SearXNG limiter has no edge trust entry. |
| `PORTAL_PRIVATE_PREVIEW`, `PORTAL_EDGE_PROXY_IP` | Optional portal-only cutover settings. They let the portal trust the exact live edge without recreating an already-running Cobalt or SearXNG container. They do not put those backends into launch mode. |
| `PORTAL_PUBLIC_ORIGIN` | Optional portal-only HTTPS Origin allowlist used by the same-origin media endpoint during a staged cutover. |
| `PORTAL_COBALT_BROWSER_URL`, `PORTAL_COBALT_RESULT_SOURCE_URL` | Browser-visible public media URL and the exact URL currently emitted by Cobalt. The portal rewrites only an exact `/tunnel?...` match; it never exposes the private source URL to the browser. |
| `PORTAL_PORT`, `COBALT_PORT`, `SEARXNG_PORT`, `REDLIB_PORT` | Private host ports; defaults are 8080, 9000, 8888, and 3002. |
| `PUBLIC_*_HOST`, `ANUBIS_PUBLIC_HOST` | Public mode uses the edge-side hostname plan. `ANUBIS_PUBLIC_HOST` must exactly match the Redlib public hostname. |
| `PUBLIC_PORTAL_ORIGIN` | Exact HTTPS origin with no trailing slash for launch; private preview uses exact `http://PRIVATE_BIND_IP:PORTAL_PORT`. Used by portal and Cobalt origin checks. |
| `COBALT_PUBLIC_API_URL`, `PUBLIC_SEARCH_URL`, `PUBLIC_REDDIT_URL` | Public HTTPS URLs with trailing slashes for launch; private preview uses the exact corresponding private HTTP ports. Redlib's URL is required only when `redlib` is enabled. |
| `PUBLIC_YOUTUBE_URL` | Leave empty until Invidious is separately reviewed, deployed, and routed. |
| `PUBLIC_IMGUR_URL` | Leave empty for this release. The launch gate blocks rimgo until an official fixed release is pinned and reviewed. |
| `ENABLED_SERVICES`, `COMPOSE_PROFILES` | Default launch set is `cobalt,searxng,redlib`; Redlib additionally requires the `privacy-frontends` profile. Enable or disable both switches together. |
| `ANUBIS_REAL_IP_HEADER` | Defaults to `CF-Connecting-IP`; safe only while the Caddy origin is reachable exclusively through Cloudflare. Re-review before any edge/CDN change. |
| `DEFAULT_LANGUAGE` | `en` or `es`; saved choice wins, then the browser's first supported English/Spanish preference, then this fallback. |
| `SEARXNG_SECRET`, generated Cobalt key files, and Anubis Ed25519 key | Required secrets; never expose through the browser or edge configuration. The Cobalt mount paths are fixed by Compose so both consumers receive the same managed pair; the stable Anubis key preserves authorization cookies across gate restarts. |
| Rate/duration/concurrency variables | Conservative gateway and supported Cobalt controls; review before raising. |
| CPU/RAM/log variables | Compose ceilings and bounded Docker logging. |

`TZ=America/Guatemala` is the supported container default. It does not require
changing the host time zone. Re-run `node scripts/render-config.mjs` whenever
`EDGE_PROXY_IP` or deployment mode changes.

The `PORTAL_*` overrides are for a staged portal-only cutover. A complete
launch should still move the shared settings to public mode, render SearXNG's
trusted-proxy configuration, pass `validate-config.mjs --launch`, and recreate
each affected service only during an explicitly approved maintenance window.

## 10. Validate and deploy with Docker Compose

Run validation without printing expanded secret-bearing configuration:

```sh
docker compose version
docker version
node --check scripts/init-secrets.mjs
node --check scripts/validate-config.mjs
node --check scripts/render-config.mjs
node scripts/tests/validate-config.test.mjs
node scripts/validate-config.mjs
docker compose config --quiet
docker compose config --images
```

`node scripts/validate-config.mjs` accepts the narrowly defined private
preview. `node scripts/validate-config.mjs --launch` is the separate public
gate and rejects `PRIVATE_PREVIEW=1`, empty edge trust, private HTTP/IP service
URLs, and unfinished public values.

Validate the portal from `portal/`:

```sh
npm ci --ignore-scripts
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm audit
```

The Playwright suite runs desktop and mobile Chromium. It checks the bilingual
catalog, both permitted integration routes, external launch behavior, responsive
layout, keyboard access, and localized errors. Separate deployment acceptance
tests exercise representative operations in the hosted upstream applications.
Browser installation may additionally require the official Playwright
OS-dependency command for the development machine.

The historical pre-Anubis run passed the 20-case configuration-validator suite, 23
Vitest/server tests, and 42/42 desktop/mobile Playwright cases against the live
deployed private-HTTP portal with its real SearXNG and direct Redlib endpoint.
The Anubis gate has a separate acceptance checklist in
[testing.md](docs/testing.md); do not treat this older count as its result.

From the repository root, pull/build and start the core stack:

```sh
docker compose pull cobalt searxng valkey anubis
docker compose build --pull portal redlib
docker compose --profile privacy-frontends up -d portal cobalt searxng valkey redlib anubis
docker compose ps
```

Do not start rimgo with the core. Its private-evaluation procedure appears below and
in [deployment.md](docs/deployment.md).

## 11. Private binding and network verification

The default private port plan is:

| Service | Host setting/default | Container port | Published? |
| --- | --- | ---: | --- |
| Portal | `PORTAL_PORT=8080` | 8080 | Exact `PRIVATE_BIND_IP` only |
| Cobalt | `COBALT_PORT=9000` | 9000 | Exact `PRIVATE_BIND_IP` only |
| SearXNG | `SEARXNG_PORT=8888` | 8080 | Exact `PRIVATE_BIND_IP` only |
| Anubis (Redlib ingress) | `REDLIB_PORT=3002` | 8080 | Exact `PRIVATE_BIND_IP` only when `privacy-frontends` profile runs |
| Redlib | none | 8080 | No; Docker service network behind Anubis |
| rimgo (conditional) | `RIMGO_PORT=3001` | 3000 | Exact `PRIVATE_BIND_IP` only when profile runs |
| Valkey | none | 6379 | No; internal Docker network only |

`INVIDIOUS_PORT` remains a documented reservation placeholder only. No
container or listener uses it in milestone 1.

Verify after every deployment:

```sh
sh scripts/check-health.sh
sh scripts/verify-network.sh
docker compose ps
ss -lntp
```

The helper refuses wildcard binding and fails if a host listener exists on the
usual PostgreSQL or Valkey ports. Still test from the edge, an unauthorized
private host, a controlled external host, and over IPv6. Docker-published ports
can interact unexpectedly with host firewall rules; apply an operator-reviewed
policy from [firewall.md](docs/firewall.md), never an automatic repository
change.

Compose uses long-form `host_ip` mappings for every published port. Put a raw,
unbracketed IPv4 or IPv6 address in `PRIVATE_BIND_IP`; brackets are used only
when writing an IPv6 address together with a port in an edge URL.

In private preview the browser connects directly, so no forwarded header is
trusted and SearXNG's generated limiter trusts only loopback. A normal SearXNG
browser visit loads `/` and its generated `client<token>.css` before search. A
raw `POST /search` that skips that token flow may correctly receive `429`; do
not work around it by widening trusted proxies or disabling the limiter.

## 12. Edge Caddy routing

This section applies to public launch, not `PRIVATE_PREVIEW=1`. Before public
routing, set preview mode to `0`, configure the separate exact edge peer and
real HTTPS hostnames/origins, re-render, and pass the launch validator.

Create these public edge mappings manually:

| Public setting | Private destination | Required special handling |
| --- | --- | --- |
| `PUBLIC_PORTAL_HOST` | `PRIVATE_BIND_IP:PORTAL_PORT` | Health `/healthz`; 16 KiB request ceiling; preserve portal security headers; client address required for media rate limits. |
| `PUBLIC_MEDIA_HOST` | `PRIVATE_BIND_IP:COBALT_PORT` | Exact `GET /tunnel` only; keep default response flushing so disconnects cancel upstream work; preserve query and Range behavior; long read/write timeout; all other paths/methods 404. |
| `PUBLIC_SEARCH_HOST` | `PRIVATE_BIND_IP:SEARXNG_PORT` | Health `/healthz`; 64 KiB request ceiling; POST-only `/search`; deny configuration/statistics/metrics; client address required for the limiter; noindex. |
| `PUBLIC_REDDIT_HOST` | `PRIVATE_BIND_IP:REDLIB_PORT` | Anubis ingress; health `/info`; preserve Cloudflare's authentic client-address header only on a Cloudflare-only origin; strip `X-Original-URI`/`X-Forwarded-Uri`; preserve paths, cookies, media streaming, and Range; noindex. |

No WebSockets are needed. Let Caddy set forwarded headers. The portal and
SearXNG trust only the exact edge address; pinned Cobalt trusts any private
proxy peer upstream, so firewall restriction to the edge is a mandatory
exception check. Preserve or add the documented `Referrer-Policy`,
`Permissions-Policy`, `X-Content-Type-Options`, frame restrictions, and
crawler controls without weakening the portal CSP. HSTS is deliberately not in
the example until all affected hostnames are HTTPS-ready and its consequences
are understood.

Use the complete placeholder Caddyfile in
[edge-routing.md](docs/edge-routing.md). Validate and reload it on the edge VM,
not here:

```sh
caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy --no-pager
```

Immediately before applying any public edge route, run the stricter launch
gate. It requires final project/source/contact/hostname values, all configured
launch services, aligned Redlib profile/catalog/origin settings, and rejects
the currently blocked rimgo profile:

```sh
node scripts/validate-config.mjs --launch
```

## 13. Service-specific configuration

- Cobalt: [configuration note](config/cobalt/README.md). Generate only the
  matching file-backed key pair; do not configure personal cookies, account
  tokens, private media, or a public API catch-all.
- SearXNG: `config/searxng/settings.yml` is a small overlay on maintained
  defaults. `scripts/render-config.mjs` creates the ignored limiter file from
  an exact edge address. The source-visible `sitecustomize.py` log hook is an
  AGPL runtime modification and must stay mounted through `PYTHONPATH`.
  Valkey has no published port or persistent volume; snapshots/AOF are
  disabled and `/data` is tmpfs.
- Redlib: [deployment and policy note](config/redlib/README.md). The source
  build pins official commit `a4d36e9`, applies the tracked local redirect
  hardening patch, runs with `--hsts 0` and requires the edge to strip the
  resulting upstream `max-age=0` header so the edge owns the HSTS decision,
  disables indexing and RSS, and needs no database or Reddit
  account credential. Its Android OAuth/client and browser/TLS emulation is an
  explicitly accepted reliability and upstream-policy risk.
- rimgo: [private-evaluation note](config/rimgo/README.md). Test privately with:

  ```sh
  docker compose --profile optional pull rimgo
  docker compose --profile optional up -d rimgo
  docker compose --profile optional ps rimgo
  curl --fail --show-error http://PRIVATE_BIND_IP:RIMGO_PORT/
  ```

  Stop and leave it disabled if Imgur blocks or destabilizes it:

  ```sh
  docker compose --profile optional stop rimgo
  ```

- Invidious: [deferral](config/invidious/README.md). Do not populate its URL
  placeholder or add a dead edge route.

## 14. Security

The implemented defense layers include exact private bindings; an
operator-managed firewall boundary; no database/cache publication; no Docker
socket, privileged mode, or host networking; capability dropping and
`no-new-privileges`; read-only roots where compatible; non-root users where
compatible; PID/CPU/RAM limits; health checks; and bounded logs.

SearXNG keeps its official image's writable/default-user behavior because its
startup initializes writable cache/config paths. rimgo lacks a dedicated
in-image health binary and remains conditional. These are documented
exceptions, not hidden claims.

The portal sends CSP, `Referrer-Policy: no-referrer`, a restrictive
`Permissions-Policy`, `nosniff`, frame denial, same-origin cross-origin
policies, and noindex headers on tools/status/API/health paths. It uses no
external JavaScript, font, analytics, pixel, widget, or UI CDN.

The media gateway's host allowlist is not an open redirect or arbitrary proxy.
It rejects private/loopback literals, unusual schemes, credentials, explicit
ports, malformed/oversized bodies, unknown origins, and unsupported result
shapes. The tested portal boundary returned 403 for an unapproved origin, 400
for private IPv4/IPv6 and host-confusion URLs, and 413 for an oversized body.
Repeat these checks through the final edge before launch. Origin checks prevent
cross-site browser use; they do not replace per-client rate limits or the
private Cobalt API key against non-browser abuse.

No Turnstile or other remote browser challenge is configured. That avoids an
external script/request for every downloader visitor, but sophisticated
automation remains a launch risk. If observed abuse exceeds the implemented
limits, review Cobalt's then-current official challenge mechanism and disclose
the resulting `EXTERNAL` flow before enabling it.

Crawler rules reduce load but are not authorization. No project-run browser
analytics, external monitoring agent, unattended updater, or general API
gateway is included. Cloudflare remains an external public-ingress processor;
its Network Error Logging was disabled on 2026-09-03, and accepted public
responses checked afterward contained neither `NEL` nor `Report-To`. Their
continued absence is a release-regression check. Cloudflare Bot Fight Mode was
also disabled for the zone after it challenged ordinary ntfy clients; the
deployment's public ntfy check now verifies health, live JSON/SSE delivery, and
non-replay of a no-cache test message. See the
complete threat review and remaining production checks in
[security.md](docs/security.md).

## 15. Privacy and data retention

The catalog is the source for each application/integration's labels, flow, upstreams,
upload behavior, temporary storage, retention, logging, license, version, and
status.

- `LOCAL`: the named upstream application performs the described operation in
  the browser after its assets load. The exact catalog record states what was
  tested and whether selected content is sent anywhere.
- `SERVER`: the application VM performs part of an operation.
- `PROXY`: the application VM contacts an upstream on the visitor's behalf.
- `EXTERNAL`: the browser can contact an upstream directly for part of the
  operation, such as a direct media result.

Language and theme choices use local storage only. SearXNG can use its own
first-party preferences cookie. Redlib can use first-party, HTTP-only cookies
for non-authentication display/subscription preferences; the pinned upstream
does not set `Secure` or `SameSite`, so that browser-defense limitation is
disclosed rather than papered over with an unverified edge rewrite. No media

Anubis uses a separate 24-hour, host-only Secure, HttpOnly, SameSite=Lax,
Partitioned authorization cookie after a local proof-of-work challenge. Its
bbolt challenge records expire logically after 30 minutes, though freed pages
can remain in the database file until compaction/deletion. This state is for
abuse control, not analytics or cross-site profiling.

No media volume, portal database, search-query database, analytics store, or
portal-native tool upload area exists. Cobalt's
short-lived tunnel state may live in process memory and media delivery varies
between streaming through the VM and a direct upstream URL; it is not honest to
claim media never touches the server.

Portal/Cobalt/SearXNG/Anubis/Redlib/container error logs remain possible. Anubis
and Redlib run
at warning log level to suppress informational device/token messages, but its
startup and upstream/OAuth failures can still reach bounded Docker logs.
SearXNG access
logging is disabled by default, and after recognizing a query marker the local
Python hook conservatively discards the untrusted remainder of that rendered
operational record. This
does not cover separate edge/daemon logs or make a “no logs” claim.
Limiter/security state may retain hashed identifiers for its configured
windows while Valkey runs, and exceptional abuse events may include an
address; the tmpfs state clears when Valkey is recreated or the VM restarts.
Docker log rotation limits size, not privacy sensitivity.
The configured driver is `json-file`, with defaults of `10m` per file and
three retained files per container; both are configurable in `.env`.
The edge Caddy VM is separate; operators must avoid media/search query strings,
keep only necessary errors, document a short retention period, and restrict
access.

All public hostnames currently pass through Cloudflare, which therefore remains
an external processor of public connection and request metadata. Cloudflare
Network Error Logging was disabled for the zone on 2026-09-03. Accepted public
responses checked after the change contained neither `NEL` nor `Report-To`.
Verify that both remain absent from every public hostname during release and
regression checks. See [Cloudflare's NEL
documentation](https://developers.cloudflare.com/network-error-logging/).

See [privacy](docs/privacy.md) and
[the public disclosure source](portal/src/catalog/catalog.ts).

## 16. Resource limits and availability

Conservative Compose ceilings are configurable:

| Service | CPU | RAM | PID ceiling | Persistent state |
| --- | ---: | ---: | ---: | --- |
| Portal | 0.50 | 256 MiB | 128 | none |
| Cobalt | 1.50 | 1536 MiB | 256 | none |
| SearXNG | 1.00 | 768 MiB | 256 | rebuildable cache |
| Valkey | 0.25 | 128 MiB | 100 | none; limiter state is tmpfs-only and internal max memory is 96 MiB |
| Anubis | 0.25 | 128 MiB | 128 | bbolt transient challenge state; stable signing key |
| Redlib | 0.50 | 256 MiB | 128 | none |
| rimgo (conditional) | 0.50 | 256 MiB | 128 | none |

These are safety ceilings, not capacity promises. Prefer one service becoming
temporarily unavailable over destabilizing the VM. Cobalt FFmpeg bursts and
bidirectional media transfer are the main CPU/egress risk; Redlib proxies Reddit
media and can attract crawler/hotlink traffic; SearXNG fans one query out to
several engines; rimgo can become a media relay. The measured
idle/active observations, image/disk figures, and limitations are maintained
in [resource-usage.md](docs/resource-usage.md).

Check resource and disk state without external telemetry:

```sh
docker stats --no-stream
docker system df
df -h
```

Aggregate operational measurement does not require browser analytics. Use
Cloudflare HTTP Traffic request/transfer totals (do not export/use visitor/country
breakdowns), Caddy's loopback-only per-host Prometheus counters, Anubis's
already loopback-only non-debug challenge counters, and `docker stats` I/O.
Those sources can answer requests/bytes/errors/challenge-outcome questions
without IP/path/user-agent/referrer/cookie/session labels. Do not enable Caddy
access logs merely to count visits. If these aggregate metrics are retained,
disclose that honestly; “no behavioral tracking” is more precise than claiming
that nothing at all is measured.

Disable one service quickly with `docker compose stop SERVICE`.

## 17. Updating

Updates are reviewed one service at a time. First record state and back up:

```sh
git status --short --branch
git rev-parse HEAD
docker compose config --quiet
docker compose config --images
docker compose images
docker compose ps
sh scripts/check-health.sh
sh scripts/backup.sh /SECURE_BACKUP_DIRECTORY
```

That helper creates the public source/configuration archive only. Also create
or verify the encrypted private archive in section 19 before changing a
production deployment.

Read the exact upstream release/deployment/license changes, replace both tag
and matching digest in `compose.yaml`, update the catalog/notices, validate,
then use:

```sh
docker compose config --quiet
sh scripts/update.sh SERVICE
sh scripts/check-health.sh
sh scripts/verify-network.sh
docker compose logs --tail=100 SERVICE
docker stats --no-stream
docker system df
```

`scripts/update.sh` only pulls/recreates the already selected pin. It does not
choose a release, make a backup, validate behavior, or roll back.

For a portal dependency, work from `portal/`:

```sh
npm install --save-exact PACKAGE@VERSION
npm audit
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Then, from the repository root:

```sh
docker compose build --pull portal
docker compose up -d --no-deps portal
docker compose ps portal
```

See [updates.md](docs/updates.md). There is no unattended major-version update
mechanism. That document also contains the stop-first, matching-pair Cobalt
key-rotation and rollback procedure; never replace only one of the two files.

## 18. Rollback

Before updating the locally built portal, preserve its exact current image:

```sh
docker image tag public-utility-portal:0.1.0 public-utility-portal:rollback-YYYYMMDD
```

For an upstream service, restore its previous known-good tag/digest and matching
configuration from the reviewed Git revision, then run:

```sh
docker compose config --quiet
docker compose pull SERVICE
docker compose up -d --no-deps SERVICE
docker compose ps SERVICE
sh scripts/check-health.sh
```

For the portal, set `PORTAL_IMAGE` in `.env` to the retained rollback tag:

```sh
docker compose config --quiet
docker compose up -d --no-deps --no-build portal
docker compose ps portal
sh scripts/check-health.sh
```

Known-good upstream images can be stored/restored explicitly:

```sh
docker image save --output /SECURE_BACKUP_PATH/service-image.tar IMAGE_REFERENCE
docker image load --input /SECURE_BACKUP_PATH/service-image.tar
```

Do not downgrade across a data migration without the official procedure. The
current core has no user database; SearXNG cache is recreatable and Valkey
limiter state is ephemeral.

## 19. Backup and restore

Create both the public source/configuration archive and a separate private
archive on an already encrypted, operator-only destination:

```sh
(
set -eu
task_backup_dir=/MOUNTED_ENCRYPTED_BACKUP/public-utility
umask 077
mkdir -p "$task_backup_dir"
sh scripts/backup.sh "$task_backup_dir"
task_timestamp=$(date -u +%Y%m%dT%H%M%S.%NZ)
task_private_archive="$task_backup_dir/public-utility-private-$task_timestamp.tar.gz"
test ! -e "$task_private_archive"
test ! -e "$task_private_archive.sha256"
tar --create --gzip \
  --file "$task_private_archive" \
  .env secrets/cobalt-keys.json secrets/portal-cobalt-key
chmod 600 "$task_private_archive"
sha256sum "$task_private_archive" > "$task_private_archive.sha256"
)
```

The archive includes Compose, tracked configuration, docs, portal source,
scripts, license material, `.gitignore`, the non-secret `secrets/README.md`,
and the environment template. It deliberately
excludes `.env`, `secrets/`, generated `config/searxng/limiter.toml`,
dependencies,
build/test output, the rebuildable SearXNG cache, and Valkey's runtime-only
tmpfs state. The second archive
contains exactly the private files. If the destination is not encrypted, use a
reviewed encryption pipeline without a plaintext intermediate or a password in
shell history.

Restore into an empty, operator-chosen directory:

```sh
(
set -eu
task_restore_dir=/ABSOLUTE/RESTORE/PATH
test ! -e "$task_restore_dir"
mkdir -m 700 "$task_restore_dir"
sha256sum --check /MOUNTED_ENCRYPTED_BACKUP/public-utility/PRIVATE_ARCHIVE.tar.gz.sha256
tar --extract --gzip \
  --file /MOUNTED_ENCRYPTED_BACKUP/public-utility/PUBLIC_ARCHIVE.tar.gz \
  --directory "$task_restore_dir"
cd "$task_restore_dir"
test ! -e .env
test ! -e secrets/cobalt-keys.json
test ! -e secrets/portal-cobalt-key
tar --extract --gzip \
  --file /MOUNTED_ENCRYPTED_BACKUP/public-utility/PRIVATE_ARCHIVE.tar.gz \
  --directory .
chmod 600 .env
chmod 700 secrets
chmod 444 secrets/cobalt-keys.json secrets/portal-cobalt-key
node scripts/init-secrets.mjs
node scripts/render-config.mjs
docker compose config --quiet
docker compose pull cobalt searxng valkey anubis
docker compose build --pull portal redlib
docker compose --profile privacy-frontends up -d portal cobalt searxng valkey redlib anubis
sh scripts/check-health.sh
sh scripts/verify-network.sh
)
```

Replace all uppercase path placeholders before running. A clean restore creates
the fresh, disposable `searxng-cache` named volume and starts Valkey with
empty tmpfs-backed limiter state; it does not restore search queries or user
media because none should exist. Follow the encrypted-secret verification,
optional rimgo, and post-restore edge checks in
[backups.md](docs/backups.md).

## 20. Troubleshooting

Begin with bounded, read-only observations:

```sh
docker compose config --quiet
docker compose ps
sh scripts/check-health.sh
sh scripts/verify-network.sh
docker stats --no-stream
docker system df
docker compose logs --tail=100 SERVICE
docker inspect --format '{{json .State}}' "$(docker compose ps -q SERVICE)"
```

Do not regenerate a partial key pair, delete volumes, expose an internal API,
widen trusted proxies, bind to `0.0.0.0`, or disable origin/auth checks to
diagnose an outage. Common failures and safe checks are in
[troubleshooting.md](docs/troubleshooting.md).

## 21. Adding another service

Do not deploy a service merely because it has an image. Review maintenance,
license, official deployment, credentials, localization, data flow, resources,
bandwidth, upstream blocking, abuse, and SSRF/open-proxy risk first. A viable
addition needs a pinned image/digest, exact private publication, internal-only
state ports, measured limits, a fixed status check, bilingual catalog content,
edge/firewall guidance, privacy/license records, and private tests.

Follow [adding-a-service.md](docs/adding-a-service.md).

## 22. Adding another tool

Do not implement the capability in Utilibre. Identify a complete,
independently maintained, self-hostable FOSS application, pass the service
admission review, register its evidence, and integrate it with glue only. If no
such application exists, omit the capability.

Follow [adding-a-tool.md](docs/adding-a-tool.md).

## 23. Adding another language

The current selection order is saved local choice, Spanish browser preference,
then configured English/Spanish fallback. A new language requires a complete
typed dictionary, every route/catalog field, selector and metadata support,
`DEFAULT_LANGUAGE` validation, crawler rules, mobile/layout checks, and
human review. The portal must never send browser language preference for
analytics.

Follow [adding-a-language.md](docs/adding-a-language.md).

## 24. Licensing and source

Copyright © 2026 Mycelibre contributors.

Original portal and integration code are licensed under
`AGPL-3.0-or-later`; see [LICENSE](LICENSE). Configure a reachable
`SOURCE_CODE_URL` before offering the software over a network. Preserve
upstream notices and publish complete corresponding source/build material for
any network-served AGPL modification. That source must include the mounted
SearXNG logging hook, Compose wiring, and exact deployment scripts; the public
Transparency inventory marks this runtime modification explicitly.

Redlib is also modified: the local `0.36.0-a4d36e9-p1` image is compiled from
exact official commit `a4d36e9` with the tracked settings-redirect patch under
`config/redlib/`. `SOURCE_CODE_URL` must expose the pinned upstream tree and
lockfile, patch, source-fetch/build recipe, Compose integration, and install/
rollback instructions required by Redlib's AGPL-3.0-only license.

Anubis is an unmodified MIT-licensed upstream image at 1.27.0, official commit
`d39e26cedcc96bea5e4915297c756e7eec74aaf7`, pinned by immutable digest. Preserve
Xe Iaso's copyright and MIT notice when redistributing the image or substantial
software portions. Local policy/environment configuration is published here;
there is no proprietary fork.

The exact service/runtime/browser/toolchain inventory, modification status,
source URLs, attribution, and disclosure obligations are in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and
[docs/licenses.md](docs/licenses.md). Cobalt's bundled static FFmpeg has GPL
obligations that require separate review before redistributing or mirroring its
container image.

The supplied identity assets under `portal/public/brand/` are excluded from
the AGPL software and documentation grant. Their inclusion does not grant a
license to use the Utilibre name, logos, or marks outside this project. Public
contact currently uses the
[GitHub issue tracker](https://github.com/mycelibre/utilibre/issues); reports
submitted there are visible to everyone.

## 25. Stop, remove, and purge

Emergency direct-Redlib rollback removes the challenge gate. Close/remove the
public Redlib edge route first, then use the tracked override:

```sh
docker compose --profile privacy-frontends stop anubis
docker compose --profile privacy-frontends -f compose.yaml \
  -f config/anubis/rollback.compose.yaml up -d --no-deps --no-build redlib
```

Restore the normal Anubis path before reopening the public route.

Stop all running project containers while retaining them:

```sh
docker compose --profile privacy-frontends --profile optional stop
```

Remove project containers and networks while retaining volumes/images:

```sh
docker compose --profile privacy-frontends --profile optional down
```

After completing and verifying both archives in section 19, confirm that the
current directory is the intended checkout, then remove containers, networks,
and the disposable SearXNG cache volume:

```sh
pwd
git status --short --branch
docker compose --profile privacy-frontends --profile optional down --volumes --remove-orphans
```

Then review and remove only this checkout's ignored operator material:

```sh
find . -maxdepth 3 \( -path './.env' -o -path './secrets/cobalt-keys.json' -o -path './secrets/portal-cobalt-key' -o -path './secrets/anubis-ed25519-key.hex' -o -path './data/anubis/*' -o -path './config/searxng/limiter.toml' -o -path './backups/*' \) -print
task_expected_checkout=/ABSOLUTE/PATH/TO/freetools
if [ "$(pwd -P)" = "$task_expected_checkout" ]; then
  rm -f -- .env secrets/cobalt-keys.json secrets/portal-cobalt-key secrets/anubis-ed25519-key.hex config/searxng/limiter.toml
  rm -rf -- data/anubis runtime portal/node_modules portal/dist portal/test-results portal/playwright-report portal/public/vendor
else
  printf '%s\n' 'Checkout guard failed; nothing was unlinked.' >&2
fi
```

Delete any listed local backup only after verifying its encrypted replacement.
Remove the repository directory and exact project images only through an
operator-reviewed absolute path/image list; do not use a broad Docker prune or
an unresolved recursive path. `docker compose config --images` lists the
configured image references, and `docker image rm IMAGE_REFERENCE` removes
one reviewed, unshared image.

The complete persistence, verification, and purge procedure is in
[backups.md](docs/backups.md).

## Command quick reference

```sh
# Fresh private preview only; refuses to overwrite an existing .env
node scripts/init-private-preview.mjs PRIVATE_BIND_IP

# Validate configuration
node scripts/init-secrets.mjs
node scripts/render-config.mjs
node scripts/validate-config.mjs
docker compose config --quiet
docker compose config --images

# Start configured launch set
docker compose pull cobalt searxng valkey anubis
docker compose build --pull portal redlib
docker compose --profile privacy-frontends up -d portal cobalt searxng valkey redlib anubis

# Stop without removal
docker compose --profile privacy-frontends --profile optional stop

# Health and exposure
docker compose ps
sh scripts/check-health.sh
sh scripts/verify-network.sh

# Bounded logs
docker compose logs --tail=100 SERVICE

# Update an already reviewed/pinned service
sh scripts/backup.sh /SECURE_BACKUP_DIRECTORY
sh scripts/update.sh SERVICE
sh scripts/check-health.sh

# Roll back after restoring the old pin/configuration
docker compose pull SERVICE
docker compose up -d --no-deps SERVICE
sh scripts/check-health.sh

# Public source/config archive; use section 19 for the required private archive
sh scripts/backup.sh /SECURE_BACKUP_DIRECTORY

# Remove containers/networks but retain data
docker compose --profile privacy-frontends --profile optional down

# Full Compose purge, after backup review
docker compose --profile privacy-frontends --profile optional down --volumes --remove-orphans
```

All commands assume the repository root unless the surrounding section says
`portal/`. Commands containing uppercase placeholders must be edited locally;
never put secrets or private addresses into public documentation.

## Launch checklist

- Set `PRIVATE_PREVIEW=0`, then set the final project text, public
  source/contact links, HTTPS hostnames/origins, exact private bind address,
  and exact separate edge peer in the ignored `.env`.
- Generate/validate both Cobalt keys, set a strong SearXNG secret, render the
  limiter, and store an encrypted recovery copy.
- Pass `node scripts/validate-config.mjs --launch` immediately before public
  routing; it rejects placeholders, missing launch services, inconsistent
  Redlib configuration, and blocked rimgo.
- Pass Compose validation, portal build/lint/type/unit/browser tests, private
  health checks, network verification, and a restore rehearsal.
- Apply an edge-only application-VM firewall rule and confirm rejection from an
  unauthorized private host, the public Internet, and unintended IPv6 paths.
- Apply and validate the manual Caddy routes. Confirm the media host accepts
  only exact `GET /tunnel`, preserves streaming, and does not log its query.
- Repeat Cobalt no-key, foreign/missing-origin, private-address, malformed,
  oversized, repeated-request, and cancellation/cleanup tests through the
  final topology without stressing an upstream.
- Record measured idle/active resource use, disk behavior, and the accepted
  bandwidth budget; establish a manual low-disk check.
- Review exact-image vulnerabilities/SBOMs, current upstream release notes,
  licenses, source links, edge log fields, and log retention.
- Navigate every portal page and bilingual integration surface in English and
  Spanish with keyboard, screen-reader checks, reduced motion, dark/light
  modes, and mobile widths. Verify each upstream application's documented
  language availability separately.
- Confirm Redlib's English-only upstream interface, OAuth/client emulation,
  crawler exposure, and Reddit-blocking risk remain acceptable; publish the
  local redirect patch and complete source at `SOURCE_CODE_URL`.
- Keep rimgo disabled unless edge abuse controls and its documented language
  and bandwidth limitations are accepted **and** its unsafe `/search` redirect
  is fixed upstream and re-reviewed; keep Invidious absent unless a new
  official-upstream review changes its viability.
- Configure DNS/TLS last, make one small authorized functional request per
  backend, and retain a known-good rollback record.

## Documentation map

- [Architecture](docs/architecture.md)
- [Deployment](docs/deployment.md)
- [Host assessment](docs/host-assessment.md)
- [Edge routing](docs/edge-routing.md)
- [Firewall](docs/firewall.md)
- [Privacy](docs/privacy.md)
- [Security](docs/security.md)
- [Resource usage](docs/resource-usage.md)
- [Backups](docs/backups.md)
- [Updates and rollback](docs/updates.md)
- [Troubleshooting](docs/troubleshooting.md)
- [SearXNG result-quality review](docs/searxng-engine-review.md)
- [Public copy style](docs/copy-style.md)
- [Viability matrix](docs/viability-matrix.md)
- [Future frontend candidates](docs/frontend-candidates.md)
- [Licenses](docs/licenses.md)
- [Adding a tool](docs/adding-a-tool.md)
- [Adding a service](docs/adding-a-service.md)
- [Adding a language](docs/adding-a-language.md)
