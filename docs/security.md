# Security review

This is a public Internet service even though its application ports are private. The threat model assumes malicious visitors, automated clients, crafted URLs/files, hostile upstream responses, provider blocking, compromised dependencies, spoofed proxy headers, and resource-exhaustion attempts. It does not assume that Caddy, Docker root, or the application host is already compromised; those are privileged trust boundaries.

The public topology currently includes Cloudflare before Caddy. A separate
`PRIVATE_PREVIEW=1` workflow still exists for controlled setup: in that mode
`EDGE_PROXY_IP` is empty, the portal ignores forwarding headers, and the
generated SearXNG limiter trusts no edge address beyond loopback. Preview
ports must be limited to the exact operator client or an equally controlled
management network. Anubis's production `CF-Connecting-IP` trust is not a
general private-preview trust mechanism.

## Security invariants

The deployment is not launch-ready unless all of these remain true:

- every published Compose port binds to one exact private-network address;
- only the edge VM can reach those ports;
- public DNS reaches Cloudflare and the operator's Caddy edge terminates the origin-side public route;
- the public media hostname exposes exact `GET /tunnel` only, never Cobalt's API root or session routes;
- Cobalt's processing API requires its file-based API key and wildcard CORS is disabled;
- only the portal container receives the matching client key;
- Valkey and any future database have no host port;
- portal and SearXNG forwarded client headers are trusted only from the exact edge address; Cobalt's upstream private-peer trust exception is accepted only behind exact edge-source firewalling;
- Anubis accepts `CF-Connecting-IP` only while the edge origin is Cloudflare-only, and direct Redlib/Anubis metrics remain unpublished;
- local browser tools have no content-processing network request;
- no personal upstream account cookies/tokens or Docker socket mount exist;
- secrets and private addresses remain untracked and absent from public documentation.

`PRIVATE_PREVIEW=1` is an explicit non-launch exception to the edge/TLS and
edge-only reachability invariants. The launch validator rejects that mode,
empty edge trust, and private HTTP/IP service URLs. Before public routing, set
preview mode to `0`, configure the separate exact edge and HTTPS origins, render
again, and pass `node scripts/validate-config.mjs --launch`.

Run [deployment.md](deployment.md), [edge-routing.md](edge-routing.md), and [firewall.md](firewall.md) checks after every networking or proxy change.

## Implemented controls

### Network and proxy boundary

Compose requires `PRIVATE_BIND_IP` for portal, Cobalt, SearXNG, Anubis (the
Redlib ingress), and optional rimgo host mappings. It publishes neither direct
Redlib nor Valkey. Docker bridge
networking is used; there is no host network, privileged container, API
gateway, local reverse proxy, or Docker socket mount.

The portal accepts forwarded client information only if the TCP peer matches exact `EDGE_PROXY_IP`; otherwise it rate-limits the socket peer and ignores forwarded values. In public mode the rendered SearXNG limiter trusts only loopback and that same exact edge address. In private preview an empty edge value is deliberate, so the portal trusts no forwarded peer and the renderer omits the edge entry. Caddy's normal behavior must discard spoofable inbound forwarding values from untrusted clients before adding its own.

The pinned Cobalt 11.7.1 application is an upstream exception: its Express configuration trusts loopback and unique-local/private proxy peers rather than this repository's exact `EDGE_PROXY_IP`. Its private listener must therefore be reachable only from the edge VM, and the edge must overwrite forwarding headers. Until the documented firewall/external-exposure check passes, a private-network peer could spoof the address used by Cobalt's tunnel limiter. No unsupported source patch is applied; this residual must be rechecked on update.

Network binding does not supersede a firewall. Docker NAT can bypass rules an operator expects from UFW, so edge-source filtering and an unauthorized-host test are mandatory.

### Cobalt gateway and API boundary

`POST /_portal/media` applies the following before Cobalt:

- exact allowed Origin; a missing, `null`, or foreign Origin is rejected;
- body limit of 8,192 bytes and URL length limit of 2,048 characters;
- JSON object schema reduced to URL, video quality, and download mode;
- HTTP(S) only, with credentials and explicit ports rejected;
- exact provider hostname or subdomain suffix from the operator allowlist;
- literal loopback, private/link-local IPv4, multicast/reserved IPv4, and all IPv6 literals rejected;
- fixed safe Cobalt options: no local processing, no better-audio mode, no user filename template, and metadata disabled;
- per-client in-memory rate limit (10 per 10 minutes by default);
- global portal concurrency ceiling of two and upstream response timeout of 45 seconds;
- maximum 1 MiB accepted Cobalt JSON response, stable error mapping, and CR/LF removal from filenames/forwarded response headers;
- picker/batch and local-processing results rejected.

Cobalt independently requires the UUID API key, restricts CORS to the portal origin, applies its rate settings, targets a 30-minute media duration where the extractor can determine it, uses lower FFmpeg priority, disables selected fragile services, and mounts no private account cookies. The edge route is a second independent boundary: only tokenized `GET /tunnel` is public.

Private preview has no edge route, so the browser must reach the configured
private Cobalt port for generated tunnel downloads. The portal admits a
private returned URL only when preview mode is active, its origin exactly
matches `COBALT_PUBLIC_API_URL`, and its path is exactly `/tunnel`; credentials,
fragments, other paths, and other private origins remain rejected. Because the
Cobalt API port is then reachable by the preview client, firewall that port to
the intended client even though the root API still requires its key.

Origin checking is not bot authentication—non-browser clients can forge an Origin. The IP rate limit, concurrency cap, Cobalt key, duration limit, provider selection, private binding, and edge policy remain necessary. No Turnstile or remote challenge script is used, avoiding a third-party browser dependency but leaving sophisticated automation as a residual abuse risk.

### SSRF and redirect review

The portal cannot be configured by a public request to fetch an arbitrary hostname. The Cobalt target begins with a strict provider allowlist and rejects literal private addresses. There is no portal streaming/fetch fallback; tokenized media delivery uses the separately restricted Cobalt hostname. Status checks come only from operator environment configuration and accept `http` plus a simple Docker service hostname; visitors cannot supply a status URL. Concurrent status callers share a bounded in-flight check and short memory cache rather than launching unbounded internal probes.

Residual SSRF risk remains inside provider extraction: the portal does not resolve DNS before the request and cannot enforce every redirect or secondary URL that Cobalt/provider code follows. A compromised allowlisted domain, DNS rebinding, extractor vulnerability, or hostile upstream response therefore depends on Cobalt's controls and Docker/network egress. The service network currently has unrestricted outbound Internet access and access to its peers. This is a documented unresolved defense-in-depth gap; add an egress policy only after enumerating real provider endpoints, DNS needs, CDNs, redirects, and update traffic so that it does not silently break extraction.

Do not add a generic fetch endpoint, proxy parameter, arbitrary status URL, private-IP exception, user cookie import, or redirect-following gateway workaround.

### Open redirects and external navigation

The private router accepts exact HTTPS source hosts with no credentials/port. It creates the destination from an operator-configured base URL and an allowlisted path/query subset. A visitor cannot supply the destination hostname. Unit and browser tests cover lookalikes, credentials, ports, private addresses, and unsupported schemes.

The optional rimgo 1.4.2 profile remains disabled. Its reviewed `/search` handler has an unanchored Imgur-URL rewrite that can yield a protocol-relative, visitor-controlled external redirect. No public Caddy route is provided. A path denial would not make this version suitable for publication; an official fixed release must be pinned and pass fresh maintenance, security, and abuse-control review first.

Cobalt may legitimately return an external HTTP(S) media URL. The portal rejects returned URLs containing credentials, localhost, private/link-local/reserved literal addresses, or a non-HTTP(S) scheme, except for the narrowly matched private-preview Cobalt `/tunnel` URL described above. It does not assert that every other permitted hostname belongs to the original provider. Authenticity therefore depends on the trusted pinned Cobalt build and the upstream response. The UI does not open it automatically and marks external delivery. QR URLs likewise open only after a warning and explicit click. A visitor can choose a QR URL that points to their own local network in the browser, but the portal server does not fetch decoded QR content.

### Redlib policy exception and abuse boundary

The Redlib deployment is an explicit operator-approved exception to the
project's original prohibition on unofficial credential workarounds. At pinned
official commit
[`a4d36e954cf1bd64f209cd8868c5a29edc81b374`](https://github.com/redlib-org/redlib/tree/a4d36e954cf1bd64f209cd8868c5a29edc81b374),
upstream emulates an official Reddit Android client and OAuth identity, obtains
and refreshes spoofed tokens, adds official-client-like headers, and uses
browser/TLS-fingerprint emulation. It creates randomized device state in
process. No personal Reddit account, cookie, password, or operator-supplied
token is configured. This reduces direct visitor contact with Reddit; it does
not make the integration official or prevent Reddit from identifying/blocking
the application VM's egress.

The reviewed upstream settings redirect accepts paths beginning with `//` and
backslash forms that browsers can interpret as another host. This repository
therefore builds Redlib from source and applies the small tracked patch in
`config/redlib/` before compilation. The patch rejects scheme-relative and
backslash redirect targets. Tests must cover encoded/unencoded variants and
confirm the `Location` header remains same-origin. Complete modified source and
build wiring must remain available through `SOURCE_CODE_URL` under Redlib's
AGPL-3.0-only license.

Redlib has no built-in public per-client rate limiter, so the private host port
now terminates at unmodified Anubis 1.27.0. The gate uses the current default
tiered policy without unsupported Thoth integration; an ordinary browser
normally receives a mild difficulty-2 proof-of-work challenge. `/info` and the
exact official Redlib/Libreddit instance-updater user agents have narrow allow
rules. This raises the cost of indiscriminate scraping but does not provide
volumetric DDoS protection, defeat distributed solvers, or prevent Reddit from
blocking the application VM's egress.

Anubis trusts `CF-Connecting-IP` only because the edge origin is intended to be
Cloudflare-only. An alternate route that accepts a visitor-supplied value would
let visitors choose the address used for challenge state. Keep the origin
restricted to Cloudflare, strip `X-Original-URI` and `X-Forwarded-Uri` at Caddy,
and retest after any CDN or edge topology change. Direct Redlib and Anubis's
localhost metrics port must remain unpublished. The bbolt challenge database
is an ignored bind mount; the stable Ed25519 key is an ignored read-only secret.
Neither value belongs in source, logs, reports, or container environment dumps.

The remaining defenses are exact private binding, edge-only firewalling,
CPU/RAM/PID/tmpfs ceilings, indexing and RSS disabled, edge noindex/crawler
guidance, and operational observation. Distributed abuse and media hotlinking
remain launch risks; stop the Redlib/Anubis pair rather than widening resources
when those risks materialize.

Redlib runs with HSTS expiry set to zero because public HTTPS and HSTS policy
belong to the edge, but pinned upstream still emits an explicit
`Strict-Transport-Security: max-age=0`; the documented Caddy route strips that
upstream header. Optional Redlib preference cookies are HTTP-only but lack
`Secure` and `SameSite` attributes in this source. They are not authentication
cookies, but the missing attributes remain a browser-defense limitation; do
not invent an unverified Caddy cookie rewrite. Its upstream UI is English-only.
These limitations must stay visible in public documentation.

### Browser security

The portal server emits:

- a Content Security Policy restricted to self-hosted resources, `blob:`/`data:` images, local blob media, no objects, no base URI, same-origin forms/connections, and no framing;
- `Referrer-Policy: no-referrer`;
- `Permissions-Policy` disabling camera, microphone, geolocation, payment, USB, and browsing topics;
- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY`;
- `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Resource-Policy: same-origin`;
- `X-Robots-Tag` for APIs, health, tool, and status routes.

HTML responses also use `Cache-Control: no-cache, no-transform`. The
`no-transform` directive is deliberate: intermediaries must not rewrite the
document or append executable markup that is outside the portal's restrictive
CSP. Versioned static assets remain separately immutable.

`'wasm-unsafe-eval'` is the deliberate CSP exception required by the self-hosted QR WebAssembly module. There are no inline scripts, external script hosts, analytics, remote fonts, or service workers. The app uses `textContent`/DOM construction rather than inserting untrusted HTML.

HSTS is an edge decision and is intentionally not assumed. Add it only after all covered names are permanently HTTPS-ready. Crawler controls reduce load; they are not authorization.

A private-IP HTTP origin is not a secure context in normal browsers. The portal
uses `crypto.getRandomValues()` for its local UUID fallback, bundled
`@noble/hashes` SHA-2 for local hashing when Web Crypto digest is unavailable,
and a local copy fallback when the Clipboard API is withheld. These fallbacks
keep the corresponding tools local; they do not add transport encryption or
server authentication. HTTPS remains preferred for private use and mandatory
for the public service.

### Container hardening

All services drop every Linux capability, set `no-new-privileges`, define
PID/CPU/memory ceilings, rotate logs, and use `restart: unless-stopped`. Pulled
images and build bases are digest-pinned; Redlib additionally pins the exact
official Git commit/checksum. Health checks exist for portal, Cobalt, SearXNG,
Valkey, Anubis, and Redlib.

| Service | User/root filesystem | Writable locations and exception |
|---|---|---|
| Portal | Image runs as non-root `node`; read-only root | 32 MiB tmpfs at `/tmp`; file-based key mount is read-only |
| Cobalt | Official image runs as non-root; read-only root | API-key database mount only; no writable media volume or tmpfs |
| SearXNG | Official entrypoint/user behavior; root filesystem not forced read-only | Read-only `/etc/searxng` directory mount, named cache, and 128 MiB `/tmp` tmpfs; writable-root and no explicit Compose user are compatibility exceptions |
| Valkey | Explicit `999:1000`; read-only root | 16 MiB `/tmp` and 128 MiB `/data` tmpfs; RDB and AOF disabled |
| Anubis | Official image user `1000`; read-only root | 16 MiB `/tmp`; writable ignored bbolt directory at `/data`; read-only Ed25519 key and policy mounts; metrics on container loopback only |
| Redlib | Upstream-created non-root `redlib`; read-only root | 32 MiB `/tmp` tmpfs; no database, secret mount, or persistent volume |
| rimgo | Explicit unprivileged `65534:65534`; read-only root | No volume; no in-image health command because it is a minimal/scratch-style image |

Compose local secrets are bind-mounted rather than Swarm secret objects. Keep `.env` mode `0600`. The generator makes the host `secrets/` directory mode `0700` and the two files mode `0444`; the file readability is required by different non-root container UIDs, while the non-traversable directory protects them from other host users. Both mounts are read-only. Verify these modes after restore. The SearXNG secret is an environment variable and is visible to Docker/root operators through container metadata; host/Docker access is therefore privileged.

The deployment relies on Docker's default seccomp and host AppArmor/SELinux policy; it does not ship a custom profile. Image digest pinning prevents silent tag movement but also prevents automatic security updates. Follow the deliberate update procedure and scan the exact images/dependencies before launch and after each pin change.

Mounting all of `config/searxng/` at `/etc/searxng` is intentional: it overrides the official image-declared volume so Compose does not create an anonymous configuration volume outside the documented persistence model. `config/searxng/limiter.toml` contains the exact trusted edge address, is generated locally, ignored by Git, excluded from backups, and regenerated after restore. The same mount makes the source-visible `sitecustomize.py` query-redaction hook available through `PYTHONPATH`; it redacts rendered Python log records but is a defense in depth, not proof that every future upstream/native logging path is covered.

### Persistence and logging controls

Cobalt, Redlib, and rimgo have no persistent media volume. Portal, Cobalt, and
Redlib roots are read-only. SearXNG temporary files and portal/Redlib/Valkey
temporary paths use size-bounded tmpfs. Only the re-creatable SearXNG cache
volume persists; Redlib OAuth/connection state and Valkey limiter state clear
on restart. Docker logs use `json-file` rotation with configurable `10m × 3`
defaults.

The portal has no access logger and never deliberately prints submitted media
URLs or local-tool input. `RUST_LOG=warn` suppresses Redlib informational logs,
including paths that print an emulated device identity or OAuth token prefix,
while retaining warnings/errors and its startup line. Reviewed warning/error
paths do not intentionally include visitor URLs or queries. Known portal
upstream errors are mapped to bilingual public messages rather than exposing
raw responses or stack traces. Edge access logging remains a manual launch
decision; tunnel queries, search queries, Redlib paths/queries, and preference
cookies must not be logged.

## Threat review

| Threat | Current control | Remaining issue / response |
|---|---|---|
| Direct public access to app ports | Exact private binding; ntfy additionally has a deployed application-VM `DOCKER-USER` rule restricted to the configured and verified `EDGE_PROXY_IP` | The ntfy private-hop test passed on 2026-09-03; equivalent controls for other ports and the edge VM's complete firewall remain operator-managed and must be verified |
| Private-preview interception | Exact private binding, explicit preview gate, no trusted edge headers, narrow returned tunnel rule | Plain HTTP can be observed or changed by a hostile private-network peer; restrict clients and move to HTTPS for launch |
| Unrestricted Cobalt API | File API key, exact CORS, same-origin portal gateway, edge exposes only GET tunnel | A leaked key or misconfigured edge catch-all is critical; rotate key and remove route |
| SSRF/internal scanning | Initial scheme/host/IP/port validation; fixed internal endpoints | DNS, redirects, and extractor secondary fetches depend on Cobalt; no egress ACL yet |
| Arbitrary redirect | Strict private-router host mapping; no automatic navigation; tracked Redlib settings-redirect patch | Cobalt/QR external URLs require user click but can still be deceptive; repeat Redlib redirect tests after every upstream rebase |
| Forwarded-header spoofing | Exact edge peer trust | Breaks if Docker source preservation or a new upstream proxy changes; verify effective client IP |
| Request flood/search/Reddit scraping | Portal and Cobalt rate limits, two-job cap, SearXNG limiter/Valkey, HTML-only search, Anubis proof-of-work gate, Redlib noindex and container limits | Anubis is not volumetric DDoS protection; distributed botnets can solve/evade per-IP controls and media hotlinking remains expensive; stop the service when controls are insufficient |
| Oversized/long media | 8 KiB request, 30-minute duration target, 45-second API wait, resource limits | Approximately 500 MB output target is not technically enforced by this Cobalt release |
| Browser memory exhaustion | Image 80-million-pixel/16,384-dimension processing guard and warnings | Image decode precedes the pixel check; PDF/hash/QR byte size is not capped because processing is local; tab/device can become unresponsive |
| Temporary-media persistence | Cobalt read-only root and no media volume | Verify after success/failure/cancel/restart; do not claim forensic erasure of RAM/storage layers |
| Container breakout | Non-root where compatible, cap drop, no-new-privileges, read-only roots, PID/resource limits, no Docker socket | Shared kernel, default seccomp, writable SearXNG exception, and outbound peer network remain |
| Secret disclosure | Ignored files, file mounts, `0700` directory, sanitized config endpoint | Root/Docker operators can read secrets; backups must be encrypted; SearXNG secret is in env metadata |
| Supply-chain compromise | Exact versions/digests, lockfile, FOSS inventory, tests | No automatic patching; upstream images/native WASM still require periodic scan/provenance review |
| Sensitive logs | No portal access log, Redlib `RUST_LOG=warn`, error mapping, size rotation, edge no-query/path guidance | Upstream startup/error logs can contain details; Redlib and edge path/cookie retention must be checked; edge/daemon retention is operator-controlled |
| Weak preference-cookie attributes | Redlib cookies are first-party and HTTP-only; public traffic is HTTPS at the edge | Pinned upstream omits `Secure`/`SameSite`; cookies can encode subscriptions/interests and direct private HTTP has no confidentiality |
| Crawler load | noindex headers, HTML-only search output, no public directory registration | Robots can ignore directives; rate limits/firewall remain necessary |
| Cloudflare bot challenge breaks API clients | Bot Fight Mode disabled for the zone; host-specific ntfy skip rule retained; public stock-client health and live delivery regression check | Re-enabling Bot Fight Mode breaks ntfy because that feature cannot be bypassed by a custom Skip rule; rely on scoped application/edge limits and rerun the check after Cloudflare changes |
| Upstream blocking/legal abuse | Curated services, acceptable-use policy, no personal account cookies or DRM workarounds; Redlib exception is explicitly disclosed | Reddit can block the spoofed Android OAuth/TLS-emulation mechanism or the server IP; disable rather than escalating to personal credentials |

## Security tests

Run the repository tests from `portal/`:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The server tests check fixed security headers, public-config sanitization, Origin rejection, private/unsupported media URLs, and absence of arbitrary API paths. URL-router tests cover lookalike hosts, credentials, ports, private addresses, and schemes. Browser tests monitor processing-time HTTP(S) requests for representative local tools.

Preview regressions additionally cover exact private-IP HTTP configuration,
public-launch rejection of preview mode, publication of private search/Redlib URLs,
the exact allowed private Cobalt `/tunnel` result, rejection of other private
result paths, and UUID/SHA-2/copy fallbacks when secure-context APIs are absent.

After starting Compose privately, also run:

```sh
sh scripts/check-health.sh
sh scripts/verify-network.sh
docker compose ps
docker stats --no-stream
```

From the edge and an unauthorized controlled host, perform the exposure/API tests in the deployment and firewall documents. Do not load-test or repeatedly probe third-party platforms.

## Ongoing production checks and open hardening items

Items already satisfied must be rechecked after every topology/update change;
unresolved items must be completed before a broader announcement or public
instance listing:

- disable `PRIVATE_PREVIEW`, restore the exact separate edge trust and HTTPS service origins, re-render, and pass the launch validator;
- maintain and externally verify edge-only firewall rules. ntfy's narrow
  application-VM rule was deployed and its private hop verified on 2026-09-03;
  other application ports and the edge VM's complete firewall remain outside
  that evidence;
- install/validate the narrow Caddy mappings and confirm actual edge access-log fields/retention;
- verify Cloudflare Network Error Logging remains disabled and public
  `NEL`/`Report-To` headers remain absent. The setting was disabled on
  2026-09-03; either header returning is a release regression;
- confirm accepted portal HTML preserves `Cache-Control: no-cache,
  no-transform`, contains no injected `/cdn-cgi/challenge-platform/` script,
  and produces no CSP violation from edge-added markup;
- keep Cloudflare Bot Fight Mode disabled and run
  `deployment/utilibre/scripts/check-ntfy-public.sh`; any non-2xx,
  `cf-mitigated`, failed live delivery, cached replay, `NEL`, or `Report-To`
  result blocks release;
- validate Redlib's same-origin redirect patch, proxied media/Range behavior, English-only disclosure, and effective crawler/abuse controls through the real edge;
- repeat the verified ntfy client-address check after topology changes, and
  confirm Docker presents the edge's source address as expected for every
  other service that trusts forwarded identity;
- perform an exact-image vulnerability/SBOM review and establish a patch cadence;
- verify Cobalt cleanup after successful, failed, cancelled, and restarted requests;
- decide how to alert on low disk without adding external telemetry;
- document that the 500 MB Cobalt result target is unenforced and monitor bandwidth manually;
- retain SearXNG's writable-root/no-explicit-user exception unless an official supported hardening method is tested;
- accept the outbound/peer-network residual risk or implement a tested egress policy;
- leave rimgo undeployed until an official fixed release is pinned and fully reviewed; egress, Range behavior, logging, and edge abuse controls must then pass as separate gates;
- keep the Redlib OAuth/client and TLS/browser emulation policy exception explicit and stop it if Reddit blocking or public abuse becomes unreasonable;
- do not enable Invidious without a new official-upstream, credential, resource, privacy, and security review.

Prefer stopping one service over weakening these controls or risking the host. Commands and rollback guidance are in [troubleshooting.md](troubleshooting.md) and [updates.md](updates.md).
