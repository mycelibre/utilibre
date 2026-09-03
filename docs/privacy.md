# Privacy and data handling

This document describes the implemented deployment, not an anonymity guarantee. Privacy frontends change some network paths and reduce some direct contacts; they do not hide activity from this operator, every upstream service, the visitor's network, browser extensions, or the visitor's device.

The bilingual public Privacy and Transparency pages are generated from centralized translations and the structured catalog. Update those public disclosures together with this document whenever a flow, log, cookie, retention rule, or enabled service changes.

## Summary by operation

| Operation | What reaches the application VM | What reaches an external service | Temporary or persistent state |
|---|---|---|---|
| Portal page | Requested path and ordinary HTTP headers forwarded by the edge | Nothing from portal code | Static browser cache; no portal database |
| Catalog launch | Only the portal page and chosen catalog route before the click | The separately hosted upstream application receives the subsequent navigation and handles data according to its disclosed flow | Determined by that upstream application and its Utilibre configuration |
| Cobalt media | Full submitted public URL, output mode/quality, Origin, and client address used for rate limiting | Full target URL and extraction requests from Cobalt; possibly a later direct browser request to a provider/CDN | In-memory rate bucket and tunnel metadata; no media volume |
| SearXNG search | Search terms, preferences, ordinary headers, and client address for limiting | Query and engine-specific parameters from the application VM | Memory-only Valkey limiter state, re-creatable cache, optional first-party preferences cookie |
| Redlib browsing | Anubis receives the requested path, network address, user agent, ordinary headers, challenge state, and its first-party authorization cookie; accepted requests then reach Redlib with any optional Redlib preference cookie | Redlib sends corresponding page/media/API requests to Reddit from the application VM using spoofed Android OAuth/client identity and browser/TLS emulation | Anubis bbolt challenge records (30-minute logical TTL), stable signing key, and a 24-hour first-party authorization cookie; Redlib process state and optional preference cookie |
| Status | Request for `/_portal/status` | Nothing; portal checks fixed health targets, including ntfy's exact public health URL | No history database |
| External support/source/contact link | Only an ordinary portal page request before the click | The destination receives a normal navigation after the click | Determined by the external destination |

## Cloudflare and portal access

All current public Utilibre hostnames pass through Cloudflare before the Caddy
edge, not only Redlib. Cloudflare can therefore process the client network
address, hostname, requested path, headers, timing, and traffic metadata under
the operator's Cloudflare configuration and Cloudflare's terms. TLS then
terminates on the edge VM. The edge sees the same ordinary request information
after termination and forwards a normal HTTP request over the private network.
The portal can therefore receive the trusted forwarded client address, user
agent, requested route, and other normal request headers.

Cloudflare remains an external processor of public connection and request
metadata. Its Network Error Logging was disabled for the zone on 2026-09-03.
Accepted public responses checked after the change contained neither `NEL` nor
`Report-To`. Verify that both remain absent from every public hostname during
release and regression checks. See [Cloudflare Network Error
Logging](https://developers.cloudflare.com/network-error-logging/).

Portal HTML is served with `Cache-Control: no-cache, no-transform` so the
public intermediary is instructed not to append executable content. Public
release checks require that the returned document contain no Cloudflare
challenge-platform script; this protects the portal's no-third-party-script
boundary without relaxing its CSP. Cloudflare still processes the request as
the public proxy.

The portal sets no cookies and includes no analytics, advertising, tracking pixel, remote font, third-party script, or telemetry endpoint. It has no user accounts or request-history database. Its server emits a startup message and a generic operational error message for an uncaught request failure; it has no normal per-request access logger and deliberately does not print submitted media URLs.

`/_portal/config` returns only sanitized public presentation URLs/text and enabled-service IDs. It does not return edge configuration, Cobalt keys, the SearXNG secret, resource secrets, or container environment details. `/_portal/status` returns only service IDs, a timestamp, and high-level states. A direct private preview can intentionally return private service URLs to visitors already on that network.

Browser caching may retain versioned portal JavaScript and CSS according to ordinary cache headers. Separately hosted upstream applications control their own asset caching and disclose task-data handling in their catalog records.

## Hosted upstream applications and portal glue

Utilibre's portal does not provide independently authored image, PDF, text,
developer, webhook, or network utilities. Every task offered in the catalog is
implemented by an independently maintained, self-hostable FOSS application.
The portal contributes discovery, bilingual explanation, attribution, status,
and launch routing. Its one task-specific adapter validates a narrow media
request before handing it to the upstream Cobalt service.

After a visitor opens a catalog entry, the selected upstream application has
its own browser, server, external-recipient, cookie, cache, and retention
boundaries. The catalog and this document describe verified deployment facts;
they do not turn an upstream project's general claims into Utilibre guarantees.
FOSS libraries or browser APIs alone are not treated as an upstream application
and cannot justify publishing a portal-native tool.

## Language and theme storage

The portal stores exactly two preference keys in this origin's `localStorage`:

- `portal.language`: `en` or `es` after a manual language choice;
- `portal.theme`: `system`, `light`, or `dark` after a manual theme choice.

On a first visit with no saved language, `navigator.languages` is read locally. The preferences are sent neither to analytics nor to a profile. The browser still sends the selected language route (for example `/es/`) in an ordinary page request. Clearing this site's browser storage removes both keys.

The portal itself sets no cookie. SearXNG is a separate origin and may set a
first-party preferences cookie when the visitor changes its settings; the
pinned upstream can keep that preference for a multi-year period (up to
approximately five years) unless the visitor clears it. Redlib is another
origin and can store non-authentication display, subscription, and filter
choices in first-party, HTTP-only cookies for up to approximately 52 weeks.
The pinned upstream cookie builder does not add `Secure` or `SameSite`; public
TLS still protects transport through the edge, but the missing attributes are
a documented browser-defense limitation. Direct private HTTP preview has no
transport confidentiality. Those choices can reveal interests even though
they are not an account identifier. Neither service's
cookie is shared with the portal, but both belong in the public disclosure.

Before an ordinary browser reaches Redlib, Anubis normally sets a separate
host-only authorization cookie after a browser-side proof-of-work challenge.
That cookie is Secure, HttpOnly, SameSite=Lax, and Partitioned, and expires
after 24 hours. Its purpose is abuse resistance, not advertising, analytics,
or cross-site profiling. Clearing site data removes both the Anubis cookie and
any separate Redlib preference cookies. Clients that cannot run the first-party
challenge JavaScript may be unable to use the instance.

## Cobalt media requests

The browser sends the full target URL, quality, and mode to same-origin `POST /_portal/media`. The edge can access that body because it terminates TLS. The portal validates it in memory, uses the trusted client address for an in-memory rate bucket, and forwards a fixed request schema plus a server-held API key to internal Cobalt. The bucket contains an address key and count and is not written to a database. It is deleted after the configured window (10 minutes by default) plus at most the 60-second sweep interval, or earlier on the next media request or portal restart.

Cobalt contacts the selected source platform from the application VM. The platform receives the requested resource details, the server's network address, and provider-specific extraction requests. No private-account cookies, personal tokens, private-media credentials, or user-supplied cookies are configured.

Cobalt may return either:

- a short-lived tunnel link, in which case the browser requests the media hostname and bytes flow through Caddy and Cobalt; or
- an upstream media URL, in which case the visitor's browser contacts that host directly and exposes its network address and normal request metadata to it.

The interface carries SERVER, PROXY, and EXTERNAL labels because both delivery classes are possible. `Referrer-Policy: no-referrer` and `rel="noopener noreferrer"` reduce referrer disclosure from the portal, but the destination still observes a direct connection.

As deployed, Cobalt has a read-only root filesystem, no writable media mount, and no persistent volume. It streams through process memory/pipes and keeps encrypted tunnel metadata in process memory for about 90 seconds by default. TTL expiry or container restart clears that metadata. There is no claim that network buffers or process memory never touch host RAM/swap; the assessed host has 4 GiB of swap as of 2026-09-03, and that can change operationally.

The portal intentionally does not log the submitted URL. Cobalt has operational error output but no configured access logger in this stack; upstream error details may still be sensitive and must be reviewed before sharing. The dedicated edge route must not log `/tunnel` query strings because they contain short-lived tunnel state. Docker log retention is size-based, not a promise of a fixed number of days.

## SearXNG searches

The browser submits the search to the SearXNG hostname. SearXNG receives the query, selected categories/language/options, ordinary headers, and the trusted client address needed for limiting. It sends the query and engine-specific parameters from the application VM to the curated external engines. Those engines see the application VM rather than the visitor as the network source, but they still receive the query.

The current General set includes Google Custom Search, Bing, Fynd, Wiby, and
Wikipedia, with additional category-specific sources listed in the portal's
Transparency catalog. The pinned Google CSE engine uses an unofficial Google
JSONP route and an upstream Blackle partner CSE identifier rather than an
operator-owned API key. Searches handled by it reach Google Custom Search. It
is retained because bounded English and Spanish checks found it materially
useful, but it is operationally brittle; see `docs/searxng-engine-review.md`.

SearXNG access logging is disabled by the pinned image's normal configuration. The source-visible `config/searxng/sitecustomize.py` hook also replaces `q`/`query` values and URL query strings in rendered Python log records before Docker captures them. Operational errors remain and an exceptional abuse event can include a network address. The hook reduces accidental query disclosure but cannot guarantee coverage of a new native process or every future upstream logging path. Review both the upstream default and redaction tests at every image update.

Valkey stores keyed/derived address identifiers and request/suspicion counters in memory. Normal keys expire with limiter windows; on an uninterrupted process, suspicious-client counters can remain for up to approximately 30 days. A derived identifier is still privacy-relevant and is not treated as anonymous. Valkey is bounded to 96 MB with eviction and warning-level logs. RDB snapshots and AOF are disabled, `/data` is a 128 MiB tmpfs, and it has no host port; all limiter state vanishes when the Valkey container restarts or is recreated.

`searxng-cache` contains re-creatable application/cache data, not an intentional query-history or result database. It is not included in routine backups. Restarting Valkey removes active abuse history and can temporarily reduce limiter effectiveness, so avoid unnecessary limiter restarts during an abuse event.

## Redlib browsing

Anubis receives the requested community, post, search, settings, or media path,
the network address supplied through the trusted Cloudflare/edge path, the user
agent, ordinary headers, and its authorization cookie. A fresh ordinary browser
normally performs a mild difficulty-2 proof-of-work challenge locally before
the request is forwarded. `/info` and exact Redlib/Libreddit instance-updater
requests are allowed by narrow policy exceptions. Anubis is not analytics and
does not make the visitor anonymous; it is an abuse-control gate.

After acceptance, Redlib receives the requested community, post, search, settings, or media path;
ordinary request headers; and any optional first-party Redlib preference cookie.
It contacts Reddit from the application VM for public page data and media and
normally proxies the returned content through the VM. The intended flow is
`Browser → Cloudflare → Caddy edge → Anubis → Redlib → Reddit`, labeled
`SERVER` + `PROXY`.
Clicking an ordinary external link is a separate visitor-directed navigation.

Anubis keeps transient challenge records in ignored `data/anubis/` using
bbolt. Records expire logically after 30 minutes; bbolt can retain freed page
bytes in its database file until later compaction or file deletion, so this is
not described as guaranteed physical erasure at minute 30. A stable Ed25519
signing key lives in the ignored, operator-only secrets directory and contains
no browsing history. Normal Anubis logging is WARN/error only and Docker bounds
it to 10 MB times three files. The private metrics listener is bound only to
container loopback and is not published.

The operator explicitly accepted an upstream privacy/operational compromise:
the pinned Redlib source impersonates an official Reddit Android OAuth client,
refreshes spoofed tokens, generates device identifiers, sends official-client-
like headers, and emulates browser/TLS fingerprints. Reddit therefore sees the
application VM's network address, the requested public resources, a spoofed
client/device identity, tokens, and request timing. No personal Reddit account,
personal cookie, password, or operator-supplied Reddit token is configured.
Reddit can still correlate or block the server-side activity.

Redlib has no database or persistent volume. OAuth, device, connection, and
transient page/media state may exist in process memory; `/tmp` is a bounded
memory-backed filesystem, and both end on container restart. This is not a
forensic-erasure claim about RAM, kernel buffers, edge/Docker logs, or Reddit's
own records.

`RUST_LOG=warn` suppresses informational paths that can print an emulated
device identity or OAuth token prefix. The process still prints its startup
line and can emit OAuth/rate-limit warning/error messages to stderr, which are
captured by bounded Docker logs. The edge may otherwise log full community,
post, search, and media paths, queries, referrers, and cookies; its Redlib site
must avoid those fields and use a short documented retention for coarse errors.
There is no configured server-side browsing-history store.

The upstream Redlib interface is English-only. The surrounding portal,
privacy disclosure, and status page are bilingual; they do not turn the
upstream application into a Spanish interface.

## Optional and deferred frontends

Invidious is not in Compose and receives no visitor data. rimgo exists only in
the optional profile. Its private compatibility test passed, but reviewed 1.4.2
has an unsafe `/search` external-redirect case. It remains publicly disabled
pending an official fix and re-review; limiter, English-only UI, and bandwidth
concerns remain additional blockers.

During private rimgo evaluation, the browser's requested Imgur path and ordinary headers reach rimgo; rimgo contacts Imgur from the application VM and normally relays page/media data. Its configured disclosure flags acknowledge processing of network address, requested URL, device/user-agent information, and diagnostics. It has no database or persistent volume, but its approximately 25 MB in-process cache can retain entries for about 30 minutes or until earlier eviction/restart, and it can emit operational logs. Do not activate it publicly until a fixed official release passes a new review; update the public catalog and this document before any later activation.

If any deferred service is later deployed, review its cookies, localization, direct-versus-proxied media, access logs, database, registration, tokens, and retention before changing `ENABLED_SERVICES` or adding an edge route.

## Logs and retention

Aggregate operational measurement is compatible with the project's stated
intent when it is limited and disclosed. The preferred signals are total
requests/bytes/errors/challenge outcomes, not visitor journeys or profiles:

- Cloudflare HTTP Traffic request/data-transfer totals, while avoiding
  exporting, retaining, or using unique-visitor and country breakdowns;
- Caddy per-host Prometheus counters from a loopback-only admin endpoint, with
  no client-IP, path, user-agent, referrer, cookie, or session labels;
- Anubis's existing loopback-only non-debug metrics, whose aggregate labels
  cover challenge method/algorithm/host/policy action rather than paths,
  client addresses, user agents, or sessions; and
- point-in-time Docker network I/O/resource counters.

Do not enable request access logs or browser analytics merely to count visits.
If aggregate metrics are retained, say so as aggregate operational metrics;
“no behavioral tracking” is accurate, while “nothing is measured” would not
be. Cloudflare's continuing public-proxy role and the disabled NEL setting are
described above; either `NEL` or `Report-To` returning is a release regression.

| Log/state | Default behavior | Retention boundary | Access |
|---|---|---|---|
| Portal stdout/stderr | Startup and generic operational errors; no normal access log | Docker `json-file`, 10 MB × 3 files by default | Host/Docker operators |
| Portal media limiter | Client address, count, and expiry in process memory | Configured window plus at most 60 seconds; earlier on next request/restart | Portal process and host/Docker operators |
| Cobalt stdout/stderr | Upstream operational output; no configured access log | Docker `json-file`, 10 MB × 3 | Host/Docker operators |
| SearXNG stdout/stderr | Operational errors; access log expected disabled; Python log records pass through the local query-redaction hook | Docker `json-file`, 10 MB × 3 | Host/Docker operators |
| Valkey stdout/stderr | Warning level | Docker `json-file`, 10 MB × 3 | Host/Docker operators |
| Valkey limiter state | Derived address counters in memory/tmpfs | Window expiry; suspicious counters up to about 30 days only while uninterrupted; all cleared on restart | SearXNG and host/Docker operators |
| Anubis stdout/stderr | WARN/error operational messages; no intentionally enabled normal request access log | Docker `json-file`, 10 MB × 3 | Host/Docker operators |
| Anubis challenge database | Network-address/user-agent-derived transient challenge state in bbolt | Logical TTL 30 minutes; freed bbolt pages may remain until compaction/deletion | Anubis and host/Docker operators |
| Anubis authorization cookie | First-party host-only Secure, HttpOnly, SameSite=Lax, Partitioned cookie | 24 hours or earlier visitor clearing | Visitor browser and Anubis when sent with a request |
| Redlib stdout/stderr | `RUST_LOG=warn`; informational device/token messages suppressed; startup and OAuth/rate-limit failures can still be emitted; no intended per-request access log | Docker `json-file`, 10 MB × 3 | Host/Docker operators |
| Redlib OAuth/device state | Spoofed token, randomized device identity, and connection state in process memory | Token lifetime/process lifetime; all cleared on restart | Redlib process and host/Docker operators; Reddit receives the emulated identity |
| Redlib preference cookies | Optional non-auth settings/subscriptions/filters in first-party HTTP-only cookies; pinned upstream omits `Secure` and `SameSite` | Up to approximately 52 weeks or earlier visitor clearing/removal | Visitor browser and Redlib when sent with a request |
| Edge Caddy | Not controlled by this repository | Operator must choose and document; recommendation is no sensitive query strings or more than seven days for coarse security logs | Edge operators |
| Cloudflare public proxy; browser NEL disabled 2026-09-03 | Cloudflare processes every public request and its connection metadata; accepted responses checked after the change contained neither `NEL` nor `Report-To` | Cloudflare account/policy dependent; keep NEL disabled, verify both headers remain absent, and review account analytics retention before broad telemetry claims | Cloudflare and authorized account operators |
| Docker daemon/journal | Container lifecycle and daemon errors, host-policy dependent | Host policy, outside Compose rotation | Host operators |

The size cap bounds disk use but does not map to an exact number of hours or days. Container deletion can remove its local log file; backups intentionally exclude logs. Never intentionally add media URLs, query terms, authentication headers, cookies, or tunnel query strings to logs.

## Operator launch obligations

Before making hostnames public, the operator must:

- verify the actual edge logging configuration and publish its retention period;
- confirm Cloudflare Network Error Logging remains disabled and `NEL` and
  `Report-To` remain absent from every public hostname; the setting was
  disabled on 2026-09-03 and either header returning blocks release;
- confirm portal HTML keeps `Cache-Control: no-cache, no-transform`, contains
  no `/cdn-cgi/challenge-platform/` script, and causes no CSP violation from
  edge-added markup;
- restrict application ports to the exact edge source and test from an unauthorized network;
- verify Caddy does not expose Cobalt API POST/session paths;
- verify the Redlib edge does not retain paths, queries, referrers, or cookies, that its local redirect patch stays same-origin, and that Anubis's real-client header cannot be spoofed around the Cloudflare-only origin;
- verify ordinary browsers are challenged, `/info` and exact instance-updater requests remain usable, the signing key survives restart, and neither Anubis metrics nor direct Redlib is host-published;
- accept and disclose Redlib's Android OAuth/client and browser/TLS emulation, English-only UI, crawler risk, and possible Reddit blocking;
- verify Docker log rotation on the created containers;
- restrict access to `.env`, the `0700` secrets directory, Docker, backups, and edge configuration;
- run the upstream-FOSS policy test and catalog/source-attribution checks against the exact built portal;
- repeat one successful, failed, cancelled, and restarted Cobalt cleanup check without stressing an upstream;
- update the public pages immediately if logging, cookies, enabled services, or retention changes.

The project must not publish “zero logs,” “anonymous,” “untraceable,” or “media never touches disk” without a new end-to-end verification that includes the edge, Docker daemon, browser delivery path, and upstream behavior.
