# SearXNG result-quality review

Initial review: 2026-08-30; pagination/public-instance follow-up: 2026-09-02

## Short answer

Useful public SearXNG instances do not have a hidden “good results” setting.
They usually combine:

1. a small number of general-web engines that happen to accept requests from
   that server's current egress address;
2. separate specialist engines for images, news, video, software, research,
   and maps; and
3. ongoing pruning when an upstream engine starts returning a CAPTCHA, an
   empty page, or a rate limit.

The previous local configuration had only Bing, Wiby, and Wikipedia. That was
reliable in a narrow sense, but it discarded most of SearXNG's useful
specialist categories and left one broad engine doing nearly all the work.
The reviewed configuration keeps a small general mix and restores curated
vertical tabs. It does not enable every upstream default.

## Sources and method

The review used only project-owned or upstream-primary material:

- the official [SearXNG engine settings documentation](https://docs.searxng.org/admin/settings/settings_engines.html),
  including category assignment, explicit engine weights, per-engine network
  settings, and the fact that key-requiring engines are inactive by default;
- the official [outgoing-network settings](https://docs.searxng.org/admin/settings/settings_outgoing.html);
- the official [searx.space instance dataset](https://searx.space/data/instances.json)
  and the [searx-space checker source](https://github.com/searxng/searx-space/blob/0fb38240a15f15b29823e54c05c3c83274fac087/searxstats/fetcher/timing.py);
- the pinned SearXNG image's engine implementations and defaults at commit
  [`9fea41204`](https://github.com/searxng/searxng/tree/9fea41204fdfa7a5cfa15b0ebd12904c520478ce);
- a small, non-recurring sample of normal `/config` responses from healthy
  instances listed by searx.space; and
- bounded English and Spanish browser searches from this VM. These did not
  attack, benchmark, or repeatedly probe third-party services.

The searx.space snapshot was timestamped 2026-08-29 21:41 UTC. Of 69 normal-
network instances that were reachable and at least 95% available over the
preceding week, 25 had any non-wiki success in the checker's latest standard
probe and only six had at least two non-Wikipedia contributors. Bing appeared
in 14 of those 25. Broader successful contributor sets most often combined
Bing with some subset of Google, Google CSE, Fynd, Mwmbl, Yahoo, Dogpile, or
YaCy.

That evidence has limits. The checker runs a small fixed query sample and its
reported contributors are not an instance's full enabled-engine list. A
separate small `/config` sample showed roughly 47–82 enabled engines on several
healthy instances, but only a handful were in the General category. Much of
the apparent breadth came from dedicated tabs. Rate-limited `/config`
responses were accepted as refusals and were not bypassed.

## Why another instance may look better

### Its outbound address is treated differently

Credential-free web engines are commonly HTML or XML scrapers. Results depend
on the reputation, geography, traffic history, and blocking state of the
instance's egress address. An engine working on another instance is not proof
that it will work here. This VM has already received CAPTCHA or rate-limit
responses from DuckDuckGo, Brave, Qwant, and Startpage.

### It offers useful verticals, not merely more general engines

SearXNG categories query the active engines assigned to that category. Healthy
instances commonly expose distinct sources for images, news, video, technical
questions, academic papers, and maps. Restoring those categories adds useful
data without making every ordinary web search fan out to dozens of sites.

### It may have credentials or its own index

Some engines use an official paid/keyed API, and YaCy can use a separately
operated index. This project has no such credentials or index. It will not hide
their cost, route searches through an unexplained third-party proxy, or add a
database just to make the engine count larger.

### It may accept more fragility

A long preferences page is not the same as a healthy result set. Public
instance statistics show high and changing error rates for many popular
engines. This deployment prefers a smaller set that produced real result rows
from this VM and documents the fragile parts.

## Selected configuration

### General search

| Engine | Role | Local observation | Weight |
| --- | --- | --- | ---: |
| Google CSE | Broad bilingual web results | Produced the strongest relevant English and Spanish rows in bounded tests | 3.0 |
| Wikipedia | Reference/list results | Reliable complement; not a web-search replacement | 1.5 |
| Bing | Broad web results | Produced result rows, although relevance varied by language/query | 1.0 |
| Fynd | Independent web complement | Produced rows in both languages; some were noisy; first-page-only because its live pagination now requires state the generic engine does not retain | 0.8 |
| Wiby | Small-web complement | Produced rows; intentionally down-weighted because its index is niche | 0.4 |

SearXNG's query-specific currency engine also remains available; the pinned
implementation contacts DuckDuckGo's currency endpoint. Weights guide
the result merger; they are not endorsements and do not make a result true.

The pinned `google cse` implementation is credential-free, but it uses an
unofficial Google JSONP route with an upstream Blackle partner CSE identifier.
That is disclosed because it is operationally brittle and means searches sent
to this engine reach Google Custom Search. It stays only because it materially
improved both languages in live tests. If it fails, disable it and re-review;
do not conceal the failure behind a private account, harvested cookie, or
unexplained proxy.

A bounded follow-up on 2026-09-02 compared page-one and page-two URL sets for
each paginating General contributor without recording result content. Google
CSE and Wiby returned disjoint sets. Fynd returned the same ten URLs on both
pages even though SearXNG correctly sent offsets 0 and 10. Fynd's own rendered
next link included additional `sx` and `psx` state that the generic XPath
definition cannot carry between SearXNG pages. The local overlay therefore
sets only Fynd's `paging` flag to `false`; it still contributes first-page
results and no unverified replacement parameter is invented.

### Specialist categories

| Category | Selected engines |
| --- | --- |
| Images | Bing Images; Wikimedia Commons images |
| News | Bing News; Reuters; Wikinews |
| Videos | Bing Videos; YouTube; Dailymotion; Wikimedia Commons videos |
| IT | GitHub; MDN; Stack Overflow |
| Science | arXiv; PubMed; Semantic Scholar |
| Map | Photon |
| Dictionary/reference | Wiktionary; Wikipedia |

A bounded category probe returned result cards in every listed category:
images 56, news 50, videos 46, IT 50, science 30, and map 10. Counts can include
overlap and are observations from one moment, not availability promises.
One proxied result-image request timed out during the later browser suite; the
HTML result lists still passed. Individual thumbnails remain dependent on
their origin and should fail as images, not take the whole search down.

The result page, rather than the minimal home form, shows SearXNG's category
tabs. Users can still change language and engine preferences in SearXNG's own
interface.

## Candidates tested and not selected

| Candidate | Observation or reason |
| --- | --- |
| Google (standard scraper) | Ten strong English rows in a bounded canary, but zero rows for the matching Spanish query; left off to avoid extra latency and CAPTCHA risk. |
| Mwmbl | Interesting small independent index, but returned no rows for a local probe and had repeated timeouts. |
| Yahoo | Repeated disconnects from this VM. |
| Wikidata | Initialization request returned HTTP 403; removed rather than leaving a known startup error. |
| DuckDuckGo and Qwant | CAPTCHA responses from this VM. |
| Brave and Startpage | Rate-limit or CAPTCHA responses from this VM. |
| Mojeek and Yep | No result rows in the bounded queries used here. |
| Openverse, OpenStreetMap, Wordnik | No rows in the local specialist probe; retained alternatives were working. |
| Dogpile | Marked inactive by the pinned upstream configuration; not resurrected simply because another instance once returned a result. |

An engine can be reconsidered later. The admission test is a normal private
browser flow, real result cards in suitable English and Spanish queries,
acceptable latency, no CAPTCHA/rate-limit page, accurate catalog disclosure,
and a repeat check on another day.

## PrivAU comparison and public-instance limits

[PrivAU](https://priv.au/) is a useful published comparison, but not a
like-for-like deployment. Its operator documents a global endpoint plus four
[regional endpoints](https://github.com/privau/searxng#readme), an
[operator-controlled TLS/network path](https://priv.au/privacy), and a custom
build that was explicitly testing `curl-cffi` when reviewed. Its live
[`/config`](https://priv.au/config) response showed Google, Dogpile, and Yahoo
as the broad paging contributors. That is an observation of the published
configuration, not evidence of unreported proxies or other hidden settings.

The transferable choices are already represented here: an explicit public
base URL, public-instance mode backed by Valkey and the link-token limiter, a
small measured engine set, and HTML-only anonymous search. PrivAU likewise
keeps its machine-readable API behind manually issued, daily limited keys
because a public API would consume its IP pool; its
[API policy](https://priv.au/api) and
[implementation](https://github.com/privau/searxng/blob/fdcf28c2009016a67db43d4bbfc1535d8b5176b2/src/auth/auth.py#L59-L99)
support keeping JSON, CSV, and RSS disabled here.

The following PrivAU-specific choices were deliberately not copied:

- its experimental HTTP-client fork instead of the official SearXNG image;
- changing limiter aggregation from IPv4 `/32` and IPv6 `/48` to
  [`/24` and `/40`](https://github.com/privau/searxng/blob/fdcf28c2009016a67db43d4bbfc1535d8b5176b2/Dockerfile#L60-L64),
  which would make unrelated users behind shared networks consume one bucket;
- a hard two-second engine cap and 60-second access-denied/CAPTCHA suspensions
  ([published startup settings](https://github.com/privau/searxng/blob/fdcf28c2009016a67db43d4bbfc1535d8b5176b2/src/run.sh#L89-L113)); and
- PrivAU's live Google/Yahoo/Dogpile mix. Google was inconsistent and Yahoo
  disconnected in local bilingual tests, while Dogpile is
  [inactive in the pinned official defaults](https://github.com/searxng/searxng/blob/9fea41204fdfa7a5cfa15b0ebd12904c520478ce/searx/settings.yml#L851-L857).

This deployment has one outbound address, so repeated requests after an
upstream 403, CAPTCHA, or 429 can extend a provider-wide block for every user.
Explicit suspensions of one day for access denial/CAPTCHA and one hour for 429
follow the current official
[`search.suspended_times` guidance](https://docs.searxng.org/admin/settings/settings_search.html#search)
and are safer here than PrivAU's region-specific 60-second retry. The tradeoff
is that one transient rejection removes that engine for longer; the remaining
general contributors and specialist tabs are the fallback, and warnings must
be monitored without logging queries.

An explicit `search.max_page: 5` is a matching backend abuse bound. Google CSE
already has an upstream
[five-page maximum](https://github.com/searxng/searxng/blob/9fea41204fdfa7a5cfa15b0ebd12904c520478ce/searx/engines/google_cse.py#L31-L35),
Fynd is intentionally first-page-only, and the cap prevents unbounded
Wiby-only deep-page fan-out. SearXNG skips engines that do not page or exceed
their effective maximum in the
[search processor](https://github.com/searxng/searxng/blob/9fea41204fdfa7a5cfa15b0ebd12904c520478ce/searx/search/processors/abstract.py#L243-L261).
This cap is not the fix for Fynd's repeated rows--the `paging: false` override
is--and upstream's simple template can still render page numbers beyond the
backend cap whenever a paging engine returned results. A strict visual cap
would require a separately reviewed template change; a direct page-six
request should instead return no engine results.

## Proxy conclusion

SearXNG supports global and per-engine proxies, but neither searx.space's
published contributor data nor public `/config` proves that a comparison
instance uses one. There is therefore no evidence that adding a proxy would
solve this deployment. A commercial rotating proxy or Tor exit would add
cost, privacy questions, abuse exposure, and a new failure domain. Direct
egress remains the documented choice.

## Operations

- Keep the global four-second timeout. Raise only a successful slow engine's
  per-engine timeout after measurement.
- Check actual `article.result` rows; HTTP 200 alone can contain “No results.”
- Review redacted SearXNG warnings after an engine failure. Do not enable query
  logging to diagnose it.
- Re-run one ordinary English and one Spanish browser query after image or
  configuration updates.
- Disable a consistently failing engine rather than broadening the set.
- Keep diagnostics, `/stats/errors`, and preferences controls protected by the
  public edge configuration.
