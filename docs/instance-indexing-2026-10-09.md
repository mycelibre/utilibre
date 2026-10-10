# Public indexing and return navigation — 9 October 2026

Checked the twenty-two new catalog additions through their public HTTPS routes, their sixteen distinct hosts' `robots.txt` and `/.well-known/security.txt`, and the English/Spanish portal and Unfurl guides. Requests were limited to Utilibre resources; no destination content, authenticated records or real user data was fetched. Private evidence is under `/opt/utilibre/reports/instance-indexing-20261009/` (`http.json`, `browser.json`, `robots-after.json`).

## Indexing result

All twenty-two application entry pages returned HTTP 200 after their normal owned-host redirects and carried a `noindex` directive. drawDB, Bookbinder, SketchForge, Moodist, ChartDB and the link cleaner use HTML metadata; the other entries use `X-Robots-Tag`. The portal and tested EN/ES guides remain `index,follow`, with their own localized canonical URLs. The portal robots file permits those pages and advertises its sitemap while excluding internal API/build resources.

All sixteen application hosts redirect security discovery to the central HTTPS security file. It returns `text/plain; charset=utf-8`, lists the working mailbox and GitHub private-reporting route, and expires on **30 September 2027**. Contact delivery/private-reporting configuration was verified in the separate security implementation; this sweep verified discovery and the public response, not another message delivery.

Three narrowly scoped gateway corrections were applied:

- `deployment/community/linkding/nginx.conf`: exact `/robots.txt` now permits crawling, so the existing `noindex, nofollow` response header can be observed. The upstream login template's `index,follow` metadata is overridden by the stricter response header; no application template was forked.
- `deployment/calendar/nginx.conf` and `deployment/razzia/nginx.conf`: exact `/robots.txt` returns real UTF-8 plaintext instead of the SPA HTML fallback. Their existing `noindex` headers remain.

All three Nginx configuration checks passed, and only those three gateways were reloaded. No containers, networks, application workers or data services were restarted. Public bookmarks still redirects to its login flow; its unauthenticated bookmarks API returns **401**. Unauthenticated CalDAV `PROPFIND /dav/` still returns **401**. Quiz root remains **200** with `noindex`; manager controls were untouched. Calendar and quiz public robots responses now contain `User-agent: *` and an empty `Disallow:`.

**Canonical cache refresh complete:** after the operator purged only `https://bookmarks.utilibre.org/robots.txt`, the exact URL returned HTTP 200 with `User-agent: *`, an empty `Disallow:` and the existing `X-Robots-Tag: noindex, nofollow` at **03:02:26 UTC** (`CF-Cache-Status: MISS`). A second canonical check passed, and the unauthenticated bookmarks API still returned **401**. Evidence: `canonical-after-purge.txt`. Useful caching and authentication were retained; no query variant was used as proof of completion.

The snippets, resume-builder and shortener hosts return 404 for robots.txt. This means no robots exclusion and does not prevent their `noindex` response headers from being read. No unnecessary robots endpoint was added. Indexing directives do not provide confidentiality or replace authentication.

## Direct-instance return links

The browser sweep inspected logged-out landing pages. It blocked non-GET requests and unrelated API calls to avoid loading records, creating state or contacting other providers. Consequently, a missing link in an account application's initial shell does not prove its authenticated menus lack one. Existing native workflow tests, rather than this restricted sweep, establish application functionality.

| Application | Observed route back to the portal |
| --- | --- |
| Spliit | No portal anchor on the inspected landing page; native custom-link support not established. |
| Wishlist | No portal anchor on the native logged-out login page; custom-link support not established. |
| Opengist | Visible bilingual **More tools from Utilibre / Más herramientas de Utilibre** through native `custom.static-links`; privacy and abuse links also work. |
| linkding | No portal anchor on login. Installed settings expose no supported arbitrary navigation-link option; retain native identity and authentication. |
| Vikunja | No anchor in the inspected logged-out shell; authenticated menus and a supported arbitrary-link setting were not established in this sweep. |
| drawDB | Visible **Utilibre** link through the native `header-actions-end` extension slot. It reaches the catalog; this supported slot could use the clearer bilingual More tools label. |
| Bookbinder JS | Visible bilingual **More tools from Utilibre / Más herramientas de Utilibre**. |
| SketchForge 3D | Visible **More tools / Más herramientas**. |
| Moodist | Visible bilingual **More tools from Utilibre / Más herramientas de Utilibre**. |
| KitchenOwl | No anchor in the restricted logged-out shell; authenticated menus/custom-link support not established. |
| ByteStash | No anchor in the restricted logged-out shell; authenticated menus/custom-link support not established. |
| ChartDB | Visible **Utilibre** link in the existing reviewed build. A label change would amend that existing source patch, not a demonstrated native branding option. |
| OpenResume | Visible **Utilibre** link in the existing reviewed build. |
| Radicale | No anchor in the native unauthenticated web interface; no arbitrary-link configuration verified. |
| Calino | No portal anchor on the inspected calendar landing page; no arbitrary-link configuration verified. |
| Gathio | Visible **More tools / Más herramientas**, configured through native site links, plus the private-contact route. |
| Chitchatter | Separate visible EN/ES **More tools** links to the matching portal language. |
| Link cleaner | Separate visible EN/ES **More tools** links to the matching portal language. |
| Razzia | No link in the inspected shell. The installed native branding schema supports name/font/logo, not an arbitrary navigation URL; no response injection was introduced. |
| Chhoto URL | Server-rendered **More tools from Utilibre** link to `/en/`. The restrictive audit blocked the app's retries for configuration, so browser visibility is not asserted by this sweep; its earlier native public workflow passed. |
| Unfurl | Separate visible EN/ES **More tools** links. |
| 13ft | Visible **Utilibre** link to `/en/` in the reviewed instance template. |

Thirteen applications have a verified portal anchor in their public HTML or rendered landing page. Nine inspected entry pages do not. These are ordinary optional links, without referral parameters or forced navigation. Existing upstream attribution remains. No new source patch was introduced solely to add promotion where an application has no supported option. Earlier installed applications and their native options remain recorded in [instance-navigation.md](instance-navigation.md).

## Recovery

The three original gateway configurations are privately preserved in the evidence directory's `config-before/`. To revert, remove only each new exact `/robots.txt` location, check the affected Nginx configuration and reload that gateway. Do not overwrite unrelated configuration or restore application data. The completed single-URL cache refresh required no deployment, purge of unrelated assets, authentication change or account access.
