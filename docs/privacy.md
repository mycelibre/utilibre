# Privacy and data handling

This document describes the implemented deployment, not an anonymity guarantee. Privacy frontends change some network paths and reduce some direct contacts; they do not hide activity from this operator, every upstream service, the visitor's network, browser extensions, or the visitor's device.

The bilingual public Privacy and Transparency pages are generated from centralized translations and the structured catalog. Update those public disclosures together with this document whenever a flow, log, cookie, retention rule, or enabled service changes.

## Summary by operation

| Operation | What reaches the application VM | What reaches an external service | Temporary or persistent state |
|---|---|---|---|
| Portal page | Requested path and ordinary HTTP headers forwarded by the edge | Nothing from portal code | Static browser cache; no portal database |
| Local browser tool | Only later static-asset requests, if an asset was not already loaded; never the selected file/content intentionally | Nothing from the tool | Working data in browser memory; generated downloads on the visitor's device |
| Browser-direct developer request | Only ordinary requests for the portal page/assets; the entered destination, headers, body, and messages do not pass through Utilibre | The chosen HTTPS, WSS, or HTTPS event-stream destination receives a direct browser connection and the data the visitor sends | Bounded working output in browser memory; destination policy controls its own state |
| Temporary webhook inbox | Receiver path, sender network/request metadata, retained headers/query, and up to 12 KiB of body per event | Cloudflare and the Caddy edge process the inbound request before it reaches the portal | Access ends after 15 minutes; process references are normally removed within another minute; 25 events/1 MiB per inbox; no database or forwarding |
| DNS lookup | Submitted public hostname and record type; short-lived derived-client rate counter | The application VM resolver and contacted DNS servers receive the query | No query history; bounded process-memory rate state |
| Open through a privacy frontend | Nothing while parsing | Nothing until the visitor follows the generated local-frontend link | Pasted URL in the page's live DOM/memory only |
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

The portal sets no cookies and includes no analytics, advertising, tracking pixel, remote font, third-party script, or telemetry endpoint. It has no user accounts or request-history database. Its server emits a startup message and a generic operational error message for an uncaught request failure; it has no normal per-request access logger and deliberately does not print tool input or submitted media URLs.

`/_portal/config` returns only sanitized public presentation URLs/text and enabled-service IDs. It does not return edge configuration, Cobalt keys, the SearXNG secret, resource secrets, or container environment details. `/_portal/status` returns only service IDs, a timestamp, and high-level states. A direct private preview can intentionally return private service URLs to visitors already on that network.

Browser caching may retain versioned JavaScript, CSS, PDF code, and QR WebAssembly according to ordinary cache headers. That cache contains public application code, not a visitor's selected tool data.

## Local browser tools

Images, PDFs, file hashes/information, JSON, Base64 text, URL encoding, UUID generation/inspection, QR generation/reading, JWT/HMAC operations, OpenAPI inspection, HTTP↔cURL conversion, regex/cron evaluation, timestamp conversion, and text hashing execute in browser JavaScript, browser APIs, bundled PDF/YAML code, disposable local workers, or self-hosted WebAssembly. They do not submit a form, fetch a processing endpoint, open a WebSocket, send a beacon, or use an external CDN after required assets have loaded.

Specific local data handling includes:

- images are decoded with `createImageBitmap`, drawn into a canvas, and encoded into a browser `Blob`;
- metadata removal is a pixel decode/re-encode, not a proof that every proprietary metadata structure is gone;
- PDFs are loaded and written in browser memory with `@cantoo/pdf-lib`;
- SHA-256 and SHA-512 use Web Crypto after reading the selected file into browser memory;
- file information reads the browser-provided filename, size, MIME label, modification time, and optional decoded image dimensions; the MIME label is not authoritative;
- JSON, UTF-8 Base64, and URL transformations use local JavaScript strings;
- UUID generation uses a cryptographically secure UUIDv4 source and inspection parses the supplied value locally;
- JWT decoding, HMAC signing, and verification use local JavaScript and Web Crypto. Supported JWT algorithms are HS256, HS384, and HS512; decoding a token does not prove its signature is valid;
- webhook-signature verification uses local HMAC SHA-256, SHA-384, or SHA-512 with a visitor-supplied payload, signature, and secret;
- OpenAPI inspection parses at most 2 MiB of JSON or YAML with the bundled `yaml` library, inspects a bounded document tree, and lists rather than fetches remote references. It is a basic structural check, not full OpenAPI standards validation;
- the HTTP↔cURL converter parses and prints a conservative subset but never executes the request or command; file-backed, shell, and credential-file options are rejected;
- arbitrary JavaScript regular expressions run in a disposable worker with a 750-millisecond deadline, 512-character pattern limit, 50,000-character input limit, and bounded displayed matches/captures;
- standard five-field cron expressions run in a separate disposable worker with a one-second deadline, UTC semantics, eight requested previews, and a five-year search horizon; an exhausted horizon is reported rather than treated as a match;
- timestamp conversion and SHA-1/SHA-256/SHA-384/SHA-512 text hashing use local JavaScript/Web Crypto; and
- QR generation/reading uses the self-hosted `zxing_full.wasm`; a decoded URL is displayed with a warning and opens only after an explicit click.

Working data remains in the tab's memory until references are released, the page is reloaded/closed, or the browser reclaims it. A browser or operating system can write memory, caches, crash reports, clipboard data, or downloaded results to the visitor's device; extensions can also observe pages and file selections. Those device-side behaviors are outside this server's control. Very large inputs can consume substantial client memory.

Automated browser tests attach network monitoring after assets are ready and exercise representative image, PDF, hash, text, and QR operations. The tests fail on an HTTP(S) processing request. Code review and the restrictive `connect-src 'self'` policy provide additional defense, but neither can control a malicious browser extension or a locally modified build.

## Browser-direct developer connections

The HTTP request tester, CORS-visible response-header viewer, WebSocket tester,
and server-sent events viewer are intentionally **not** local-only tools. The
visitor's browser connects to the destination entered in the form; the Utilibre
server does not receive or relay that destination request. The destination
therefore sees the visitor's network address and the request metadata supplied
by the browser, and can retain data under its own policy. DNS, TLS, browser
extensions, the visitor's network, and other ordinary intermediaries remain in
the path. The public portal CSP permits HTTPS and WSS destinations; the browser
also blocks mixed content where applicable.

The HTTP and event-stream fetches use `credentials: 'omit'`, so ambient browser
cookies and HTTP authentication credentials are not requested for those
fetches. An Authorization header that the visitor explicitly enters in the
HTTP tester is sent. Browser-forbidden headers such as Cookie, Host, Origin,
Referer, proxy headers, and `Sec-*` cannot be entered through the tool. The
interface displays at most 1 MiB of an HTTP response and bounds event-stream
bytes, events, and buffer size. Fetch redirects are followed. A displayed CORS
failure can happen after the destination or a redirect target already received
the request, so it is not evidence that a state-changing operation did not run.
These display limits do not limit what the remote endpoint itself records.

Cross-origin response bodies and headers are readable only when the destination
permits them through CORS. The header viewer is therefore not a complete remote
security-header audit: it shows only what browser JavaScript can see. The
WebSocket API has a different boundary. It sends an Origin and offers no
credentials-omit option, so the browser may attach cookies already stored for
the selected endpoint. Utilibre cannot inspect or suppress those cookies. Its
visible session log and message sizes are bounded and disappear with the tab.
The browser materializes an incoming frame before the page can inspect and
close the connection for an oversized frame.

The four exact network-tool routes receive an operation-specific CSP allowing
`https:` and `wss:` connections. Other portal routes retain `connect-src
'self'`, and moving into or out of a network-tool route performs a full
document navigation so the exception does not leak across SPA views.

## Temporary webhook inbox and DNS lookup

Creating a webhook inbox produces independent opaque receiver and read
capabilities. The receiver URL accepts `POST`, `PUT`, `PATCH`, and `DELETE`
from a webhook sender; the read token
stays in the creating tab and is sent only in same-origin Authorization headers
when listing or deleting the inbox. The server stores only a hash of that read
token. Anyone who learns the receiver URL can submit requests until the inbox
expires, so it should be treated as a short-lived secret.

Cloudflare and the separate Caddy edge process an incoming webhook before the
portal. The portal retains the method, query, selected headers, content
type, timestamp, and up to 12 KiB of text or Base64-encoded body data in process
memory. Each event retains no more than 32 selected headers totaling 32
KiB. Authorization, Cookie, standard hop-by-hop, and recognized forwarding,
client-address, and proxy headers are deliberately omitted; signature headers such as
`X-Hub-Signature-256`, other custom headers, query parameters, and request bodies
remain available to anyone holding the read capability. Each event says when
the retained header set was truncated. Inbox access expires after 15 minutes.
It retains the newest events up to 25 events/1 MiB, so a later accepted event
can evict the oldest. Process references are logically
removed on the next request or periodic sweep, normally within another minute,
and earlier by explicit deletion or portal restart. Process-wide ceilings are 100 inboxes,
2,048 events, and 16 MiB. A derived client is limited to three active inboxes,
75 retained events, and 2 MiB. There is no database, disk persistence, forwarding,
or replay feature. Logical removal releases application references; it is not
a forensic claim that process, kernel, or host memory is immediately zeroed.

Valid textual bodies are displayed as captured UTF-8, with a separate formatted
JSON preview when applicable. Non-textual or invalid UTF-8 bodies are displayed
as a reversible Base64 representation, not mislabeled as raw text. Byte-exact
signature checks should use decoded bytes or the sender's original bytes;
clipboard and text controls may normalize line endings.

The portal does not intentionally print webhook bodies or read tokens. A normal
edge access log can still record the opaque receiver path and sender network
address, and an edge configured to log request bodies would see the payload.
The portal route must therefore use the same no-sensitive-path/body logging
discipline as other capability URLs.

DNS lookup sends a normalized public hostname and one of A, AAAA, CAA, CNAME,
MX, NS, SOA, SRV, or TXT to the application VM resolver. The resolver and DNS
servers can observe that query. Literal IPs, single-label and special-use names,
and malformed hostnames are rejected; this is not an arbitrary network scanner.
The portal does not keep query history. Derived-client rate state exists only
in process memory and clears on expiry or restart. IPv6 identities are grouped
by /64 for application rate limits: this resists trivial address rotation, but
visitors sharing one delegated prefix can also share an allowance.

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

## Privacy-frontend router

The router parses the pasted value only in the browser. It accepts HTTPS URLs with no credentials or explicit port for exact YouTube, Reddit, or Imgur hostnames. It preserves a normalized path and only selected, length-limited query fields; all other query fields and fragments are discarded. The final hostname comes from operator configuration rather than visitor input, so the feature is not an arbitrary open redirect.

Nothing is transmitted merely by pasting or processing a URL. Following the
result is a new navigation: the configured frontend then sees the routed path
and normal request metadata and may contact its upstream. Reddit URLs route to
the operator-configured Redlib origin when `redlib` is enabled. Invidious and
rimgo are disabled by default, so the router reports their destinations as
unavailable rather than sending them elsewhere.

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
privacy disclosure, status, and private-router controls are bilingual; they do
not turn the upstream application into a Spanish interface.

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
| Portal webhook inbox | Opaque receiver ID, read-token hash, retained request metadata, and bounded event body in process memory | Access ends after 15 minutes; process references are normally removed within another minute and earlier on explicit deletion or portal restart | Anyone with the read token through the API; portal and host/Docker operators can access process memory |
| Portal developer rate state | Salted derived-client/inbox counters in process memory | Configured windows; all cleared on portal restart | Portal process and host/Docker operators |
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
| Edge Caddy | Not controlled by this repository | Operator must choose and document; recommendation is no sensitive query strings, webhook receiver paths/bodies, or more than seven days for coarse security logs | Edge operators |
| Cloudflare public proxy; browser NEL disabled 2026-09-03 | Cloudflare processes every public request and its connection metadata; accepted responses checked after the change contained neither `NEL` nor `Report-To` | Cloudflare account/policy dependent; keep NEL disabled, verify both headers remain absent, and review account analytics retention before broad telemetry claims | Cloudflare and authorized account operators |
| Docker daemon/journal | Container lifecycle and daemon errors, host-policy dependent | Host policy, outside Compose rotation | Host operators |

The size cap bounds disk use but does not map to an exact number of hours or days. Container deletion can remove its local log file; backups intentionally exclude logs. Never intentionally add media URLs, query terms, selected filenames, PDF names, QR contents, Base64/JSON text, developer-tool input, webhook receiver paths/bodies/read tokens, authentication headers, cookies, or tunnel query strings to logs.

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
- verify the portal edge accepts the 12 KiB webhook payload within its 16 KiB request ceiling without logging receiver paths or bodies, and that both developer API kill switches fail closed independently;
- verify the Redlib edge does not retain paths, queries, referrers, or cookies, that its local redirect patch stays same-origin, and that Anubis's real-client header cannot be spoofed around the Cloudflare-only origin;
- verify ordinary browsers are challenged, `/info` and exact instance-updater requests remain usable, the signing key survives restart, and neither Anubis metrics nor direct Redlib is host-published;
- accept and disclose Redlib's Android OAuth/client and browser/TLS emulation, English-only UI, crawler risk, and possible Reddit blocking;
- verify Docker log rotation on the created containers;
- restrict access to `.env`, the `0700` secrets directory, Docker, backups, and edge configuration;
- run the local-tool no-upload tests against the exact built portal;
- repeat one successful, failed, cancelled, and restarted Cobalt cleanup check without stressing an upstream;
- update the public pages immediately if logging, cookies, enabled services, or retention changes.

The project must not publish “zero logs,” “anonymous,” “untraceable,” or “media never touches disk” without a new end-to-end verification that includes the edge, Docker daemon, browser delivery path, and upstream behavior.
