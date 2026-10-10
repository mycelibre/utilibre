# Catalog SEO verification — 9 October 2026

## Owner-supplied replacement key — 10 October 2026, 16:07 UTC

At the owner's explicit request, the new UTF-8 proof is deployed at
`https://utilibre.org/fd4a2291b63244d09920bfd28d40f718.txt`. HTTPS GET returned
200 without redirection, `text/plain; charset=utf-8`, with the supplied
32-character key and a trailing newline. The previous proof remains available
for compatibility/rollback. `portal/scripts/submit-indexnow.mjs` now reads the
replacement file and derives the matching root `keyLocation`.

One notification containing only the EN/ES documents collection pages returned
**HTTP 202: received, ownership verification pending**. This is not completed
ownership verification or evidence of crawling, indexing or rankings. No second
notification was sent after that receipt. The prior 403 no longer occurred in
this attempt, but the response does not establish why the previous key failed.
No Cloudflare rule, crawler preference or Caddy configuration was changed. The
earlier observed crawler block and API-permission limitation are not claimed
resolved by this key replacement.

All 15 focused SEO/notification tests passed, including use of the real new key
file and refusal to submit when the public proof mismatches. The normal Docker
build, FOSS gate, client payload budget and Compose validation passed. After
deployment the container is healthy, the selected public pages passed targeted
canonical/indexability checks, and the sitemap still advertises 168 URLs. The
public configuration SHA-256 is unchanged:
`6f2c6c7f2dc2cde22cabe3f2aafb170054cf658da8f998fc6b4c21e2764089c4`.

Release: `public-utility-portal:0.1.0-indexnow-20261010`, image
`sha256:cf3f997b6c4643a6f7d8039174de1e957307043142e62bdd1ecc46938d6cad23`.
The isolated source snapshot is `/opt/utilibre/portal-indexnow-6oiCyqNT/source`;
pending unrelated status changes and export scripts were excluded. Runtime
changes are limited to adding the static proof file; frontend bundles and
application configuration are unchanged.

Rollback: restore `PORTAL_IMAGE=public-utility-portal:0.1.0-bing-20261010` in the
private `.env`, then run `docker compose up -d --no-deps --no-build portal`.
This removes the new proof from the served image and can interrupt its ownership
verification. Revert the submission helper's key-file selection as well if
deliberately returning to the previous proof. No user data or database migration
is involved. The previous source archive/index are retained with the release.

## IndexNow access investigation — 10 October 2026, 16:01 UTC

The latest controlled notification at 15:59 UTC returned **403
`UserForbiddedToAccessSite`**. Its two selected collection pages passed targeted
live canonical/indexability checks. The public ownership proof matched and the
168-URL sitemap returned 200 from this VM. These checks do not establish access
from the engine's validation or crawler infrastructure.

Owner-supplied Cloudflare events establish that **Block AI Search bots** blocked
both Googlebot and Bingbot on `/sitemap.xml` earlier today. They do not establish
which rule, if any, rejected the ownership-file fetch. Bot Fight Mode was already
off; disabling it was not a change made during this investigation.

The current IndexNow custom Skip rule covers only the proof file and skips
Browser Integrity Check, Security Level and Super Bot Fight Mode. It does not
skip the managed AI Search rule. Its matching-request logging remains disabled;
the separate ntfy rule is unchanged.

The retained token can read custom rules, but the bot-configuration read and a
**dry-run** of a proof-only managed-rule exception both returned Cloudflare
403/code 10000. No provider mutation or portal deployment was performed. The
dry-run narrowed matching to the exact proof path, GET/HEAD and no query, and
targeted only the AI Search managed rule identified in the supplied events.
Because authorization failed, neither API acceptance of that exception nor its
effectiveness has been verified. Do not report it as installed or validated.

The next dependency is authorized Cloudflare configuration access: check the
existing VM token's **Zone WAF Edit** and **Bot Management Edit** permissions and
resource scope for `utilibre.org`, or have the owner apply the reviewed change
in the dashboard. No global API key, audience analytics or new request logging
is required. Do not repeatedly submit unchanged notifications while this access
issue remains unresolved. A proof-only exception would not itself restore
crawling of the public pages; search policy must be reviewed separately while
preserving training preferences. No Bing `noarchive` directive was added.

Primary references checked today: [IndexNow response codes](https://www.indexnow.org/documentation),
[Cloudflare skip scope and logging](https://developers.cloudflare.com/waf/custom-rules/skip/options/),
[managed-rule exceptions](https://developers.cloudflare.com/ruleset-engine/managed-rulesets/create-exception/),
[API token permissions](https://developers.cloudflare.com/fundamentals/api/reference/permissions/),
and [mixed-use crawler controls](https://blog.cloudflare.com/accountable-mixed-use-ai-crawlers/).

## Bing ownership tag — 10 October 2026

At the owner's request, `portal/index.html` now retains the supplied
`msvalidate.01` ownership meta tag in the initial HTML head. This static proof
adds no script, cookie, visitor request or analytics integration. Live HTTPS
checks of `/`, `/en/` and `/es/` returned 200 with exactly one correct head tag;
the public configuration remains unchanged. Build, typecheck, targeted lint
and all eight SEO unit tests passed, including a new proof-placement regression.

Deployed `public-utility-portal:0.1.0-bing-20261010` from the isolated snapshot
`/opt/utilibre/portal-bing-45GSKw/source`, excluding unrelated pending status work.
The owner must still click **Verify** in their Bing Webmaster Tools account;
neither account verification nor resolution of IndexNow's rejection is claimed.
No new IndexNow notification was sent. Keep the tag after successful verification.

Rollback: restore `PORTAL_IMAGE=public-utility-portal:0.1.0-seo-20261010` in the
private `.env`, then `docker compose up -d --no-deps --no-build portal`. This also
removes the verification tag and may revoke Bing verification. Matching prior
source archive/index are preserved in the release directory. No Caddy change.

## Implemented follow-up — 10 October 2026

The mobile-loading correction is **deployed** as
`public-utility-portal:0.1.0-seo-20261010` (image
`sha256:8b8f22bf691ac35a5eb43166ab2aa153ec6c5360beb1a755bb96776a127f9e55`).
No service URLs, access controls, translations, local-toolkit format, crawler
preferences or visitor tracking changed. The existing layout, fonts and CSS
remain unchanged; optimization changes loading, not the visual design.

### Implementation and verification

- `guide-index.generated.json` contains navigation/SEO summaries derived from
  the canonical guide content by `scripts/build-guide-index.mjs`, automatically
  before development/build. A unit check prevents stale summaries and paths.
- Guide walkthroughs and the My Utilibre editor load only on their respective
  routes. The synchronous server renderer still supplies complete public HTML
  and matching metadata, including guide bodies and the complete guide index.
- `scripts/check-client-budget.mjs` runs in every build, with a 215,000-byte gzip
  ceiling for initial entry/preload JavaScript. Same-method before/after sizes:
  **323,924 → 194,604 bytes (39.9% smaller)**. This is a build regression guard,
  not a CDN compression or real-user performance claim. Vite's SSR-only dynamic
  import warnings are expected: server rendering intentionally keeps those
  modules together; the client build correctly separates them.
- Lint, typecheck, build, 113 isolated-release unit tests and 13 SEO/notification
  script tests passed. All 80 desktop/mobile-emulated browser tests passed,
  including every guide, examples, collections, search, localization and local
  import/export. Two unrelated pending status tests/code were excluded from the
  release. No dependency was added.
- Live: all **168** canonical pages passed the SEO gate. EN desktop / ES 390px
  homepage → collection → shared preview → explicit save and guide journeys
  passed, with no page errors, horizontal overflow or outside-origin requests.
  The initial homepage does not request guide/My Utilibre chunks; navigation
  requests them when needed. The 1200×800 practice image decoded successfully.
  Six layout captures are private in the release directory; the initial early
  collection capture was replaced after waiting for the image to decode.
- Runtime public configuration remained byte-identical (SHA-256
  `6f2c6c7f2dc2cde22cabe3f2aafb170054cf658da8f998fc6b4c21e2764089c4`).

Repeatable lab command: `cd portal && node scripts/check-mobile-loading.mjs --run`.
This explicitly performs six clean-profile page loads, not ongoing monitoring.
Chromium 151.0.7922.34, same 390×844 / 4× CPU / 150ms / 1.6Mbps conditions as
the baseline below; October 10 at 14:55 UTC. No field INP or real-phone claim.

| Page | Before median LCP | After LCP samples / median | After encoded response bytes | CLS |
| --- | --- | --- | --- | --- |
| Spanish homepage | 2772 ms | 2120 / 4108 / 2148; **2148 ms** | 317,247–317,324 | 0.00055 |
| Spanish documents collection | 3080 ms | 4416 / 2400 / 2404; **2404 ms** | 387,562–387,593 | 0.02924 |

Median improvement is approximately 22% on both sampled routes. The slower
outlier on each route is retained, not discarded: this tiny shared-infrastructure
sample does not establish a percentile, universal speed or field CWV pass.

### IndexNow: repaired diagnostics, external validation still unresolved

The script now reports a sanitized engine error code, distinguishes HTTP 202
pending ownership verification from completed acceptance, and never retries
automatically. A regression test ensures rejection does not disclose remote
message bodies or trigger retries.

The global endpoint returned **403 `UserForbiddedToAccessSite`**. The ownership
file is public HTTPS 200/text/plain and matches the 32-character key after
trimming its trailing newline. No account credential is involved in this proof.
The API token could read Cloudflare rules but its attempted narrow rule write
returned 403/code 10000; no rule was changed through that API call.

The owner then added the proof-only Skip rule in Cloudflare. A read-back confirms
it is enabled for host `utilibre.org` and the literal ownership-proof path,
skipping Browser Integrity Check, Security Level and Super Bot Fight Mode, with
**matching-request logging disabled**. The existing ntfy rule and its disabled
logging are unchanged. The owner's saved expression uses a wildcard operator
with no wildcard characters; it does not include the suggested GET/HEAD filter.
The target remains one public static file, not an application/account endpoint.

After this actual edge change, one retry for the ten selected changed pages
still returned 403. One diagnostic request to the
[documented Bing endpoint](https://www.indexnow.org/faq) returned the same code.
No successful notification, indexing or root cause is claimed. No more retries,
key rotation, broad security relaxation or crawler-policy changes were made.
At that checkpoint, the remaining dependency was **Bing Webmaster Tools
ownership/URL diagnostics**, or engine-side verification diagnostics. The later
Cloudflare events and configuration-access blocker above supersede that
assessment; an engine-side defect has not been established. Search Console
access is still needed to measure actual Google discovery. IndexNow is not a
prerequisite for ordinary crawling.

### Release and rollback

Isolated release source: `/opt/utilibre/portal-seo-TG8zAm/source`; pending status
work and unrelated export scripts were not packaged. Production container is
healthy. No new Caddy block or data migration is required.

Rollback: restore `PORTAL_IMAGE=public-utility-portal:0.1.0-collections-20261010`
in the private `.env`, then run `docker compose up -d --no-deps --no-build portal`.
Restore matching source archive/index from `previous-utilibre-integration.tar.gz`
and `previous-source-index.html` in that release directory if rolling back.
User data and local collections are untouched. The proof-file Cloudflare rule
is independent and can be disabled without modifying ntfy.

## Fresh research and live review — 10 October 2026

**Assessment:** the technical and useful-content foundation is sound; actual
indexing, visibility, clicks and citations remain unmeasured without the search
accounts. No percentage SEO gain or ranking score can be justified. The latest
collection/guide release and its bounded native workflows are recorded in
[the UX follow-up](ux-friction-2026-10-10.md#everyday-collections-and-easier-guide-entry--october-10).

| Area | Observed now | Assessment / next action |
| --- | --- | --- |
| Discovery and HTML | All 168 canonical sitemap URLs passed the read-only audit: 200, nonempty server-rendered content, distinct titles/descriptions, one canonical, reciprocal EN/ES/x-default, matching WebPage JSON-LD, strict CSP/no cookies. Both guide indexes expose complete links before JavaScript. | Applied. A successful request from this host is not verified Googlebot/Bingbot access or indexing. |
| URL boundaries | Collection trailing slash → 308 canonical; invented path → genuine 404/noindex; search/filter results → noindex,follow; status → noindex,nofollow. Public sitemap excludes those URLs and private app content. | Applied; preserve account protection and noindex boundaries. |
| People-first content | Three distinct situations, 3–4 canonical tools each, bilingual fictional editable examples, checked native outputs, constraints and explicit saving. Existing about/source/privacy/help links and AI-assistance disclosure remain. | Stronger reason to visit than a list of app names. Do not add generic guides merely to increase URL count. Existing guide maintenance remains necessary. |
| Crawler preferences | Live Cloudflare-managed robots permits generic crawling, explicitly blocks several training, AI-search and agent crawlers, including OAI-SearchBot and PerplexityBot. Googlebot and Bingbot are not explicitly disallowed in the observed file. | Preserve policy. It restricts AI discovery; no claim of full AI-search access. Effective Google Search generative-AI account controls are unknown. The web research tool also reported the site's robots exclusion, which is not proof of absence from ordinary search indexes. |
| Audit reliability | Old regex treated any named-bot `Disallow: /` as a universal ban. | Corrected operator-only checker to examine wildcard root rules; four focused tests plus eight notification safety tests pass. It is not a complete bot/WAF-access validator. No robots or Cloudflare setting changed. |
| IndexNow | After the 168-page gate, one selected notification for six new collection URLs plus EN/ES home/index pages returned HTTP 403. Public root proof file is 200, text/plain, 33 bytes (32-character key plus newline) and matches the submitted key after trimming. | **Unresolved ownership validation.** Official protocol defines 403 as invalid/unavailable proof. Later evidence confirms a Cloudflare sitemap block, not the precise proof-fetch failure; see the current investigation above. Do not claim success or repeatedly submit. |
| Mobile loading | Three clean-profile runs per URL under the conditions below. Home median LCP 2.772s; documents collection 3.080s. | Worth improving. Shared client bundle is ~1,009 KB minified/~326 KB gzip. Investigate deferring non-route guide/catalog data and avoiding unnecessary initial rerender, preserving SSR and text-fragment behavior. This review does not implement a speculative rewrite. |
| Structured data | WebSite/WebPage matches visible content; no fabricated reviews/ratings. | Appropriate baseline, not a rich-result guarantee. Software-app rich-result requirements include a genuine rating/review; do not fabricate one to qualify. Breadcrumbs are optional, not the priority over functionality/loading. |
| Freshness | Sitemap intentionally omits lastmod; substantive guide review dates are not refreshed merely by builds. | Valid. Accurate per-page significant-change dates could help later; false build timestamps would be worse. No priority/changefreq busywork. |
| Measurement and distribution | No Search Console/Bing account data in this environment; no visitor tracking introduced. Three finished EN/ES outreach drafts prepared, nothing sent. | Obtain account exports/access or inspect them as owner. Use impressions/clicks by relevant pages/queries, not a visitor analytics install. Qualitative feedback and small genuine sharing next; no backlink quota or forecast. |

### Bounded mobile laboratory observations

Linux Chromium, Pixel 7 emulation at 390×844, fresh browser context per run,
4× CPU slowdown, 150 ms configured latency, 1.6 Mbps download, three runs per
URL, settling 3.5 seconds after load. Browser PerformanceObserver values, **not
Lighthouse scores, real-user measurements, INP or a Core Web Vitals pass**.

| URL | LCP milliseconds (three runs) | Observed CLS | Encoded response bytes (range) |
| --- | --- | --- | --- |
| `/es/` | 2820 / 2772 / 2748 | 0.00055 | 454,053–454,092 |
| `/es/colecciones/documentos-y-tramites` | 3076 / 3080 / 3092 | 0.02924 | 524,402–524,417 |

No horizontal overflow in these viewports; one or two long tasks observed per
load. Shared infrastructure, browser emulation and CDN state limit generalization.
Google's good targets remain LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 at the 75th percentile
separately by device type. This sample supplies neither that population nor INP.

### Current primary-source log and decisions

Retrieved October 10, 2026; no competitor claims or search-volume estimates.

- [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide): descriptive titles, useful content, links, crawl access and proportionate promotion. Existing architecture satisfies those basics; none guarantee indexing.
- [Helpful, reliable content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content): intended audience, first-hand evidence and task completion. Fictional samples/native workflow checks supply concrete value; no invented popularity or experience.
- [October documentation updates](https://developers.google.com/search/updates) and [AI-content guidance, updated October 1](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content): fact-check visible copy and metadata; mass AI pages without added value risk scaled-content abuse. October 8's UGC-data program is not an integration needed for this static tool portal.
- [Google generative-AI optimization](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide): no special llms.txt, compulsory chunking, AI-only writing style or special schema needed. Do not add these as ranking tricks. Search-account settings/reports still need owner access.
- [Robots grouping rules](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec): named-agent groups are not blanket site rules; equal wildcard groups combine. Preserve deliberate exclusions rather than deleting them for a green checker.
- [Sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) and [localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions): canonical inventory, accurate significant-change lastmod when available, reciprocal language annotations. Current URLs and output checked, dates not invented.
- [SoftwareApplication feature requirements](https://developers.google.com/search/docs/appearance/structured-data/software-app): richer eligibility is distinct from generic Schema.org validity; real review/rating evidence would be necessary.
- [Web Vitals](https://web.dev/articles/vitals): current thresholds and field percentile; keep lab evidence separate.
- [Bing Webmaster Guidelines](https://www.bing.com/webmasters/help/bing-webmaster-guidelines-30fba23a): canonical sitemap, crawlable internal links, accurate freshness and meaningful IndexNow updates. Search-indexed official text was available; the direct documentation shell did not expose its full body to the research tool.
- [IndexNow protocol](https://www.indexnow.org/documentation): 403 means key verification failed; 202 would mean pending verification, not indexing. Today's notification failed and is recorded as such.

Priority after this release: resolve notification proof validation; inspect real
Search Console/Bing indexing and page/query reports; then reduce measured mobile
loading cost. AI crawler policy is a separate owner preference, not permission to
weaken privacy. No mass content expansion, tracker, new paid service or external
promotion was added during this research review.

## Earlier checkpoints (preserved)

The additions3 release is deployed. The live portal now has 102 catalog
records, including shortcuts, status and withdrawn entries; this is not a count
of independent applications. Its 65 practical guides have English and Spanish
versions. The sitemap contains 160 canonical pages: 130 guide pages and 30
static pages. Earlier checks below retain their original measured counts. Spanish remains voseo. This pass changes verification glue and
records, not guide bodies, policy wording or the queued voice pass.

## Change and evidence

The old public SEO audit stopped at 96 sitemap URLs, and its manually copied
allowlist omitted later guides plus the security and data-export pages. The
notification/audit helper now derives guide paths from the same maintained
registry used by routes, rendering and the sitemap. Static public paths remain
explicitly allowed. Query URLs, application routes, arbitrary guide paths and
other origins remain rejected. The notification limit remains 30 explicitly
selected URLs. No IndexNow notification or other outside message was sent.

The live, bounded read-only audit passed all 130 pages. It verifies one canonical
link, matching HTML language, unique nonempty titles and descriptions, initial
content, EN/ES/x-default reciprocal alternatives, matching WebPage structured
data, matching Open Graph URL, strict CSP and no application cookies or external
scripts. Both guide indexes link all 50 localized guides in their initial HTML.
The portal robots file advertises the sitemap and permits public documents and
assets to be crawled. There are no invented ratings or freshness timestamps.

A separate public-config/initial-HTML inventory check found all 82 enabled tool
entries other than the dedicated uptime entry, in both languages, with launch
links and mentions in the indexable software inventory. The full catalog view
contains 85 rows including three deliberately unavailable applications. The
filtered catalog is intentionally noindex,follow; guides and the software
inventory provide ordinary indexable discovery. Browser-only/private application
pages do not need indexing to be findable through the portal.

At 02:04 UTC the status API returned 76 operational observations, including all
four final additions. This is an HTTP/TCP readiness observation; the portal can
still display known qualifications such as Mumble's degraded state. Native
application workflows and restore scopes remain in their dated deployment
records, not inferred from these responses.

## Checks

- `node scripts/check-seo.mjs`: all 130 live pages passed. Private report:
  `/opt/utilibre/reports/new-services-20261009/seo-public-20261009.json`.
- Public bilingual inventory check: no missing enabled tool, launch link or
  software-inventory mention. Private report: `seo-discovery-20261009.json` in
  the same directory. It contains only public IDs and counts.
- `npx vitest run tests/unit/seo.test.ts tests/unit/routes.test.ts`: 13 passed,
  including complete guide coverage, reciprocal routes and server metadata.
- `node --test scripts/indexnow-selection.test.mjs`: eight passed, including
  fixed-origin/private-path rejection, explicit selection and no-network default.
  Its notification tests use in-memory stubs; they send nothing externally.
- `npm run typecheck` and targeted ESLint on changed scripts/tests passed.

The existing build/server metadata already produced correct public output;
no metadata/rendering runtime rewrite or new dependency was needed. A future
guide addition now participates automatically in the bounded checks. Removing
a guide that needs a notification requires explicitly retaining its reviewed
old public path in the helper until that removal is handled.

## Indexing boundaries and remaining facts

The [separate application sweep](instance-indexing-2026-10-09.md) covers all
22 additions. All entry pages returned 200 with noindex in an HTTP header or
HTML metadata. All 16 distinct hosts expose working security-file discovery.
Thirteen applications show a portal link; nine initial screens lack one, with
supported settings and unresolved upstream limitations recorded separately.

Three scoped gateway robots corrections are deployed. Calendar and quiz now
serve plaintext crawl instructions instead of their SPA fallback. The bookmarks
origin and a fresh public response permit crawling so its noindex header can be
seen; protected bookmarks and CalDAV still reject anonymous requests with 401.
At 02:07:22 UTC, the exact bookmarks `/robots.txt` remained a Cloudflare HIT of
the previous `Disallow: /` response (Age 452, max-age 14400). That cache object
would expire around 06:00 UTC if unchanged; other cache locations can differ.
Recheck the exact canonical URL after expiry or an authorized targeted purge.
No useful caching or account permission was changed to force the result.

Noindex is not confidentiality. Authentication, secret-link controls and the
application permissions continue to protect private content; this review does
not expose any user data to make a directive discoverable.

Search Console/Bing account settings, actual search-engine indexing, rankings,
traffic and real-user task completion were not measured. No tracker, analytics
collection, crawler impersonation or external submission was added. The queued
full copy pass follows this SEO checkpoint and must preserve factual limits.

Primary references checked for this review:
[canonical consistency](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls),
[reciprocal language alternatives](https://developers.google.com/search/docs/specialty/international/localized-versions),
and [crawl access for noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing).
These describe search-engine behavior, not a guarantee of indexing this site.

## Native2 follow-up

Newsletter launch adds its EN/ES guide through the existing registry. The live
9 October read-only audit passed all 132 canonical pages, with reciprocal language
links, source content and metadata. The new catalog card is searchable with and
without JavaScript. Twelve public EN/ES browser checks cover search, the new guide
and the revised your-data header. The status API returns 77 observations, including
an operational newsletter HTTP check through the private Caddy edge. This HTTP
check does not measure SMTP delivery. The owner separately confirmed external
browser access and a controlled routed newsletter message. No outside SEO
submission, tracking or cache-policy change was made.

## Additions1 follow-up

The One File Core, TiddlyWiki, Moocup, Rustpad, AutoRedact, Gravity, Knit and
NewTon have live catalog entries and EN/ES guides. The 9 October public audit
passed all 148 canonical pages. All 59 guides passed the existing desktop/mobile
EN/ES browser checks; account-filter checks also passed. Type checking, lint and
95 unit tests passed. The public audit is recorded at
`/opt/utilibre/reports/native-followup-20261009/seo-additions1.json`.

No outside SEO notification was sent. These additions retain the existing
indexable portal/guide and noindex application boundaries. The earlier bookmarks
cache issue was resolved by the owner's targeted purge and the canonical URL was
verified at03:02 UTC; the historic cache observation above is not an open blocker.

## Additions2 follow-up

Kokoro Web is public and enabled. Family Chess, Donetick, Beaver and Projects are installed privately with completed native checks; their EN/ES guides and catalog notes are published with explicit maintenance notices and no premature launch controls. The complete public audit passed 158 canonical pages. Build/typecheck/lint,95 unit checks and6 browser cases covering all 64 guides in EN/ES desktop/mobile passed. No external SEO submission or analytics was added.

The additions2 public mobile check covered20 new localized guide views with and without JavaScript, plus20 catalog checks. Kokoro has a working launch link; the four pending stateful services appear in the pilots view without launch links. No horizontal overflow, placeholder text or browser errors were found. Private evidence: `native-followup-20261009/additions2-public-mobile-nojs.json`. The public integration archive checksum matched the local published archive, and both new account-service source downloads matched their recorded SHA-256 values.

## Additions3 follow-up

TRIP adds one reviewed EN/ES guide and a maintenance catalog entry after its private production workflow, provider-boundary and recovery checks. No public launch is advertised before the separate edge is verified. All 160 public SEO checks,97 unit tests and6 browser cases covering all 65 guides in both languages passed. The exact-target status configuration is ready for the five pending stateful hosts but does not probe them before they are enabled. The live 86 enabled entries each have a status observation. Source downloads and patch reconstruction are verified separately from public application readiness.

## Public-pilots activation, 9 October

TRIP, Family Chess, Projects, Donetick and Beaver now have public native workflow evidence and portal launch links, bringing enabled entries to91. Account restrictions remain in their cards and guides. PrivateBin's software row now marks its small native discovery-template adaptation. Chhoto's version is7.8.3-p3 and TRIP is1.50.1-p2, matching the rendering fixes and published sources.

The portal build,97 unit tests and six guide/browser cases passed. The public audit still passes all160 canonical pages; the bilingual registry still contains65 guides. Public EN desktop and ES mobile catalog checks found all five expected launch URLs without page errors or horizontal overflow. A targeted12-test status suite verifies Beaver's exact login endpoint: the root's ordinary307 is not an outage. Portal status observation is separate from the native login, permission, export and cleanup evidence recorded per service. No search-engine notification was sent.
