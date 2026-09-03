# Future privacy-frontend candidates

Last reviewed: 2026-08-28

This is a screening document, not a deployment list. None of the projects below is included in milestone 1. A candidate must still pass an egress smoke test, an abuse review, a privacy/data-flow review, a pinned-image review, and a measured resource test before it can be added.

Only the candidates' own repositories and deployment material were used for this review. Commit dates below are the newest commit observed on the named branch at review time. Resource numbers are deliberately broad planning envelopes inferred from the documented architecture; they are **not measurements on this host**. A future deployment must replace them with idle and active measurements.

## Summary

| Candidate | Represents | Maintenance at review | English / Spanish UI | Recommendation |
| --- | --- | --- | --- | --- |
| [AnonymousOverflow](https://github.com/httpjamesm/AnonymousOverflow) | Stack Overflow / Stack Exchange | Active; `v1.14.1`, main updated 2026-08-25 | English / no | **Conditionally deploy later** after proxy-trust and image-proxy security work |
| [GotHub](https://codeberg.org/gothub/gothub) | GitHub | Active, but asking for maintainers; stable branch updated 2026-04-06 and development branch 2026-08-11 | English / no | **Conditionally deploy later** only with download proxying disabled or tightly restricted |
| [libremdb](https://github.com/zyachel/libremdb) | IMDb | Active at a low cadence; main updated 2026-04-19 | English / no | **Conditionally deploy later** after a pinned build and live compatibility test |
| [Piped](https://github.com/TeamPiped/Piped) | YouTube | Active; frontend updated 2026-08-26 | English / yes | **Defer**; duplicates Invidious and has a much larger, bandwidth-heavy stack |
| [ProxiTok](https://github.com/pablouser1/ProxiTok) | TikTok | Some activity; main updated 2025-05-31 | English / no | **Defer**; CAPTCHA tokens, a browser sidecar, and video bandwidth make it fragile |
| [Nitter](https://github.com/zedeus/nitter) | X / Twitter | Code active, but upstream reports a 2026-08-24 cease-and-desist demand | English / no | **Reject for public deployment** while the legal notice and account-session requirement remain |
| [Lingva Translate](https://github.com/TheDavidDelta/lingva-translate) | Google Translate | Stale; main updated 2023-01-13 | English UI; Spanish is a translation target, not a UI locale | **Reject current upstream**; unmaintained scraper and unrestricted APIs |
| [SimplyTranslate Web](https://codeberg.org/SimpleWeb/SimplyTranslate-Web) | Google, DeepL, ICIBA, Reverso, and LibreTranslate | Stale; master updated 2023-04-06 | English UI; Spanish is a translation target, not a UI locale | **Reject current upstream**; no supported container release and fragile multi-engine scraping |

The most promising additions are AnonymousOverflow, GotHub, and libremdb. Their lack of Spanish interface localization is a material limitation for this bilingual project, not a cosmetic issue. Upstream contributions would be preferable to maintaining private forks.

## Candidate assessments

### AnonymousOverflow

- **Upstream service:** public Stack Overflow and other Stack Exchange question pages.
- **Maintenance and release:** the official repository was at [`v1.14.1`](https://github.com/httpjamesm/AnonymousOverflow/releases/tag/v1.14.1); the reviewed main commit was [`937cfeefd6dcbab92ef572671f16d4d3be6abad3`](https://github.com/httpjamesm/AnonymousOverflow/commit/937cfeefd6dcbab92ef572671f16d4d3be6abad3) dated 2026-08-25.
- **License:** MPL-2.0. Changes to covered files must remain available under MPL-2.0; the service can remain a separate component beside the AGPL portal.
- **Official deployment:** the repository provides a multi-architecture scratch-based image, a Compose example, and `/healthz`. The example uses `ghcr.io/httpjamesm/anonymousoverflow`; a future Compose file must pin the `v1.14.1` image by digest rather than use `latest`.
- **Dependencies and persistence:** one Go service; no database or persistent volume. `APP_URL` and a strong `JWT_SIGNING_SECRET` are required. `SCRAPER=api` uses the Stack Exchange API; `API_KEY` is optional but the unauthenticated quota is lower. The HTML scraper avoids a key but is more sensitive to markup changes.
- **Planning resource envelope:** low CPU; roughly 20–100 MiB RAM; less than 150 MiB container disk; negligible persistent disk; temporary response buffers only. Expect low-to-moderate egress, increasing when answer images are proxied.
- **Bandwidth and privacy benefit:** pages and referenced images are fetched by the application, so a normal page view should be `SERVER` + `PROXY`. This keeps the visitor's browser away from Stack Exchange, subject to a network trace confirming that templates do not emit external requests.
- **Credentials:** no personal Stack Overflow account is required. A separately registered Stack Apps API key may be useful for public quota, but it must be treated as a service secret and its terms reviewed.
- **Fragility:** both supported data paths depend on an upstream-controlled surface: API quota/schema or scraped HTML. Upstream outages are included in the application's own health endpoint, which can make health state noisy.
- **Security and abuse:** the built-in in-memory limiter is approximately 30 requests per minute per perceived IP. The reviewed code uses Gin's client-IP resolution without an application setting for the single trusted edge proxy. The signed image-proxy token prevents arbitrary callers from supplying a URL, but the URL originates in upstream user content; private-address and redirect-chain blocking must be verified to rule out SSRF. Response size and content-type limits also need review.
- **Languages:** public templates are English-only. Stack Overflow content can of course contain Spanish, but that is not Spanish interface support.
- **Duplication:** none in milestone 1. It would add a distinct reference/developer use case.
- **Recommendation:** **conditionally deploy in milestone 2** only after either an upstream trusted-proxy control is available or a small published MPL-compliant patch restricts it to `EDGE_PROXY_IP`; validate the image proxy against private IPv4, private IPv6, redirects, and oversized images; add edge rate limits; and decide whether an English-only upstream interface is acceptable.

### GotHub

- **Upstream service:** public GitHub repositories, users, files, commits, releases, gists, and raw content.
- **Maintenance and release:** the project is active but its README explicitly asks for new maintainers. The reviewed stable commit was [`0bc0ec59222bfb09fb29fec4136133e220072285`](https://codeberg.org/gothub/gothub/commit/0bc0ec59222bfb09fb29fec4136133e220072285) dated 2026-04-06; the default development branch was at [`e8aa920cab00ae827561af1dfd978ed4ea322427`](https://codeberg.org/gothub/gothub/commit/e8aa920cab00ae827561af1dfd978ed4ea322427) dated 2026-08-11.
- **License:** AGPL-3.0. Any modified network deployment must offer the corresponding modified source.
- **Official deployment:** the repository provides `codeberg.org/gothub/gothub` images and Compose on port 3000, but its examples use floating `latest`/`dev` tags. A future deployment needs an audited commit or release digest.
- **Dependencies and persistence:** a single Go service, no database, no required credentials, and no persistent data. It scrapes most GitHub pages and uses the unauthenticated GitHub API for the Explore page.
- **Planning resource envelope:** low CPU for ordinary pages with bursts for parsing and syntax highlighting; approximately 30–150 MiB RAM; less than 200 MiB image disk; no required persistent disk. Bandwidth is the dominant and potentially unbounded resource.
- **Bandwidth and privacy benefit:** with proxying enabled, ordinary browsing is `SERVER` + `PROXY` and the client need not contact GitHub. With proxying disabled, avatars, images, raw content, archives, and releases can become `EXTERNAL`, which must be disclosed.
- **Credentials:** none are required. Unauthenticated GitHub rate limits make public reliability fragile; adding a personal token would be contrary to this project's credential policy and is not proposed.
- **Fragility and upstream hostility:** HTML scraping can break whenever GitHub changes markup. The Explore route consumes unauthenticated API quota.
- **Security and abuse:** the official routes can proxy `git-upload-pack`, repository archives, raw files, release downloads, and gist ZIPs. That makes a public instance attractive as a bulk-download relay and can consume large egress. The reviewed stable code also trusts forwarded client IPs from `0.0.0.0/0`, rather than only the edge VM. Its HSTS header is set by the application with `includeSubDomains; preload`, which is not acceptable to inherit without a domain-level decision.
- **Languages:** templates are English-only; there is no centralized localization tree.
- **Duplication:** it overlaps the portal's software/source links but not any privacy frontend.
- **Recommendation:** **conditionally deploy later**, initially with `GOTHUB_PROXYING_ENABLED=false` and explicit `EXTERNAL` labels, or with edge/application blocks on git transport, archive, raw, gist-download, and release-download routes. Require exact trusted-proxy support, remove application-imposed HSTS unless deliberately approved, cap response sizes, add a conservative edge rate limit, and run a GitHub compatibility test. A maintained Spanish translation path would materially improve its priority.

### libremdb

- **Upstream service:** public IMDb title and person data, images, and video references.
- **Maintenance:** the reviewed main commit was [`d0793f59b5f090fe0d29341e3a173cfa92884307`](https://github.com/zyachel/libremdb/commit/d0793f59b5f090fe0d29341e3a173cfa92884307) dated 2026-04-19. The project publishes no versioned GitHub releases, so maintenance is visible but release hygiene is weak.
- **License:** AGPL-3.0. Modified network deployments must publish corresponding source.
- **Official deployment:** the repository supplies a Dockerfile, a Compose example, and `ghcr.io/zyachel/libremdb`, but documents only a floating `latest` image. A milestone-2 deployment should build an audited commit reproducibly or pin a verified registry digest.
- **Dependencies and persistence:** Next.js/Node plus Redis in the example. Redis is used as a cache and can be tmpfs/ephemeral; it does not need a host port or backup. There is no application database.
- **Planning resource envelope:** low-to-medium CPU; approximately 200–700 MiB RAM including a small cache; roughly 0.5–1.5 GiB container disk; no required persistent disk; small temporary cache. Image and trailer proxying can produce moderate-to-high egress.
- **Bandwidth and privacy benefit:** the project states that it proxies images and video, so the intended flow is `SERVER` + `PROXY`. That is a meaningful benefit over loading IMDb/Amazon assets in the browser, but it transfers their bandwidth cost and abuse risk to this VM.
- **Credentials:** no API token or personal IMDb account is documented as required.
- **Fragility and abuse:** it relies on undocumented IMDb data and markup and acknowledges extra round trips. Search/crawler traffic and media hotlinking are likely public-instance risks. Live compatibility must be tested from this VM before exposing a card.
- **Languages:** the document root is hard-coded to English. `AXIOS_LANGUAGE` can influence upstream content but does not localize the interface, so Spanish UI support is absent.
- **Duplication:** none; movie metadata is distinct from milestone-1 services, but it is lower public value than search and local tools.
- **Recommendation:** **conditionally deploy later** only after an official tagged release or a reproducibly pinned commit, successful title/image/video smoke tests, route and media size limits, crawler controls, and an explicit decision about the English-only interface. Run Redis only if measurements show that it meaningfully reduces upstream traffic.

### Piped

- **Upstream service:** YouTube browsing and playback.
- **Maintenance:** active. The reviewed frontend commit was [`e341724a3f5fe46d9f318e8acba207688f1045de`](https://github.com/TeamPiped/Piped/commit/e341724a3f5fe46d9f318e8acba207688f1045de) dated 2026-08-26; the official [Piped-Docker](https://github.com/TeamPiped/Piped-Docker) templates were at [`e5b6cc08a6227ffb7a76ef42c0fe702ee84f5be5`](https://github.com/TeamPiped/Piped-Docker/commit/e5b6cc08a6227ffb7a76ef42c0fe702ee84f5be5) dated 2026-04-08.
- **License:** the frontend, backend, proxy, and helper components are AGPL-3.0; Piped-Docker integration files are MIT.
- **Official deployment:** the official stack includes frontend, Java backend, Rust media proxy, background helper, PostgreSQL, and—depending on the template—nginx or Caddy plus an automatic updater. This project may not use the bundled general reverse proxies, Docker-socket-mounted updater, floating images, or unattended upgrades; a compliant deployment would have to compose only the application components behind the existing edge VM.
- **Planning resource envelope:** medium-to-high CPU; roughly 1–3 GiB RAM; several GiB of image disk; PostgreSQL persistent storage that can grow beyond 1–10 GiB; temporary media buffers; very high egress during playback. These figures require validation under current extractor behavior.
- **Bandwidth and privacy benefit:** page/API requests are proxied. Playback may traverse the Piped proxy, making bandwidth the limiting resource. Exact `SERVER`, `PROXY`, and possibly `EXTERNAL` labels must come from a browser network trace of the selected configuration.
- **Credentials:** no personal Google account should be needed in the documented design, but YouTube anti-bot changes and IP reputation can still break extraction.
- **Fragility and public abuse:** YouTube is hostile to alternative extraction, public media proxies attract hotlinking, and account/subscription APIs add abuse and retention questions. Registration and any user accounts would have to be disabled.
- **Languages:** the official frontend contains maintained `en.json` and `es.json` locale files, so both required interface languages are available.
- **Duplication:** it directly duplicates the intended Invidious role and part of Cobalt's YouTube support.
- **Recommendation:** **defer**. Reconsider only if Invidious remains deferred, the operator can budget sustained video egress, and a low-account/no-registration topology can be demonstrated without private credentials. Do not run two YouTube frontends merely to increase service count.

### ProxiTok

- **Upstream service:** public TikTok profiles, tags, feeds, and video.
- **Maintenance:** the reviewed master commit was [`ca9fcf6192b018fe0199e9e32e080fa6f8556594`](https://github.com/pablouser1/ProxiTok/commit/ca9fcf6192b018fe0199e9e32e080fa6f8556594) dated 2025-05-31. The README identifies `v2.5.0.0`, but the deployment example tracks `master`.
- **License:** AGPL-3.0.
- **Official deployment:** official Compose runs PHP/ProxiTok, Redis, and a Chrome/ChromeDriver sidecar. It uses floating images and automatic-update labels; those must not be carried into this project.
- **Planning resource envelope:** medium CPU with browser bursts; approximately 0.8–2 GiB RAM because the Chrome sidecar reserves a 1 GiB shared-memory area; 1–3 GiB image disk; ephemeral cache; high video egress.
- **Bandwidth and privacy benefit:** the application says all TikTok requests are server-side, so the intended label is `SERVER` + `PROXY`. That creates a real privacy benefit but also makes the host a video relay.
- **Credentials:** the self-hosting documentation says operators may need an `API_VERIFYFP` value copied from a TikTok browser cookie after solving a CAPTCHA, and the Compose file exposes optional device-ID configuration. This is a fragile quasi-credential and conflicts with the project's preference not to operate on personal/private tokens.
- **Fragility and public abuse:** TikTok changes its signer/CAPTCHA mechanisms, video endpoints consume bandwidth, and the project's own known-issues list includes URL crashes. A public instance would need strict route, response-size, concurrency, and rate controls beyond the documented stack.
- **Languages:** templates are hard-coded in English; no English/Spanish interface localization system was found.
- **Duplication:** no direct service duplicate, although Cobalt already handles supported public media downloads.
- **Recommendation:** **defer** unless upstream eliminates the CAPTCHA-cookie/browser dependency and publishes a pinned, supported release. Even then, test a read-only, non-download-heavy configuration and budget egress before adoption.

### Nitter

- **Upstream service:** public X/Twitter pages and media.
- **Maintenance and legal status:** source activity was current at [`e4aefbc210a75d90d919fedba92f830c965ed989`](https://github.com/zedeus/nitter/commit/e4aefbc210a75d90d919fedba92f830c965ed989) dated 2026-08-26. However, the official README says cease-and-desist letters were sent by X Corp. on 2026-08-24 demanding permanent takedown of instances and the repository. That makes public operation legally and operationally unsuitable for this milestone.
- **License:** AGPL-3.0-only.
- **Official deployment:** Nitter plus Redis/Valkey, a configuration file, HMAC secret, and a `sessions.jsonl` file. The official Compose uses an unpinned `latest` image and Redis 6.
- **Planning resource envelope:** low-to-medium CPU; approximately 100–400 MiB RAM with cache; less than 1 GiB image and cache disk; moderate page/media egress.
- **Credentials:** despite an outdated feature sentence saying no developer account is required, current official Compose mounts `sessions.jsonl`, and the official tools accept X username/password/TOTP or extract account authentication cookies. Those are sensitive real-account credentials and directly conflict with this project's requirements.
- **Privacy and fragility:** the browser can avoid X when all media proxying works (`SERVER` + `PROXY`), but account bans, rate limits, API changes, and the takedown demand make reliability exceptionally poor.
- **Abuse:** public timelines, RSS, search, and media proxying invite crawlers. Cache/Valkey must be private, but no amount of local hardening resolves the legal and account-token concerns.
- **Languages:** generated HTML declares English and no locale catalog was found.
- **Duplication:** none, but the risk dominates the potential benefit.
- **Recommendation:** **reject for public deployment**. Do not obtain accounts, tokens, or cookies and do not adopt an unofficial fork to evade the current situation. Re-review only if the official project publishes a clear, lawful, credential-free operating model.

### Lingva Translate

- **Upstream service:** Google Translate text and audio, using an unofficial scraper.
- **Maintenance:** the reviewed main commit was [`0190ea5da9fbccba51e82184ca855c4ef5728fc7`](https://github.com/TheDavidDelta/lingva-translate/commit/0190ea5da9fbccba51e82184ca855c4ef5728fc7) dated 2023-01-13. That is too stale for a public scraper in 2026.
- **License:** AGPL-3.0.
- **Official deployment:** a Next.js service and an official Docker Hub image are documented, but only with `latest`; there is no current pinned production release to adopt.
- **Planning resource envelope:** low-to-medium CPU; approximately 200–700 MiB RAM; roughly 0.5–1.5 GiB image disk; no database; low text egress with potentially larger audio responses.
- **Credentials:** none documented.
- **Privacy and fragility:** visitor text is sent to this server and then Google (`SERVER` + `PROXY`). The project exposes REST and GraphQL translation APIs, creating bulk-automation abuse risk unless separately restricted. An unmaintained Google scraper can fail without notice.
- **Languages:** Spanish is supported as translation input/output, but public controls, errors, metadata, and `html lang` are English. This is not bilingual interface support.
- **Duplication:** it overlaps the simpler SimplyTranslate candidate and could be approximated through already selected SearXNG translation engines, if enabled deliberately.
- **Recommendation:** **reject the current upstream deployment**. Do not silently substitute an unreviewed fork. Reconsider only after the canonical project resumes maintained tagged releases and documents API abuse controls.

### SimplyTranslate Web

- **Upstream services:** configurable relays for Google Translate, DeepL, ICIBA, Reverso, and LibreTranslate.
- **Maintenance:** the reviewed master commit was [`d95fed97bf354a92d242f16529712ba59ee54eb0`](https://codeberg.org/SimpleWeb/SimplyTranslate-Web/commit/d95fed97bf354a92d242f16529712ba59ee54eb0) dated 2023-04-06.
- **License:** AGPL-3.0-or-later; bundled visual assets include CC BY 4.0 material that would need attribution.
- **Official deployment:** the upstream instructions install Python dependencies and run Uvicorn on port 5000. No official container image or Compose deployment is supplied.
- **Planning resource envelope:** low CPU; approximately 100–400 MiB RAM; less than 500 MiB application/dependency disk; no database; low-to-moderate outbound bandwidth. Actual usage varies by enabled engines.
- **Credentials:** no personal credential is documented for the default scrapers, but each external engine has separate compatibility and terms risk.
- **Privacy and fragility:** entered text is sent to this server and then the selected translation provider (`SERVER` + `PROXY`). The documented API makes automated bulk use easy. Five upstream integrations multiply breakage and disclosure work.
- **Languages:** translation choices include Spanish, but interface templates and errors are English-only.
- **Duplication:** overlaps Lingva and any translation features intentionally exposed through search.
- **Recommendation:** **reject the current upstream deployment** because it is stale, has no supported pinned container, and expands the upstream/abuse surface without first-class Spanish UI. Reconsider only after active official releases and a narrow, rate-limited deployment method exist.

## Required gate for any future addition

Before promoting any candidate into `compose.yaml`:

1. Re-run this review against the canonical repository and record an immutable release tag and image digest.
2. Confirm the license and publish modified source when AGPL or MPL obligations apply.
3. Run a private egress smoke test from this VM without personal accounts or cookies.
4. Trace a representative browser session and assign `LOCAL`, `SERVER`, `PROXY`, and `EXTERNAL` labels from observed data flow.
5. Verify exact edge-proxy trust, origin/host handling, redirect behavior, SSRF resistance, response-size limits, and crawler/rate controls.
6. Disable account registration, public APIs, media relays, or download routes that are not necessary for the stated utility.
7. Measure idle RAM and active CPU/RAM/disk/network use; set limits from measurements, not the planning envelopes above.
8. Confirm that both English and Spanish interfaces exist or document the upstream localization limitation prominently before launch.
9. Add the service to the structured catalog, status page, privacy page, software inventory, backup plan, edge-routing map, and automated tests in one change.
10. Do not register the instance in a public directory during its initial observation period.

## Canonical sources reviewed

- [AnonymousOverflow repository, deployment example, and source](https://github.com/httpjamesm/AnonymousOverflow)
- [GotHub repository and setup documentation](https://codeberg.org/gothub/gothub)
- [libremdb repository and installation instructions](https://github.com/zyachel/libremdb)
- [Piped frontend](https://github.com/TeamPiped/Piped), [backend](https://github.com/TeamPiped/Piped-Backend), [proxy](https://github.com/TeamPiped/piped-proxy), and [official Docker templates](https://github.com/TeamPiped/Piped-Docker)
- [ProxiTok repository](https://github.com/pablouser1/ProxiTok) and [official self-hosting wiki](https://github.com/pablouser1/ProxiTok/wiki/Self-hosting)
- [Nitter repository, current legal notice, Compose file, and session tools](https://github.com/zedeus/nitter)
- [Lingva Translate repository and deployment documentation](https://github.com/TheDavidDelta/lingva-translate)
- [SimplyTranslate Web repository and API documentation](https://codeberg.org/SimpleWeb/SimplyTranslate-Web)
