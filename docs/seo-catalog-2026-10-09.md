# Catalog SEO verification — 9 October 2026

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
| IndexNow | After the 168-page gate, one selected notification for six new collection URLs plus EN/ES home/index pages returned HTTP 403. Public root proof file is 200, text/plain, 32 bytes and exactly matches the submitted key from this host. | **Unresolved engine-side key validation.** Official protocol defines 403 as invalid/unavailable proof. Check validation and any edge challenge for the exact proof URL; do not claim success or repeatedly submit. No cause established from the response alone. |
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
