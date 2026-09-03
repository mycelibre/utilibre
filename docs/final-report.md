# Milestone 1 final report

Report date: 2026-08-31

> **Post-report production change (2026-08-30):** the historical private-preview
> baseline below predates the Redlib abuse gate. Public Redlib traffic now
> follows `Cloudflare → Caddy edge → private port 3002/Anubis 1.27.0 → internal
> Redlib:8080 → Reddit`. Redlib no longer publishes a host port. Anubis is the
> unmodified official MIT image at commit
> `d39e26cedcc96bea5e4915297c756e7eec74aaf7`, pinned to manifest digest
> `sha256:8828275668b7bc675679f100970f9714f731388fbbf66ae94de8aca952e3fc4a`.
> It uses a mild default difficulty-2 browser challenge, narrow `/info` and
> official instance-updater exceptions, a 24-hour host-only secure
> authorization cookie, bbolt challenge state with a 30-minute logical TTL,
> WARN/error logs, localhost-only metrics, and 0.25 CPU/128 MiB/128 PID
> ceilings. This raises scraper cost but is not absolute bot/DDoS protection.
> Current commands and privacy/security/rollback details are in
> [deployment.md](deployment.md), [privacy.md](privacy.md), and
> [security.md](security.md); statements below describing direct Redlib port
> 3002 or a five-container private-only handoff are retained as dated test
> history, not the current production topology.
>
> **Historical NEL finding at the 2026-08-31 report cutoff:** public responses
> traversed Cloudflare and included `NEL`/`Report-To`, which could instruct
> compatible browsers to send network-error reports to Cloudflare. This dated
> finding is superseded by the 2026-09-03 addendum below.
>
> **Post-report SearXNG correction (2026-09-02):** the application-side
> maintenance window is complete. SearXNG was recreated with the public
> `https://search.utilibre.org/` base URL and the exact private Caddy peer in
> its limiter trust list. Fynd is now first-page-only after a bounded test found
> exact page-one repetition; Google CSE and Wiby produced distinct later-page
> sets. Anonymous engine fan-out is capped at five pages, access-denied/CAPTCHA
> suspensions are one day, and HTTP 429 suspension is one hour. The service,
> Valkey, health checks, network checks, configuration regression, and complete
> portal test suite pass. The tracked Caddy fragment now forwards normalized
> `{client_ip}` rather than `{remote_host}`. This source correction has **not**
> been applied to the separate edge: its global Caddy trusted-proxy settings
> and Cloudflare-only firewall could not be inspected with available access.
> Until an operator verifies and deploys the procedure in
> [edge-routing.md](edge-routing.md), public users may still share limiter
> buckets by Cloudflare edge/POP. Do not call that portion production-verified.
>
> **Post-report ntfy/edge correction (2026-09-03):** Cloudflare Network Error
> Logging was disabled for the zone. Accepted public responses checked after
> the change contained neither `NEL` nor `Report-To`; their continued absence
> is a release-regression check. Cloudflare remains the public proxy and still
> processes public connection metadata. For ntfy, `EDGE_PROXY_IP` was verified as
> the edge's private source and recorded in the live root-only `.env`. ntfy now
> runs alone on its dedicated non-internal Docker network, and the application
> VM has a persistent `DOCKER-USER` rule that permits forwarded traffic to
> `${APP_BIND_IP}:${NTFY_PORT}` only from that exact edge source. A private-hop capture
> showed a single-value `X-Forwarded-For` containing the same public address
> independently observed for the request at Cloudflare. This verifies the ntfy
> path; the edge VM's complete Caddyfile and firewall were not directly
> inspected, so it does not verify every edge route or global edge policy.
> Cloudflare Bot Fight Mode initially challenged the pinned `ntfy` CLI despite
> the browser surface being reachable. It was disabled for the zone because a
> host-specific custom Skip rule cannot bypass that feature. Ordinary curl,
> Node, and the pinned CLI then passed through the public hostname.
>
> **Post-report frontend release (2026-09-03):** the complete public portal was
> replaced with the selected “Field Ledger” direction: an editorial,
> task-indexed public-utility catalog using the supplied Utilibre logo kit,
> self-hosted Newsreader and Atkinson Hyperlegible Next fonts, square controls,
> and factual processing/source annotations. English and Spanish have equal
> routes, metadata, error states, and responsive behavior. The default catalog
> is a cross-category editorial selection; mobile retains Featured and A–Z
> modes. All catalog launches and external source/support destinations open in
> a separate tab. Account requirements are disclosed for Healthchecks,
> FreshRSS, and Wakapi. The optional GitHub Sponsors link is configured, and
> the support page explicitly asks visitors to consider upstream maintainers.
>
> Four issues from the independent Impeccable design assessment were fixed:
> mobile catalog-mode parity, retrieval within the long software inventory,
> silent empty-output JSON actions, and weak unknown-route recovery. Unknown
> paths now return a localized HTTP 404 and `/es/support` redirects with 308 to
> `/es/apoyar`. A second independent detector/browser assessment returned no
> source findings; its one browser observation was Cloudflare JavaScript
> Detection conflicting with the portal CSP. Portal HTML now returns
> `Cache-Control: no-cache, no-transform`; public responses contain no
> challenge-platform injection, while the restrictive CSP remains unchanged.
> The deployed portal image ID is
> `sha256:aa0465f0bd168dbf14db9e7aaac3816c3f748df784ee81bf370940f5f5d8607d`.
>
> The exact post-remediation source passed the production build, ESLint,
> TypeScript, 43/43 unit/server tests, and 64/64 desktop/mobile browser tests.
> A fresh public browser check passed the updated catalog, grouped software
> disclosure, JSON action states, localized 404, donation destination, new-tab
> behavior, and absence of CSP/page/request failures outside the deliberately
> requested 404. Separate live acceptance exercised every deployed service and
> representative real operations; this is strong release evidence, not a
> promise that every possible input or changing upstream will work forever.

## Current production state (authoritative addendum)

The original numbered report below records the private-preview milestone at
the time it was written. The following later facts supersede conflicting
statements in that baseline:

- `utilibre.org`, Redlib, and ten additional service subdomains have working
  public HTTPS routes through Cloudflare and the separate Caddy edge. The ten
  additional application containers and their private PostgreSQL/Valkey
  dependencies are healthy. Crab Fit remains deferred after a fresh build and
  security review; amd64 is not its blocker.
- Redlib is Docker-network-only behind Anubis 1.27.0. A normal fresh browser
  completed the challenge in English, the challenge rendered in Spanish, the
  authorization cookie survived an Anubis restart, and the official instance
  updater obtained Redlib 0.36.0 without an interactive challenge.
- The portal was rebuilt after two English/Spanish copy passes. The final pass
  removed slogan-shaped and over-polished wording from the homepage while
  keeping technical disclosures deliberately plain. Public headless-browser
  checks passed at a 375-pixel viewport with no horizontal overflow, stale
  copy, missing Redlib link, or browser-console error. That image is superseded
  by the frontend-release image recorded in the dated addendum above.
- A staged portal-only production override now trusts the observed exact edge
  peer, accepts `https://utilibre.org` as the media Origin, and rewrites only an
  exact private Cobalt `/tunnel?...` result to the public media hostname. This
  did not recreate or change Cobalt or SearXNG. A live public resolve and full
  186 MB streamed transfer succeeded; the transfer created no Cobalt writable-
  layer media artifact. The source did not honor the test Range request, which
  remains an egress-risk warning.
- Cobalt retains the container identity captured before the Anubis/portal
  work. SearXNG was later recreated in the 2026-09-02 maintenance window with
  its public base URL, exact edge trust entry, pagination guard, and upstream
  cooldowns. The remaining shared-client risk is now isolated to the separate
  Cloudflare/Caddy edge configuration described above.
- Cloudflare Network Error Logging is disabled as of 2026-09-03. Accepted
  public responses checked afterward contained neither `NEL` nor `Report-To`;
  releases must keep checking both. ntfy's exact edge source, dedicated Docker
  network, application-VM firewall rule, and normalized one-address forwarding
  path are verified as described in the dated addendum above.
- Cloudflare Bot Fight Mode is disabled for the zone. Ordinary curl and Node
  health checks return 200 without a managed challenge, and the pinned upstream
  ntfy CLI can publish a non-cached test message through the public hostname.
  Keep the full public health/publish/subscribe check as a release regression.
- The public portal edge route was still targeting the temporary port 4173
  process used during review. That raw `npm start` process has been removed;
  the hardened portal container now publishes its internal port 8080 on the
  same private host port 4173, preserving the live edge route. Port 4173 is a
  deployment-specific override; the documented default remains 8080. The
  public status endpoint now returns all configured service checks, with ntfy
  deliberately checked through its exact public health URL because its Docker
  network is isolated from the portal.
- The host now has 4 GiB of swap (unused in the final sample), 15 GiB RAM with
  about 12 GiB available, and a 99 GiB root filesystem with about 70 GiB free.

Remaining manual launch work is concrete: keep the ntfy client-compatibility
and Cloudflare NEL-header checks green, publish the exact source and set
`SOURCE_CODE_URL`,
configure `CONTACT_URL`, verify the Cloudflare-only origin firewall and global
Caddy client-IP trust beyond the verified ntfy path, and
review/apply the latest generated edge fragment on the actual edge VM. On
2026-09-03 the shared backend `.env` was aligned with the verified public
hostnames, HTTPS service URLs, exact application bind, and exact edge peer.
The base validator passes; the strict launch validator now fails only for the
intentionally unset `SOURCE_CODE_URL` and `CONTACT_URL`. Those two values need
real operator-owned destinations and must not be invented from unrelated
project or homepage URLs.

The numbered milestone report below is the retained prelaunch baseline. It no
longer describes the live topology: the portal and catalogued services now
have public HTTPS routes, and the authoritative corrections are the dated
addenda and “Current production state” section above. Remaining publication,
contact, and separate-edge verification limits are not erased by that public
reachability.

## 1. Host assessment

The sanitized application VM has:

- Debian 13, Linux 6.12 series, and `x86_64` architecture;
- 8 logical CPUs and 15 GiB RAM, with approximately 14 GiB initially available;
- no swap;
- one approximately 99 GiB ext4 root filesystem, with about 85 GiB free after
  the Redlib build/test pass;
- host time zone UTC; containers default to `America/Guatemala` where supported;
- Docker Engine 29.7.2 and Docker Compose 5.5.0;
- a private address on its primary Ethernet interface, deliberately omitted from source and documentation;
- no Tailscale installation found; and
- initially no Docker containers, images, or volumes and no identified production service other than the existing SSH listener.

No firewall, route, DNS, TLS, SSH, host time-zone, or boot configuration was changed. No reverse proxy or TLS terminator was installed. The host has ample quiet-state headroom for the core stack, but the lack of swap makes the configured memory/tmpfs limits important. See [host-assessment.md](host-assessment.md).

## 2. Services implemented

| Service | Implementation state |
| --- | --- |
| Portal 0.1.0 | Original TypeScript/Vite bilingual portal, minimal Node static/application server, fixed config/status/media endpoints, health endpoint, structured catalog, public policy pages, and no database/accounts/analytics. Privately built and healthy. |
| Cobalt 11.7.1-a636575 | Official self-hosted API behind an original bilingual portal interface and narrow server-side gateway. File-backed API authentication, exact CORS origin, conservative supported limits, no account cookies, and no persistent media volume. The current default/live policy accepts only `dailymotion.com` and `dai.ly`; a Dailymotion resolve and partial ranged tunnel transfer succeeded privately. |
| SearXNG 2026.8.22-9fea41204 | Official image with a tested weighted General set and curated image/news/video/IT/science/map/reference engines, HTML-only output, POST form, official limiter, image proxy, English/Spanish upstream UI, and a source-visible local Python log-redaction hook. Privately healthy; bounded English, Spanish, and specialist-category checks returned result rows. Google CSE is the strongest current bilingual contributor and its unofficial route/partner-identifier fragility is documented. |
| Valkey 9.1.1 | Internal-only, tmpfs-backed SearXNG limiter state with persistence disabled and no published port. Privately healthy. |
| Redlib `0.36.0-a4d36e9-p1` | Source-built from pinned official commit `a4d36e9` with a tracked same-origin settings-redirect patch. Runs non-root/read-only with no database/volume, exact private port 3002, noindex, RSS omitted, and conservative limits. A live `/r/privacy` request returned real posts. The operator explicitly accepted upstream Android OAuth/client identity spoofing and browser/TLS emulation; no personal Reddit credentials are used. |
| Service status | Bilingual high-level status view backed by a fixed internal allowlist; concurrent callers share one check and its result is cached in memory for 15 seconds by default. It exposes no addresses, container names, stack traces, or resource figures. |
| rimgo 1.4.2 | Implemented as an optional Compose profile and privately smoke-tested, but blocked from public deployment by the known issue in sections 3–4. It has no public Caddy route. |

The Cobalt frontend is this project's own interface. It does not copy Cobalt's official frontend, assets, mascot, or branding and does not imply affiliation.

## 3. Services deferred

- **Invidious and Invidious Companion:** not present in Compose; no PostgreSQL container or volume exists.
- **rimgo public activation:** image/profile exists for controlled private evaluation, but it is absent from the default enabled-service list and has no public DNS/TLS/Caddy route.
- **Cobalt YouTube extraction:** disabled in the current default/live policy; this is separate from the deferred Invidious browsing frontend.
- **YouTube and Imgur private-router destinations:** unavailable unless the corresponding reviewed local frontend is genuinely enabled. Reddit routes to the configured Redlib origin; the router never manufactures a destination from visitor input.

Launch validation rejects both `rimgo` in `ENABLED_SERVICES` and a populated `PUBLIC_IMGUR_URL` until an official fixed release is pinned and reviewed.

## 4. Reasons for each deferral

- **Invidious:** current official public-instance deployment requires Invidious, PostgreSQL, Companion, effective anti-abuse controls, and rotating YouTube egress. Official planning guidance is approximately 2 vCPU, 4 GiB RAM, 60 GiB disk, 200 Mbit/s, and around 20 TB transfer or unmetered service. That operational, bandwidth, database, and anti-bot envelope is unsuitable for this small single-VM milestone without personal cookies/tokens.
- **rimgo public activation:** pinned version 1.4.2 has a known protocol-relative open redirect in its `/search` handling. That is a public-deployment blocker even though the private gallery/media smoke test passed. It also lacks a built-in public limiter, relays potentially large media, can be provider-blocked, emits its own HSTS policy, and has an English-only interface. Do not route this version publicly; reassess only after an official fixed release and a complete new review.
- **Cobalt YouTube extraction:** two live YouTube resolution checks failed with pinned Cobalt 11.7.1. This is consistent with the current upstream [open YouTube failure report](https://github.com/imputnet/cobalt/issues/1562), so advertising support would be misleading. The portal allowlist now accepts only Dailymotion hosts and Cobalt disables YouTube. Re-enable it only after a fixed official Cobalt release is pinned and a small authorized live check succeeds.

No unreviewed substitute or unmaintained fork was deployed for any deferred
service. Redlib is not a deferral: its official source is deployed under a
narrow, explicitly approved exception to the original credential-workaround
policy. Upstream's English-only UI, unofficial Android OAuth/client identity,
browser/TLS emulation, possible Reddit blocking, and lack of a built-in public
limiter remain disclosed conditions.

## 5. Browser tools implemented

All listed operations run in the visitor's browser after self-hosted assets load:

- image resize with width/height, aspect-ratio preservation, result dimensions, and download;
- JPEG/WebP compression with quality control and before/after size;
- conversion among PNG, JPEG, and WebP;
- metadata-reduction by browser decode/re-encode, with quality/profile/animation/orientation/transparency limitations disclosed;
- PDF merge, page extraction, rotation, and exact reordering through `@cantoo/pdf-lib`;
- SHA-256 and SHA-512 through Web Crypto when available, with bundled `@noble/hashes` 2.3.0 as the local private-HTTP fallback;
- basic file information, browser-reported MIME caveat, and image dimensions;
- JSON validation, formatting, minification, copy, and download;
- UTF-8 Base64 encode/decode with invalid-input errors;
- URL-component and complete-URL encoding/decoding;
- secure UUIDv4 generation through browser cryptography;
- local QR generation/download and QR reading through self-hosted `zxing-wasm`, with a warning before opening decoded URLs; and
- strict browser-only “Open privately” parsing with exact source-host allowlists, safe path/query preservation, no arbitrary destination, and no server submission.

Automated browser tests waited for required static/lazy/WASM assets, then began HTTP(S)-request and WebSocket monitoring **before** selecting a fixture file or entering user content. They observed no network communication from input/selection through representative local processing and output checks.

## 6. English-language status

English is complete for navigation, service/tool names and descriptions, controls, placeholders, errors, warnings, privacy labels, public policy pages, status, metadata, accessibility names, and empty states. All public routes are directly linkable below `/en/`. Language switching preserves the equivalent current page/tool. The custom Cobalt UI is fully English; SearXNG manages its own supported English localization.

Automated route/i18n and desktop/mobile browser tests passed. Redlib's upstream
application itself remains English-only. A final fluent-human review of the
deployed production origin remains a launch check.

## 7. Spanish-language status

Neutral Latin American Spanish is implemented as an equal centralized dictionary with exact stable-key parity. All public pages and tools have directly linkable `/es/` routes, Spanish metadata/errors/accessibility labels, accented text, and route preservation when switching. First visit selects Spanish when the browser prefers Spanish; an explicit local choice takes precedence on later visits. The custom Cobalt UI is fully Spanish, and SearXNG provides its own upstream Spanish interface/preferences.

Automated tests passed browser detection (`es-GT`), local preference
persistence, page preservation, translated public routes, a 375-by-812 mobile
viewport, and missing-string checks. Redlib and optional rimgo have
English-only upstream UIs; Redlib's surrounding portal card, routing, status,
privacy, and policy disclosure are fully Spanish, while rimgo remains disabled.

## 8. Container images and versions

| Component | Tested image/version |
| --- | --- |
| Portal runtime/base | Locally built `public-utility-portal:0.1.0` from `node:24.14.0-alpine3.23@sha256:7fddd9ddeae8196abf4a3ef2de34e11f7b1a722119f91f28ddf1e99dcafdf114` |
| Cobalt | `ghcr.io/imputnet/cobalt:11.7.1-a636575@sha256:63186dd68afd57ce3bb1f62cc4c139f5fa95b9c3e87a3cf5c6e4c7a570523f62` |
| SearXNG | `docker.io/searxng/searxng:2026.8.22-9fea41204@sha256:11a9b34cdc0b1ec2b991470a2762ecb5a1a531898289fb51dcd015260450729e` |
| Valkey | `docker.io/valkey/valkey:9.1.1-alpine@sha256:de31910896150d5e754a07d57d227cfdde4e258ddd0d1aa4607f2d2f95843715` |
| Redlib | The 2026-08-30 tested local build `public-utility-redlib:0.36.0-a4d36e9-p1`, from official commit `a4d36e954cf1bd64f209cd8868c5a29edc81b374`, source-archive checksum and digest-pinned Rust/Ubuntu bases, plus local patch `p1`; local rebuild image IDs are not stable identifiers |
| rimgo, optional | `codeberg.org/rimgo/rimgo:1.4.2@sha256:569800892522c7dd7d47290ce80d5c1fbb451609ce0d983c545a5d203ca93048` |

There are no floating `latest` tags. Redlib is a local reproducible source
build with `pull_policy: never`; Invidious is not configured or installed.

## 9. Host ports

| Service | Host setting/default | Container port | Publication state |
| --- | --- | ---: | --- |
| Portal | `PORTAL_PORT=8080` | 8080 | Exact private bind only |
| Cobalt | `COBALT_PORT=9000` | 9000 | Exact private bind only; edge may expose only its tunnel route |
| SearXNG | `SEARXNG_PORT=8888` | 8080 | Exact private bind only |
| Redlib | `REDLIB_PORT=3002` | 8080 | Exact private bind only while the `privacy-frontends` profile is enabled |
| rimgo, private evaluation only | `RIMGO_PORT=3001` | 3000 | Only while optional profile runs on the private bind; no public route |
| Valkey | none | 6379 | Docker internal network only; never published |
| Invidious | reserved placeholder `INVIDIOUS_PORT=3003` | none | No container or listener |

No database, cache, Docker socket, administrative, metrics, or debug port is published.

In the current private preview, the portal/UI is
`http://PRIVATE_BIND_IP:PORTAL_PORT/` (default `8080`), SearXNG is
`http://PRIVATE_BIND_IP:SEARXNG_PORT/` (default `8888`), and Redlib is
`http://PRIVATE_BIND_IP:REDLIB_PORT/` (default `3002`). Cobalt's published
port (default `9000`) is a protected API and generated `/tunnel` destination,
not a user landing page. Actual private addresses remain intentionally absent
from this report.

## 10. Private bind address configuration

Every published mapping uses `${PRIVATE_BIND_IP:?Set PRIVATE_BIND_IP}`. The actual RFC1918/private-network address is intentionally absent from committed files and this report; the operator stores it in ignored `.env`. `scripts/verify-network.sh` rejects an empty or wildcard bind and checks that the common PostgreSQL/Valkey ports are not listening.

For public launch, set `EDGE_PROXY_IP` to the one exact private address of the Caddy edge peer. The portal accepts forwarded-client headers only from that direct peer, and `scripts/render-config.mjs` writes that exact address into ignored SearXNG limiter configuration. Private binding is not a firewall; edge-source filtering remains required.

For the current `PRIVATE_PREVIEW=1` handoff, `EDGE_PROXY_IP` is deliberately
empty. The portal therefore ignores forwarding headers, and
`scripts/render-config.mjs` omits the non-loopback edge entry from SearXNG's
limiter. Preview access must be restricted to the intended operator client(s)
because private HTTP provides neither transport confidentiality nor server
authentication. The launch validator rejects this mode, empty edge trust, and
the direct HTTP/IP service URLs.

The pinned Cobalt application is a documented upstream exception: it trusts loopback and private/unique-local proxy peers more broadly than this repository's exact `EDGE_PROXY_IP`. Therefore its private port must be firewalled to the exact edge source, and that edge must overwrite forwarded headers. Until that check passes, another private-network peer could spoof the address used by Cobalt's tunnel limiter.

## 11. Required public hostnames

Four public hostnames are required for the configured launch:

- `PUBLIC_PORTAL_HOST` for the portal, local tools, fixed portal API, and policy/status pages;
- `PUBLIC_MEDIA_HOST` for Cobalt's exact tunnel path only;
- `PUBLIC_SEARCH_HOST` for SearXNG; and
- `PUBLIC_REDDIT_HOST` for Redlib.

`PUBLIC_IMGUR_HOST` and `PUBLIC_YOUTUBE_HOST` are reserved only. They must not
receive DNS/TLS/Caddy routes while rimgo 1.4.2 and Invidious are deferred. The
repository contains placeholders, not personal or final domains.

## 12. Required Caddy edge mappings

| Public hostname | Private destination | Required route |
| --- | --- | --- |
| Portal | `APP_VM_PRIVATE_IP:PORTAL_PORT` | General portal reverse proxy; health `/healthz`; 16 KiB edge body ceiling |
| Media | `APP_VM_PRIVATE_IP:COBALT_PORT` | **Only** exact `GET /tunnel`; every other path and method returns 404; upstream-only health `/` |
| Search | `APP_VM_PRIVATE_IP:SEARXNG_PORT` | SearXNG reverse proxy; health `/healthz`; 64 KiB body ceiling; public `/search` POST-only; deny `/config`, statistics, and metrics; noindex |
| Reddit | `APP_VM_PRIVATE_IP:REDLIB_PORT` | Redlib reverse proxy; health `/settings`; 64 KiB body ceiling; preserve cookies, paths, query strings, Range, and streaming; strip upstream `Strict-Transport-Security`; noindex |
| Imgur/rimgo | None | Do not configure a public mapping for pinned rimgo 1.4.2 because of its known protocol-relative open redirect |

Complete placeholder Caddy configuration is in [edge-routing.md](edge-routing.md). It must be validated and applied on the separate edge VM; nothing in this repository installs or changes Caddy.

## 13. Required Caddy headers or special handling

- Let Caddy replace/set `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Forwarded-Host`; do not pass an untrusted client-supplied chain verbatim.
- Preserve `Host` and `Origin`. Only the exact configured edge is trusted by the application VM.
- Preserve the portal's restrictive CSP and cross-origin headers. Set/preserve `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, frame denial, and the documented restrictive `Permissions-Policy`.
- Apply `X-Robots-Tag: noindex, nofollow` to APIs/health, SearXNG, and Cobalt tunnel results. Portal informational pages may remain indexable.
- On media, preserve the encrypted tunnel query but do not log it; preserve Range headers and Caddy's default response flushing so a client disconnect can cancel upstream work; use a short dial timeout and long read/write timeout; set `Cache-Control: private, no-store`. Do not set negative `flush_interval` low-latency mode.
- On SearXNG, return 405 for non-POST `/search` and 404 for `/config`, `/stats`, `/metrics`, and their documented subpaths. These edge guards prevent GET query leakage and public diagnostics even though the upstream application has broader routes.
- On Redlib, preserve media Range/stream behavior; avoid path/query/cookie/referrer access logs; add noindex/security headers; strip upstream `Strict-Transport-Security: max-age=0` so HSTS remains an explicit edge/domain choice. Stock Caddy has no standard rate-limit directive: add a conservative limit only through a reviewed installed module or another operator-controlled edge mechanism.
- No WebSocket rule is required.
- Do not add a Cobalt catch-all, root POST, session route, metrics path, or generic proxy.
- HSTS is intentionally not automatic. Enable it only after every affected hostname is permanently HTTPS-ready and the operator accepts the recovery consequences.

## 14. Resource limits

| Service | CPU ceiling | RAM ceiling | PID ceiling | Important secondary bound |
| --- | ---: | ---: | ---: | --- |
| Portal | 0.50 | 256 MiB | 128 | 32 MiB tmpfs; 8 KiB media JSON; two concurrent gateway jobs; 15-second status cache by default |
| Cobalt | 1.50 | 1,536 MiB | 256 | 30-minute supported duration target; 90-second tunnel TTL; lower processing priority |
| SearXNG | 1.00 | 768 MiB | 256 | 128 MiB `/tmp` tmpfs; curated engines |
| Valkey | 0.25 | 128 MiB | 100 | 96 MiB max data with LRU; 128 MiB `/data` tmpfs; persistence off |
| Redlib | 0.50 | 256 MiB | 128 | 32 MiB `/tmp` tmpfs; 32 MiB reservation; no database/volume; indexing and RSS disabled |
| rimgo, optional | 0.50 | 256 MiB | 128 | Small in-process cache; no built-in request limiter |

Launch ceilings including Redlib total 3.75 CPUs and 2,944 MiB RAM; optional
rimgo raises them to 4.25 CPUs and 3,200 MiB. Docker logs default to 10 MB times
three files per container. Prefer stopping one service over raising a limit
without evidence.

## 15. Measured idle resource use

An initial quiet `docker stats --no-stream` snapshot after private health/smoke checks recorded:

| Service | RAM | Point CPU sample |
| --- | ---: | ---: |
| Portal | 22.44 MiB | 0.01% |
| Cobalt | 49.38 MiB | 0.00% |
| SearXNG | 135.8 MiB | 0.00% |
| Valkey | 8.121 MiB | 0.17% |
| rimgo, optional | 12.57 MiB | 0.09% |

The original pre-Redlib core idle RAM was approximately 215.7 MiB; including
optional rimgo it was approximately 228.3 MiB. Later pre-Redlib snapshots ranged
from approximately 210.4–248.4 MiB. After Redlib startup and live checks,
Redlib measured **7.102 MiB** in a Docker point sample; a later raw cgroup
reading was 8,085,504 bytes (about 7.71 MiB). Its image size is 35,573,122
bytes (about 35.6 MB). One full-stack point recorded approximately **257.0
MiB** total while SearXNG was active; Redlib itself was 5.59 MiB/0.00% in that
earlier point. Portal, Cobalt, SearXNG, Valkey, and optional rimgo image virtual
sizes were approximately 227, 438, 374, 65.8, and 38.2 MB. These observations
are not promises; shared layers make virtual sizes non-additive.

The post-build Docker storage point reported 1.267 GB of images (38.24 MB
reclaimable), 327.7 kB in containers, one 0-byte volume, and 5.455 GB of
BuildKit cache (5.101 GB reclaimable). Much of the cache is consistent with the
Rust/BoringSSL compile but may include earlier/other-project entries. Inspect
`docker system df -v` before the optional `docker builder prune`; pruning slows
Redlib rebuilds/rollback and can affect other projects.

## 16. Measured active resource use where tested

No representative active-load peak was measured, so none is claimed. The following functional activity completed:

- all local image/PDF/hash/text/QR operations ran in Playwright; their processing CPU/RAM belonged to the browser, not the portal container;
- bounded SearXNG checks returned 48 English and 42 Spanish General result cards for matching practical queries, with relevant sources near the top; every selected specialist category also returned rows. These are one-time functional observations, not a benchmark or availability guarantee;
- the raw query from a separate limiter-compatible SearXNG privacy check was absent from captured logs;
- Redlib fetched `/r/privacy` with real posts: 63,051 bytes in 0.874 seconds.
  A bounded local synthetic check then served 1,000 `/settings` responses at
  concurrency 10. Across startup and both checks, Redlib's cgroup peak was
  15,958,016 bytes (about 15.22 MiB), cumulative CPU use was 339,556
  microseconds with no throttling, and its cumulative network counters were
  roughly 193 kB received/133 kB sent. These tiny tests are not a public
  workload, concurrency ceiling, or bandwidth forecast;
- optional rimgo served a live gallery and a partial/ranged media request with low observed activity, but no defensible peak sample; and
- Cobalt accepted the valid server-held key, resolved Dailymotion item `x5e9eog` through the portal gateway, and returned media data for a ranged tunnel request before the client cancelled the transfer. No defensible active-resource peak was captured, and no complete download or FFmpeg-processing path was exercised.

Representative active CPU, memory, temporary-storage, and network measurements are a pre-launch task using short operator-owned or explicitly authorized media. See [resource-usage.md](resource-usage.md).

## 17. Expected bandwidth risks

1. **Cobalt tunnels** can consume ingress from a media provider and equivalent egress to the visitor. Direct result URLs move delivery to an external provider/CDN. The approximately 500 MB result target cannot be enforced by this Cobalt release.
2. **Redlib** proxies Reddit images/video and can become a crawler/hotlink
   relay. A single page smoke test says nothing useful about public egress.
3. **rimgo** proxies images/video and can become a hotlink relay; this is a
   reason it is off.
4. **SearXNG** fans one query to several engines, and image proxying adds egress
   beyond small HTML pages.
5. **Portal assets** are bounded/cacheable; the self-hosted QR WASM is about
   1.5 MiB and the lazy PDF chunk about 587 KiB.

The VM provider's transfer quota, sustained throughput, and egress cost were not available to the repository and must be established before announcement. Low idle RAM is not evidence of a safe bandwidth budget.

## 18. Logging behavior

- **Portal:** startup and generic operational errors only; no normal access logger and no intentional media-URL/tool-content logging. In-memory client address/count is used for media limiting.
- **Cobalt:** upstream operational stdout/stderr; no configured access logger. Submitted URLs are not logged by the portal, but upstream error details can still be sensitive.
- **SearXNG:** access logging is expected disabled. On the first recognized `q`/`query` field or URL-query marker, tracked `sitecustomize.py` retains only the rendered non-sensitive prefix plus a redaction marker and discards the whole record tail. This conservative behavior covers multiword and escaped-quote values but intentionally loses later diagnostic text. Operational errors and exceptional abuse addresses remain possible.
- **Valkey:** warning-level operational output; limiter state is data, not an access log.
- **Redlib:** `RUST_LOG=warn` suppresses informational paths that expose an
  emulated device ID or OAuth token prefix. Startup and warning/error output can
  still reach Docker; reviewed warning paths do not intentionally include
  visitor URLs/queries. There is no intended per-request access logger.
- **rimgo, if enabled:** operational output is possible; its default public-log behavior must be rechecked before activation.
- **Docker:** `json-file`, 10 MB maximum per file, three retained files per container by default.
- **Docker daemon/journal and edge Caddy:** outside Compose. The edge must not log search terms, Cobalt tunnel queries, Redlib paths/queries/cookies/referrers, or full sensitive URLs; a coarse security-log target of no more than seven days is recommended if logs are necessary.

There is deliberately no “zero logs” claim. Size rotation bounds disk use, not a fixed retention duration.

## 19. Retention behavior

- Local-tool input/output remains in browser memory/object URLs and is not intentionally uploaded. Browser cache stores public application assets, not selected content.
- Language and theme are two `localStorage` preferences retained until changed or cleared. The portal sets no cookie.
- SearXNG may set a first-party preferences cookie for up to approximately five years when the visitor changes upstream preferences.
- Redlib may set first-party HTTP-only, non-authentication display,
  subscription, and filter cookies for up to approximately 52 weeks. Pinned
  upstream omits `Secure` and `SameSite`; the public edge still uses HTTPS, but
  those missing attributes are a disclosed browser-defense limitation.
- Portal media rate buckets retain a client address/count in memory for the configured window plus at most 60 seconds and clear on process restart.
- Cobalt has no media volume; encrypted tunnel metadata is process memory for about 90 seconds by default and clears on expiry/restart.
- Valkey limiter identifiers/counters are memory/tmpfs only. Normal keys expire with windows; suspicious-client counters may last about 30 days while uninterrupted, and all clear on restart.
- SearXNG's rebuildable cache can persist in its named volume. It is not configured as a query-history store.
- Redlib OAuth/device/connection state and transient buffers are process
  memory or bounded tmpfs and end on restart. It has no browsing-history
  database or persistent volume.
- Docker logs retain by size, not time. Backups exclude logs, cache, limiter state, and media.

No forensic-erasure claim is made for RAM, kernel buffers, container layers, browser storage, provider logs, edge logs, snapshots, or downloaded files on a visitor's device.

## 20. Persistent volumes

The only named Docker volume is `searxng-cache`. It is
disposable/rebuildable and does not require backup. Valkey `/data` and
temporary directories are tmpfs, not volumes. Portal, Cobalt, Redlib, and
rimgo have no persistent volumes; no PostgreSQL/database volume exists.

Host bind mounts are limited to tracked read-only SearXNG configuration, generated ignored limiter configuration within that directory, and read-only Cobalt key files. The entire SearXNG config directory mount intentionally overrides the image-declared configuration volume so Docker does not create an undocumented anonymous volume.

## 21. Backup requirements

Back up two separate classes:

- **public/source archive:** exact Git/source revision, Compose, portal
  lockfile/source/server, scripts, tracked SearXNG configuration/redaction hook,
  complete Redlib source-fetch/build/patch material, documentation, notices,
  and licenses; and
- **encrypted private archive:** `.env`, `secrets/cobalt-keys.json`, and `secrets/portal-cobalt-key` as a matching set.

Do not back up Docker logs, `searxng-cache`, Valkey state, build/test output, dependencies, generated `config/searxng/limiter.toml`, or any media. `scripts/backup.sh` creates the public archive; [backups.md](backups.md) gives the exact encrypted-private archive and clean restore procedure. Store checksums and decryption material separately, test a restore, and rotate secrets if an old copy may remain accessible.

## 22. Security protections

- Exact private host binding; Valkey internal-only; no database/cache/admin/debug/metrics/Docker-socket exposure; no host networking or privileged containers.
- Public-mode portal forwarded-header handling and the generated SearXNG limiter trust only the exact edge peer (plus SearXNG loopback). Private preview trusts no forwarded portal peer and renders only loopback SearXNG proxy trust. Pinned Cobalt's broader private/ULA trust is the documented exception requiring strict source firewalling in either mode.
- Cobalt API key stays server-side; Cobalt authentication and exact CORS are enabled; public edge route is exact tunnel GET only.
- Portal media gateway enforces an 8 KiB body, fixed request schema/options, strict source-host allowlist, no credentials/ports, literal private/local address rejection, exact Origin, modest per-client rate, two in-flight requests, upstream timeout/size bounds, and stable bilingual error mapping.
- Private router uses exact HTTPS source hosts and operator-configured destinations; no arbitrary redirect or automatic QR/Cobalt navigation.
- Status checks use a fixed internal allowlist, 2.5-second timeout, redirect denial, concurrent-call coalescing, and a 15-second default in-memory cache; the public result remains high-level only.
- SearXNG official limiter/Valkey, HTML-only output, selected engines, no autocomplete/directory registration, crawler controls, and required edge denials for diagnostics and non-POST search.
- Redlib exact private bind; non-root/read-only container; local same-origin
  settings-redirect patch with build-time Rust regression test; noindex; RSS
  omitted; HLS/autoplay off; and no database/volume. The edge strips Redlib's
  upstream HSTS-zero header and must supply crawler/abuse controls where a
  reviewed mechanism exists.
- Containers drop all capabilities, use `no-new-privileges`, PID/CPU/RAM ceilings, restart policies, health checks where compatible, pinned image digests, bounded logs, non-root users where supported, and read-only roots except the documented SearXNG exception.
- Portal CSP restricts scripts/styles/connect/forms to self, blocks objects/base/framing, and uses restrictive referrer, permissions, MIME, frame, and cross-origin policies.
- No personal upstream account cookies/tokens, user accounts, analytics,
  advertisements, remote fonts/scripts, Docker socket, or unrestricted proxy
  endpoint. Redlib's upstream-generated spoofed OAuth token/device identity is
  the explicit documented exception, not an operator credential.

## 23. Unresolved security issues

- Firewall/source filtering and denial from unauthorized private/public/IPv6 hosts have not been tested through the final network. Private binding alone is insufficient.
- Final Caddy route behavior is untested. A media catch-all, missing SearX
  diagnostic/search guard, missing Redlib HSTS-header stripping, sensitive
  Redlib access logs, or a forwarded-header mistake would be serious.
- Pinned Cobalt trusts loopback and private/ULA proxy peers rather than only exact `EDGE_PROXY_IP`; exact edge-source firewalling and header replacement are mandatory compensating controls and remain externally unverified.
- Origin checks are a browser control, not bot authentication. Portal limits are per-process/per-address, reset on restart, and can be evaded by distributed clients.
- The portal rejects literal private addresses but does not resolve every hostname before Cobalt. DNS rebinding, redirects, extractor secondary requests, a compromised allowed domain, and hostile upstream responses remain defense-in-depth SSRF risks. The service bridge has required Internet egress and peer reachability; no egress ACL is configured.
- Cobalt lacks a supported hard approximately-500-MB output limit and true global FFmpeg/tunnel concurrency control in this release. The gateway's two-job ceiling covers API resolution work, not every later tunnel.
- The one partial ranged Dailymotion tunnel/client-cancellation path left no observed `/tmp` media or media artifact in the writable layer, but a complete transfer, direct-result case, FFmpeg-processing result, repeated cancellation/restart sequence, and representative active-resource behavior remain untested.
- SearXNG retains a writable-root/no-explicit-user exception required by the tested official image behavior.
- Redlib has no built-in public per-client limiter. Robots/noindex can be
  ignored, distributed scraping/hotlinking can consume bandwidth, and stock
  Caddy supplies no standard `rate_limit` directive. A reviewed edge module or
  other operator-managed control remains a public-launch decision.
- Redlib relies on spoofed official Android OAuth/client identity and
  browser/TLS fingerprints. Reddit can block that mechanism or the VM's egress
  at any time; the accepted response is to stop the service, not add personal
  credentials.
- Redlib preference cookies lack `Secure` and `SameSite`. They are non-auth,
  HTTP-only cookies, but can encode subscriptions/interests.
- Direct private preview is plaintext HTTP. Restrict its portal, search,
  Redlib, and Cobalt/tunnel ports to intended operator clients; HTTPS remains
  preferred privately and mandatory publicly.
- Exact image/native dependency vulnerability/SBOM review beyond npm audit remains manual and must be repeated for updates.
- rimgo 1.4.2 has a known protocol-relative open redirect and no built-in limiter. It has no public route and must remain off for public use until an official fixed release passes a new review.

## 24. Unresolved privacy issues

- Actual Caddy access fields and retention are unknown until the edge operator
  verifies them. Tunnel/search queries and Redlib paths/queries/cookies/referrers
  must not be logged.
- Cobalt and SearXNG necessarily send target/query data to external platforms from the VM. A Cobalt direct-result link also causes the visitor's browser to contact an external provider/CDN.
- Redlib necessarily sends requested public resources to Reddit from the VM
  using its spoofed OAuth/client/device identity and proxies page/media bytes.
  Reddit can correlate server-side requests; this is not an anonymity claim.
- The strongest current bilingual SearXNG contributor is the pinned Google CSE engine. It uses an unofficial Google JSONP route and an upstream Blackle partner identifier, so queries handled by it reach Google Custom Search and its availability/handling remain outside this operator's control.
- Cobalt operational error output can contain upstream detail. The failed and partial cancelled paths received a bounded cleanup inspection, but complete/FFmpeg paths and final edge logging still need a sensitive-data and cleanup review.
- The SearXNG redaction hook conservatively discards the rendered tail after the first recognized query marker. Its regression covers multiword and escaped-quote cases, but it cannot cover every possible future native process, changed upstream log path, Docker daemon log, or edge log; discarded tails also reduce operational detail.
- Limiter-derived address identifiers remain privacy-relevant even though they are ephemeral and not treated as anonymous.
- SearXNG's separate preference cookie, Redlib's approximately-52-week optional
  preference/subscription cookies, and the portal's two local preferences
  persist until their respective expiry/clearing behavior.
- Browser extensions, browser/OS telemetry, upstream-provider logs, and the visitor's saved downloads are outside this implementation's control.

Public wording therefore avoids “anonymous,” “untraceable,” “zero logs,” and “media never touches disk.”

## 25. License obligations

- Original portal, server, integration, configuration, tests, scripts, documentation, and SearXNG redaction hook are AGPL-3.0-or-later. Before network use, `SOURCE_CODE_URL` must expose the exact deployed Corresponding Source and build/deployment material.
- Cobalt is treated as AGPL-3.0-only and is unmodified. Link its exact source/license; publish complete modified source if later patched. Do not reuse its frontend/branding/assets.
- SearXNG is AGPL-3.0-or-later. The offered service is accurately identified as modified because the local hook changes runtime logging; source must include that hook, Compose mount/environment, and deployment context.
- Redlib is AGPL-3.0-only and **modified**. `SOURCE_CODE_URL` must expose exact
  upstream commit/Cargo lockfile, the local redirect patch, source archive
  checksum, pinned build bases, Dockerfile, Compose wiring, and installation
  instructions. Preserve upstream notices and do not describe the local image
  as an official unmodified build.
- Optional rimgo is AGPL-3.0-only and unmodified. If enabled, link its exact source; publish a modified fork if changed.
- Valkey is BSD-3-Clause. Browser dependencies carry MIT, Apache-2.0, BSD-3-Clause, Zlib, 0BSD, and other compatible notices recorded in [licenses.md](licenses.md) and [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
- Preserve all notices. Configure an accurate operator copyright notice before release.
- Cobalt's upstream image includes a static FFmpeg/GPL closure. Pulling the official image is distinct from redistributing/mirroring it; perform the documented GPL corresponding-source/SBOM review before any mirror or redistribution.

No noncommercial-only asset or dependency is used. Invidious and deferred
rimgo code are not distributed by the public portal; the locally built Redlib
binary carries the source obligations above.

The destination GitHub repository currently has one license-only initial
commit. The application tree is attached to that history locally but has not
yet been committed or published, so there is still no immutable public project
revision to identify as the deployed source. Publishing the reviewed tree and
setting `SOURCE_CODE_URL` to that exact revision remain release gates.

## 26. Tests performed

- Frontend production build, ESLint, TypeScript checking, and exact-lockfile install/build.
- The 20/20 validator Node regressions passed, covering required launch services,
  aligned Redlib profile/catalog/origin settings, the rimgo/public-Imgur launch
  block, private IPv4/IPv6 bind handling, exact private-preview HTTP
  relationships, and launch-gate rejection of preview mode.
- `npm test`: the SearXNG log-redaction regression passed, followed by 23/23
  Vitest tests covering exact EN/ES key/catalog parity, route preservation,
  strict URL routing, utilities, security headers, public-config sanitization,
  status coalescing, media schema/error/rate/concurrency validation, fixed API
  behavior, secure UUID fallback, bundled SHA-2 fallback, the exact
  private-preview Cobalt tunnel exception, Redlib configuration exposure, and
  real 404 handling for missing static assets. The redaction regression includes
  multiword and escaped-quote tails.
- Playwright: 42/42 desktop/mobile Chromium project/test combinations passed,
  with no skips, against the actual deployed private-IP HTTP portal and its real
  SearXNG and Redlib endpoints rather than the Vite development server. Coverage
  includes all public pages and every tool in both languages, browser-language
  ordering, saved switching, translated validation errors, mobile layouts,
  keyboard/focus/reduced motion/labels/status regions, real
  image/PDF/file/text/UUID/QR operations, output validation, and no-upload checks
  whose monitoring starts before selected files/content enter the page after
  assets settle.
- The deployed Playwright run also confirmed an insecure browser context,
  working secure-random UUID, SHA-256/SHA-512 and copy fallbacks, SearXNG's
  browser link-token result flow, live Redlib backend/portal integration, and
  one-time recovery after the first request for a real lazy image-tool chunk was
  forcibly failed. The raw preview query was absent from recent SearXNG logs.
- Full and production-only npm audits returned zero known vulnerabilities for the tested lockfile.
- Compose syntax/interpolation/image validation; portal image build; core startup, health convergence, recreation/restart behavior, and failed-startup/readiness correction.
- Redlib reproducible source build from official commit `a4d36e9`: archive
  checksum and builder/runtime digests pinned, local patch applied with
  `git apply --check`, locked release compilation, and the patch's Rust
  same-origin redirect regression run inside the build.
- Private-preview configuration validation with `node scripts/validate-config.mjs`; the stricter `--launch` mode correctly rejects the preview and remains a manual gate for final public values.
- Exact private port/listener inspection; no database/cache host port; Valkey internal-only; no local reverse proxy.
- Redlib private listener/health check at port 3002; non-root user, read-only
  root, no mounts/volumes, 32 MiB tmpfs, 0.50 CPU/256 MiB/128 PID ceilings,
  bounded log rotation, no RSS routes, noindex crawler behavior, and upstream
  HSTS-zero header behavior inspected.
- Container limit/hardening/log-rotation/mount/volume inspection and quiet resource snapshot.
- Media gateway rejection of missing/wrong Origin, private IPv4/IPv6, localhost/lookalike/scheme/credential/port/malformed targets, oversized body, and arbitrary API paths.
- Cobalt missing/invalid key rejection and successful authentication with the generated matching key. Dailymotion item `x5e9eog` resolved through the portal/Cobalt path; its tunnel returned data for a ranged request and the client then cancelled the bounded transfer. Live configuration matched the one exact portal CORS origin with wildcard mode disabled; responses never authorized the foreign test origin. The live/default portal allowlist accepts only `dailymotion.com` and `dai.ly`, and Cobalt disables YouTube after two failures on pinned 11.7.1 consistent with [upstream issue #1562](https://github.com/imputnet/cobalt/issues/1562).
- Recent portal/Cobalt logs contained neither the generated API key nor the submitted invalid test URL.
- SearXNG official browser-client-token flow, 48-card English and 42-card Spanish General results for matching practical queries, successful probes across every selected specialist category, expected throttling of raw POSTs that skip the token flow, live log check proving the raw test query absent, and repeatable local redaction regression integrated into `npm test`.
- Optional private rimgo home/gallery/media smoke test, including ranged bytes; it returned content with a valid range header but HTTP 200 rather than 206. Source review identified the public-blocking protocol-relative open redirect.
- Redlib live `/r/privacy` request returned real posts (63,051 bytes in 0.874
  seconds). Patched scheme-relative/backslash settings redirects remained
  same-origin, RSS-disabled and crawler controls passed, and 1,000 local
  `/settings` responses at concurrency 10 completed as a bounded synthetic
  check. A bounded proxied-image Range request returned bytes 0–1023 of a
  16,067-byte PNG as HTTP 206 with the correct `Content-Range`; the edge example
  strips the Reddit CDN diagnostic headers seen on that private response.
  Redlib peaked at about 15.22 MiB cgroup memory with 339,556
  microseconds cumulative CPU and no throttling across startup/tests; this is
  not a public-load benchmark.
- Static retention inspection: no Cobalt media volume, read-only root, memory-only limiter, bounded tmpfs, and only the intended cache volume. After the failed path and partial ranged/cancelled Dailymotion path, no media artifact was found under `/tmp`; Cobalt's filesystem diff contained only Docker-injected init/secret paths and no media path.
- Public backup-helper rehearsal: required public source/configuration members were present, private/generated files were absent, and the temporary archive was removed.
- Handoff transition: the original disposable test deployment and sensitive
  captures were removed, then a fresh ignored private-preview configuration,
  matching key pair, and no-edge limiter were created. Portal, Cobalt, SearXNG,
  Valkey, and Redlib are now running privately; no public route, wildcard bind,
  or public listener was added.

Details and limits are in [testing.md](testing.md).

## 27. Tests that could not be performed

- Real edge Caddy validation/reload, public DNS/TLS, HSTS decision, and final-hostname route tests.
- Launch configuration validation with `node scripts/validate-config.mjs --launch`, because final public values/source do not yet exist.
- Reachability from the actual edge and rejection from an unauthorized private host, public Internet, and unintended IPv6 path.
- Complete Cobalt tunnel delivery, a direct-result response, an FFmpeg-processing result, repeated cancellation/restart cleanup, and the cancellation path through the final Caddy edge. The current evidence is one resolved Dailymotion item whose ranged tunnel request returned initial data before the client cancelled, not a complete download or resource soak.
- Representative active concurrency, FFmpeg peaks, sustained bandwidth, soak, and provider transfer-cost measurements.
- Edge logging-field/retention verification and host low-disk/egress alert delivery.
- Encrypted-private backup/clean-host restore, rollback, long soak, and permanent-removal rehearsal on a separate clean host.
- Manual WCAG AA audit with a real screen reader, zoom/reflow review, and broad Firefox/WebKit/Safari coverage.
- Container/native dependency vulnerability and provenance/SBOM scanning beyond npm audit.
- Creation and publication of the first reviewed application-source commit;
  the remote currently contains only its initial license file, so there is no
  immutable application revision for `SOURCE_CODE_URL`.
- Redlib through the real edge: final HSTS-header stripping, access-log
  redaction/exclusion, preference-cookie behavior over HTTPS, media Range and
  cancellation, effective edge crawler/rate control, unauthorized-source
  rejection, sustained/concurrent public behavior, and Reddit blocking over
  time. Invidious operation remains intentionally omitted because it is
  deferred.

These are documented launch or future-review tasks, not hidden passes.

## 28. Secrets or credentials I must provide

Required private/operator values in ignored `.env`:

- exact `PRIVATE_BIND_IP`; `EDGE_PROXY_IP` may be empty only for the explicit private preview and must be the exact separate edge peer for launch;
- `PRIVATE_PREVIEW=1` only for direct private HTTP, changed to `0` before public launch;
- strong `SEARXNG_SECRET` (for example, generated with `openssl rand -hex 32`);
- matching generated Cobalt files `secrets/cobalt-keys.json` and `secrets/portal-cobalt-key` created/validated by `node scripts/init-secrets.mjs`;
- final public portal/media/search/Redlib hosts and their exact HTTPS URLs/origin;
- matching `ENABLED_SERVICES=cobalt,searxng,redlib` and
  `COMPOSE_PROFILES=privacy-frontends`; and
- any deliberately changed resource/log limits.

Required public launch configuration:

- `PROJECT_NAME` and optional tagline;
- reachable `SOURCE_CODE_URL` for the exact deployed source;
- `CONTACT_URL` for abuse/legal contact; and
- optional `SUPPORT_URL`, which is hidden when empty and uses no embedded payment script.

No source-platform account, personal/operator-supplied YouTube/Google/Reddit/
Imgur token, private-content cookie, Turnstile secret, portal database password,
or Invidious database credential is required for the launch deployment. Redlib
obtains its own spoofed OAuth token as described above. The reserved Invidious
database placeholders must remain empty while that service is deferred.

## 29. Manual steps before public launch

1. Resolve the repository license/copyright decision, commit the reviewed
   application tree on top of the existing license-only history, publish that
   exact revision, and configure its public `SOURCE_CODE_URL`.
2. Replace the current preview values with an edge/public mode-0600 `.env`:
   set `PRIVATE_PREVIEW=0`, fill portal/media/search/Redlib HTTPS and edge
   placeholders, enable the matching Redlib profile/catalog ID, and leave only
   deferred Invidious/rimgo URLs empty.
3. Generate/validate Cobalt keys, generate the SearXNG secret, and run `node scripts/render-config.mjs`.
4. Run `node scripts/validate-config.mjs --launch`; do not continue until it validates final project/source/contact/host/network values and their relationships.
5. Make and verify an encrypted recovery archive; re-run Compose validation, build/lint/type/unit/E2E/audit, private health, network, mount, log-rotation, and resource checks.
6. On the application/edge network, apply an operator-reviewed firewall rule allowing application ports only from the exact edge. This is mandatory for Cobalt's broader private/ULA proxy-trust exception. Verify denial from unauthorized IPv4/IPv6/external sources.
7. Manually add and validate the documented four Caddy sites. Prove that media
   exposes only exact tunnel GET, SearX diagnostics/non-POST search are denied,
   Redlib strips upstream HSTS-zero, patched redirects stay same-origin,
   media/Range works, and sensitive search/Redlib path/query/cookie logs are
   absent. Do not add rimgo. Add Redlib rate/crawler limits only through a
   reviewed mechanism actually present on the edge.
8. With operator-owned/authorized short media, complete the still-missing full-transfer, direct-result, FFmpeg, repeated-cancel/restart, and active CPU/RAM/disk/network tests without stressing an upstream. Retain the existing bounded Dailymotion partial-transfer result as a regression, not as a soak result.
9. Confirm the VM provider's transfer quota/cost, establish low-disk/egress review or alerts, inspect edge/daemon log fields, publish the real retention policy, and perform remaining accessibility/bilingual/backup/rollback/SBOM reviews.
10. Configure public DNS/TLS last, make one small authorized functional request
    per backend, retain a known-good rollback image/source record, and keep
    rimgo/Invidious disabled.

## 30. Exact commands for starting and stopping the deployment

Run from the repository root. For a fresh private preview when `.env` does not
exist:

```sh
node scripts/init-private-preview.mjs PRIVATE_BIND_IP
node scripts/init-secrets.mjs
node scripts/render-config.mjs
node scripts/validate-config.mjs
docker compose config --quiet
docker compose pull cobalt searxng valkey
docker compose build --pull portal redlib
docker compose up -d portal cobalt searxng valkey redlib
docker compose ps
sh scripts/check-health.sh
sh scripts/verify-network.sh
```

Replace `PRIVATE_BIND_IP` with one assigned private address; the argument may
be omitted only when automatic selection is unambiguous. The initializer
creates `.env` and refuses to overwrite an existing one. Resume or reconcile
the current prepared preview with:

```sh
node scripts/validate-config.mjs
docker compose up -d portal cobalt searxng valkey redlib
docker compose ps
```

The portal, search, and Redlib use direct HTTP on their configured ports;
Cobalt's port is
for its authenticated API and generated exact `/tunnel` links, not a user UI.
Restrict all four ports to intended private clients.

For the first public-launch start, first replace preview values with the exact
HTTPS/Caddy plan and separate edge peer, then run:

```sh
node scripts/init-secrets.mjs
node scripts/render-config.mjs
node scripts/validate-config.mjs --launch
docker compose config --quiet
docker compose pull cobalt searxng valkey
docker compose build --pull portal redlib
docker compose up -d portal cobalt searxng valkey redlib
docker compose ps
sh scripts/check-health.sh
sh scripts/verify-network.sh
```

Start or reconcile the already prepared public deployment later:

```sh
node scripts/validate-config.mjs --launch
docker compose up -d portal cobalt searxng valkey redlib
```

Stop all project services, including rimgo if its optional profile was ever started, while retaining containers and the SearXNG cache:

```sh
docker compose --profile privacy-frontends --profile optional stop
```

Remove project containers and networks while retaining the named cache and images:

```sh
docker compose --profile privacy-frontends --profile optional down
```

Only after a reviewed backup/purge decision, remove project containers, networks, and the disposable SearXNG cache:

```sh
docker compose --profile privacy-frontends --profile optional down --volumes --remove-orphans
```

Do not run a broad Docker prune or delete `.env`, secrets, backups, edge routes, or firewall rules as part of an ordinary stop.

## Launch checklist

- [ ] The complete tree has a reviewed initial commit, that exact revision is published, and `SOURCE_CODE_URL` points to it.
- [ ] `PRIVATE_PREVIEW=0`; final project name, source, contact, HTTPS origin/hosts, private bind, and separate edge peer are configured without committing secrets; `node scripts/validate-config.mjs --launch` passes.
- [ ] Cobalt keys and SearXNG secret are generated, validated, rendered, and recoverably backed up.
- [ ] Core build, lint, type, unit, E2E, audit, Compose, health, network, and resource checks pass on the exact release.
- [ ] Application ports accept only the edge source—including Cobalt's broader private/ULA trust exception; database/cache ports and unintended IPv6/public listeners are absent.
- [ ] Manual Caddy config validates; media exposes exact tunnel GET only,
  SearX denies diagnostics/non-POST search, Redlib strips upstream HSTS-zero,
  redirects stay same-origin, proxied media/Range works, and sensitive search,
  tunnel, and Reddit path/query/cookie logs are absent.
- [ ] Authorized complete Cobalt transfer, direct-result, FFmpeg, repeated cancellation/restart, rate, cleanup, and active-resource tests pass; the existing partial Dailymotion cancellation smoke remains green.
- [ ] Edge/container/daemon logs and retention are reviewed; bandwidth quota and low-disk/egress response are established.
- [ ] Exact Corresponding Source, SearXNG runtime modification, Redlib upstream
  commit/local patch/build recipe, upstream links, licenses, notices, and
  rollback revision/image are public.
- [ ] English and Spanish human/accessibility/mobile reviews pass; support remains optional and nonpreferential.
- [ ] Redlib's Android OAuth/client plus browser/TLS emulation policy exception,
  English-only UI, weak non-auth cookie attributes, crawler/rate-limit gap, and
  possible Reddit blocking are explicitly accepted; stop it rather than add
  personal credentials if those risks become unreasonable.
- [ ] rimgo 1.4.2 has no public hostname/route because of its known open
  redirect; Invidious remains disabled; DNS/TLS is enabled only after every
  preceding launch gate passes.
