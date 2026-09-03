# Test record and verification guide

Infrastructure baseline: 2026-08-30. The upstream-FOSS-only cutover completed
the fresh release regression recorded below; older results are retained only
as dated historical evidence.

## 2026-09-03 upstream-FOSS-only release regression

Commit `c354cbec4b31b1debb12fab236b2f01f372da941` was built, published, and
deployed by recreating only the portal container. The release checks produced
the following results:

- the production-included FOSS policy gate accepted 16 catalog records and
  kept all 31 retired route pairs blocked;
- ESLint and TypeScript completed without errors; the SearXNG pagination and
  query-redaction regressions passed; Vitest passed 48/48 tests across eight
  files; and npm reported zero known vulnerabilities;
- Playwright passed 48/48 applicable desktop/mobile tests; 12 explicitly
  live-only private-preview checks were skipped in the loopback run;
- the launch validator and Compose model passed, as did all 27 secret-free
  configuration-validator tests;
- the production Docker build ran the policy gate inside its build context and
  produced a 56.6 MB portal image;
- through the public HTTPS edge, all 62 English/Spanish retired URLs and six
  representative method/path combinations in the former developer namespace
  returned 404; four catalog routes and the exact published source revision
  responded correctly;
- a live browser check found the same 14 launchable records in English and
  Spanish, confirmed every catalog launch uses a separate tab with opener
  isolation, and found no horizontal overflow at 375 CSS pixels; and
- the public status endpoint reported all 13 configured upstream applications
  operational at the time of the check. This is a point-in-time result, not an
  uptime claim.

The Impeccable source detector and rendered desktop/mobile checks had no
remaining findings after line-height and long-line-width corrections. The
`cream-palette` detector rule has one narrow documented exception for the
selected Useful Field Ledger paper surface; no other finding was suppressed or
left standing.

## Historical 2026-09-03 frontend release regression (superseded)

After the public frontend redesign and final Impeccable remediation, the exact
release source passed:

- Vite production build, ESLint, and TypeScript with no errors;
- 43/43 Vitest unit/server tests, including SearXNG pagination and query-log
  redaction regressions;
- 64/64 Playwright combinations across desktop Chromium and a Pixel 7-sized
  profile against the built Node server;
- focused public desktop/mobile checks for the honest unconfigured-donation
  state, Featured/A–Z parity, all catalog launches opening separately, grouped
  software disclosure, JSON output gating, localized HTTP 404 recovery, and
  the `/es/support` 308 alias; and
- two independent Impeccable assessment tracks. The source detector returned
  no findings. The browser assessment's Cloudflare script-injection finding
  was fixed by retaining the strict CSP and adding `Cache-Control: no-cache,
  no-transform` to HTML; the public response contains no challenge-platform
  bootstrap and fresh browser contexts report no CSP/page error.

The retired PDF implementation was route-lazy and triggered Vite's 500 kB
chunk warning. That observation does not describe the upstream-FOSS-only
portal. The older measurements below remain dated evidence rather than the
current aggregate test count.

## 2026-09-03 source publication and launch metadata

The reviewed 174-entry source tree was published to the public
[`mycelibre/utilibre`](https://github.com/mycelibre/utilibre) repository under
AGPL-3.0-or-later. The exact staged index excluded private `.env` files,
credentials, runtime data, generated build/vendor output, agent artifacts, and
non-curated reports. A redacted Gitleaks 8.28.0 scan of an index-only export
reported no leaks. GitHub recognizes the repository license as AGPL-3.0.

The ignored production configuration now uses an immutable revision URL for
`SOURCE_CODE_URL` and the repository issue tracker for `CONTACT_URL`. The
strict launch validator passes. The portal was rebuilt and recreated without
restarting the other services; its public configuration endpoint returned the
expected source and contact destinations and no inactive donation URL
afterward.

## Retired 2026-09-03 Developer implementation record

The portal-native Developer category and its webhook/DNS API were tested on
2026-09-03, then removed because original Utilibre task implementations do not
meet the upstream-FOSS-only policy. Those passing results are not release
evidence for the current portal and must not be used to re-enable the routes.
The replacement regression must prove the retired routes and API namespace
return 404, every launchable catalog capability maps to an approved independent
self-hostable FOSS application, and the public build contains no orphaned task
implementation or task-specific runtime dependency.

This record separates automated, private-host, and still-manual checks. It does
not claim that private smoke requests constitute a public production launch.
The original baseline below was recorded with portal, Cobalt, SearXNG, Valkey,
and direct Redlib under `PRIVATE_PREVIEW=1`. It is retained as historical test
evidence. The current production Redlib path adds Anubis and must satisfy the
separate gate acceptance section below; the old direct-port observations do
not substitute for that verification.

## Automated repository checks

The validator has secret-free unit coverage for required launch services,
matching Redlib profile/catalog/URL/port relationships, the rimgo/public-Imgur
launch block, IPv4/IPv6 private bind values, exact private-preview HTTP
relationships, and rejection of preview mode by the public launch gate. Run it
from the repository root:

```sh
node scripts/tests/validate-config.test.mjs
```

The portal was checked with the exact lockfile dependencies using:

```sh
cd portal
npm run build
npm run lint
npm run typecheck
npm test
npm audit
npm audit --omit=dev
npm run test:e2e
```

Private configuration and Compose were also checked from the repository root with:

```sh
node scripts/validate-config.mjs
docker compose config --quiet
```

`node scripts/validate-config.mjs --launch` is a separate mandatory launch gate.
It requires the launch services and aligned Redlib profile/catalog/origin
settings, rejects rimgo and `PUBLIC_IMGUR_URL` until an official fixed release
is pinned/reviewed, and requires final non-reserved public hosts, project name,
source URL, contact URL, private bind/edge addresses, and their cross-field
relationships. As of 2026-09-03, the workspace configuration contains the
verified public host/origin plan, immutable public source revision, and public
issue-tracker contact destination; both the base validator and strict launch
gate pass.

The live private-IP HTTP run is opt-in because it targets the running Compose
portal rather than Playwright's loopback development server. `E2E_BASE_URL`
both changes the relative-route target and prevents Playwright from starting
the local Vite server:

```sh
cd portal
E2E_BASE_URL=http://PRIVATE_BIND_IP:PORTAL_PORT \
PRIVATE_PREVIEW_BASE_URL=http://PRIVATE_BIND_IP:PORTAL_PORT \
PRIVATE_PREVIEW_SEARCH_URL=http://PRIVATE_BIND_IP:SEARXNG_PORT \
PRIVATE_PREVIEW_REDDIT_URL=http://PRIVATE_BIND_IP:REDLIB_PORT \
  npm run test:e2e
```

This exercises the complete desktop/mobile suite through the built portal on
the deployed private HTTP origin. It covers the bilingual catalog, mobile and
accessibility behavior, upstream attribution and launch URLs, SearXNG's browser
link-token flow, and the configured Redlib origin. It must also confirm that
retired portal-native tool routes and developer APIs return 404. Public HTTPS
is still the preferred browser environment and remains mandatory for launch.

Recorded baseline results, followed by the current private-preview handoff:

- the 20/20 validator Node regressions passed, including launch-service,
  Redlib profile/catalog/origin, rimgo/public-Imgur block, IPv4/IPv6
  private-address, exact private-preview, and preview-at-launch rejection cases;
- the production Vite build completed; its retired local-PDF chunk produced a
  size warning at that historical revision;
- ESLint and TypeScript completed without errors;
- `npm test` passed the SearXNG redaction regression followed by 23/23 Vitest
  tests across the route, i18n/catalog, browser utility, and portal-server suites;
- both the full and production-only npm audits reported zero known vulnerabilities at the tested lockfile state;
- Playwright passed 42/42 project/test combinations, with no skips, across
  desktop Chromium and a Pixel 7-sized Chromium profile against the actual
  deployed private-IP HTTP portal, real SearXNG endpoint, and real Redlib
  endpoint—not the Vite development server. This historical run included the
  now-retired local-tool checks, SearXNG's token-backed result flow, Redlib
  backend/portal integration, and stale lazy-chunk recovery; and
- a missing static-asset path returned a real 404 rather than the SPA document. The raw SearXNG smoke query was absent from recent logs.

Rerun the complete command set after changing any source, dependency, runtime configuration, or test. A historical pass is not evidence for a modified tree.

Run the public ntfy compatibility gate from the application VM after every
Cloudflare, Caddy, ntfy, firewall, or DNS change:

```sh
cd deployment/utilibre
sh scripts/check-ntfy-public.sh
```

It uses a random no-cache/no-Firebase message to verify stock-client health,
live JSON and SSE delivery, no replay, no managed challenge, and no
`NEL`/`Report-To` headers. A Cloudflare error page is a failure even if it omits
those reporting headers.

## Anubis/Redlib gate acceptance

The Redlib public path now adds Anubis 1.27.0 after the historical baseline
above. A complete recurring gate check must verify all of the following without
load-testing Reddit:

- Anubis and Redlib are healthy, only Anubis publishes the exact private port,
  and metrics remain container-loopback-only;
- a fresh ordinary Chromium context receives and solves the mild challenge,
  obtains the 24-hour host-only Secure/HttpOnly/SameSite=Lax/Partitioned cookie,
  and then renders one Redlib page;
- the cookie remains accepted across an Anubis-only restart, proving the stable
  key mount is effective;
- `/info` and exact `redlib-instance-updater` and
  `libreddit-instance-updater` user-agent patterns pass without an interactive
  challenge, while lookalike agents do not;
- direct requests without the trusted real-client header fail closed, and the
  public Cloudflare path cannot be made to honor spoofed client-address or
  `X-Original-URI`/`X-Forwarded-Uri` values;
- bbolt is the selected store with the documented 30-minute logical TTL,
  normal logs remain WARN/error and bounded, and no page/media body appears in
  the challenge database;
- clients without JavaScript are shown the limitation rather than silently
  forwarded; and
- Cloudflare Network Error Logging remains disabled and `NEL` and `Report-To`
  remain absent from Redlib and every other public Utilibre response. The zone
  setting was disabled on 2026-09-03 and accepted responses checked afterward
  contained neither header.

Record the exact command/browser result in the deployment report. Do not treat
a 200 challenge page as proof that the upstream Redlib operation succeeded.

## SearXNG public pagination and limiter acceptance

After every SearXNG settings, image, limiter, Cloudflare, or Caddy change:

- confirm the effective base URL is the public HTTPS search origin and result
  HTML contains no private address;
- complete the real link-token browser flow, then compare URL sets from pages
  one, two, and three using one ordinary non-sensitive query;
- confirm Fynd contributes only to page one, while page two is not a replay of
  page one;
- confirm a page-six request creates no engine fan-out under the five-page
  backend cap; the stock page-five UI may still show a Next control that leads
  to an empty terminal page;
- exercise two controlled users through the real Cloudflare path and verify
  distinct limiter identities without recording their raw addresses; and
- prove a direct non-Cloudflare client cannot reach the origin or forge the
  normalized client identity.

The last two checks require access to the separate edge and its firewall. A
successful private request with a synthetic header proves only the application
side of the trust chain; it is not public-path acceptance.

## Bilingual and accessibility coverage

Automated browser coverage verifies:

- Spanish browser preference selects `/es/` on first use;
- a manual language choice is stored locally and wins on the next root visit;
- changing language preserves the equivalent current information or catalog route;
- all public information pages render in English and Spanish with an `h1`, matching HTML `lang`, and non-empty translated metadata;
- accented Spanish strings render without `undefined`/`null` placeholders;
- the 375-by-812 mobile layout has no horizontal overflow on representative long Spanish catalog content;
- the skip link receives keyboard focus and moves focus to the main region;
- interactive catalog controls have associated labels or accessible names and reduced-motion styling removes transitions; and
- optional support links are absent when their URL is not configured.

This is meaningful regression coverage, not a complete WCAG conformance audit. Before launch, manually review contrast, zoom/reflow, keyboard order, errors, downloads, screen-reader announcements, and all pages with at least one commonly used screen reader.

## Upstream-FOSS catalog policy and launch evidence

The policy regression imports the same catalog used by the public interface and
requires each launchable capability to reference an approved provider record.
That provider must be an independently maintained, self-hostable FOSS
application with a source URL, license, exact reviewed version, and documented
integration type. A library, browser API, or Utilibre's own AGPL license is not
sufficient evidence that a user-facing task has an upstream application.

Browser coverage verifies visible upstream attribution, bilingual discovery,
and configured launch destinations. It also requests every retired
portal-native route and the former developer API namespace and expects 404.
Only the narrow Cobalt adapter may implement task-specific portal behavior;
its tests prove that the capability remains supplied by pinned upstream Cobalt
and that the adapter retains its existing validation, authentication, rate, and
response bounds.

## Portal and security checks

Unit and private integration checks cover:

- fixed health response and browser security headers, including raw-socket
  rejection and closure of incomplete bodies on bodyless routes;
- sanitized public configuration with no server-held Cobalt key or internal URL;
- 404 behavior for arbitrary `/_portal/*` and legacy `/api/*` routes;
- real 404 responses for missing static assets rather than an HTML SPA fallback;
- missing/wrong Origin rejection on the media gateway;
- rejection of private IPv4, private IPv6, localhost, unsupported schemes, credentials, explicit ports, malformed hosts, and oversized media request bodies;
- coalescing of concurrent high-level status calls and the server's 15-second default in-memory status snapshot, which prevents one public caller per internal probe;
- Cobalt missing/invalid key rejection and acceptance of the generated matching portal key; and
- stable public error codes rather than raw upstream error bodies;
- absence of webhook, DNS, generic HTTP/header proxy, and other retired
  developer API behavior; and
- catalog-policy rejection of any launchable entry without an approved
  independently maintained, self-hostable FOSS application provider.

The private-preview server regression also admits only an exact generated
Cobalt URL on the configured private origin, exact `/tunnel` path, and required
opaque query. A missing query, different private host, `/admin`, loopback, or
another private result remains an invalid upstream response. Public runtime
configuration exposes the exact preview SearXNG URL without exposing the key or
internal service URL.

The private media gateway returned 403 for an unapproved Origin, 400 for invalid/private targets, and 413 for an oversized body in the recorded checks. An authenticated request using the server-held key reached Cobalt and produced Cobalt's expected invalid-link result for `example.com`, demonstrating that the valid key was accepted. A separate bounded interoperability check submitted Dailymotion item `x5e9eog` through the portal gateway: Cobalt resolved it, the generated tunnel returned media data to a ranged request, and the client then cancelled the transfer.

The current default and live Cobalt policy accepts only `dailymotion.com` and
`dai.ly`. YouTube is disabled in Cobalt and absent from the portal gateway's
media-host allowlist after two live resolution attempts failed on pinned 11.7.1,
consistent with the current official [open YouTube failure
report](https://github.com/imputnet/cobalt/issues/1562). This is a tested
provider limitation, not a claim that Cobalt as a whole is unavailable.

The live Cobalt environment matched the configured portal origin exactly and had wildcard CORS disabled. Cobalt's CORS middleware consistently returned that configured origin—even when sent a foreign `Origin`—so a browser at the foreign origin cannot read the response because the returned allow-origin value does not match it. Recent portal and Cobalt logs were also checked and contained neither the generated key nor the submitted invalid test URL. CORS remains a browser boundary rather than authentication; the server-held API key and narrow edge route are still required.

## Backend and Compose checks

The following were performed against private-bound test configuration:

- Compose interpolation/syntax validation;
- portal image build and creation of the core services;
- Redlib source build from exact official commit/archive checksum with
  digest-pinned Rust/Ubuntu bases, local patch `git apply --check`, patch Rust
  regression, and locked release compilation;
- service health convergence for portal, Cobalt, SearXNG, Valkey, Anubis, and Redlib;
- restart/recreation while correcting readiness, secret-mode, and SearXNG configuration-mount issues;
- confirmation that Valkey is internal-only and has no published cache port;
- confirmation that no database port is published;
- inspection of exact private host-port mappings rather than wildcard bindings;
- inspection of CPU/RAM/PID ceilings, read-only/capability settings, and `json-file` rotation settings;
- SearXNG's homepage/official client-token flow, 48-card English and 42-card
  Spanish General results for matching practical queries, and successful
  image/news/video/IT/science/map category probes;
- SearXNG live log-redaction verification: the raw test query was absent and the redaction marker was present;
- Cobalt key authentication, failed-request behavior, and a bounded ranged Dailymotion resolution/tunnel/client-cancellation check; and
- Redlib `/settings` health; one live `/r/privacy` response containing real
  posts; same-origin rejection of scheme-relative/backslash settings redirects;
  RSS-disabled and crawler/noindex behavior; headers/cookies/log level; exact
  private port; a 1,024-byte ranged Reddit image request returning HTTP 206 with
  the correct `Content-Range`; no database/volume; non-root/read-only/limit inspection; and
  1,000 local `/settings` responses at concurrency 10 as a bounded synthetic
  application-only check; and
- optional rimgo home, gallery, and partial/ranged media retrieval using examples supplied by its upstream documentation.

The SearXNG redaction regression is now part of `npm test`, not only a one-time container smoke check. It verifies simple `q=`, a URL query with a multiword value/tail, and a rendered mapping containing an escaped quote. On the first recognized `q`/`query` or URL-query marker, the hook deliberately keeps only the non-sensitive prefix plus a marker and discards the entire rendered record tail. This sacrifices some diagnostic detail rather than attempting to parse an unsafe, unstructured remainder.

Search-result counts are bounded observations, not assertions in the recurring
test suite: third-party indexes change and repeated synthetic searches would
create needless traffic. The recurring private browser test requires a real
`article.result` rather than merely HTTP 200. The current engine research,
weights, specialist set, rejected candidates, and re-admission method are in
`docs/searxng-engine-review.md`.

In `PRIVATE_PREVIEW=1`, the rendered limiter has no non-loopback trusted proxy.
A normal browser loads the generated `client<token>.css` before submitting the
built-in POST search form; that flow returned HTML successfully. A raw POST
that skips the CSS token can correctly receive `429` as a suspicious client.
This is expected limiter behavior, not evidence that arbitrary forwarding
headers should be trusted.

The rimgo server returned the requested media bytes and a valid `Content-Range`, although the tested response used HTTP 200 rather than 206. Source review also found that 1.4.2 `/search` input can produce a protocol-relative external redirect. That known open redirect is a public-deployment blocker independent of the protocol quirk, missing limiter, English-only UI, HSTS behavior, and bandwidth risk. There is no public rimgo Caddy route; its profile remains private compatibility evaluation only.

Redlib used about 7.102 MiB in a post-check Docker point sample. Its cgroup
memory peak across startup, the live page, and the local synthetic responses
was 15,958,016 bytes (about 15.22 MiB); total CPU use was 339,556 microseconds
with no throttling. `/r/privacy` returned 63,051 bytes in 0.874 seconds.
Capped direct media proxying was also exercised: Redlib returned bytes 0–1023
of a 16,067-byte Reddit PNG as HTTP 206 with `Content-Range: bytes
0-1023/16067`. The response exposed several Reddit CDN diagnostic headers;
the documented edge route now strips those along with upstream HSTS-zero.
Cumulative network counters of roughly 193 kB in/133 kB out include startup
and are not a workload forecast. The synthetic settings path avoids repeated
Reddit traffic; it is not evidence for real public crawler/media behavior.

## Cleanup and retention checks

Structural checks confirmed that Cobalt has a read-only root and no persistent
media volume; portal, Valkey, Anubis, and Redlib also have read-only roots;
SearXNG/portal/Anubis/Redlib/Valkey temporary paths are bounded tmpfs; Redlib has no
mount/database/volume; Valkey persistence is disabled; and only the rebuildable
SearXNG cache is a named volume. Anubis deliberately bind-mounts its ignored
bbolt state and read-only stable signing key. Docker logs use bounded rotation.

The public backup helper was run into an isolated temporary directory. Its
archive contained `.gitignore`, `secrets/README.md`, the portal lockfile, and
the documented public source/configuration material, including Redlib's
source-fetch Dockerfile and patch; it excluded `.env`, both
Cobalt key files, the generated limiter, and dependency directories. The
temporary rehearsal archive was then removed. The encrypted private-archive
and clean-host restore drill remain manual launch work.

A failed Cobalt request, the bounded ranged Dailymotion `x5e9eog` tunnel request followed by client cancellation, and a container restart did not create a configured media volume or observable media artifact under `/tmp`. After the checks, `docker diff` showed only Docker-injected `/sbin/docker-init` and `/run/secrets` paths; the one Cobalt key mount remained read-only. This is evidence for that specific partial-transfer/cancellation path, not proof for every extractor or lifecycle. A complete download, a result requiring FFmpeg, repeated cancellation, and a sustained/resource-concurrency soak remain unperformed; repeat writable-layer, `/tmp`, mount, and log inspection during those controlled tests before making any stronger retention claim.

An earlier cleanup removed the original disposable test containers, networks,
volumes, credentials, rendered limiter, Playwright result state, and sensitive
temporary captures. The current operator-requested handoff supersedes that
stopped state: a fresh ignored mode-`0600` preview `.env`, matching Cobalt
secrets, and rendered no-edge limiter were created, and the portal, Cobalt,
SearXNG, Valkey, and Redlib containers are now running privately. Generated
private material remains untracked; no public route or listener was added.

## Checks that remain manual or unperformed

The following are launch gates, not silently assumed passes:

- real edge-to-application reachability and rejection from an unauthorized source;
- public DNS, TLS, host routing, Caddy route matching, and the rule that the media host exposes exact `GET /tunnel` only;
- verification that the edge replaces rather than appends spoofed client-forwarding headers;
- verification that exact edge-source firewalling compensates for pinned Cobalt's broader upstream trust of loopback and private/ULA proxy peers;
- edge request/body/time limits and the operator's chosen privacy-preserving access-log policy;
- confirmation that the real SearXNG edge returns 404 for diagnostics/config/statistics/metrics and 405 for non-POST `/search`;
- confirmation that the real Redlib edge strips upstream
  `Strict-Transport-Security: max-age=0`, avoids paths/queries/cookies/referrers
  in access logs, preserves media Range/cancellation, retains same-origin
  redirects, and applies a reviewed crawler/rate control if available;
- a complete Cobalt result transfer, a direct-result case, an FFmpeg-processing case, repeated cancellation/restart cleanup, and the same cancellation check through the final Caddy edge;
- representative active CPU/RAM/network observations under controlled concurrency;
- provider transfer quota/cost and low-disk/egress alert delivery;
- longer soak, container rollback, encrypted-private backup/clean-host restore, and complete-removal drills;
- a full manual WCAG AA review and real assistive-technology test;
- behavior in Firefox and WebKit/Safari beyond standards-based implementation review;
- external dependency/container vulnerability scanning beyond npm audit;
- sustained/concurrent public Redlib behavior, media egress, preference-cookie
  behavior over HTTPS, Reddit blocking over time, and unauthorized-source
  rejection; Invidious remains intentionally undeployed; and
- publication checks for future releases, including an index-only secret scan
  and updating `SOURCE_CODE_URL` to the new immutable deployed revision.

Do not load-test or repeatedly probe upstream search/media platforms. Use owned or explicitly authorized media and keep any concurrency exercise within the documented public limits.

## Launch verification sequence

First replace the direct-preview values with `PRIVATE_PREVIEW=0`, the exact
separate edge peer, and final public HTTPS hosts/origins; then re-render the
limiter. From the application VM:

```sh
node scripts/render-config.mjs
node scripts/validate-config.mjs --launch
docker compose config --quiet
docker compose up -d --build
sh scripts/check-health.sh
sh scripts/verify-network.sh
docker stats --no-stream
docker system df
```

From the edge VM, validate and manually apply the placeholder-based
configuration in [edge-routing.md](edge-routing.md). Then test both language
roots, one permitted POST SearXNG query, denial of non-POST search and
diagnostic paths, one authorized short Cobalt operation, exact tunnel routing,
and rejection of every other media-host path. Test one small Redlib page/media
request, its same-origin redirect patch, upstream HSTS-header stripping,
noindex, cookie behavior, and sensitive-log exclusion. Do not create a public
rimgo hostname or route for version 1.4.2.

Finally, use a controlled host that is neither the edge nor the application VM to confirm that application ports are unreachable. Record the test date and results without committing private addresses, tokens, query content, media URLs, or host identifiers.
