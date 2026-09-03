# Architecture

## Scope and trust boundaries

Milestone 1 is a small static portal with narrow, fixed application APIs and
three separately hosted user-facing backend services in this root stack.
Public TLS and hostname routing belong to a separate Caddy edge VM. The
application VM neither installs nor runs a general-purpose reverse proxy.

```text
Visitor browser
   │ public HTTPS
   ▼
Cloudflare                             public CDN/proxy; NEL disabled 2026-09-03
   │ public HTTPS
   ▼
Caddy edge VM                         outside this repository
   │ private-network HTTP
   ├── portal hostname ─────────────► portal:8080
   ├── media hostname, GET /tunnel ─► cobalt:9000
   ├── search hostname ─────────────► searxng:8080 ──► selected search engines
   └── Reddit hostname ─────────────► Anubis:8080 ─► redlib:8080 ─► Reddit
Application VM / Docker
   ├── services bridge ─► Internet-facing upstream platforms
   └── search-state bridge (internal) ─► Valkey only
```

The numbers after container names are container ports. The host-side ports are configurable and bind to one exact `PRIVATE_BIND_IP`; see [edge-routing.md](edge-routing.md). Public DNS must resolve to the edge VM, never to the application VM.

The principal trust zones are:

1. **Browser:** untrusted input and navigation into separately hosted upstream applications. Browser extensions, the operating system, and a visitor's device are outside the server operator's control.
2. **Cloudflare:** current public ingress for all Utilibre hostnames. It processes public request and traffic metadata. Network Error Logging was disabled on 2026-09-03; accepted public responses checked afterward contained neither `NEL` nor `Report-To`, and their continued absence is a release-regression requirement.
3. **Caddy edge VM:** public TLS endpoint behind Cloudflare and intended source of forwarded client headers. The portal and generated SearXNG configuration trust its exact address; Cobalt's documented upstream exception is described in the security review. Its configuration and logs are operator-managed outside this repository.
4. **Application VM:** Docker Engine, repository, private configuration, and service logs. Only operators with host access belong here.
5. **Service network:** portal, Cobalt, SearXNG, Anubis, Redlib, and optional rimgo. It has outbound access because the upstream-facing services legitimately contact external platforms. Anubis is a narrowly configured gate for Redlib, not a general application proxy.
6. **Search-state network:** an internal Docker bridge shared only by SearXNG and Valkey. Valkey has no host port and no Internet route on this network.
7. **External upstreams:** search engines and public media platforms. They have their own policies and observe requests made by the server; a direct Cobalt result also exposes the visitor's request to the media delivery host.

## Components

| Component | Responsibility | Public exposure | Persistent state |
|---|---|---|---|
| Caddy edge VM | DNS destination, TLS, public routing, request ceilings, and optional edge logs | Public, outside this repository | Certificates and edge configuration, managed separately |
| Portal | Static bilingual catalog, public configuration, high-level status, and the constrained Cobalt adapter | Private-bound host port reached through edge | No database; media rate counters exist only in process memory |
| Cobalt | Extracts supported public media information and streams or redirects delivery | Private-bound host port; edge exposes only `GET /tunnel` | No media volume; short-lived process memory |
| SearXNG | Sends a query to selected search engines and renders results | Private-bound host port reached through edge | Re-creatable cache only |
| Valkey | SearXNG abuse-limiter counters | Container network only | Memory/tmpfs only; cleared on restart |
| Anubis 1.27.0 | Applies a browser proof-of-work policy before forwarding accepted Redlib traffic | Private-bound host port reached through edge | bbolt challenge state and a stable signing key; no content database |
| Redlib | Retrieves and renders public Reddit pages and proxies associated media | Docker service network only, behind Anubis | None; optional preferences are browser cookies |
| rimgo | Privately tested optional Imgur frontend, disabled by policy | No public route; launch-blocked at pinned 1.4.2 | No volume; small in-memory cache when running |

Redlib is enabled only when the `privacy-frontends` profile and `redlib`
catalog ID agree. Invidious is reviewed but not present in Compose. It has no
catalog launch or public route.

## Browser application

The portal uses TypeScript and Vite without a UI framework. The production image contains built static assets plus a small Node HTTP server. That server serves only this portal; its non-static endpoints are fixed application functions rather than a generic proxy:

- `GET /healthz` returns `{ "status": "ok" }`.
- `GET /_portal/config` returns a sanitized allowlist of public presentation values and enabled-service IDs.
- `GET /_portal/status` checks only operator-configured health targets accepted by a strict parser, discards response bodies, and returns high-level states. Internal HTTP targets are limited to Compose names or the exact private bind address; ntfy is the sole HTTPS exception and must exactly equal the configured public ntfy health URL so its isolated public client path is tested.
- `POST /_portal/media` validates and rate-limits one Cobalt request, supplies the server-held API key, and maps upstream errors to stable public codes.
- all other `/_portal/*` paths return 404. In particular, the portal has no
  webhook receiver, DNS resolver, generic HTTP requester, response-header
  proxy, or arbitrary status target. The former `/api/*` paths remain local
  compatibility aliases only for the fixed portal functions.

The static server accepts only origin-form request targets, normalizes requested paths, refuses non-GET/HEAD methods outside the fixed API endpoints, and falls back to the SPA entry document only within the built distribution directory. Only the fixed media resolver may declare a request body; other routes return 400 and close an incomplete body rather than leaving a keep-alive socket occupied. Header receipt is limited to ten seconds; requests at the conservative 100-field boundary are rejected with 431 before routing. Request receipt is limited to 20 seconds, keep-alive to five seconds and 100 requests, and the process accepts at most 512 concurrent connections.

English and Spanish dictionaries are centralized under `portal/src/i18n/`. Routes carry the language, the root selects a saved choice or browser preference, and switching language maps to the equivalent current route. `portal/src/catalog/catalog.ts` is the structured source for names, descriptions, data flows, labels, status, versions, and license metadata used across cards and transparency pages.

The initial `/_portal/config` request has a five-second client-side deadline. If the endpoint fails, returns an unexpected response, or does not settle, the browser renders with conservative defaults: runtime-configured hosted services and optional links remain absent. With JavaScript disabled, the Node server returns an English or Spanish static fallback that identifies Utilibre and explains why it cannot safely list the active catalog. The fallback links only to its equivalent page in the other language. Full catalog and informational-page rendering without JavaScript would require server rendering or prerendering and is not implemented.

Portal pages retain `connect-src 'self'`. User-facing applications run on
their own configured origins with their own reviewed policies; the catalog
opens those applications instead of broadening the portal's connection policy.

## Data-flow sequences

### Catalog navigation and upstream application

```text
Browser ──GET HTML/JS/CSS──► edge ──► portal catalog
Browser ──explicit launch navigation──► separately hosted upstream application
```

The portal performs discovery, localization, attribution, and launch routing.
It does not implement the launched task. Processing and data-handling behavior
after navigation belong to the independently maintained FOSS application and
are described in its catalog record and the privacy documentation.

### Media request

```text
Browser ──URL + quality/mode──► edge ──► POST /_portal/media
portal ──validated request + API key──► Cobalt
Cobalt ──provider request──► supported public media platform

delivery A: Browser ──short-lived tunnel URL──► edge ──► Cobalt ──► provider
delivery B: Browser ──returned HTTPS/HTTP media URL────────────────► provider/CDN
```

The API key never enters browser code. Cobalt's private host port is published only because the edge must stream `/tunnel`; the edge example rejects every other public path and method. The portal rejects picker/batch and local-processing responses. Media JSON receipt has a ten-second deadline and at most 16 concurrent body readers; validated work then enters the existing two-request upstream gateway ceiling.

### Search

```text
Browser ──search form──► edge ──► SearXNG ──► selected search engines
                                      │
                                      └──► Valkey limiter counters
```

Search engines see the query from the application VM. `image_proxy` keeps configured result images behind SearXNG instead of automatically loading them from an engine into the visitor's browser. Clicking a result is an intentional direct navigation to that external site.

### Reddit browsing

```text
Browser ──page/path, request metadata and optional preference cookie──► edge
edge ──► Anubis ──accepted request──► Redlib ──spoofed Android OAuth/client request with TLS/browser emulation──► Reddit
Browser ◄──HTML, images, video and other proxied media── Anubis ◄── Redlib ◄── Reddit
```

A fresh ordinary browser normally completes Anubis's mild difficulty-2
proof-of-work challenge before Redlib receives the request. Anubis stores
short-lived challenge records in bbolt with a logical 30-minute TTL and sets a
24-hour host-only Secure, HttpOnly, SameSite=Lax, Partitioned authorization
cookie after success. `/info` and exact official Redlib/Libreddit
instance-updater requests are allowed without an interactive challenge. The
gate increases scraper cost; it is not volumetric DDoS protection and cannot
prevent distributed automation or Reddit-side blocking.

Redlib's upstream interface is English-only. The portal describes and links it
in both supported languages, but does not fork the upstream UI for Spanish.
Redlib uses no personal Reddit account, cookie, or operator-supplied token.
Instead, the operator explicitly accepted upstream's Android OAuth identity and
token spoofing plus TLS/browser-fingerprint emulation. That mechanism may be
blocked by Reddit at any time. The local source build also applies the tracked
scheme-relative/backslash redirect hardening patch from `config/redlib/`.

### Private URL router

The pasted URL is parsed in browser JavaScript. Only exact Reddit hostnames,
HTTPS, selected path segments, and a small query-parameter allowlist survive.
The destination hostname comes only from the configured Redlib URL. Nothing is
sent until the visitor activates the resulting link; at that point Redlib
receives the routed path.

### Status

The browser calls `/_portal/status`; the portal checks a fixed set of health URLs with a 2.5-second timeout and redirects disabled. Most are internal HTTP targets. ntfy is intentionally checked through its exact configured public HTTPS health URL because network isolation prevents the portal container from reaching ntfy directly and the public client path is the useful one to verify. Concurrent callers share one in-flight check and the result is held in process memory for 15 seconds by default, preventing public request fan-out. The public response contains a service ID and high-level state only. It exposes no container name, address, resource measurement, response body, or stack trace.

## Docker topology and lifecycle

The configured Compose launch application starts portal, Cobalt, SearXNG,
Valkey, Anubis, and Redlib; Anubis and Redlib are selected through the
`privacy-frontends` profile.
rimgo is behind the separate `optional` profile. Every service uses
`restart: unless-stopped`, a health check where compatible, rotated `json-file`
logs, CPU/memory/PID limits, dropped Linux capabilities, and
`no-new-privileges`. The portal, Cobalt, Valkey, Anubis, Redlib, and rimgo have
read-only root filesystems; SearXNG has a documented writable-root exception
for its official initialization and cache behavior.

No service uses host networking, privileged mode, the Docker socket, a host filesystem write mount, or a published database/cache port. Compose mounts the entire host `config/searxng/` directory read-only at `/etc/searxng`. It contains the tracked settings, limiter template, query-log redaction module, and ignored generated `limiter.toml`. The directory mount deliberately overrides the official image's `/etc/searxng` `VOLUME`, preventing Docker from creating an untracked anonymous configuration volume. Compose secrets are read-only container mounts sourced from the host's non-traversable `secrets/` directory.

The `services` bridge is intentionally not marked internal: Cobalt, SearXNG,
Anubis, Redlib, and optional rimgo share the bridge; Redlib and optional rimgo
must reach their upstreams. This also means container
compromise has an outbound path and peer reachability within that bridge; it is
a residual risk discussed in [security.md](security.md).

## Persistence model

There is no portal database and no account system. The only persistent Docker volume is:

- `searxng-cache`: re-creatable application/cache data, not a search-history database.

Cobalt, portal, Valkey, Redlib, and rimgo have no persistent volumes. The
portal's media rate counters exist only in process memory and clear on restart.
Cobalt's
root filesystem is read-only and no writable media directory is mounted.
Redlib's only writable location is its bounded memory-backed `/tmp`; OAuth and
connection state are process-local and end on restart. SearXNG and portal
`/tmp` paths and Valkey `/tmp` and `/data` are memory-backed tmpfs. Valkey has
RDB snapshots and AOF disabled, so all limiter state vanishes on restart.
Anubis is the deliberate exception: ignored `data/anubis/` holds its bbolt
challenge database and ignored `secrets/` holds the stable Ed25519 signing
key. Challenge rows expire logically after 30 minutes, though freed database
pages can remain in the bbolt file until compaction or deletion; neither store
contains Reddit page bodies by design.
Detailed backup and erasure consequences are in [backups.md](backups.md).

## Deliberate omissions

The application architecture has no Kubernetes, API gateway, general reverse
proxy on the application VM, portal database, account service, portal-native
end-user utility implementation, webhook receiver, DNS lookup service,
project-run browser analytics service, message queue, background-worker system,
external monitoring agent, or persistent media store. Every catalog launch
must resolve to an independently maintained, self-hostable FOSS application;
the portal contributes only catalog, localization, routing, configuration, and
narrow integration glue. Cloudflare remains an external
public-ingress processor even though its Network Error Logging was disabled on
2026-09-03. Accepted public responses checked afterward contained neither
`NEL` nor `Report-To`; releases must continue checking that both stay absent.
These omissions reduce resource use and the quantity of sensitive state.

Invidious is deferred because its database/Companion, bandwidth, anti-bot, and
operational requirements do not fit a conservative first milestone. Redlib's
credential/client emulation was accepted as an explicit operator policy
exception, not silently reclassified as an official Reddit integration. rimgo
1.4.2 remains private-evaluation-only because of its reviewed external
redirect; only an official fixed release that passes a complete new review may
be reconsidered, and public-abuse controls remain a separate gate. See
[viability-matrix.md](viability-matrix.md).
