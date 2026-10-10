# Reader reliability: current results and one deployed correction

Checked 9 October 2026. This supersedes the old description of LibreMDB as an
unrepaired obsolete runtime. It does not turn successful article metadata into
a playback or complete-media claim.

| Reader | Exact reviewed software | Current native result |
| --- | --- | --- |
| Rimgo | `d2be8e221522dfe7a06452e2002dcf6dad569d1a`, local p3 | Public post HTML 200; its selected MP4 429, so playback remains unavailable for that sample. |
| BreezeWiki | `6d09507b6e7ecec0cbac4c2c4eb223c10ccc23a4`, updated from local p2 to p3 | Public article text 200. Native tabs/JavaScript exception repaired; selected proxied Fandom image still refused with 403. |
| LibreMDB fork | `b233f4e24acfb4afbe55b7c13798832ca8068086`, local p1, version 4.5.0 | Private desktop/mobile search, title and images pass. The selected data API's public-use restriction remains separate from technical functionality. |

The actual original upstream remotes still return those same revisions as HEAD.
No newer upstream fix was available in the checked branches. No visitor data,
retention, providers, credentials or tracking configuration was changed.

## BreezeWiki: concrete repair deployed

The public article loaded `tabs.js`, which unconditionally imported `jsonp.js`
even with native `bw_feature_jsonp::enabled=false`. JSONP initialization then
attempted to render into absent loading/progress elements, throwing
`Cannot read properties of null (reading '__k')` and preventing tab setup.

The small patch moves that import into the existing JSONP-enabled branch.
The server-rendered path now initializes normally without executing JSONP code.
The existing strict-proxy configuration, same-origin CSP, disabled suggestions,
destination checks, cooldowns, CPU/RAM ceilings and privacy controls are unchanged.

An offline browser fixture verified native tab switching, selected-tab hashes,
zero JSONP requests and no JavaScript exception. Six offline transport tests and
the Racket media-response integration test passed. The actual public article
then loaded the new module and completed tab initialization without page errors.
That post-deployment JavaScript regression replayed the previously captured
media refusal locally rather than retrying a denied upstream during cooldown.
It does not claim that images began working.

The installed p3 image is
`sha256:3983b1a5276aaaa906657f3c2ae5c6e89b45eab79e6ad92a547849bd3ebb7755`.
`deployment/expanded/build-breezewiki-tabs.sh` verifies the retained p2 parent
image ID and builds the static-file layer with networking disabled. The full
source Dockerfile remains available for reconstruction. A fresh offline full
build could not resolve apt packages without a dependency cache; the verified
parent layer avoided a redundant package/compiler download. Only BreezeWiki was
recreated, and its health check passed. The old image and scoped compose backup
remain available for rollback. No stateful service or user dataset was touched.

Public article media still returned **403**, `no-store`, `Retry-After: 600` and
Cloudflare `DYNAMIC` before the repair. The transport replaced the upstream
challenge body with its plain error, as intended. An independent-wiki logo was
blocked by the browser CSP; network diagnostics distinguished that blocked
attempt from an actual third-party response. Direct visitor requests to Fandom
were explicitly rejected by the operator earlier and remain disabled.
[BreezeWiki's configuration documentation](https://docs.breezewiki.com/Configuration.html)
describes its direct JSONP/proxy alternatives; enabling direct requests would
change the privacy requirement and is not this repair.

## Rimgo: metadata works, media access does not

One bounded range request for the previously used public video `wG1nGfK.mp4`
still returned **429**, `Cache-Control: no-store`, `Retry-After: 601` and
Cloudflare `BYPASS`. Its native public post returned 200, but the browser could
not load video metadata or a finite duration. This is not an old cached error
or evidence that the video is playable. No repeated retry loop was run.

The existing p3 patch already serializes requests by upstream host, honors
denial cooldowns, strips visitor headers and validates destinations. It was not
replaced merely to change a version number. The later follow-up below accounts
for the now-working host IPv6 route without treating it as successful playback.
[Rimgo's own provider guidance](https://rimgo.codeberg.page/docs/getting-started/unsupported-providers/)
documents provider-dependent Imgur refusals. That supports the observed failure
class, not a conclusion that every Hetzner address is blocked. No rotating proxy,
alternate public instance or new provider was introduced. A permitted working
outbound path or upstream removal of the denial is still required for playback.

## LibreMDB: functioning private build, distinct provider condition

The retained modernized image uses Node 24.21.0 and Next 16.4.0. The existing
bounded GraphQL/media fetcher, same-origin CSP, disabled telemetry and private
loopback binding were preserved. The native search for `Up`, title `tt1049413`
and visible proxied images passed at desktop and 390-pixel mobile widths:
17 and 16 loaded images respectively, no third-party browser responses,
JavaScript errors or horizontal overflow. Invalid private/impostor destinations
were rejected and the invalid-title response exposed no stack trace. Screenshots
were inspected. The review container was stopped after this check.

The selected [fork](https://github.com/darlopvil/libremdb-fork) documents use of
IMDb's internal anonymous GraphQL endpoint for its private instance. The
installed parser was rechecked on 9 October against revision
`b233f4e24acfb4afbe55b7c13798832ca8068086`: it still uses
`api.graphql.imdb.com`, with the existing bounded ten-minute cache. A current
minimal title response succeeded but explicitly excluded public and non-private
use in its disclaimer. [IMDb's published data-use conditions](https://help.imdb.com/article/imdb/general-information/can-i-use-imdb-data-in-my-software/G5JTRESSHJBBHTGX)
restrict their stated noncommercial permission to supplied datasets and exclude
scraping/republication as a movie database. The fork has no configured native
licensed-API or dataset backend that would resolve this particular condition.

This is a specific provider restriction for this selected implementation, not a
claim that its FOSS licence is invalid, that all frontends are unlawful, or that
the application is technically broken. No agreement or permission covering
Utilibre's public operation has been verified. Its private-only guard and
stopped state remain; no public route was added or external permission request
sent. A database replacement would be a different application or substantial
custom work, not a configuration fix to this fork.

## Follow-up after working host IPv6

The bounded 9 October follow-up checked the actual destination DNS records,
installed reader images and original upstream branch HEADs. Rimgo, BreezeWiki,
the LibreMDB fork and Dumb still matched their reviewed revisions; no newer
branch fix was available. The installed readers remain Rimgo p3 and BreezeWiki
p3. The current public lyrics service is LRCLIB, not the stopped Dumb candidate.

`i.imgur.com` and `api.imgur.com` returned IPv4 addresses only. The selected
Fandom media host, `static.wikia.nocookie.net`, also returned IPv4 addresses only.
No IPv6 destination can be selected natively for those hostnames from the DNS
answers observed here. A working host IPv6 route therefore does not provide an
alternate path for these particular media requests. No IPv6 address was guessed,
DNS override installed, or third-party relay added.

One ordinary HTTPS range request directly from the VM to each previously tested
public media resource separated the upstream response from Utilibre's gateway
and cache. Imgur returned **429 with an empty body**. Fandom returned **403 with
`cf-mitigated: challenge`**, before delivering image bytes. Neither response is
evidence of playback or a loaded image. No repeated retry or load test followed.
Existing bounded fetching, cooldowns, error cache controls and same-origin
browser restrictions remain intact. An independent-wiki logo is also blocked
by the browser policy: the installed native banner has no local-logo or
Fandom-proxy configuration for that third-party asset. Its useful text and link
remain; expanding the media allowlist would add a provider and would not repair
the refused Fandom image.

Genius does publish IPv6 addresses. The existing 13:49 UTC test already proved
working ordinary IPv6 HTTPS and a continuing challenge for both Genius search
and lyric URLs; see `dumb-ipv6-readiness-2026-10-09.md`. Those refusals were not
retried in this follow-up. The request path is challenged; the available evidence
does not isolate the cause to an IP address rather than other client or service
policy factors.

The precise remaining media dependency is an ordinary successful response from
the selected provider through an authorized request path. An already-controlled
edge route can be tested by its operator, but its egress is inaccessible here
and no working alternate route has been supplied. No public-instance relay,
challenge solver, visitor-direct media request or new provider is substituted.
LibreMDB's separate public-use condition is unchanged: there is still no verified
permission or configured native backend resolving it. The stopped private
candidate is not an unfinished runtime repair.

## Evidence and reproduction

Private reports: `/opt/utilibre/reports/frontend-reliability-20261009/`.
They contain dated HTTP headers, bounded body samples, public browser/media
results, screenshots, offline regression output, image/source identifiers and
the scoped rollback configuration. Only public content or fictional fixtures
were used. The new `deployment/community/check-reader-media.mjs` records
metadata success separately from media failure; it never declares a reader
healthy solely because its article returns 200. Its `--breezewiki-tabs-only`
mode replays the known image refusal locally while verifying the public module.
`deployment/expanded/check-breezewiki-tabs.mjs` tests the native module offline.
Neither script is a recurring monitor or upstream load test.
The IPv6 follow-up's DNS answers and the two direct media response headers are
under `/opt/utilibre/reports/reader-recovery-20261009/`; they contain no visitor
data or credentials. This follow-up changed documentation only and did not
restart services, alter data, or weaken a destination/privacy boundary.
