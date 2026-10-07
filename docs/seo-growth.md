# Utilibre search and traffic foundation

Research and implementation baseline: 7 October 2026. This is the operator
handoff for making existing tools easier to find and use, not a forecast of
rankings or donations. The initial focus is two useful bilingual task guides,
tested examples, safe discovery, and one manageable feedback channel. The
technical deployment details remain in [expanded operations](expanded-operations.md).

## Scope and success

### October 7 browser tool release

The four new hosted applications are ZIP Manager, RAWGraphs, AudioMass and
miniPaint. Six direct OmniTools task links improve discovery without adding
six deployments or thin landing pages. The catalog remains server-rendered in
English and Spanish; each task has a specific name, description, processing
label, parent-service gate and direct localized launch link where supported.
RAWGraphs/AudioMass remain English-only; some native Spanish labels in the
other upstream applications are incomplete. No new traffic or ranking claim
is implied by adding tools.

| Visitor need | Destination and useful action | Evidence and measurement |
| --- | --- | --- |
| Open/create a ZIP | Bilingual catalog → `zip.utilibre.org`; extract or download archive | Exact-byte create/extract fixture; real usage unmeasured |
| Chart CSV/spreadsheet data | Catalog → `charts.utilibre.org`; map columns and export SVG | Two-row CSV-to-bar-chart download fixture; larger-screen guidance |
| Edit a recording | Catalog → `audio.utilibre.org`; select/edit and export audio | Three-second input to one-second WAV fixture; multitrack labeled beta |
| Edit images with layers | Catalog → `paint.utilibre.org`; edit and export PNG/project | PNG input/output fixture; native language setting |
| Backgrounds, compression, annotations, clips, CSV and duplicate lines | Specific searchable catalog entries → existing OmniTools routes | Six synthetic output checks; not six new keyword pages or claimed search volumes |

Home descriptions now reflect images, audio, charts and ZIP files. Existing
canonical/hreflang rules and filtered-page noindex remain unchanged. The portal
sitemap still contains **20 meaningful canonical pages**; each new application
has its own root-only sitemap, robots declaration, one canonical and matching
Open Graph URL. Source downloads are crawlable with `X-Robots-Tag: noindex`;
missing application paths return real 404s. Public tool homepages do not expose
uploaded/result URLs because these four applications process files locally.

No analytics dependency or completion beacon was added. Success remains a
verified useful result; synthetic tests are not visitor conversions. Search
Console/Bing access and outcome reports remain unavailable. The operator can
add the four application sitemaps to an existing verified domain property;
no separate guessed verification credential has been installed. Existing
distribution drafts can demonstrate a ZIP round trip or chart export, but
no new promotional posts or bulk directory submissions are authorized here.

Maintenance evidence and repeatable checks are in
[the toolbox review](toolbox-review.md#browser-tools-added-on-october-7).
The existing 30/60/90-day plan remains: review observed queries and feedback
before expanding pages, rather than manufacturing pages for every task.

Production is `https://utilibre.org`; repository is
`https://github.com/mycelibre/utilibre`, working directory
`/home/ubuntu/freetools`. The project independently hosts free software tools,
with voluntary Liberapay donations and no donor privileges. The portal uses
TypeScript, Vite and a small Node server in Docker; HTTPS/Caddy runs on a separate
VM behind Cloudflare. Existing publication authority covers the portal and
repository; new community posts below are drafts, not authorized submissions.

Audience assumption: ordinary Spanish- and English-speaking people completing
document and QR tasks. Guatemalan voseo is established; geographic demand is
unknown, not assumed to be US-centric or limited to Guatemala. No advertising
budget or additional staffing was supplied. Use existing infrastructure, no new
paid service, no extra application stack, and a proposed weekly operator review.

Primary success is **a useful downloaded result that the person verifies**:
a correctly ordered merged PDF, a searchable OCR document checked against its
original, or a downloaded QR that decodes to the intended content. Opening a tool
is not completion. Secondary outcomes are useful feedback, repeat use when the
task recurs, and optional support. Real visitor completions and repeat use are
currently unmeasured; synthetic checks are quality gates, not conversions.

The strongest available evidence is working software, reviewable integration
source, synthetic workflow tests, bilingual instructions and explicit data-flow
limits. These support a practical guide; they do not prove superior privacy,
performance or reliability over every alternative.

### First implementation acceptance criteria

- Preserve existing URLs, privacy commitments, voseo, design and account gates.
  Whisper remains hidden by the operator's choice.
- Publish two substantive guides in both languages, with localized tool links,
  original practice material, upstream credit, limitations and result checks.
- Make all four pages accessible in initial HTML and without JavaScript, with
  unique metadata, reciprocal hreflang, correct canonicals and sitemap entries.
- Keep practice PDFs out of indexing. No account, result, search/filter or
  private-content URLs enter the sitemap or IndexNow notifications.
- Validate actual PDF/QR tasks with synthetic data and check mobile, keyboard,
  downloads, deep links, missing pages and no unexpected portal connections.
- Deliver an offline aggregate reporting tool, researched distribution drafts
  and exact account dependencies without installing behavioral tracking.

## Baseline and prioritized audit

The inherited SEO release was already live: all 16 sitemap routes passed a
fresh public HTTP/initial-HTML audit on October 7. It supplies SSR, absolute
canonicals, language alternatives, WebSite/WebPage markup, real 404s and a public
IndexNow proof. The previous notification returned 202, which means key
validation pending, **not indexed**. The catalog displayed 40 records; this is
inventory, not usage or proof of every tool's current functionality.

Search Console/Bing account access, indexing reports, impressions, clicks,
referrals, visits, completions, donations attributable to traffic, repeat usage
and field Web Vitals are **unavailable**, not zero. Existing capacity reports
describe synthetic requests, not concurrent real users or search demand.

| Priority and issue | Evidence and affected surface | Consequence and fix | Effort and confidence | Validation |
| --- | --- | --- | --- | --- |
| P0 PDF worker cache | Normal public merger failed; cached `pdf.worker-C317IdDw.js` had conflicting COEP headers, unlike backend | Cannot complete primary task; purge exact stale worker, retain security policy | Small; high causal confidence | Fresh normal browser merge and OCR; no cache bypass |
| P1 No task destinations | Home catalog plus policy pages; no standalone PDF/QR instructions | Hard to understand task differences or link directly to useful help; add four localized guide URLs | Medium; high usefulness confidence, demand scale unknown | SSR, output checks, navigation and language tests |
| P1 Missing search ownership/data | No authenticated Search Console/Bing access in this session | Cannot diagnose observed indexing or queries; operator verifies properties and supplies reports | Small owner step; high | Account inspection and dated exports, not DNS guessing |
| P1 Blanket ongoing IndexNow selection | Old helper submitted every sitemap URL | Unnecessary unchanged notifications; require explicit changed/removed canonical URLs | Small; high | Mocked safety tests and one scoped live receipt |
| P2 Privacy limits on measurement | No behavioral analytics is an established decision | Cannot count real task completion automatically; retain privacy, validate offline aggregates and separate synthetic outcomes | Small; high | Null/zero/provenance, weighted CTR and raw-field rejection tests |
| P2 Distribution and demand unknown | No supplied audience/traffic evidence | Technical eligibility alone will not bring users; one disclosed, rules-compliant feedback discussion | Ongoing; hypothesis | Relevant feedback and observed search changes, not link counts |

The present constraints coexist: a real task blocker, weak task-specific
explanation, unproven demand/differentiation, and insufficient distribution/data.
More generic catalog pages would not establish demand. No broad service
redeployment or claim that all hosted tools work is part of this release.

Coverage: audit every canonical portal route (16 before, 20 after), all four new
guide routes, representative filtered/unknown/private routes, and actual PDF/QR
flows. Existing regression tests cover bilingual catalog, account gates and
hidden services. No recursive subdomain crawl, authenticated-document indexing
test, physical phone camera, printer or complete matrix of PDF formats is claimed.

## Intent and page map

Searches and result pages were inspected on October 7 in English and Spanish,
without a controlled country/device SERP or paid keyword database. Result
presence supports recognizable intent, not search volume, rank difficulty or
forecast. No Trends/Keyword Planner estimate is used.

| Need and audience | Representative query family and result format | Destination and next action | Real advantage and remaining uncertainty |
| --- | --- | --- | --- |
| Combine documents; students/office users | merge PDF without uploading; unir PDF sin subir archivos. Direct tools with short instructions | `/en/pdf-tools`, `/es/herramientas-pdf`, section `#merge`; merge then check two-page A/B result | Localized launch and reproducible synthetic practice PDFs; ordinary devices/large files need further evidence |
| Make scans searchable; document users | OCR PDF Spanish English; extraer texto de PDF escaneado. Tool plus language/output explanation | Same PDF page, `#ocr`; select document language, recognize, download and check text | Explains merge versus OCR, selectable text, CDN downloads and review limits; no handwriting accuracy guarantee |
| Link/Wi-Fi QR; households, clubs and venues | WiFi QR code no signup; crear código QR WiFi sin registro. Generator plus examples | `/en/qr-codes`, `/es/codigos-qr`; choose app, download and test | Two real apps, tool-specific steps, password disclosure, static-code versus destination lifetime; physical print/camera testing remains user-specific |
| File conversion; broad everyday users | convert files in browser; convertir archivos en navegador. Format-specific tools | Existing VERT catalog entry; defer separate page | Browser conversion exists but remote video is disabled; validate specific input/output pairs before publishing a broad claim |

PDF merge and OCR are distinct operations, presented as clearly separated
sections in one initial chooser, not canonicalized together from competing
pages. Split them later only if observed tasks/queries and sufficient distinct
content justify it. Do not create a page for each synonym or every catalog item.

Representative competing pages inspected:

- [UnboundPDF merger](https://unboundpdf.com/tools/merge-pdf/) and
  [Reflect unir PDF](https://reflect.com.ar/herramientas/unir-pdf/) already stress
  browser-local/no-account use. Reflect explains order and recovery. Those
  slogans alone are not a distinctive proposition.
- [OléPDF OCR](https://olepdf.com/ocr-pdf/) and
  [PDFlora OCR in Spanish](https://florapdf.com/es/ocr-pdf) explain searchable
  output, scans versus selectable text and limits. Their features/guarantees
  are not evidence of BentoPDF's capabilities.
- [ToolyLab QR](https://toolylab.com/es/qr-generator) and
  [Qraftt Wi-Fi QR](https://www.qraftt.com/wifi-qr-code-generator) address specific
  use cases. Utilibre adds its own verified deployment notes and bilingual help,
  not a claim that these competitors lack privacy or useful features.

Each guide has one H1, distinct title/description, direct launches before the
detailed instructions, incoming homepage links, related-guide links, catalog
return, privacy/about references and upstream source credit. Text and links
render without interaction. Examples are explicitly synthetic. The existing
Field Ledger components, local fonts and light/dark styles are retained.

Maintenance owner: Utilibre operator. Recheck guide steps and data flows after
upstream/configuration changes and monthly while actively promoting them.
Change the visible review date only after substantive review. Generated example
PDFs are deterministic, reproducible from source and contain no personal data;
their responses carry noindex. They are practice resources, not SEO landing pages.

## Technical and publication decisions

The portal now has 20 canonical sitemap pages when support is configured. No
lastmod is invented. Essential assets remain crawlable; search/filter URLs have
noindex while private content remains protected by real access controls. The
default public crawler policy is preserved, including existing training/search
preferences; this task does not silently change publisher consent.
OAI-SearchBot and GPTBot currently inherit the wildcard public crawl policy;
there is no explicit GPTBot training opt-out. Search inclusion and training
preference are separate owner choices. Genuine bot access through the CDN has
not been established merely by using a bot-like request header.

Structured data remains accurate WebSite/WebPage metadata. No fabricated
SoftwareApplication ratings, FAQ/HowTo rich-result promises, hidden AI prompts,
llms.txt ranking claims or manufactured citations are added. A logo social card
identifies this directory/guide publisher; it is not represented as a tool result.

IndexNow requires an explicit selection. Its dry run audits public pages and
proof, and submits nothing. New/changed URLs must be reviewed canonical pages;
removed URLs must leave the sitemap and return an unredirected 404/410. No empty
selection makes requests. A receipt never proves indexing. Example after a
meaningful PDF-guide change, from `portal/`:

```sh
npm run seo:indexnow -- --urls https://utilibre.org/en/pdf-tools,https://utilibre.org/es/herramientas-pdf
# Only after reviewing the dry run, repeat with --submit once.
```

Public quality gate: verify each advertised operation and limitation; reconcile
EN/ES facts; test disabled-service behavior; check outputs with synthetic data;
review links, source credit, security/network behavior and mobile layout. Fail
publication for a broken primary task or unsupported claim. AI-assisted text is
reviewed against actual application behavior; no fictitious authors or reviews.

## Measurement without visitor tracking

No collector, analytics script, cookies, fingerprinting, extra access logging or
telemetry endpoint is installed. An SEO mandate does not override the no-tracking
decision. There is no cross-subdomain behavioral identifier or uploaded-document
event payload. Portal click counts would not establish tool success in any case.

The local `scripts/report-search-aggregates.mjs` accepts deliberately supplied
aggregate JSON counts, validates them and prints a report. It makes no network
requests. It rejects unknown/raw-data fields; it is **not** a scrubber for raw
queries, private URLs, filenames, IP addresses, form contents or search exports.
Use `--example` for an all-null template and `--help` for the exact schema.

```sh
node scripts/report-search-aggregates.mjs --example
node scripts/report-search-aggregates.mjs --help
node scripts/report-search-aggregates.mjs /path/to/reviewed-aggregate-counts.json
node --test scripts/report-search-aggregates.test.mjs portal/scripts/indexnow-selection.test.mjs
```

Definitions and reporting procedure:

1. **Eligibility/indexing:** weekly public SEO audit plus Search Console/Bing URL
   inspection for home and four guides. Record observed selected canonical and
   inspection date only from the engine's report. Successful HTTP tests do not
   establish Googlebot/CDN access or Google-selected canonical.
2. **Search visibility:** compare successive complete 28-day windows in each
   account, retaining source timezone and preliminary/reporting-lag notes. Review
   pages, languages, country and device; distinguish branded Utilibre/Mycelibre
   terms from nonbranded tasks manually. Upstream names like BentoPDF are not
   automatically Utilibre-branded queries. Suppressed/unreturned rows stay unknown.
3. **Counts/CTR:** provide aggregate impressions/clicks, not raw queries. CTR is
   summed clicks divided by summed impressions, never average row CTR. The CLI
   combines only matching windows/timezones/scopes. Engine counts are not unique
   people; do not force Search Console and analytics totals to match. The compact
   CLI has property/guide scopes, not a full query, country or per-URL dashboard;
   do those segmented reviews in the source account.
4. **AI visibility:** Google generative-AI impressions and Bing AI citations are
   separate counts, not visits, AI CTR or revenue. The Google report can be absent
   for insufficient data. Its unavailable `~`/`-` display values can export as zero:
   the CLI requires provenance and normalizes ambiguous export zeros to null.
   Bing's sample and Citation Share are not complete traffic or market share.
5. **Primary outcome:** define `tool_result_verified` as one completed task whose
   downloaded output the person checks. No real-user event is emitted today.
   For future explicitly approved aggregate evidence, record the task definition,
   deduplication, test/bot exclusion and denominator. `completions / visits` is
   an event ratio only when both counts have matching coverage; otherwise null.
   Operator/synthetic checks must never be mixed with visitor conversions.
6. **Referral/social/organic/AI visits and return use:** unavailable without an
   approved source. Preserve incoming attribution parameters in the browser URL
   while canonicalizing the clean page; this does not collect them. ChatGPT may
   add `utm_source=chatgpt.com`; no existing source here counts those visits.
   Use voluntary public feedback as qualitative evidence, not a fabricated funnel.
7. **Performance:** repeated lab checks are diagnostics. Current good field
   thresholds are p75 LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1 separately for mobile and
   desktop. No field dataset or field pass is established; Lighthouse TBT is not INP.

Keep aggregate reports outside public source, with only reviewed summaries in
release notes. Note dates, filters, timezone, row/export limits, suppressed values
and sampling before comparison. Search Console UI exports can cap at 1,000 rows;
paginate supported APIs when used or label extracts partial. No API was called.
Annotate this release; do not infer causality from a subsequent traffic change.

## First distribution packet

No new posts were sent. Prior public-instance work stays in
[public instance submissions](public-instance-submissions.md); do not duplicate
existing PrivateBin listing, Redlib PR 117 or SearXNG request 941. The initial
format is one disclosed project-feedback discussion, followed by personal replies
and a substantive update only if useful. Recheck rules on the posting day.

### First choice r SideProject

Destination: [r/SideProject](https://old.reddit.com/r/SideProject/).
Its observed sidebar invites project feedback and specifies
“Project name - short description” titles. The JSON rules endpoint returned 403;
sidebar inspection is not exhaustive moderator approval. Requires the owner's
eligible Reddit account and explicit posting approval. Assets: four live guide
links, repository source, optional current non-sensitive screenshot. Measure
specific problems reported and voluntarily described successful tasks; referral
traffic remains unavailable without an approved measurement source.

Ready-to-review title: **Utilibre - English and Spanish guides to browser-based PDF and QR tools**

Draft:

> I operate Utilibre, which hosts independently developed open-source applications.
> BentoPDF, Mini QR and Offline QR do the tool work; my contribution is hosting,
> configuration and the bilingual interface.
>
> I added two task pages: combining PDFs or recognizing text in scans, and
> creating QR codes for links or Wi-Fi.
>
> PDF/OCR: https://utilibre.org/en/pdf-tools
>
> QR: https://utilibre.org/en/qr-codes
>
> Selected documents and QR contents are processed in the browser. OCR may
> download components from external providers; local processing does not mean
> zero network activity. The guides explain limits and how to check the result.
>
> Is the choice between merging and OCR clear? If you read Spanish, does
> https://utilibre.org/es/herramientas-pdf make the same choices understandable?

### Conditional second choice r webdev

Destination: [r/webdev](https://old.reddit.com/r/webdev/), **Showoff Saturday only**.
Observed sidebar requires 9:1 participation and no commercial solicitation.
Only proceed if the owner already meets participation rules; no manufactured
engagement. This is an alternative, not simultaneous blanket cross-posting.
Needs owner account, rule recheck and approval. Measure actionable UI feedback,
not backlink totals. No donation pitch.

Ready-to-review title: **Showoff Saturday: a bilingual task chooser for hosted PDF and QR applications**

Draft:

> I maintain Utilibre's portal and deployments. The underlying applications are
> BentoPDF, Mini QR and Offline QR, with their source projects credited.
>
> The interface problem is choosing the right task without learning every app
> name. The PDF page separates merging from making a scan searchable; the QR
> page explains which app to use and how to check a result.
>
> https://utilibre.org/en/pdf-tools
>
> https://utilibre.org/es/herramientas-pdf
>
> https://utilibre.org/en/qr-codes
>
> Source: https://github.com/mycelibre/utilibre
>
> I'd appreciate specific feedback on keyboard navigation, Spanish wrapping and
> whether the processing explanation is clear before opening a tool.

### Screened alternatives and rules

- [Privacy Guides Showcase](https://discuss.privacyguides.net/c/privacy/showcase/13):
  [category rules](https://discuss.privacyguides.net/t/about-the-project-showcase-category/114)
  require one project thread and affiliation/moderator review.
  [General rules](https://discuss.privacyguides.net/guidelines) prohibit AI-generated
  posts. **No paste-ready AI draft provided.** Owner can independently write from
  the verified facts above, disclosing operation and external component downloads.
- [Hacker News](https://news.ycombinator.com/submit):
  [guidelines](https://news.ycombinator.com/newsguidelines.html) prohibit generated
  or AI-edited text, vote solicitation and promotional primary use.
  [Show HN](https://news.ycombinator.com/showhn.html) excludes lists/reading material;
  do not label a directory/guide launch Show HN automatically. Human-authored only.
- [DEV AI policy](https://dev.to/guidelines-for-ai-assisted-articles-on-dev)
  restricts promotional AI-assisted articles; no AI launch draft for DEV.
  Avoid generic directories, paid links, automated comments and backlink quotas.

Reason to reference the resource: reusable synthetic PDF exercises and specific
result-check instructions for bilingual teaching/support, not an exchange of
links. Return path: bookmark the relevant guide or direct tool; download and keep
the result. No newsletter or intrusive capture mechanism is added without a real
publishing commitment.

## Owner tasks and operating schedule

Before interpreting visibility, the owner should:

1. Verify the `utilibre.org` Domain property in Google Search Console using its
   **account-generated** DNS TXT token. Do not invent a token; an existing verified
   property should be reused. Submit `https://utilibre.org/sitemap.xml` and inspect
   the four guide URLs. Set up/reuse Bing Webmaster Tools similarly and submit
   the sitemap there. These do not require visitor analytics.
2. In Search Console **Settings → Search generative AI**, inspect the effective
   value and inheritance for the domain and relevant URL-prefix properties.
   Record the deliberate choice. It is separate from Google-Extended training
   controls. This session could not inspect the account setting.
3. Review initial complete search reports when available; supply only reviewed
   aggregate counts and limitations. Do not translate absent reports to zeros.
4. Choose one distribution draft, check account eligibility/rules and authorize
   posting, or write independently for human-only communities. No third party
   has been contacted by this release.
5. Try the guides on a real phone and a printed QR; report the task/browser/error,
   not confidential documents. Existing backup work remains separately deferred
   by the owner; this task does not open account registrations.

| Window | Owner and concrete outputs | Dependencies and measures |
| --- | --- | --- |
| Days 1–30 | Operator verifies search properties, runs weekly route/task checks, approves one feedback post and records substantive feedback; maintainer corrects demonstrated defects | Account access, posting permission; valid public pages, successful synthetic tasks, source-verified indexing where available; no numeric traffic promise |
| Days 31–60 | Operator compares complete 28-day reports by guide/language/device, reviews query fit and revises instructions; maintainer tests one specific VERT workflow if audience evidence supports it | Sufficient unsuppressed data or qualitative feedback; relevant queries and task friction, not raw impression growth |
| Days 61–90 | Operator retains the useful channel, refreshes changed facts, expands only proven task themes; maintainer resolves demonstrated overlap and rechecks performance/security after releases | Evidence of benefit and maintenance capacity; verified outcomes, corrections and sustainable workload; no automatic content quota |

Diagnostic order: no observed indexing → access/discovery/canonical/content and
reporting delay; indexed with little visibility → demand/relevance/differentiation
and competition; impressions without relevant visits → intent/result context and
titles; visits without useful actions → tool errors, usefulness, trust and flow;
useful actions without returns → first establish whether the task should recur.
No result should be attributed to an algorithm or one edit without supporting evidence.

## Source log

Primary sources fetched on 7 October 2026; dates below identify material changes,
not invented freshness. Competitor/community sources above are evidence, not
authority over project rules. OpenAI Docs guided the separate crawler checks;
Impeccable guided existing-component, bilingual/mobile refinements; Write Page
guided the repository handoff's factual and editorial review.

| Decision | Current primary reference and qualification |
| --- | --- |
| Useful content and AI visibility | [Google AI optimization](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), updated July 10 2026: ordinary eligibility plus Search generative AI control; no special chunking/schema/llms.txt tactic |
| Review AI-assisted claims | [Google generative content](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content), updated October 1 2026; [third-party advice](https://developers.google.com/search/docs/fundamentals/third-party-seo), June 5 2026: external scores are not internal Google data |
| AI setting ownership | [Search generative AI control](https://support.google.com/webmasters/answer/16908024?hl=en), worldwide August 31 2026; account inheritance must be inspected |
| AI reporting limits | [Google AI report](https://support.google.com/webmasters/answer/16984139?hl=en), [June launch](https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports), [September 24 multimodal update](https://developers.google.com/search/blog/2026/09/web-multimodal-in-sc): impressions, not a dedicated AI-click/revenue report |
| Current structured features | [Gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery), [changelog](https://developers.google.com/search/updates): FAQ ended May 7 2026; HowTo also retired; [software requirements](https://developers.google.com/search/docs/appearance/structured-data/software-app) do not justify invented ratings |
| Crawl/URL consistency | [Canonicals](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [JavaScript](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): no guaranteed indexing, accurate or omitted lastmod |
| Change notifications | [IndexNow documentation](https://www.indexnow.org/documentation), [FAQ](https://www.indexnow.org/faq): meaningful new/changed/removed URLs; 202 is key-validation pending |
| Bing controls and reporting | [Guidelines](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a), [AI Help](https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c), [June 16 update](https://blogs.bing.com/search/2026/6/New-AI-Visibility-Insights-in-Bing-Webmaster-Tools-Intents-Topics-Citation-Share-Compare/): sampled citations/share are not visits; noarchive/nocache have distinct content-use consequences. Help pages required browser rendering |
| ChatGPT search versus training | [OpenAI crawlers](https://developers.openai.com/api/docs/bots), [publisher FAQ](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq): OAI-SearchBot and GPTBot independent; fake user-agent checks do not prove genuine crawler access |
| Performance definitions | [Web Vitals](https://web.dev/articles/vitals): field p75 by device, laboratory diagnostics are not a field pass |

## Validation and release checkpoint

Completed locally: four guide routes, generated bilingual PDF samples, shared
SSR metadata/sitemap integration, guide links, strict PDF noindex, scoped IndexNow
and offline aggregate reporting. 70 unit tests, 60 desktop/mobile browser tests
and 16 reporting/notification tests pass. No new package dependency is needed.
Repository typecheck and lint pass. Visual inspection of the production build
confirmed the inherited layout, readable EN/ES guides and no document overflow.
The new text stays around a 70-character measure on desktop and wraps on mobile.
No-JavaScript guide content and PDF actions work. The detector reported no findings.

Before this release the bounded live audit passed all 16 original canonical
routes. QR Tools passed public generation, decode, PNG/SVG/PDF, Spanish mobile,
synthetic-camera and offline-reload checks, with no external requests observed.
An intentional offline check emitted a disconnected-resource console diagnostic;
it is not proof of an online failure. After the owner's targeted Cloudflare purge,
ordinary public PDF requests passed at 12:59:53 UTC: exact two-page A/B merge,
raster-only English/Spanish recognition and searchable one-page downloads. No
failed network requests or application uploads were observed. Existing jsDelivr
and githack downloads remain disclosed. Some cached ordinary scripts retain old
duplicate policy headers but did not block these flows; actual workers now have
the correct policies. No security settings were relaxed.

Reusable tests: `node deployment/toolbox/check-pdf-tools.mjs` and
`node deployment/community/check-qr-offline.mjs`. The PDF check's optional
`--diagnostic-fresh-workers` output is explicitly **not** a production pass.

### Final production checkpoint

Verified on 7 October 2026, completed by 13:13 UTC:

- Deployed source revision `a6690d1625f18e2eb1978e5a7ccdd956d0797515`, following
  the guide/reporting commit `21adc2d`. Both are pushed to GitHub. Only the portal
  container was rebuilt/restarted; no upstream application or security policy
  changed. Final documentation is a subsequent docs-only commit.
- All 20 public sitemap URLs pass the live audit, including canonicals, unique
  metadata, reciprocal language links, initial content, schema and CSP. Four
  practice PDFs return correct content/type and noindex. Known trailing-slash
  duplicates redirect 308; unknown pages and internal build files return 404.
- All four guides have two real public launch links, localized PDF/QR Tools
  destinations, no console errors or horizontal overflow at tested 1440px/390px
  sizes, and only same-origin portal requests. Two representative no-JS routes
  also retain both launch actions. Legitimate incoming attribution survives;
  the canonical remains query-free.
- The 200% text-resize check found a pre-existing rigid header/minimum-width
  problem. The narrow responsive fix lets controls wrap and retains the actual
  320px minimum independently of text size. Updated browser regressions and
  final public checks pass at 780px dark and 375px light with 200% text size.
  Screenshots were visually inspected, not merely captured.
- Final source archive URL linked from `/en/software` returns 200 with the
  matching revision parameter. The existing non-source public configuration
  hash remains `068d41f1b1281e87c0b1d82d584ebccab88f9fdb2058a3b7cb5b2c225feea0bf`;
  Whisper and service/account configuration are unchanged.
- One scoped IndexNow notification for EN/ES home plus the four new guides
  returned **202** after auditing all 20 pages. No other pages or visitor data
  were submitted. Key validation/indexing can still be pending; do not repeat
  this unchanged notification.
- Build, typecheck, lint, FOSS policy, 70 unit tests, 60 browser tests and 16
  reporting/notification tests pass. Full npm audit found zero known advisories
  at the check time, not a guarantee of security. Container is healthy; the final
  observation was 30.47 MiB of its existing 256 MiB limit.

Before/after content: 16 → 20 canonical pages; no task-specific guide → two
substantive bilingual guides; blanket IndexNow selection → explicit bounded
selection; no aggregate reporting helper → locally validated, no-collection
reporter. Browser JS grew from 178.10 kB (56.38 kB gzip) to 191.28 kB (61.58 kB
gzip), chiefly bilingual guide content; final CSS is 24.53 kB (5.58 kB gzip).
No extra browser dependency or third-party resource was added.

The initial public guide-release lab sample (same VM, Chromium, unthrottled,
one visit per route, desktop EN 1440px/mobile ES 390px) recorded LCP
240/180/188/164 ms and CLS 0.0177/0.0040/0/0 for PDF EN, QR EN, PDF ES, QR ES.
These are small diagnostic observations, not a controlled improvement study,
field p75, mobile-network guarantee, or INP measurement. Local preview samples
are not substituted for production. Review captures are retained locally in
`/tmp/utilibre-growth-review/` and `/tmp/utilibre-growth-live/`; the claims and
reproduction commands here persist if temporary files are removed.

### Rollback and remaining dependencies

Preserved pre-growth image: `public-utility-portal:pre-growth-20261007`, with source
revision `c4ffe570f4c0efb850cab8f0ec6073e8dcfc59c9`. Its corresponding archive is
preserved at
`/opt/utilibre/source-update-hyFMh3/previous-utilibre-integration.tar.gz`.
The final image manifest is
`sha256:1063e27d792344d0a34905261af4e523838e8734c30178128c8ee2418066d876`.
No database migration or deletion occurred. Local rollback artifacts are not
an offsite backup.

If rollback is needed, set the private `.env` `PORTAL_IMAGE` to that preserved
tag and `SOURCE_CODE_URL` to the matching GitHub revision, preserve the current
public archive before restoring the paired archive, then run
`docker compose up -d --no-deps --wait --wait-timeout 60 portal`. Do not revert
unrelated working files or restart other services. Recheck health and the old
16-page sitemap; withdrawing new guides would be a reviewed removal, not grounds
to redirect unknown URLs to the homepage. No rollback was needed or performed.

Local/reporting tools and launch materials are complete. Search Console/Bing
verification, effective Google AI setting inspection, actual reports and new
community-post approval remain external owner dependencies. Real indexing,
rankings, traffic, AI citations, task completions and repeat use remain
**unavailable**, not measured successes or zero activity.
