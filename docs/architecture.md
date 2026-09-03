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

1. **Browser:** untrusted input, local files, and local processing. Browser extensions, the operating system, and a visitor's device are outside the server operator's control.
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
| Portal | Static bilingual application, public configuration, high-level status, constrained Cobalt gateway, temporary webhook inboxes, and bounded DNS lookup | Private-bound host port reached through edge | No persistent state; webhook events and rate counters exist only in process memory |
| Local browser tools | Image, PDF, file, text/data, QR, JWT/HMAC, OpenAPI inspection, HTTP↔cURL, regex, cron, timestamp, hash, and UUID operations | Static code in the visitor's browser | Browser language/theme preferences plus live tool input/output in the tab |
| Browser-direct developer tools | HTTP requests, CORS-visible response headers, WebSocket messages, and server-sent events | Visitor's browser connects to the destination directly | Bounded live output in the tab; destination policy applies to what it receives |
| Cobalt | Extracts supported public media information and streams or redirects delivery | Private-bound host port; edge exposes only `GET /tunnel` | No media volume; short-lived process memory |
| SearXNG | Sends a query to selected search engines and renders results | Private-bound host port reached through edge | Re-creatable cache only |
| Valkey | SearXNG abuse-limiter counters | Container network only | Memory/tmpfs only; cleared on restart |
| Anubis 1.27.0 | Applies a browser proof-of-work policy before forwarding accepted Redlib traffic | Private-bound host port reached through edge | bbolt challenge state and a stable signing key; no content database |
| Redlib | Retrieves and renders public Reddit pages and proxies associated media | Docker service network only, behind Anubis | None; optional preferences are browser cookies |
| rimgo | Privately tested optional Imgur frontend, disabled by policy | No public route; launch-blocked at pinned 1.4.2 | No volume; small in-memory cache when running |

Redlib is enabled only when the `privacy-frontends` profile and `redlib`
catalog ID agree. Invidious is reviewed but not present in Compose; its card
and private-router destination remain unavailable.

## Browser application

The portal uses TypeScript and Vite without a UI framework. The production image contains built static assets plus a small Node HTTP server. That server serves only this portal; its non-static endpoints are fixed application functions rather than a generic proxy:

- `GET /healthz` returns `{ "status": "ok" }`.
- `GET /_portal/config` returns a sanitized allowlist of public presentation values and enabled-service IDs.
- `GET /_portal/status` checks only operator-configured health targets accepted by a strict parser, discards response bodies, and returns high-level states. Internal HTTP targets are limited to Compose names or the exact private bind address; ntfy is the sole HTTPS exception and must exactly equal the configured public ntfy health URL so its isolated public client path is tested.
- `POST /_portal/media` validates and rate-limits one Cobalt request, supplies the server-held API key, and maps upstream errors to stable public codes.
- `POST /_portal/developer/webhook-inboxes` creates a memory-only inbox whose access expires after 15 minutes. Process references are removed on the next request or periodic sweep, normally within another minute. Its separate opaque receiver accepts `POST`, `PUT`, `PATCH`, and `DELETE`; token-protected read/delete routes never expose the read token in the receiver URL. Request bodies are capped at 12 KiB and a ten-second body-read deadline, with at most four active receivers per inbox and 32 process-wide. Each inbox retains the newest events up to 25 events/1 MiB, evicting the oldest when later accepted events cross either bound; process-wide memory/count/rate ceilings also apply. Each event keeps at most 32 retained headers totaling 32 KiB and reports when that set was truncated. Authorization, Cookie, standard hop-by-hop, and recognized forwarded-client and proxy headers are omitted from retained/displayed events; other custom headers, queries, and bodies remain visible to the read capability. Reads return at most 10 events/192 KiB per page and have separate response-concurrency bounds. There is no forwarding, replay, or persistence.
- `POST /_portal/developer/dns` performs one allowlisted DNS record lookup for a normalized public hostname after a same-origin check. Special-use, literal-IP, single-label, and malformed names are rejected; query rate, concurrency, timeout, result count, and response bytes are bounded.
- `WEBHOOK_INBOX_ENABLED` and `DNS_LOOKUP_ENABLED` independently remove their catalog launch and make their respective API surfaces return 404. They do not disable the rest of the portal.
- all other `/_portal/*` paths return 404. In particular, there is no generic server-side HTTP requester, response-header proxy, webhook forwarder, or arbitrary status/DNS target. The former `/api/*` paths remain local compatibility aliases, but the browser avoids that commonly reserved edge namespace.

The static server accepts only origin-form request targets, normalizes requested paths, refuses non-GET/HEAD methods outside the fixed API endpoints, and falls back to the SPA entry document only within the built distribution directory. Only the fixed media resolver, webhook receiver, and DNS lookup routes may declare request bodies; other routes return 400 and close an incomplete body rather than leaving a keep-alive socket occupied. Header receipt is limited to ten seconds; requests at the conservative 100-field boundary are rejected with 431 before routing. Request receipt is limited to 20 seconds, keep-alive to five seconds and 100 requests, and the process accepts at most 512 concurrent connections.

English and Spanish dictionaries are centralized under `portal/src/i18n/`. Routes carry the language, the root selects a saved choice or browser preference, and switching language maps to the equivalent current route. `portal/src/catalog/catalog.ts` is the structured source for names, descriptions, data flows, labels, status, versions, and license metadata used across cards and transparency pages.

The initial `/_portal/config` request has a five-second client-side deadline. If the endpoint fails, returns an unexpected response, or does not settle, the browser renders with conservative defaults: local tools remain available, while runtime-configured hosted services and optional links remain absent. With JavaScript disabled, the Node server returns an English or Spanish static fallback that identifies Utilibre and explains why it cannot safely list the active catalog. The fallback links only to its equivalent page in the other language. Full catalog and informational-page rendering without JavaScript would require server rendering or prerendering and is not implemented.

Most portal pages retain `connect-src 'self'`. The exact HTTP tester,
CORS-visible header viewer, WebSocket tester, and server-sent event viewer
routes receive the narrower operation-specific exception `connect-src 'self'
https: wss:`. Navigation into or out of those routes loads a new document so a
more permissive policy cannot remain attached to another SPA surface.

## Data-flow sequences

### Static page and local tool

```text
Browser ──GET HTML/JS/CSS/self-hosted WASM──► edge ──► portal
Browser ──selected file/content──► browser memory and browser APIs only
Browser ◄──generated Blob/object URL── browser tool
```

After assets load, local operations do not call a server endpoint. PDF code and QR WebAssembly are bundled/self-hosted. Output downloads are browser-created objects. The server never receives the selected file or entered content by design.

JWT decode/generate and verification support only HMAC HS256, HS384, and HS512.
Webhook HMAC verification supports SHA-256, SHA-384, and SHA-512. The OpenAPI
tool parses bounded JSON or YAML locally and summarizes OpenAPI 3.x/Swagger 2.0
structure; it does not resolve remote references or claim full specification
validation. Parsing is synchronous in the visitor's tab, so pathological YAML
within the 2 MiB input ceiling can still cause a brief local stall. Arbitrary regular expressions run in a disposable worker with a
750-millisecond deadline and bounded input/output. Five-field cron previews run
in a separate disposable worker with a one-second deadline, UTC semantics, and
a bounded search horizon.

### Browser-direct developer connection

```text
Browser ──visitor-entered HTTPS, WSS, or HTTPS event-stream request──► destination
Portal ──serves application assets only; it does not relay the request──► browser
```

The deployed CSP permits HTTPS/WSS destinations; the browser also enforces its
mixed-content rules. HTTP fetches omit ambient browser credentials, although a
visitor-entered Authorization header is intentionally sent. Script-visible
response data is subject to the destination's CORS policy. The browser
WebSocket API provides no credentials-omit control: it sends an Origin and can
attach cookies already held for the destination. Output/session sizes are
bounded in the UI, but a received frame is materialized by the browser before
the page can reject an oversized frame. The destination and network intermediaries apply their
own logging and retention. Fetch redirects are followed. A CORS-visible failure
can occur after the entered destination or a redirect target already received
the request, so the interface warns against state-changing methods on an
untrusted endpoint and against blind retries.

### Temporary webhook inbox

```text
Webhook sender ──► Cloudflare ──► Caddy edge ──► opaque portal receiver
Browser ──same-origin request + read token──► portal process memory
```

The read token remains in the creating tab; the server retains only its hash.
Inbox creation is limited to 10 per client in 15 minutes. Ingestion is limited
to 240 requests per client and 120 per inbox per minute. Authorized reads and
deletion use a per-inbox bucket plus a broader client backstop; failed
authorization has a separate low-rate bucket so it cannot consume an owner's
allowance. A derived client may hold at most three active inboxes, 75 retained
events, and 2 MiB of retained event data. IPv6 clients are grouped by /64 for these application rate keys,
which limits address rotation but can make visitors sharing a delegated prefix
share an allowance. Process-wide ceilings are 100 inboxes, 2,048 retained
events, and 16 MiB of retained event data. Receiver bodies have a ten-second
deadline and 32-global/four-per-inbox concurrency ceilings. Event reads are
paged at 10 events/192 KiB, with 32-global/two-per-inbox response ceilings and a
ten-second response timeout. Access stops at expiry; process references are
removed on the next related request or periodic sweep, normally within another
minute. Explicit deletion or portal restart removes them earlier. The public receiver is deliberately one-way: it cannot
forward or replay a request.

### DNS lookup

```text
Browser ──validated hostname + record type──► portal
portal ──► application VM resolver ──► DNS servers
```

The API accepts A, AAAA, CAA, CNAME, MX, NS, SOA, SRV, and TXT only. Defaults
allow 60 requests per client in five minutes, eight concurrent lookups, a
four-second resolver deadline, 100 records, and a 64 KiB response. It returns
bounded public results, not resolver addresses or internal error details.

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

The pasted URL is parsed in browser JavaScript. Only exact supported source hostnames, HTTPS, selected path segments, and a small query-parameter allowlist survive. The destination hostname comes only from operator configuration. Nothing is sent until the visitor activates the resulting link; at that point the configured privacy frontend receives the routed path.

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

Cobalt, portal, Valkey, Redlib, and rimgo have no persistent volumes. Portal
webhook inboxes, webhook events, read-token hashes, and developer rate counters
exist only in process memory and clear on restart; DNS history is not stored.
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
proxy on the application VM, portal database, account service, project-run
browser analytics service, message queue, background-worker system, external
monitoring agent, or persistent media store. Cloudflare remains an external
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
