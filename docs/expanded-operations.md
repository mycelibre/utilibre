# Expanded deployment operations

Work from `/home/ubuntu/freetools`. Caddy is on a separate VM at `10.10.1.3`;
application gateways bind `10.10.1.43`. Preserve its existing Cloudflare-only trust.

## Browser tool operations

The separate `deployment/toolbox/compose.browser.yaml` stack adds ZIP Manager
on **3160**, RAWGraphs on **3161**, AudioMass on **3162**, and miniPaint on **3163**.
The second batch adds Excalidraw **3164**, SVGEdit **3165**, CyberChef **3166**
and Image Scrubber **3167**. Matching `zip`, `charts`, `audio`, `paint`,
`whiteboard`, `svg`, `cyberchef` and `scrub` Caddy blocks are in
`deployment/toolbox/Caddyfile.tools`. All eight backends bind only `10.10.1.43`.
Their static server accepts the exact Caddy peer `10.10.1.3`, app-VM diagnostics
and loopback; forwarded headers cannot bypass this allowlist. No host firewall
was changed. Keep these ports closed to the Internet. Portal/Kuma liveness
checks use public HTTPS because other containers are deliberately denied at
the private listeners. The portal permits only these eight exact public roots
for their matching service IDs, requires a 2xx response, and does not follow
redirects; arbitrary public probes, credentials and query parameters are rejected.

Each new serving container is non-root, read-only, capability-free, limited to
128 MiB/0.5 CPU/64 processes, with 32 MiB tmpfs and rotating error logs. Input
files and browser drafts do not live in server volumes. Preserve the source
pins/configuration, not fictional user-data backups. Export browser work locally.

```sh
docker compose -f deployment/toolbox/compose.browser.yaml build
docker compose -f deployment/toolbox/compose.browser.yaml up -d
node deployment/toolbox/check-browser-tools.mjs
node deployment/toolbox/check-creative-tools.mjs
node deployment/toolbox/publish-browser-sources.mjs
sh deployment/utilibre/scripts/update-check.sh
```

Review upstream changes and dependency advisories weekly, update the manifest
and lockfiles deliberately, and repeat real export/privacy checks before
publishing. `update-check.sh` is read-only/manual; it is not an automatic
upgrade guarantee. Existing guarded SearXNG automation is unchanged. New Kuma
checks are five-minute homepage liveness, not scheduled workflow tests.

For rollback, retain the preceding portal image and private environment snapshot
and the OmniTools `0.6.0-p1` image. Recreate only the affected service with its
previous image/configuration. New apps have no server-side documents to migrate;
do not remove unrelated containers/volumes. Source archives remain public.

## Capacity baseline — October 7, 2026

### Root storage expansion — October 7, 16:39 UTC

After the creative-tool release, the operator-requested expansion used existing
unallocated space on the 130 GiB `/dev/sda`; no provider upgrade or purchase was
made. `growpart -N /dev/sda 1` verified the target first. `growpart /dev/sda 1`
preserved the root start sector (262144) and both boot partitions; it also moved
the backup GPT header to the already-expanded disk's end. `resize2fs /dev/sda1`
grew the mounted ext4 filesystem online, with no reboot or application stop.

`df -h /` changed from 99G total / about 7G available / 93% used to 128G total /
36G available / 72% used. The filesystem has 34,045,947 4 KiB blocks. Final
`sfdisk --verify /dev/sda` reports no errors; boot partitions retain their sizes
and identifiers. Portal and browser-tool containers remain healthy, and public
checks pass after expansion. This adds storage headroom, not CPU/RAM or proven
concurrent-user capacity.

The preceding partition layout is recorded at
`/opt/utilibre/creative-tools-rollback-20261007/sda-before-grow.sfdisk`. This is
metadata, not a data backup. **Do not restore the smaller partition over the
expanded filesystem**: shrinking needs a separately planned offline operation.
Existing on-host backups/offsite deferral remain unchanged. Online-growth
behavior is documented in the [Ubuntu resize2fs manual](https://manpages.ubuntu.com/manpages/noble/man8/resize2fs.8.html).

### Earlier load-test baseline (unchanged)

The first bounded tests found request quotas before CPU or RAM exhaustion. This
is **not certification for 1,000 active users**. The application VM has 8 vCPUs
and 15,664 MiB RAM. All generators ran on that same VM, including requests through
public DNS/HTTPS; these are not independent external-network measurements.
The [machine-readable results](../deployment/community/capacity-fixtures/results-2026-10-07.json)
retain per-stage figures, tested paths, exclusions and private raw-report locations.

| Test | Measured result |
| --- | --- |
| Public HTTPS, 20 front doors, 50 lightweight visits/second for 20 seconds | 1,852 requests, 92.46 requests/second, all successful; response p95 30.22 ms |
| Public HTTPS, same mix, 100 visits/second for 20 seconds | 3,702 requests, 184.81 requests/second; 40 HTTP 429 responses, all from FMD (20% of its requests, 1.08% overall) |
| Direct origin, 100 simultaneously launched static visits | 190 requests, all HTTP 200; visit p95 57.94 ms |
| Application VM across paced tests | Highest sampled CPU 22.87%; at least 9,630 MiB RAM available |
| Isolated LRCLIB handler, 30 distinct simultaneous cache misses | One accepted, 29 rate-limited; a local fake provider received just one request |
| Same LRCLIB fixture, 1,000 cached requests at concurrency 50 | All successful, no additional provider requests; response p95 22.63 ms |

Each lightweight visit fetched HTML and at most one same-origin JS/CSS asset
under 1 MiB. This excludes full cold-start downloads, browser execution, logins,
document editing, PDF exports, media traffic and real upstream search load. The
paced runs reached at most seven overlapping visits, not 1,000 concurrent users.
Their optional session-equivalent field assumes a visit every ten seconds; it
must not be presented as a measured user count. No long-duration soak was run.

FMD applies its 5 requests/second **per-IP** budget to both HTML/assets and API
traffic. A single-IP generator exhausted that budget; this does not establish a
global FMD capacity ceiling. Separate loopback-only Nginx fixtures reproduced
the configured global quotas of TransLite, AnonymousOverflow, 4get and Binternet:
30-request bursts produced respectively 9, 23, 23 and 26 HTTP 429 responses.
These fixtures test gateway policy, not the real applications or providers.
No quotas were raised, visitor IPs spoofed, or content providers load-tested.

The direct-Caddy run skipped the portal after TLS validation failed and three
routes after HTTP 403; it did not bypass those checks. All 20 routes passed the
public-HTTPS preflight. Caddy VM CPU, memory and network saturation were not
measured. Production configuration and user data were unchanged. Afterwards,
83 containers were running, none reported unhealthy/OOM, FMD returned HTTP 200,
and all 37 entries in the portal's liveness response were operational. Those
checks do not establish complete functional health of every advertised service.
Pollaris's worker restart count rose from 11 to 12 during preparation, before
the first measured run; its command has a 3,600-second lifetime and automatic
restart. Its last start was 02:37:46 UTC, before load began at 02:39:57 UTC.
Temporary fixture containers and listeners were removed.

Repeat only in a quiet maintenance window, reviewing each stage before escalating:

```sh
node --test scripts/capacity-check.test.mjs
nice -n 10 node scripts/capacity-check.mjs origin
nice -n 10 node scripts/capacity-check.mjs edge
nice -n 10 node scripts/capacity-check.mjs public
# Explicit escalation after reviewing the smaller public run:
nice -n 10 node scripts/capacity-check.mjs public higher
nice -n 10 node scripts/capacity-bursts.mjs
```

The paced runner has request deadlines, response/phase byte caps, RAM/CPU guards,
and stops escalation on aggregate errors above 2%, p95 above one second, or
missed arrivals. A per-service failure can exceed 2% while the aggregate remains
below it, so always inspect `byTarget`. Reports are private under
`/opt/utilibre/reports/`. These checks are manual, not scheduled.

For the separate provider-free fixtures, first ensure loopback ports 3390–3394
are unused. The temporary container uses host networking, with all listeners
and its sole fixed backend restricted to loopback. Always tear it down:

```sh
(
  set -e
  trap 'docker compose -f deployment/community/capacity-fixtures/compose.yaml down' EXIT
  docker compose -f deployment/community/capacity-fixtures/compose.yaml up -d
  node scripts/capacity-fixtures.mjs
)
```

That initial baseline preceded the targeted changes and follow-up below. Its
figures remain historical, not measurements of the revised settings.

### Targeted fixes and workflow follow-up

Deployed October 7: LRCLIB `f37c070-p2` shares identical in-flight searches, admits
up to four waiting distinct searches, bounds all attached waiters to 48, and
expires queued work after two seconds. Disconnected requests are removed; an
active provider fetch is cancelled only when nobody still needs it. One upstream
request at a time, the 500 ms completion-to-next-start gap, 15-second provider
timeout, cache bounds, provider cooldowns and browser privacy controls remain.
Fourteen backend tests cover timing, bounded admission, duplicate sharing,
cancellation, cooldown propagation and existing security behavior. Public desktop
and mobile search/preview/copy checks passed after deployment.

With the same local 200 ms fake provider, 30 identical cold searches now all
succeed with one upstream call. Three distinct simultaneous searches also pass
with enforced spacing. An intentionally excessive 30-distinct-search burst still
returns 27 HTTP 429 responses: queueing does **not** remove the upstream capacity
limit. All 1,000 cached fixture requests at concurrency 50 pass without extra
provider calls. Fixture reports are under
`/opt/utilibre/reports/capacity-fixtures-2026-10-07T03-08-02-834Z/`.

FMD's complete cold-browser test passed at one and three shared-IP users, but the
eight-user stage initially returned seven HTTP 429 responses, including essential
JavaScript; several login forms failed to render. Gateway logs classified these
as request-rate, not connection, rejections. Its strictly matched static asset
location now has a separate 20 requests/second, burst-100 budget. API/root limits
remain 5 requests/second, burst 60; the 12-connection limit, 15 MiB request cap,
no-store headers, invitation requirements and real-IP trust are unchanged.
After a validated graceful Nginx reload, all 72 requests in the eight-user stage
succeeded and every login form rendered, with no external browser connections.
The first higher-rate external follow-up exposed `/theme-init.js` outside the
initial `/assets/` rule: FMD again hit its API quota. The static rule now explicitly
includes that bootstrap script and the known icon/manifest files, while `/version`
and every API path retain the original allowance. GET-only static routing,
anonymous API denial and no-store headers were rechecked. The eight-browser test
passed again after this final reload.
This does not validate multiple independent client IPs or Android GPS/push flows.
Before/after reports are under `fmd-browser-2026-10-07T03-02-42-795Z` and
`fmd-browser-2026-10-07T03-05-03-682Z` in the private reports directory.

Two newly created, uniquely marked synthetic CV users passed real public SSO/MFA,
private-by-default creation, save/reopen and cross-user denial. Three rounds of
two simultaneous server-side PDF exports returned PDF bodies (six total). First
exports took about 2.1 seconds; later exports took 0.2–0.7 seconds. This verifies
PDF responses, not every template's visual correctness or large-document limits.
Both documents were purged through native owner APIs; the synthetic application
profiles and identity accounts were then disabled, with sessions/tokens/MFA
revoked. No owner or real-user data was changed. Details:
`/opt/utilibre/reports/capacity-resume-20261007a/results.json`.
PairDrop's exact-byte synthetic WebRTC transfer and JupyterLite's Python/pandas/
matplotlib notebook execution also passed. They run on this test machine, not
different NATs or representative low-end phones.

The 30-minute follow-up (`scripts/capacity-soak.mjs`) runs ten lightweight visits
per second across 19 public front doors, plus synthetic FMD and Pollaris create/
round-trip/vote/export/delete workflows every five minutes. FMD is excluded from
the background page mix so its one-IP allowance does not interfere with its
actual workflow. Reports are written every minute; CPU/RAM/error/latency guards
and a 4 GiB transfer ceiling stop the run when necessary. This remains a light
same-VM stability check, not a 1,000-user test or multi-hour endurance certificate.
Its final result is recorded after completion.

Completed 03:34 UTC: **33,169 page/asset requests, zero errors and zero missed
arrivals** across all 30 minutes. All six FMD and six Pollaris workflows passed,
including synthetic-data cleanup. Per-minute response p95 ranged 40.71–46.53 ms;
peak overlapping background visits was two. Peak sampled host CPU was 46.76%,
with at least 8,781 MiB available RAM. Those resource figures include local test
browsers, CV/Python checks and build/check activity, not application serving alone.
There were 83 containers before and after; none reported unhealthy or OOM after
the run. The final raw report is
`/opt/utilibre/reports/capacity-soak-2026-10-07T03-03-55-674Z/results.json`.
The [follow-up results](../deployment/community/capacity-fixtures/followup-2026-10-07.json)
include failed intermediate runs as well as successful retests and limitations.

The manual-only `capacity-external.yml` GitHub Actions workflow uses the existing
pinned checkout action, read-only repository permissions, no secrets and a
five-minute job deadline. Its fixed-target public-page test runs four 30-second
stages at 2.5, 5, 10 and 25 lightweight visits/second, without user writes or
provider searches. An explicit `higher=true` dispatch instead runs 50 and 100
visits/second only after baseline review. Aggregated counters are written to the
job log. This supplies an independent network generator, but does not supply
Caddy VM resource counters.

- [External baseline run](https://github.com/mycelibre/utilibre/actions/runs/37565686866):
  all 20 preflights passed; 2,365 measured requests, zero errors. At its highest
  stage, 46.08 requests/second and response p95 277.75 ms.
- [First higher-rate run](https://github.com/mycelibre/utilibre/actions/runs/37566012806):
  the 91.21 requests/second stage passed; the 181.09 requests/second stage had
  90 FMD HTTP 429 responses and 15 missed arrivals at the runner's 40-visit cap.
  It failed its guard and was not accepted as a clean capacity result.
- [Final higher-rate run](https://github.com/mycelibre/utilibre/actions/runs/37566271910),
  after the static-route correction and raising only the generator's in-flight
  cap to 80: all 20 preflights passed; 2,777 requests at 91.26 requests/second
  and 5,552 at 182.11 requests/second, all successful. The latter's response p95
  was 217.88 ms, visit p95 430.07 ms, peak overlapping visits 38 and missed
  arrivals zero. These remain 30-second page/selected-asset samples, not 1,000
  active users or sustained authenticated/heavy-workload limits.

```sh
node --test deployment/community/lrclib-server.test.mjs scripts/fmd-capacity-config.test.mjs scripts/capacity-check.test.mjs
node scripts/check-fmd-browser-load.mjs --expect-clean
nice -n 10 node scripts/capacity-soak.mjs
gh workflow run capacity-external.yml --repo mycelibre/utilibre
# Only after reviewing that baseline:
gh workflow run capacity-external.yml --repo mycelibre/utilibre -f higher=true
```

For CV workflows, choose a new lowercase alphanumeric run ID (maximum 12
characters). Run `deployment/identity/capacity-users.py` inside Authentik's
`ak shell` with `UTILIBRE_CAPACITY_CHECK_RUN` set; it refuses existing identities
or credential files. Set the same variable when running `CHECK_APP=resume node
deployment/identity/check-apps.mjs`, then `node scripts/check-capacity-resume.mjs`.
Finally run `node scripts/retire-capacity-users.mjs` with that run ID. It refuses
to retire application sessions while synthetic CV records remain. Credential and
recovery files stay mode 0600 under the existing private directory; never commit
or publish them. Do not repurpose operator accounts or the old retired QA users.

No Caddy blocks, DNS, TLS, proxy-trust settings, provider limits or hardware were
changed. Before any large-user promise, obtain Caddy CPU/RAM/network measurements
and test representative heavier/concurrent workflows plus longer steady loads.

## Functional regression checks

The October 6 audit/fixes are recorded in [the toolbox review](toolbox-review.md).
These checks use synthetic data. They do not enumerate every application feature.

```sh
node deployment/expanded/check-whisper.mjs
node deployment/expanded/check-whisper-quality.mjs
node deployment/expanded/check-jupyter.mjs
node deployment/community/check-pairdrop.mjs
node deployment/community/check-safetwitch.mjs
node deployment/community/check-fmd.mjs
node deployment/community/check-pollaris.mjs
# App-VM public-IP hairpin limitation: explicitly test verified TLS via Caddy.
# These two routes are NOT independent external-network availability checks.
node scripts/check-searxng-browser.mjs https://search.utilibre.org/ 10.10.1.3
BINTERNET_CHECK_ORIGIN=https://binternet.utilibre.org node deployment/community/check-binternet.mjs --edge
```

Whisper is `81869ed-p3` (same-origin models, 128 MiB file guard, microphone cleanup,
retry/error recovery, repetition and silence guards). Its default is multilingual
Small, about 253 MB downloaded on first transcription. Tiny remains an explicit
lighter option. Language selection is visible and initialized to English/Spanish
for those browser locales; otherwise Auto is shown accurately. Guards reject
excessive repetition, duration-budget overruns and punctuation-only output instead
of silently deduplicating/truncating it. These are not speech VAD or an accuracy
guarantee. Windows/Opera, the reported failure environment, remains unverified.
draw.io is `32.0.2-p3` (native narrow-screen UI and
content-versioned config). SafeTwitch is `ddee63e-p2`; the earlier `caeb85a` source
metadata was wrong. Its full source now uses the verified checkout's real base.
Do not disable media proxying or broaden CSP to repair upstream blocks.

Whisper rebuilding/source publication is documented in its `UTILIBRE-SOURCE.txt`
inside the public archive. After reviewed source changes, run
`node deployment/expanded/publish-whisper-source.mjs`; SafeTwitch uses
`sh deployment/community/publish-safetwitch-source.sh`. Both retain previous
archives. Serving images contain static output, not build-time Node dependencies.

The portal's `STATUS_SERVICES` now covers all 38 launched web services, including
the eight newer entries previously shown as unknown. These are private HTTP
liveness checks, not end-to-end workflows. Mumble remains unknown on this HTTP
page; its separate Kuma check observes only private TCP, not public UDP voice.
`node --test deployment/community/tests/portal-status.test.mjs` guards coverage.

| Newer service | Public hostname | Application-VM port |
| --- | --- | --- |
| Priviblur | tumblr.utilibre.org | 3139 |
| Mezzo | tenor.utilibre.org | 3140 |
| FMD | fmd.utilibre.org | 3141 |
| LRCLIB (replaces Dumb) | lyrics.utilibre.org | 3142 |
| 4get | 4get.utilibre.org | 3145 |
| SafeTwitch | twitch.utilibre.org | 3146 |
| AnonymousOverflow | overflow.utilibre.org | 3147 |
| GotHub | gothub.utilibre.org | 3148 |
| Pollaris | pollaris.utilibre.org | 3149 |
| Binternet | binternet.utilibre.org | 3150 |
| BiblioReads | biblioreads.utilibre.org | 3151 |
| TransLite | translate.utilibre.org | 3152 |
| Rimgo | rimgo.utilibre.org | 3153 — media upstream rate-limited |
| Kittygram | gram.utilibre.org | 3154 |
| QR Tools | qrtools.utilibre.org | 3155 |
| DeGoog | degoog.utilibre.org | 3156 |
| Mumble | mumble.utilibre.org | 64738 TCP **and** UDP — TCP voice and inbound UDP routing verified; UDP audio not yet tested |

DeGoog's direct port 3143, LibreMDB's 3144 and Kuma administration 3135 remain
loopback-only. Do not route them through Caddy. The current Caddy HTTP blocks are
in `deployment/community/Caddyfile.community`. Mumble instead needs DNS-only and
TCP/UDP forwarding; keep its join password separate from SuperUser credentials.
Credentials are private in `/opt/utilibre/mumble/runtime.env`, not in this repo.

## Scheduled maintenance

### Lyrics replacement

LRCLIB's MIT-licensed official web client replaces Dumb at the same hostname
and port. It searches the LRCLIB catalog, not Genius: annotations, Genius links
and artist biographies are not preserved. The upstream interface is English.
The portal explains this in both languages. No custom Utilibre return link was
added, following the native-settings-only rule.

Pinned frontend: `tranxuanthang/lrclib-homepage` commit
`f37c07042be1af5fdcc7932d090af32141089751`, with
`deployment/community/lrclib-source.patch`. The production image contains only
static frontend assets and a dependency-free Node 24 read-only adapter. The
frontend's production dependency audit is clean; older build-only Tailwind/Vite
tooling still has advisories and is not exposed as a development server.

The adapter only calls LRCLIB's documented `/api/search`. Its `f37c070-p2` build
coalesces identical in-flight searches, permits four queued distinct searches
with a two-second queue deadline, and caps attached waiters at 48. It sends an
identifying User-Agent, no visitor headers, serializes requests with a 500 ms gap, and honors
Retry-After (minimum 60 seconds; 403 pauses ten minutes). Responses are limited
to 2 MiB, with an 8 MiB / 128-entry / ten-minute RAM cache. No account, publish
API, arbitrary proxy target, persistent search history or search logging.
Cloudflare/Caddy remain in the data path. Public browser tests confirm that CSP
blocks Cloudflare's injected inline challenge script; the app itself works
without enabling that script. Health monitoring checks only local liveness,
not continuous upstream searches.

Build from the pinned checkout with the patch applied:

```sh
docker build --build-context integration=/home/ubuntu/freetools/deployment/community \
  -f /home/ubuntu/freetools/deployment/community/Dockerfile.lrclib \
  -t utilibre-lrclib:f37c070-p2 /opt/utilibre/community-src/lrclib-homepage
docker compose -f deployment/community/compose.additions.yaml up -d --no-deps dumb
docker exec utilibre-additions-dumb-gateway-1 nginx -t
docker exec utilibre-additions-dumb-gateway-1 nginx -s reload
LRCLIB_CHECK_URL=https://lyrics.utilibre.org node deployment/community/check-lrclib.mjs
```

The Compose service key `dumb` is retained solely to preserve its private network
address/firewall and existing gateway. Its image is now LRCLIB; the public
catalog ID is `lrclib`. The previous stateless Dumb image remains available for
rollback, but still cannot retrieve Genius content. No visitor data was removed.

Other replacements reviewed October 6:

- [Phantom](https://codeberg.org/phantom-org/phantom) at `5517e140` still fetches
  Fandom's blocked media host. Its proxy uses string-prefix URL authorization,
  follows redirects and reads unbounded bodies; not deployed as a safe drop-in.
- [Rimgu](https://codeberg.org/3np/rimgu) explicitly recommends Rimgo instead
  while its own development is paused. No verified Imgur replacement found.
- [Watcharr](https://github.com/sbondCo/Watcharr) is an account-based watched-list
  service, not an anonymous IMDb reader. TMDB-based movie browsers also require
  operator API registration and terms acceptance. No verified LibreMDB drop-in
  was deployed in that replacement review. The later private LibreMDB repair
  below supersedes the obsolete-runtime blocker, not the public data-use gate.

### Reader comparison follow-up — October 6, 21:36 UTC

Working instances are evidence to investigate, not proof that all frontends are
universally broken. This follow-up changes the earlier LibreMDB diagnosis; no
production deployment or privacy setting was changed during these comparisons.

- **LibreMDB:** the [darlopvil fork](https://github.com/darlopvil/libremdb-fork)
  at `b233f4e24acfb4afbe55b7c13798832ca8068086` replaces HTML extraction with
  anonymous IMDb GraphQL POSTs. Using its documented request header, a minimal
  title query from this application VM returned HTTP 200 and the correct title
  for `tt1049413`. The earlier generic GraphQL rejection does **not** establish
  that this method is blocked. This verifies data access, not the complete fork's
  UI, full queries or media. The API response explicitly excludes public use;
  [IMDb's published data-use conditions](https://help.imdb.com/article/imdb/general-information/can-i-use-imdb-data-in-my-software/G5JTRESSHJBBHTGX)
  also restrict extraction and republication. Resolve the public-use basis before
  launching this route. The fork still pins Next 12.2.5 and old dependencies, so
  runtime/security modernization is independently required. No API credentials,
  paid agreement, challenge solver or public deployment was added.
- **Rimgo:** a bounded range request for `wG1nGfK.mp4` at `ri.nadeko.net`
  returned HTTP 200, `video/mp4`, a content range and a valid MP4 signature;
  the same path on `rimgo.utilibre.org` returned 429 with Retry-After 601.
  Nadeko's [privacy page](https://ri.nadeko.net/privacy) identifies version
  1.4.2 and Chile/Movistar hosting. This supports investigating outbound network
  access; it does not prove every Hetzner address is blocked. Rimgo's
  [provider guidance](https://rimgo.codeberg.page/docs/getting-started/unsupported-providers/)
  documents this failure class. The app VM has no global IPv6 address/default
  IPv6 route, regardless of the public edge's AAAA record. No external instance
  was configured as our upstream; no new proxy/provider was provisioned.
- **BreezeWiki:** browser checks loaded the same `/zelda/wiki/Link` article
  at `breezewiki.nadeko.net` and `wiki.utilibre.org`. The other instance's
  browser contacted `zelda.fandom.com` and referenced direct Fandom-CDN images;
  ours retrieved the article server-side but its first proxied article image
  returned 403. Media requests were deliberately bounded, so this is **not** a
  full media-success claim for the other instance. Upstream's
  [configuration guide](https://docs.breezewiki.com/Configuration.html) explains
  the proxy/JSONP distinction. Direct browser media connections could work from
  a visitor's network but would disclose their IP to the upstream; approval and
  accurate privacy wording are needed before changing our configuration. Native
  JSONP/direct-media mode has not been enabled.

### Privacy-preserving repairs — October 6, 22:00 UTC

The operator explicitly rejected direct browser connections to Fandom. Keep
`bw_strict_proxy=true`, JSONP and suggestions disabled, and the same-origin CSP.
Do not enable a direct-media fallback or borrow another public instance as an
upstream. The public catalog still distinguishes visible inventory from a
verified launch; none of these three was newly enabled for public launch.

**BreezeWiki:** deployed gateway changes disable error logs that could include
visitor addresses/article URLs, strip visitor identity headers before the
application, and restrict form submissions to the same origin. Four regression
tests in `deployment/expanded/tests/wiki-privacy.test.mjs` enforce these settings.
Public article text and the new headers were verified. Chromium's network
diagnostics confirmed an external independent-wiki logo was blocked by CSP,
not fetched; a Playwright `request` event alone is not proof of network contact.
The proxied Fandom image still returns 403. Its complete source archive was
refreshed, with the previous archive preserved.

**Rimgo:** deployed `utilibre-rimgo:d2be8e2-p3`
(`sha256:00855ed0135e8a27b524759651b8da7727685fda86740fa75f0fdac23d7886c2`).
Per-host admission now serializes response-header retrieval so simultaneous
image requests see the first 429 cooldown, rather than all reaching Imgur.
Waiting requests honor cancellation, visitor identity headers are removed,
and the custom transport negotiates HTTP/2. Five offline transport tests cover
destination policy, cooldowns, concurrent requests, cancellation and headers.
The public version and media response were checked: the video remains 429,
`no-store`, Retry-After 601. This is a retry/privacy fix, **not restored playback**.
The source patch and complete archive match the deployed p3 changes.

**LibreMDB:** privately repaired the darlopvil fork at `b233f4e24acfb4afbe55b7c13798832ca8068086`.
Node 24.21.0 / Next 16.4.0 replace the unsupported runtime. Package audit reports
zero known vulnerabilities in the reviewed lockfile. The patch also fixes an
over-broad media URL regex: exact HTTPS hosts, public DNS answers passed directly
to TLS, no redirects, bounded responses/time/concurrency and fixed outgoing
headers. Untrusted HTML is sanitized, browser resources remain same-origin,
and error pages do not expose server stacks. GraphQL results have a bounded
16 MiB / 64-entry RAM cache with timed deletion after ten minutes. It fails
closed unless `UTILIBRE_PRIVATE_EVALUATION=true`.

Desktop/mobile checks passed for search `Up`, movie `tt1049413`, and visible
proxied images (17 desktop / 16 mobile), with no third-party browser requests,
JavaScript errors or horizontal overflow. Invalid destinations are rejected and
the invalid-title error discloses no server stack. Four offline security tests
and the production build pass. Impeccable's hardening checks guided these
privacy/error checks while preserving the upstream interface. This sample does
not certify every title, person, list or trailer. React 18 is supported but
deprecated by Next 16; migrate it before Next 17.

The private test container was stopped after verification. It has an explicit
`libremdb-review` Compose profile, a loopback-only binding and no application
logs. No public Caddy route, portal launch, monitoring or directory submission
was added: IMDb public data-use permission remains unresolved. The software's
AGPL license is separate from permission to use IMDb's data.

To reproduce the private check, apply `deployment/community/libremdb-private-source.patch`
to a pristine checkout of the pinned fork, then:

```sh
docker build -f deployment/community/Dockerfile.libremdb-private \
  -t utilibre-libremdb:b233f4e-p1 /opt/utilibre/community-src/libremdb-fork
docker compose -f deployment/community/compose.evaluation.yaml --profile libremdb-review up -d --no-deps libremdb
node deployment/community/check-libremdb-private.mjs
docker compose -f deployment/community/compose.evaluation.yaml --profile libremdb-review stop libremdb
```

### Existing schedules

```sh
systemctl list-timers 'utilibre-*' --no-pager
systemctl status utilibre-account-backup.service utilibre-monitor-alerts.service
node deployment/community/monitor-alerts.mjs
```

Daily guarded SearXNG updates run at 02:20 UTC with jitter, community snapshots
at 04:10, identity/expanded-account snapshots at 04:40, and the original service
backup at 08:20. Account snapshots briefly stop account applications for consistency,
restart only previously running services, then verify isolated restores.
Recovery state in `/run/utilibre-account-backup-state.json` is consumed by the
locked `ExecStopPost` recovery handler after interruption. Do not run backup scripts
concurrently outside their systemd locks.

The five-minute monitor watcher alerts after two consecutive failed/stale
observations; it also watches 10 GiB disk headroom, 5% inode headroom and 5% available
memory. Alerts repeat no more than every 12 hours for an unchanged condition;
recovery sends one notification. Mail goes from `no-reply@utilibre.org` to
`admin@utilibre.org` via the private relay with verified STARTTLS. It includes no
visitor queries or backup contents. It cannot independently detect whole-VM loss.

No automatic deletion policy was chosen for new snapshots. The backup guards
refuse new runs below 5 GiB free and notify the operator. Off-site storage still
needs an operator-provided destination; on-host snapshots are not disaster recovery.
The operator explicitly deferred off-site backup work on October 6; keep the
existing local schedules unchanged and do not purchase or provision storage.

## Recheck the new launches

```sh
node deployment/community/check-qr-offline.mjs
node deployment/community/check-new-readers.mjs --only=gram
node deployment/community/check-degoog.mjs
node deployment/community/check-mumble.mjs
# After the edge forwarding is applied; pins the private server certificate:
node deployment/community/check-mumble.mjs --public
# Optional outside-network test via a temporary local Tor SOCKS listener on9151:
node deployment/community/check-mumble.mjs --tor --voice
```

The default Mumble check verifies private-network TLS/protocol authentication.
`--public` additionally checks public-hostname TCP authentication, not UDP audio.
`--tor --voice` uses an independently routed TCP connection, pins the server's
LAN certificate before sending credentials, and verifies a valid Opus silence
packet through server loopback. No other participant hears the probe. This
passed on October 6. A direct connection from the application VM times out
despite working external TCP access, consistent with missing NAT reflection.
Reader tests make real upstream requests: do not loop them against
429/challenge responses. Rimgo's cooldown honors longer upstream Retry-After
values and otherwise waits ten minutes; its state is in memory.

Rimgo's previously stale public media URL was rechecked at 20:15 and 20:27 UTC:
`CF-Cache-Status: BYPASS`, `Cache-Control: no-store`, `Retry-After: 601`.
That cache problem is resolved for the tested URL, but the separate Imgur429
persists. Do not repeatedly retry or purge unrelated Utilibre hosts.

BreezeWiki p2 adds per-host rejection backoff (minimum ten minutes; longer
upstream Retry-After is respected), strips upstream challenge documents, and
sandboxes media responses. Six offline transport tests and a Racket response
integration test guard this behavior. This does not remove Fandom's image block.

DeGoog uses official 1.0.0 plus three pinned AGPL SearXNG engines. Run
`init-degoog.mjs` only for private credential initialization; run
`configure-degoog.mjs` to install/configure the curated engine set, then restart
the DeGoog service. The script preserves existing identity/credentials and saves
private pre-change settings. Its native privacy panel links the source archive.

## Mumble

Use a [Mumble client](https://www.mumble.info/downloads/), not a web browser:

- Server: `mumble.utilibre.org`
- Port: `64738`
- Password: request access from `admin@utilibre.org`; it is not published here.
- Certificate: self-signed. Compare its SHA-256 fingerprint before accepting it:
  `83:FA:6A:F8:C6:79:77:E0:FE:4E:DA:3B:1F:6C:83:D6:E5:B2:49:60:CA:96:9E:DD:87:FD:86:E1:4C:38:EB:01`

Public TCP authentication and voice fallback are verified. A credential-free
[GitHub-runner check](https://github.com/mycelibre/utilibre/actions/runs/37525936562)
also verified pinned TLS and rejection of invalid credentials. Its tagged UDP
packets (nonce `5574696cc9adeaa7`) reached the application VM and the Mumble
container at `172.29.92.10:64738` on October 6 at 20:22 UTC. Inbound UDP forwarding
is therefore verified. This is not an authenticated UDP audio/return-path test.
Public status pings stay disabled (`ALLOWPING=false`); missing unauthenticated
ping replies are not a firewall failure. No Mumble firewall change was needed.
The Kuma monitor remains an explicitly private TCP-listener check. The join
password is separate from the private SuperUser administrator password.

The manual `Mumble external connectivity` workflow sends no production secrets.
It emits three small UDP probes and reports **sent**, not **delivered**. To repeat,
capture only those tagged packets on the application VM while dispatching it:

```sh
timeout 60 tcpdump -i any -nn -XX 'udp dst port 64738 and udp[8:4] = 0 and udp[12:4] = 0x5574696c'
# Run separately while the capture is active:
gh workflow run mumble-external.yml
```

Compare the full eight-byte nonce printed by the workflow with the capture;
do not capture unrelated voice packets or treat a green send-only step as UDP
audio verification. The workflow is manual-only, not recurring monitoring.

En español: instalá un cliente de Mumble, conectate a `mumble.utilibre.org` en
el puerto `64738` y pedí la contraseña a `admin@utilibre.org`. Compará la huella
del certificado antes de aceptarlo. La voz por TCP está verificada; falta
verificar UDP desde una conexión externa. No compartás la contraseña de SuperUser.

## Privacy-preserving SEO (2026-10-07)

The follow-on [search and traffic foundation](seo-growth.md) records the current
20-page scope, task guides, measurement limits, source updates, launch drafts and
operating plan. The 16-page measurements below describe the earlier checkpoint.

The audit found a JavaScript-only catalog, no XML sitemap, relative server-side
language alternatives, and generic home-page search descriptions. The portal
now renders its existing public components in the initial HTML, including
launch links, upstream credit, help/privacy details and account restrictions.
This is the same content for visitors and crawlers, not bot-specific cloaking.
Catalog search and category navigation also work without JavaScript. The
existing layout, voseo, hidden Whisper configuration and service permissions
are unchanged. Status checks and the Redlib URL integration still need JS.

`PUBLIC_PORTAL_ORIGIN` supplies the canonical HTTPS origin; request Host and
forwarded-host headers cannot change it. Private previews and missing/invalid
origins fail closed to noindex and a crawl-disallow rule. Canonical URLs,
English/Spanish/x-default links, WebSite/WebPage JSON-LD and local-logo share
metadata agree between initial HTML and client navigation. No fake reviews,
ratings, usage claims or special AI-ranking markup are used. Known slash/alias
duplicates redirect; real 404s no longer claim to be the homepage.

`https://utilibre.org/sitemap.xml` contains 16 canonical public information pages
when donations are configured (14 otherwise). It does not enumerate searches,
operational endpoints, tool logins, pastes, polls, budgets, résumés or other
visitor documents. No dates are fabricated for `lastmod`. Search/filter URLs
carry noindex and no-store; private tool authentication is unchanged. The
sanitized public configuration is embedded as inert JSON, so initial rendering
needs no extra config request. API routes remain blocked from crawling and
carry noindex headers. Robots directives are not access control.

Rendering uses pinned ISC-licensed LinkeDOM 0.18.13, bundled only into the server
build outside the public directory. It executes no visitor scripts and makes
no network requests. Bundled dependency licenses are published at
`/legal/server-renderer-notices.txt`. HTML and gzip variants have a bounded,
30-second memory cache only for query-free known pages. Queries are not cached
or logged by the portal. CSP permits only the exact JSON-LD/config hashes, without
unsafe-inline/eval or external scripts. Fonts and share images remain local.
Build dependencies brace-expansion and source-map-js were updated to resolve
the two advisories found during the audit; npm audit then reported zero known
vulnerabilities, not a guarantee of complete security.

Verification: 69 unit tests; 58 desktop/mobile browser tests; TypeScript,
ESLint and the FOSS policy gate. A live-configuration staging browser check
confirmed 40 catalog records in each language with and without JavaScript,
functional search, no horizontal overflow, no console/CSP errors, and only
same-origin page requests. This is not a field Core Web Vitals certification.
The Impeccable refinement checks kept the existing visual system; its detector
reported no findings on the changed components.

Maintenance commands (from `portal/`):

```sh
npm test
npm run typecheck
npm run lint
npm run test:e2e -- --workers=3
npm run test:seo
npm run seo:indexnow -- --help  # explicit changed/removed URL selectors
npm run seo:indexnow -- --url https://utilibre.org/en/pdf-tools # dry run
```

The bounded SEO audit checks only the sitemap's allowlisted public pages.
IndexNow sends only explicitly selected new/changed/removed public URLs plus a public ownership-proof key; it never
sends visitor queries, logs, identifiers or private documents. Its acceptance
does not guarantee indexing. Do not repeatedly submit unchanged URLs. Google
Search Console and Bing Webmaster Tools account verification remain operator
tasks; DNS verification does not require installing visitor analytics. Submit
the sitemap there once verified. Do not use Google's restricted Indexing API
for these ordinary pages, buy links, or create thin keyword/AI doorway pages.

Cloudflare retained the previous `robots.txt` under a four-hour edge TTL at the
first live check. Purge only `https://utilibre.org/robots.txt`, or let it expire;
do not purge the whole site. New robots/sitemap responses request no-store.
While that confirmed cache is stale, the explicit IndexNow option
`--allow-unadvertised-sitemap` skips only the missing sitemap-advertisement
check and still validates every public page and privacy/security boundary.
The ordinary SEO audit continues to flag the stale robots file until resolved.

Resolved on October 7 after the operator's targeted purge: public robots.txt
returns `CF-Cache-Status: BYPASS` and `Cache-Control: no-store`; the strict live
audit passes all 16 pages. IndexNow accepted one notification for those 16 URLs
with HTTP 202 (ownership validation/indexing may still be pending). Final
English desktop and Spanish mobile checks show all 40 catalog records, working
no-JS search, eight same-origin resources, no extra config request and no
console/CSP errors. No layout overflow was observed. Existing service settings
are unchanged apart from the public portal-origin field and source revision;
Whisper remains disabled. These checks do not certify every hosted tool's
functionality or guarantee search placement.

Research checked against primary documentation on October 7, 2026:
[JavaScript and server rendering](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics),
[language alternatives](https://developers.google.com/search/docs/specialty/international/localized-versions),
[sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap),
[site-name structured data](https://developers.google.com/search/docs/appearance/site-names),
[structured-data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies),
[AI search features](https://developers.google.com/search/docs/appearance/ai-features),
[spam policies](https://developers.google.com/search/docs/essentials/spam-policies),
and [IndexNow](https://www.indexnow.org/documentation).
