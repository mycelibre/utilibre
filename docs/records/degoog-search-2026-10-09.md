# DeGoog general search repair, 9 October 2026

The earlier single Linux/Wikipedia check did not establish useful general search.
This report supersedes the original three-engine coverage description. Native
DeGoog 1.0.0 remains unmodified at image digest
`e1ce8ee724a4514d269b74088424e579322bdfcf718256c1c5dd2cbb5aaf510c`.

## Cause and deployed correction

The public browser reproduced `Guatemala turismo` returning only ten Open Library
catalogue entries. Mwmbl returned zero; `how to boil eggs` also encountered a ten
second Mwmbl timeout. Book results were technically nonempty but not useful web
answers. Books and Hacker News themselves were working in their specialist tabs.

The instance now loads the **unmodified Google CSE engine** through DeGoog's
explicitly supported native SearXNG compatibility layer. This is the same native
engine family already used by Utilibre's SearXNG. No extra service, search backend,
public JSON endpoint, application fork, or private-network permission was added.

- Web: Google CSE plus Mwmbl; CSE has native score 2, Mwmbl score unchanged.
- Books: Open Library alone, through native `searchTypeOverride: books`.
- IT: Hacker News, unchanged.
- Mwmbl has a four-second deadline instead of ten; CSE has twelve seconds.
  Native automatic retries remain disabled. Results can arrive progressively;
  provider outages still appear in the engine status panel.
- Outgoing-host configuration adds only `www.google.com`, `cse.google.com`, and
  `encrypted-tbn0.gstatic.com` through `encrypted-tbn3.gstatic.com`. Existing
  private-image rejection, signed image URLs, body limits, rate limits and CSP
  are retained. No all-host or private-address exception was added.
- Native no-JavaScript search is enabled at `/nojs`. Its form uses the exact
  `/nojs/search` POST route, with the same existing gateway/native rate limits.
  Other previously forbidden POST and operator routes remain blocked.
- No favicon provider is installed. Its existing 404/letter fallback is returned
  directly by the gateway, avoiding needless upstream connections for each
  result while thumbnail images keep using the signed native proxy.
- Browser preferences are preserved. The native registry merges a newly installed
  engine with saved selections, without resetting existing switches. A visitor
  can disable the new engine in the existing public Settings page.

All bridge files are pinned to SearXNG revision
`d48c4b555421e824342c51d68482dd0898e54d0f`, AGPL-3.0-or-later. New files are
`google_cse.py`, its `google.py` dependency and the matching native trait data.
`SOURCE.json` records the downloaded source/derived-trait hashes and provenance.
There is no source patch for this change.

## Privacy and practical limits

Google CSE uses the upstream engine's **unofficial endpoint and Blackle partner
identifier**. Google receives the query and this server's connection metadata;
this is not a confidential or Google-free search path. Mwmbl, Open Library and
Hacker News receive queries for their respective selected engines. Provider
retention periods have not been verified. Result thumbnails are fetched by
Utilibre from the four Google thumbnail hosts or the existing Internet Archive
hosts; browsers request them from DeGoog, not those providers. Opening a result
visits the destination site.

The native search cache remains RAM-only, up to ten minutes, bounded to 200
entries per namespace. The engine's shared provider token can stay in memory for
one hour. Rate-limit counters can stay in memory for an hour. Native successful
image responses carry a one-day browser/shared-cache lifetime. No query-log
storage, visitor analytics, account system or index was enabled. Native logs are
disabled for this container/gateway; Cloudflare and the separate Caddy edge still
process HTTP requests/connection metadata. Their policies and the portal's
verified edge logging notes remain applicable. Browser preferences can survive
closing the tab. Native English/Spanish privacy copy now explains these facts.

The native language filter is separate from interface language. Explicit Spanish
searches with `lang=es` returned Spanish results. Individual providers can still
fail, give sparse results, or order results poorly; the change does not promise
universal coverage. Some native controls and Settings strings still fall back to English.

## Reproduction, verification and recovery

Run the original `configure-degoog.mjs` for an initial installation, then
`node deployment/community/configure-degoog-search.mjs`. The latter creates a
mode-0700 private backup of the existing settings and updates only the necessary
native engine settings and privacy panel. Recreate **only** `degoog` using the
existing `deployment/community/compose.evaluation.yaml`; its read-only module
mount and the exact outgoing-host allowlist must both be present.

`node deployment/community/check-degoog-search.mjs` checks public desktop,
390-pixel Spanish and 320-pixel returning-browser flows, meaningful result
counts, no book pollution in Web, proxied thumbnails, no external browser
requests, no script/HTTP failures, no horizontal overflow, retained saved engine
preferences, Spanish web queries, Books, IT, the no-JavaScript search and protected
operator/private-proxy paths. Screenshots and measured results are private under
`/opt/utilibre/reports/degoog-search-20261009/`; only public queries are used.

Before deployment, a disposable loopback candidate returned 20 useful CSE links
for both Guatemala tourism and boiling eggs, 28 merged Berlin weather results,
and 38 Spanish egg-query results. These are sample functionality checks, not a
load test or an uptime guarantee. The final public desktop/mobile/returning-browser checks returned 48, 22 and
20 useful Web results. Public API checks returned 28 Berlin weather results,
38 Spanish egg-query results, 10 book entries and 30 IT results. Repeated cached
API reads took 107–456 ms; these are cache timings, not cold-provider latency.
Native no-JavaScript GET and form POST both passed. Operator endpoints remained
404 and an unsigned private-address image request remained 403. The native
allowlist also rejects loopback, private/link-local destinations, non-HTTP URLs
and hostname suffix tricks. At idle, the app used about 68 MiB of its 512 MiB
ceiling and the gateway about 3 MiB of 64 MiB. No capacity claim follows from
these modest functional checks.

Rollback: restore the saved `server-settings.json` and `plugin-settings.json`
from the dated `degoog-before-general-search-*` backup, restore the previous
`SOURCE.json`, remove only the newly added Google bridge/trait files, restore the
previous outgoing-host line and gateway POST allowlist, and recreate only
DeGoog, then validate/reload its gateway. Existing user browser
preferences and durable operational configuration must not be deleted. The
unchanged pinned DeGoog image and the previous public source archive are retained.

Primary references: [DeGoog's supported SearXNG engines](https://github.com/degoog-org/degoog/blob/4a9bcc74f0fceaa33efbab4777f063274cce23d6/src/server/extensions/compatibility-layer/searx/catalog.ts),
[pinned CSE engine](https://github.com/searxng/searxng/blob/d48c4b555421e824342c51d68482dd0898e54d0f/searx/engines/google_cse.py),
[pinned engine source licence](https://github.com/searxng/searxng/blob/d48c4b555421e824342c51d68482dd0898e54d0f/LICENSE).
