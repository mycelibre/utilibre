# Architecture

## Scope and trust boundaries

Utilibre uses two Compose projects on one application VM and a separately
managed public edge. The application VM does not run a general-purpose public
reverse proxy.

```text
Visitor browser
   | public HTTPS
   v
Cloudflare
   | public HTTPS
   v
Caddy edge VM
   | private-network HTTP
   +--> portal
   +--> SearXNG --> selected search engines
   +--> Anubis --> Redlib --> Reddit
   +--> FreshRSS --> subscribed feed origins
   +--> PrivateBin

Application VM / Docker
   +-- public-utility services network
   +-- private SearXNG/Valkey network
   +-- utilibre-services frontend network
   +-- utilibre-services internal backend
       +-- FreshRSS + PostgreSQL
       +-- internal RSSHub + private Valkey
```

Public DNS resolves to the edge VM, never directly to the application VM.
Host-published application listeners bind to one exact private address and
must be filtered so only the edge can reach them.

The principal trust zones are:

1. **Browser.** Untrusted input, application JavaScript, cookies, extensions,
   and local storage live here.
2. **Cloudflare.** Current public ingress. It processes connection and request
   metadata under the operator's Cloudflare configuration.
3. **Caddy edge VM.** TLS endpoint and source of trusted forwarded-client
   headers. Its configuration and logs are outside the application Compose
   projects.
4. **Application VM.** Docker Engine, repositories, application state,
   secrets, logs, and operator access.
5. **Public-utility networks.** Portal, SearXNG, Anubis, and Redlib. Only
   SearXNG shares the separate internal search-state network with its Valkey.
6. **Additional-application networks.** FreshRSS and PrivateBin accept traffic
   through private-bound host ports. PostgreSQL and RSSHub's Valkey remain on
   the internal backend. RSSHub joins that backend for cache/FreshRSS traffic
   and a non-published egress-capable network to contact source sites.
7. **External recipients.** Search engines, Reddit, subscribed feed origins,
   and any external link intentionally opened by a visitor.

## Components

| Component | Responsibility | Public exposure | Persistent state |
| --- | --- | --- | --- |
| Caddy edge VM | TLS, public routing, request controls, and optional edge logs | Public; managed outside the Compose projects | Certificates, configuration, and any enabled logs |
| Portal | Bilingual catalog, public configuration, and high-level status | Private-bound port reached through the edge | No database |
| SearXNG | Sends searches to selected engines and renders results | Private-bound port reached through the edge | Re-creatable cache |
| Root Valkey | SearXNG limiter/cache state | Docker network only | Memory/tmpfs; cleared on restart |
| Anubis | Browser challenge before accepted Redlib traffic | Private-bound Redlib ingress reached through the edge | Challenge database and stable signing key |
| Redlib | Retrieves Reddit pages and proxies associated media | Docker network only behind Anubis | No server database; optional preferences are browser cookies |
| FreshRSS | Feed reader, refresh jobs, and account interface | Private-bound port reached through the edge | Application data/extensions plus its PostgreSQL database |
| PostgreSQL | FreshRSS database | Internal Docker network only | Host bind-mounted database directory |
| RSSHub | Intended operator-approved feed generation for FreshRSS | Docker networks only; no host or edge route | Re-creatable cache only |
| Additional Valkey | RSSHub cache | Internal Docker network only | Memory/tmpfs; cleared on restart |
| PrivateBin | Browser-encrypted paste storage and retrieval | Private-bound port reached through the edge | Ciphertext and paste metadata in a host bind mount |

## Portal server

The production portal contains built static assets and a small Node server.
Its non-static surface is fixed:

- `GET /healthz` returns a minimal health response;
- `GET /_portal/config` and the legacy fixed alias return sanitized public
  presentation values and enabled service IDs;
- `GET /_portal/status` and the legacy fixed alias check only a configured
  allowlist of internal health targets and return high-level states; and
- unknown `/_portal/*` or `/api/*` paths return 404.

The portal has no arbitrary URL fetcher, media resolver, webhook receiver,
DNS resolver, network scanner, upload store, or account system. Internal
addresses and response bodies are never returned by the public status API.

The portal's Reddit URL router runs in the browser. It accepts only reviewed
Reddit hostnames and path/query shapes, then creates a link on the configured
Redlib origin. It does not proxy the request.

## Main data flows

### Search

```text
Browser --> edge --> SearXNG --> selected external search engines
                           |
                           +--> private Valkey limiter state
```

Search engines receive the query from the application VM. SearXNG may proxy
result images according to its configuration. Opening a result is a direct
navigation to the result site.

### Reddit browsing

```text
Browser --> edge --> Anubis --> Redlib --> Reddit
Browser <-- rendered pages and proxied media <-- Redlib <-- Reddit
```

Redlib is operationally fragile: its upstream Android client emulation and
browser/TLS behavior can be blocked by Reddit at any time. It uses no personal
Reddit account supplied by a Utilibre visitor. The local source build includes
the documented redirect-hardening patch.

### FreshRSS and internal RSSHub

```text
Browser --> edge --> FreshRSS --> subscribed public feed origins
                         |
                         +--> PostgreSQL
                         +--> internal RSSHub route --> source site
```

FreshRSS stores persistent user and subscription state. RSSHub is not a
public feed-generation endpoint: it has no host or edge route. The stock
runtime does not allowlist routes, however, so a FreshRSS user able to submit
an arbitrary subscription URL may be able to address more than the intended
operator-approved set. That boundary must be enforced or explicitly contained
before unrelated-user access opens.

### PrivateBin

```text
Browser --ciphertext + metadata--> edge --> PrivateBin storage
Browser <--ciphertext------------- edge <-- PrivateBin storage

URL fragment containing decryption key stays in the browser
```

The server can see request metadata, ciphertext size, expiry metadata, and
traffic timing. It does not receive the URL-fragment decryption key during
ordinary use. File uploads and discussions are disabled; the configured paste
size and expiry choices bound individual records.

### Status

The portal checks a fixed list of internal health URLs with redirects disabled
and a short timeout. Concurrent callers share an in-flight check and a short
memory cache. The response contains service IDs, high-level states, and a
timestamp, not historical availability or internal diagnostics.

## Persistence model

The root Compose project persists only re-creatable SearXNG cache plus the
Anubis challenge database and its signing key. Redlib and the portal have no
content database. Root Valkey state is intentionally ephemeral.

The additional project persists FreshRSS application data/extensions,
PostgreSQL data, and PrivateBin ciphertext. RSSHub and its Valkey cache are
re-creatable. Those persistent directories require backup, restore, erasure,
capacity, and retirement procedures before broader account access opens. See
[`backups.md`](backups.md).

## Deliberate omissions

The architecture has no public database/cache port, Docker socket mount, host
networking, wildcard application binding, portal-native end-user utility,
generic proxy, persistent media store, advertising system, or behavioral
analytics. RSSHub has no public listener. Applications removed during the
strategic reset have no place in the active topology.
