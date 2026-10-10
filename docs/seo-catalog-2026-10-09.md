# Catalog SEO verification — 9 October 2026

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
