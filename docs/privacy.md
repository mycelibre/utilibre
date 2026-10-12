# Privacy and data handling

This document describes the reviewed deployment and identifies remaining verification limits. It is not an
anonymity, confidentiality, availability, or forensic-erasure guarantee.
Utilibre changes which server handles a task; it does not remove every network
intermediary or make an operator unable to access server-side data.

## Current verification — October 8, 2026

The live English/Spanish privacy page and tool details distinguish the following
boundaries. These are scoped observations, not a whole-provider privacy audit.

| Flow | Verified behavior and limits |
| --- | --- |
| External translation | Native TransLite desktop/mobile POST workflows passed for English/Spanish, including the four configured providers. Browser requests stayed on the Utilibre origin, but **the backend sends plaintext to each selected provider**. No-store responses, 2,000-character input bound and secure session cookies passed. Sessions reset after five minutes of inactivity and are collected on later requests. The 9 October endpoint review below distinguishes provider policies from still-unverified edge retention. |
| ntfy delivery | One fictional message reached an independently connected, unauthenticated subscriber and was readable by another anonymous history request. A topic is not an authenticated private channel. The response declared 3,600-second expiry; native cleanup runs periodically and can lag expiry. The cache is RAM-only. No Firebase credentials, upstream iOS relay, browser Web Push, mail, calls or attachments are configured. No real recipient was contacted. |
| Anubis challenge | Desktop-Chrome browser-identity test completed the native challenge. Verification/auth cookies expire after 30 minutes/24 hours and have host-only, Secure, HttpOnly, SameSite=Lax and Partitioned attributes. The unchanged bot policy rejects the default HeadlessChrome identity. Native bbolt access rejects logically expired records and performs an hourly sweep; freed pages are not secure erasure. |
| Shared content | WBO links allow read/write; Pollaris management links grant management; ntfy topic names allow both reading/publishing. PrivateBin/Yopass and CryptPad sharing links can carry decryption capabilities. LiberaForms encrypts answers to creator keys; form questions and metadata are not protected the same way. Native account/team/document permissions still apply to CVs, Penpot and Actual. |
| Meeting relay | Four synthetic external browsers received each other's audio/video over UDP, TCP and TLS TURN. Utilibre operates both SFU and relay. Media is encrypted in transit, not end-to-end against the SFU. Cloudflare carries HTTPS signaling; its STUN service sees discovery metadata. TURN is authenticated, expiring and limited to Galene as a peer. No server recording; participants may record independently. |

The PrivateBin restore test recovered and decrypted a fictional paste using its
original fragment key in a separate native instance; an unkeyed browser did not
show its plaintext. A restored CryptPad instance likewise decrypted a synthetic
collaborative document with recovered browser state. These checks do not make
links safe to publish, recall recipients' copies, or protect against compromised
application code supplied by the operator.

Reproducible checks: `deployment/community/check-translite.mjs`,
`scripts/check-notification-boundary.mjs`, `scripts/check-challenge-boundary.mjs`,
`deployment/utilibre/tests/check-privatebin-restore.mjs`,
`deployment/pack/check-restored-pad.mjs` and the relay checks documented in
`deployment/pack/turn/README.md`. Private results are under
`/opt/utilibre/reports/readiness-20261008/`; never publish cookie values,
invitation URLs, document keys, private backup contents or raw authentication logs.

Provider documentation: [ntfy configuration](https://docs.ntfy.sh/config/),
[Anubis pinned bbolt implementation](https://github.com/TecharoHQ/anubis/blob/d39e26cedcc96bea5e4915297c756e7eec74aaf7/lib/store/bbolt/bbolt.go),
[Galene operation](https://galene.org/galene.html). Configuration and the tested
paths above determine the deployed behavior; upstream documentation alone is
not evidence that an optional feature is enabled.

## Summary

Excalidraw, SVGEdit, CyberChef and Image Scrubber also process task contents in
the browser. Excalidraw cloud collaboration/export, remote SVG imports and
CyberChef network operations are disabled; resources are served locally. Browser
storage can retain drawings/preferences, and explicitly shared CyberChef recipe
links can contain input. Image Scrubber exports a new PNG, leaves the original
unchanged and does not guarantee anonymity. The Cloudflare edge still processes
application-delivery metadata/security requests. See each tool's catalog help
for limits; these statements do not cover every possible untested operation.

The expanded toolbox and its per-tool disclosures are documented in
[the deployment review](toolbox-review.md) and the portal's tool details.
Browser-based processing does not mean that page requests, model downloads
or signaling connections are invisible to the hosting infrastructure.

ZIP Manager, RAWGraphs, AudioMass and miniPaint process selected files locally.
Their tested paths use same-origin assets; RAWGraphs analytics/remote imports
and miniPaint web fonts/remote image imports are disabled. AudioMass requests
microphone permission only when recording is selected. Browser preferences,
cached code and local drafts can survive closing a tab; they are not cloud
backups. Do not save default ZIP passwords on shared devices. Cloudflare's
same-origin security processing remains part of the public delivery boundary.
OmniTools 0.6.0-p6 mirrors the reviewed processing components locally: FFmpeg,
Monaco, compression, Tesseract with EN/ES data and IMG.LY. Six featured workflows
produced outputs without outside requests or content uploads in the October 8
check. That result does not certify every optional operation. See the scoped
checks and pinned runtime assets in [the service-pack review](service-pack.md).

Approved-account pilots use Authentik at `auth.utilibre.org`. It stores email,
name, password hashes, authenticator settings, sessions and authentication
events (configured for 30 days; container logs rotate by size). Email recovery
uses the configured mail relay and requires the existing authenticator.
App-specific sessions can survive identity-provider logout: signing out of
Utilibre is not a promise of immediate logout from every tool.

Reactive Resume stores CVs/assets and Penpot stores designs/team permissions.
Reactive Resume's public view/download analytics were disabled in the deployed
`6.0.0-p1` image on 8 October. The correction stops identifier derivation,
deduplication and new statistics, removes the browser download event and owner
statistics widget, and preserves native CV sharing/export. Earlier aggregate
counters may remain in live storage and backups; no real historical rows were
deleted. See `reactive-resume-privacy-2026-10-08.md` for the source patch,
isolated restore and fictional public-flow checks.
Actual synchronizes budgets; its optional end-to-end encryption must be enabled
by the user and is not automatic. Administrators can access unencrypted
server data. Wakapi stores editor-supplied activity metadata. Its native cleanup
uses a three-month window for raw heartbeats, derived durations and summaries,
not only raw events; cleanup runs periodically. Account settings are separate.
Leaderboards and automatic WakaTime imports are disabled.
Native heartbeat API uploads remain available; the supported raw CSV export and
upload scripts were checked with one current fictional heartbeat on October 8. Sharing starts
private in the tested account pilots. The inspected application snapshots are
on this VM; the owner confirmed a separate VM backup on October 9, but its
off-host location/restore have not been inspected. Keep independent exports.
For account deletion or lost MFA, contact
`admin@utilibre.org` without sending passwords or private documents.

| Surface | Utilibre receives | External recipients | Persistent state |
| --- | --- | --- | --- |
| Portal | Page/config/status requests and ordinary connection metadata | Cloudflare and the edge process public traffic | No account or request-history database |
| SearXNG | Search terms, options, preferences, headers, and limiter address | Selected search engines receive the query from the application VM | Re-creatable cache; optional browser preference cookie; limiter state is ephemeral |
| Redlib | Requested Reddit path, headers, challenge state, and optional preference cookie | Reddit receives corresponding server-side requests | Anubis challenge database/signing key and browser cookies; no Redlib content database |
| FreshRSS | Account credentials, subscriptions, reading state, preferences, API requests, and imports | Subscribed feed origins and source sites reached through internal RSSHub | FreshRSS files and PostgreSQL account/feed state |
| PrivateBin | Ciphertext, expiry/deletion metadata, request size, and ordinary connection metadata | No content recipient is required beyond the public ingress path | Ciphertext and metadata until expiry or deletion |
| Internal RSSHub | Route requests made from FreshRSS | Source sites used by the requested route | Re-creatable Valkey cache; no public account data store |

The 12 October 19:11:16 UTC authenticated, read-only DNS configuration check
confirmed proxied apex/wildcard records. `search` now has explicit proxied A and
AAAA records; `binternet`, `newsletters` and `aliases` have explicit proxied A
records. This supersedes the 9 October DNS-only classification of those four
web hosts: their configured HTTPS path includes Cloudflare, where ordinary HTTP
content is visible at TLS termination. `translate` and `trip` have no explicit
records and inherit the proxied wildcard. `turn` and `mumble` still have DNS-only
A records for their native TCP/UDP services. A separate 19:13:10 UTC check
confirmed `speed.utilibre.org` retains its DNS-only A record for direct HTTPS
speed measurements. Binternet's onion service uses Tor
without the public HTTPS edge. SMTP routing is separate and is not established
by a web host's proxy flag. The earlier public response checks remain separate
evidence of actual HTTP routing; a DNS record alone does not verify every edge
setting.

Proxied HTTPS traffic reaches Cloudflare, then the separate Caddy edge, then the
application VM. Ordinary HTTP payloads can be read at TLS termination. Browser-
encrypted payloads such as PrivateBin ciphertext remain encrypted at those
terminators in the normal application flow; metadata is still visible. The
operator confirmed on 8 October that the application and Caddy edge VMs share
the same physical Hetzner server in Germany. The Caddy logging correction is
owner-applied, without an independently checked post-change runtime result;
server location alone does not establish the operator's legal jurisdiction. Each tool's disclosure
identifies its actual path. Edge handling and retention depend
on operator configuration outside these Compose projects. Network Error
Logging headers (`NEL` and `Report-To`) were absent in the October 8 reachable-
host audit. This checks the observed response headers, not every provider-side
logging or telemetry setting. The 12 October GET-only configuration audit could
read zone settings, cache/WAF entrypoints and all 15 Web Analytics site records.
NEL and Utilibre Web Analytics remain disabled. All three enabled custom Skip
rules have matching-request logging disabled; a separate enabled Block rule has
no explicit logging field, so this is not a claim that blocked requests or other
security events are never logged. Provider internal operational/security
retention remains unverified;
do not publish a deletion duration. See the current evidence below and
[Cloudflare proxy status](https://developers.cloudflare.com/dns/proxy-status/)
for the DNS-only/HTTP-proxy distinction, not evidence of Utilibre's settings.

## Provider policy and endpoint review, 9 October 2026 (Cloudflare configuration refreshed 12 October)

This review reads selected configuration and public primary policies, not user
content or provider logs. It changes disclosure only; services, useful caches,
providers and backup retention stay unchanged by this review. The fresh compact
DNS result is private at
`/opt/utilibre/reports/cloudflare-dns-recheck-20261012T1912Z.json`; it contains
only the ten reviewed hostnames, record types, proxy flags and completeness
checks, without IP addresses, record contents, identifiers or API credentials.
The supplemental speed-host check is
`/opt/utilibre/reports/cloudflare-speed-dns-recheck-20261012.json` with the same
limited output. No unrelated zones or mail-provider records were enumerated.
The 9 October snapshot remains historical evidence at
`/opt/utilibre/reports/provider-facts-20261009/cloudflare-dns.json`.

| Installed product / endpoint | Verified fact and policy scope | Remaining limit |
| --- | --- | --- |
| Cloudflare HTTPS proxy / authoritative DNS | Proxied and DNS-only records are distinguished above and in the bilingual privacy page. The 12 October 19:08:16 UTC audit verified the active Free Website zone, readable settings and all 15 Web Analytics site records. NEL and Utilibre Web Analytics are disabled. Three enabled Skip rules have matching-request logging disabled; the fourth enabled custom rule is Block with no explicit logging field. [Product documentation](https://developers.cloudflare.com/dns/proxy-status/) explains the traffic distinction. | Logpull is unavailable on this plan. Both zone/account Logpush job-list requests returned 403/code 10000; the owner reports Logpush is unused, which is not independently verified. The 11 October Caddy correction is owner-applied, without an independently checked post-change runtime result. Other security/operational logging and exact edge/provider retention remain unverified. |
| Cloudflare public STUN | Galene uses `stun.cloudflare.com:3478` plus Utilibre's own authenticated UDP/TLS TURN. PairDrop switched to Utilibre-only STUN/TURN on 11 October; `WS_FALLBACK=false` remains. The [Realtime FAQ](https://developers.cloudflare.com/realtime/turn/faq/) confirms Galene's free STUN endpoint. | No verified Cloudflare STUN-metadata deletion deadline. Cloudflare TURN assurances are not proof of STUN retention or a policy for Utilibre-operated TURN. PairDrop's HTTPS signaling still crosses its Cloudflare proxy. |
| Server-side recursive DNS | TRIP, 13ft and Unfurl configure 1.1.1.1 and 9.9.9.9 for approved outbound hostname resolution. The [Cloudflare resolver policy](https://developers.cloudflare.com/1.1.1.1/privacy/public-dns-resolver/) specifies ordinary-log deletion within 25 hours, separate packet sampling, indefinitely retained aggregates and limited research sharing with APNIC. [Quad9](https://quad9.net/privacy/policy/) distinguishes aggregate query statistics from routine user-IP logging and security exceptions. | These are provider statements for recursive DNS, not audited deletion or promises about authoritative DNS, HTTPS, STUN, submitted URLs or content. |
| TransLite 7b4b8e5-p3 (unchanged p2 parsers) | The p2 parser verification remains applicable: p3 changes the bilingual provider notice, not the parsers or selected endpoints. Reviewed parser hashes match the installed source: consumer Google `translate_a/single`, free DeepL `www2.deepl.com/jsonrpc`, Yandex `tr.json/translate`, and DuckDuckGo `translation.js`. [DuckDuckGo](https://duckduckgo.com/duckduckgo-help-pages/results/translation) identifies Microsoft downstream. [DeepL section 3](https://www.deepl.com/en/privacy) permits free-service model improvement and prohibits personal data; paid/API assurances do not describe this configured endpoint. Yandex receives the text as a URL query value even though the native call uses POST. | No single content/metadata deletion deadline is established for these endpoints. [Google](https://policies.google.com/privacy) and [Yandex](https://yandex.com/legal/confidential/en/) describe purpose-dependent retention. A provider URL log could include submitted Yandex text; logging there was not inspected. |
| Addy 1.7.3 / local PMG | Mail and attachments are readable during local forwarding and by the destination mail provider. The 12 October DNS check marks the HTTPS hostname as Cloudflare-proxied, superseding its former DNS-only classification; this exposes ordinary web requests at Cloudflare's TLS termination, not a claim that SMTP mail transits its HTTP proxy. Hetzner hosts the application and Caddy VMs in Germany. Native local DKIM/SPF/DMARC verification is deployed with DNS lookups, stripped untrusted decision headers and no external content scanner. The owner confirmed one native forward to Gmail with SPF/DKIM/DMARC passing via PMG selector `pmg`, then receipt of the native Gmail reply in the original sender’s inbox. Separately retained Postfix Spamhaus DNSBL checks send client-IP and mail-domain metadata through the configured resolver, not message bodies; an open-resolver warning prevents a blanket working-filter claim. [Deployment and authentication evidence](addy-deployment-2026-10-09.md#deployed-reply-authentication-1432-utc) distinguishes the seven isolated cases from that delivery test. | The controlled exchange does not establish every sender/provider’s delivery. Application encryption-at-rest keys are operator-held; this is not zero-knowledge mail. Local verifier error logs, mail queue/failed-delivery records and same-VM backups have the separate retention described in the deployment record; gateway, resolver, Spamhaus and destination-provider retention is not established by these tests. |
| TRIP map/search/routing | Browser OSMF/Fastly tiles, server Photon search and FOSSGIS routes have distinct recipients, conditions and request limits. Primary policies and exact installed controls are recorded in [TRIP's review](trip-review-2026-10-09.md#provider-policy-fit). | No current endpoint-specific deletion deadline was established for OSMF tile logs, Photon API queries or FOSSGIS route logs. An OSMF analytics period is not a tile-log period. |
| Private LibreMDB 4.5.0-p1 | The chosen native backend is IMDb's internal GraphQL endpoint, not a licensed dataset/API integration. Current [data-use conditions](https://help.imdb.com/article/imdb/general-information/can-i-use-imdb-data-in-my-software/G5JTRESSHJBBHTGX) and its response disclaimer do not establish permission for public operation. Technical/private checks are recorded in [the frontend review](frontend-reliability-2026-10-09.md#libremdb-functioning-private-build-distinct-provider-condition). | Permission covering Utilibre's public use is unverified. No permission request, provider replacement or public activation was performed. This is separate from the program's software licence. |

DuckDuckGo's translation help states that Microsoft does not store the search
translation text/language pair. That is a provider statement about that feature,
not proof that Utilibre/edge requests are anonymous or that text cannot identify
someone. The portal names the actual downstream recipient and links the policy
without promising universal non-retention. The same bilingual TransLite warning
is now live in its existing header patch as `7b4b8e5-p3`; the scoped deployment
and public desktop/mobile checks are recorded in
[native wording verification](native-wording-2026-10-09.md#deployed-provider-clarification-9-october).

Verification: portal TypeScript and targeted ESLint checks pass; 27 existing
locale/route tests pass. Existing public-page EN/ES checks pass on desktop and
mobile (two browser cases, 13.6 seconds). The browser harness used supported
Vite polling after the host watcher limit prevented its first start; no host
limits were changed. Native TransLite PHP syntax and complete reverse patch
applicability pass. The subsequent p3 release passed public1280px and390px checks
of both language notices, with no overflow, page errors or outside browser
requests in that page-view test. Its provider parsers, PHP/session settings and
gateway are unchanged from p2. No translation text was sent for the p3 notice
check; the earlier native translation-flow evidence remains distinct. No map
query, message or user-data mutation was performed for this provider-copy review.

## Current configuration evidence, 12 October

The 9 October 16:01 and 17:20 permission-denied reports are historical. After the
owner corrected access, the zone identity/settings, custom WAF entrypoint and
Web Analytics configuration reads succeeded. A fresh GET-only check completed
at **2026-10-12 19:08:16 UTC**, after checking the VM clock against the current
UTC clock. The credential remains in a
root-only 0700 directory under `/opt/utilibre/provider-secrets`; files are 0600.
Neither token, account/zone IDs nor private setup history belongs in Git.

The corrected auditor reads every Web Analytics page (bounded to 20 pages),
deduplicates site IDs internally and uses `ruleset.enabled`, not a nonexistent
top-level enablement field. An incomplete list, missing record or unknown field
is not treated as disabled. The latest read covers **15 of 15** site records.
It prints neither unrelated site names nor site/account/zone identifiers.

| Configuration | Observed result | Scope |
| --- | --- | --- |
| Web Analytics | Utilibre ruleset `enabled=false`, `lite=false`; stored `auto_install=true` | Effective ruleset disabled, independently checked after the owner's dashboard change. The stored installation mode is not the enablement flag. |
| NEL | `enabled=false` | This optional reporting setting is disabled, not proof that the provider keeps no other logs. |
| Browser/security/cache settings | Integrity check on, security medium, browser TTL 14,400 seconds, cache level aggressive | Read-only observations; unchanged. |
| Custom cache-phase entrypoint | 404 / code 10003 | No entrypoint found in that phase; not a permissions denial or a complete audit of every cache mechanism. |
| Custom WAF entrypoint | Four enabled rules: three Skip rules with matching-request logging **disabled**, plus one Block rule with no explicit logging field | Configuration observed on 12 October; no rule was changed. The absent field on the Block rule is not evidence that its requests or other security events are unlogged. |
| Logpull | Verified Free Website plan | [Unavailable on this plan](https://developers.cloudflare.com/logs/logpull/), not a missing read grant. This does not describe internal security/operational logs. |
| Logpush | Zone and account job-list requests both return 403 / code 10000 | The owner says it is unused; this remains owner-reported. [Listing jobs requires Logs Write](https://developers.cloudflare.com/logs/logpush/permissions/), so the requested read permissions do not independently verify an empty list. No write access is requested. |

Fresh sanitized evidence is
`/opt/utilibre/reports/cloudflare-config-recheck-20261012T1907Z.json`.
The checker reports no privacy findings; its exit status is 2 solely because
the two Logpush configuration requests were denied. Nine focused checker tests
pass. No provider settings, useful caching, credentials, retention or services
were changed. The older successful audit is
`/opt/utilibre/reports/provider-facts-20261009/cloudflare-corrected-audit.json`.
Earlier before/after dashboard observations are in that same historical directory,
including `cloudflare-analytics-after-disable-2026-10-09T17-42-06-288Z.json`.
Only configuration was read; no visitor logs or analytics reports were fetched.

Repeat the configuration check from the repository, using a new report filename:

```sh
node --test scripts/tests/cloudflare-privacy.test.mjs
node scripts/check-cloudflare-privacy.mjs /opt/utilibre/reports/cloudflare-config-recheck.json --logpush-owner-not-used
```

The Logpush option records the owner's statement explicitly; it is not a remote
verification. Do not reuse it if the operator later enables that product.
The checker does not change provider settings. No assertion of provider-wide
zero tracking or log deletion follows from a successful configuration read.

### Completed Cloudflare correction, 9 October

The owner turned **Log matching requests** off in **Security → Security rules →
Custom rules**. The rule must remain enabled with its expression and skipped
products unchanged. A GET-only recheck verified that state at 18:06:47 UTC;
private evidence is `cloudflare-owner-rule-check-1791569207916.json` in the
provider-facts directory above. No visitor logs were fetched.
Cloudflare's [skip-option documentation](https://developers.cloudflare.com/waf/custom-rules/skip/options/#log-requests-matching-the-skip-rule)
describes this control separately from the security action.

`scripts/disable-cloudflare-skip-logging.mjs` is a dry-run-first alternative for
an operator with narrow Zone WAF Write access. `--apply` snapshots the current
rules privately, refuses an unexpected target count/concurrent change, submits
the existing full rule definition with only logging disabled, then checks all
rule definitions and ordering. Eight focused tests cover pagination, missing
evidence, data minimization and preserving security-rule fields. The attempted
production API write was denied; the subsequent owner dashboard correction is
now verified. No need to grant broad API privileges or repeat that change.

Rollback, if a later successful change requires it: restore only the prior
logging toggle on that same rule after reviewing the private snapshot. Do not
replace the entire ruleset or replay an old matching expression over newer work.
Turning logging back on reintroduces the disclosed privacy issue.

### Subsequent Cloudflare correction, 10 October

Cloudflare configuration was independently rechecked after the owner's
10 October correction: all three enabled custom Skip rules have matching-request
logging disabled, Utilibre Web Analytics is disabled (all 14 account records
covered), and NEL is disabled. The newly added sitemap/IndexNow rule had enabled
logging; the narrow API patch was denied with 403, so the owner changed only
that toggle. Rules remain enabled and ntfy's skip behavior is preserved.
The checker now treats enabled matching-request logging or analytics as a
privacy finding/nonzero exit, separate from successful API access. Nine focused
tests pass. Logpush remains owner-reported unused, not independently certified;
provider-internal retention remains outside these settings.

The 12 October results above supersede this dated site-count observation and
confirm that all three Skip rules still have matching-request logging disabled.

### Separate Caddy VM

11 October owner-supplied running configuration (Caddy **2.11.1**): both HTTP
servers omit access logging and have tracing/credential logging disabled. The
only returned logger is `default`, at `info`, writing to a **file** with empty
include/exclude lists. This establishes that ordinary access logging is off,
not that request details cannot appear in HTTP errors. The file destination,
historical contents/rotation and other installed modules were not inspected.
SSH access remains unavailable. The outstanding native correction is to add
the `exclude` line **inside the existing `log default` block**, preserving its
writer, other settings and the rest of the global block:

```caddy
log default {
    exclude http.log.access http.log.error
}
```

For each Utilibre site that already configures an access `log`, replace that
directive's writer with `output discard`. Additional named global loggers must
be inspected independently; default exclusions do not cover them. Keep debug
and HTTP tracing off. This is not proof that other installed modules, journal
history or provider infrastructure retain no information. Validate the existing
file before reload; do not replace the whole Caddyfile or its proxy settings.
The synthetic syntax fixture is `scripts/tests/fixtures/caddy-privacy.Caddyfile`,
checked with the locally available Caddy 2.11.7 parser. The initial strict test
was corrected to allow Caddy's additional native per-site exclusion; both
required exclusions and the discard writer are present.
The owner subsequently reported “Cddy is fixed” on 11 October after receiving
the exact exclusion and validate/reload command. Record this as **owner-applied**,
not independently verified: a post-change filtered runtime result showing both
exclusions has not been supplied. Do not enable access logging or create a
second `default` logger. No remote configuration or historical log deletion was
performed here. The prior read-only output is the pre-change state.

On the Caddy edge, an operator with local access can inspect only the running
logging configuration with the following read-only command, if its local admin
API uses the normal loopback endpoint. It prints no raw routes, headers,
credentials, log filenames, remote writer addresses or log records:

```sh
curl --fail --silent --show-error --max-time 10 http://127.0.0.1:2019/config/ |
  python3 -c '
import json, sys
c = json.load(sys.stdin)
writers = []
for log in c.get("logging", {}).get("logs", {}).values():
    writer = log.get("writer", {})
    writers.append({"level": log.get("level"), **{
        key: writer.get(key) for key in
        ("output", "roll", "roll_size_mb", "roll_keep", "roll_keep_days")
    }})
access = []
for server in c.get("apps", {}).get("http", {}).get("servers", {}).values():
    log = server.get("logs")
    access.append({
        "configured": log is not None,
        "configuredHostCount": len((log or {}).get("logger_names", {})),
        "skippedHostCount": len((log or {}).get("skip_hosts", [])),
        "skipUnmappedHosts": (log or {}).get("skip_unmapped_hosts")
    })
print(json.dumps({"configuredWriters": writers,
                  "httpAccessLogConfiguration": access}, indent=2))
'
```

This command was checked against synthetic configuration; the owner supplied
an equivalent filtered live result described above. A null field means omitted configuration, not disabled
logging or zero retention. Inspect that installed Caddy version's
[writer behavior](https://caddyserver.com/docs/caddyfile/directives/log), and the
systemd journal or container log driver if it writes to stdout/stderr. Size
rotation is not a fixed time limit. Do not enable or expose the admin API to run
this check; use its existing local transport or an equivalently filtered local
configuration if that endpoint is disabled.

## Portal

The portal sets no application cookie and includes no advertising, behavioral
analytics, tracking pixel, third-party script, or remote font. It has no
account or request-history database. Static requests can still be visible to
Cloudflare, the edge, host networking, and bounded application logs.

`/_portal/config` returns only sanitized public presentation values and enabled
service IDs. `/_portal/status` checks fixed internal targets and returns only
high-level state and a timestamp. Neither endpoint returns secrets, internal
addresses, response bodies, or resource details.

The browser-side Reddit URL router parses the supplied URL locally and creates
a link on the configured Redlib origin. It sends nothing until the visitor
opens that link.

## SearXNG searches

SearXNG receives the query, selected category/language/options, ordinary
headers, and the trusted client address needed for abuse limiting. It sends
the query and engine-specific parameters from the application VM to the
configured engines. Those engines see the application VM as the network
source, but still receive the query. Opening a result contacts the result site
directly.

The selected configuration uses HTML output and no public metrics or general
API formats. SearXNG's own access logging is expected to be disabled. A local
source-visible Python hook reduces accidental query disclosure in rendered
log records, but it is not proof that every future upstream code path will
redact every value. Review logs and the hook on every upgrade.

The root Valkey contains ephemeral limiter state and is not a query-history
database. Restarting it clears counters and can weaken limiting temporarily.
The SearXNG cache is re-creatable and is excluded from routine user-data
backups.

## Redlib and Anubis

A new ordinary browser normally completes Anubis's first-party challenge
before a request reaches Redlib. Anubis processes the requested path, network
address, user agent, ordinary headers, challenge state, and its authorization
cookie. It stores short-lived challenge records in a bbolt file and uses a
stable signing key. Freed database pages can remain until compaction even
after logical expiry.

Accepted requests reach Redlib, which receives the requested community, post,
search, settings, or media path and any optional Redlib preference cookie.
Redlib contacts Reddit from the application VM and proxies rendered content
and media back through Utilibre.

The upstream implementation emulates an official Reddit Android client and
browser/TLS behavior to obtain access. Reddit therefore receives emulated
client/device identity, tokens, requested content, and timing from the server.
Visitors do not supply a personal Reddit account to Utilibre. Reddit may block
the mechanism without notice.

Redlib has no database or persistent content volume. OAuth/device state is
process-local. Optional preferences and subscriptions can live in long-lived
browser cookies; they are not a Redlib account. Edge and application logging
must not retain full Redlib paths, queries, referrers, or cookies.

## FreshRSS accounts and feeds

FreshRSS is a persistent account service. It stores usernames, password
verifiers, configuration, feed subscriptions, reading/favorite state, labels,
and application metadata in its files and PostgreSQL. Depending on how a user
configures a feed, stored URLs or credentials can themselves be sensitive.
Users should not embed reusable credentials in feed URLs unless the risk is
understood.

FreshRSS contacts subscribed origins from the application VM on its refresh
schedule. Those sites receive the server's network address, requested feed
path, headers, and timing. Feed contents are stored and indexed for the user's
reader experience. The operator can technically access the application files,
database, logs, and backups; this must be stated before account requests open.

FreshRSS remains limited to existing/operator-provisioned accounts with public
registration closed. OPML exports subscriptions/categories, not article contents
or reading state. The native article export is separate. Deleting an account
from the live service does not rewrite older backups; the core backup policy is
seven daily and four Sunday weekly generations, not guaranteed calendar days.
Manual snapshots also consume generation slots.

## Internal RSSHub

RSSHub has no host port or public route. FreshRSS requests it over the internal
Docker network; RSSHub then contacts the route's source sites from the
application VM and may cache results in the private Valkey. Source sites see
the requested path, server address, headers, and timing.

The intended use is a set of operator-approved feeds, but stock RSSHub does
not enforce a route allowlist. A FreshRSS user able to submit an arbitrary URL
may be able to request other routes by Docker service name. Resolve or
explicitly contain that privacy/egress surface before unrelated-user accounts
open. The cache is re-creatable and ephemeral. Logs can still reveal route
names or source failures, so keep them bounded and do not place private
credentials in routes without a separate review.

## PrivateBin

PrivateBin encrypts and decrypts paste content in the browser. The HTTP request
contains ciphertext and metadata but not the URL fragment carrying the
decryption key; URL fragments are not sent to servers in ordinary HTTP
requests. Anyone who obtains the complete paste URL can normally decrypt its
content.

The server and ingress can observe connection metadata, timing, ciphertext
size, expiry, and paste/deletion requests. The configured service stores
ciphertext on the VM. Attachments are allowed up to 25 MB total (25,000,000
raw bytes) in the browser; the server enforces a 35,000,000-byte ciphertext
limit because it cannot inspect encrypted files. Discussion remains disabled.
Expiry defaults to one day; choices are five minutes, ten minutes, one hour,
one day or one week. The upstream forever
choice is not configured here. Preserve the native deletion link shown after
creation to delete a paste early. Expired records cannot be retrieved through
the app; a native cleanup command runs every minute while the service is
available. Request-triggered cleanup remains enabled as well. Logical expiry
is not proof of immediate physical erasure. New application backups exclude
these pastes and attachments; earlier and externally managed whole-VM snapshots
may still contain them. See [backup boundaries](backups.md). Creation pauses
below 5 GiB of available VM filesystem space; retrieval/deletion remain enabled.
This is an emergency headroom check, not a reserved allocation or per-user quota.

Normal decryption requires the fragment key and any separately configured
password. A compromised application delivery path could supply malicious code;
this is not an absolute claim that plaintext can never be exposed. Abuse response relies
on metadata, deletion capability, rate/size/expiry limits, and reports that
identify a paste safely. Do not ask a reporter to publish a full sensitive URL
in a public issue.

## Logs and operational measurement

The October 8 runtime inspection found logging disabled or bounded Docker
`json-file` rotation: three 10 MB files or two 5 MB files, depending on the
service. PrivateBin container logging is disabled; Yopass and ntfy use
three 10 MB files. PairDrop and its separate relay container logging are disabled
as of 11 October, and coturn request logs go to `/dev/null`. That does not prove application-internal, system, edge or
provider logs are absent. Journald has no verified time-retention limit in this
review. A size rotation is not a promise of a fixed number of days. Keep log levels
conservative and do not enable full access logs merely to count visitors.

Aggregate service health, bytes, error rates, challenge outcomes, container
resource use, database size, and disk pressure are sufficient for most
operations. If additional metrics are retained, document them and avoid
client-address, path, query, cookie, user-agent, or session labels.

## Backups, deletion, and retirement

Routine user-data backups now cover identity, account applications, community
services, CryptPad, LiberaForms, Galene/TURN, FreshRSS and PrivateBin as listed in
[the current restore matrix](backups.md). Pack snapshots use authenticated
encryption; other current on-host sets are root-restricted plaintext archives.
Keys and backups remain on this VM, so loss of the VM can lose both. Operators
can access these backups; neither encryption nor file permissions provide
operator-blind storage. SearXNG and
RSSHub caches are not user-data backups.

Live deletion, backup expiry, account export, and whole-service retirement are
different operations. The exact procedures and limitations are in
[`backups.md`](backups.md). For a planned closure, Utilibre aims to announce it in advance and keep export
options available for a reasonable transition period where feasible. An
unexpected outage or loss of infrastructure may prevent advance notice or
continued access. Users need independent copies. The status application runs on
the same VM and cannot independently report a complete VM outage; the existing
GitHub repository is an external announcement route, not an uptime guarantee.

## Incident response

If logs or backups may contain sensitive data, restrict access, preserve only
what is necessary for investigation, rotate affected credentials, and avoid
copying raw material into public issues. Use the existing operator mailbox and verified GitHub private advisory intake
listed in the security policy; correspondence retention is a separate unverified
fact and reports must stay out of public issues. Never promise confidentiality that the ingress provider,
operator access, upstream applications, or backups cannot technically provide.

## October 8 addendum evidence and retention record

This extends the existing catalog disclosures rather than establishing another
service database. Values below were compared with mounted configuration and
selected runtime settings; no real content, keys or user records were inspected
for these checks. Export/import/deletion procedures belong to the existing
bilingual `/en/your-data` and `/es/your-data` guides. Tested restoration scope is
recorded in [backups.md](backups.md), not inferred from the existence of an export.

| Service / reviewed version | Processing, retained content and providers | Active / backup retention; native controls | Evidence and October 8 result |
| --- | --- | --- | --- |
| hat.sh 2.3.6 | Local file encryption/decryption; no application upload or server copy. Application delivery uses the HTTPS ingress. | Downloaded files remain until their owner deletes them. Keep required passwords/keys; operator deletion by item ID does not exist. Browser storage is distinct from downloaded files. | Pinned static build, catalog local workflow; no upload endpoint introduced. |
| PrivateBin 2.0.6 | Browser-encrypted text, files and filenames; expiry/deletion metadata on the VM; HTTP excludes the fragment key. | 25 MB total browser attachment limit; 35 MB server ciphertext limit. Default 1 day, maximum 1 week; creator deletion and optional burn-after-reading. Native expiry cleanup each minute while available. New application backups exclude content; historical/whole-VM snapshots may retain it. | Public 25 MB upload/download/hash/deletion and lifetime checks passed on 10 October. Isolated expired-record purge and configuration-only recovery passed. See `privatebin-uploads-2026-10-10.md`; not a physical-device or uptime test. Container logging disabled; separate edge retention remains unverified. |
| Yopass 14.10.0 | Browser-encrypted short text; ciphertext in persistence-disabled Valkey RAM; connection metadata is separate. | Forced first retrieval or 1h; 10 KB encrypted payload; no file uploads. No durable secret backup. Native DELETE `/secret/{id}` deletes before retrieval without requiring the decryption fragment on this instance. | `deployment/community/compose.yaml`, pinned `pkg/server/secret.go`; public browser synthetic fixture create/status/delete/status = 200/200/204/404. Fixture removed; report `content-review-20261008/yopass-delete.json`. |
| PairDrop 1.11.2 + coturn 4.7.0-p1 | Direct or relayed browser-to-browser encrypted WebRTC files; Utilibre signaling, STUN and TURN. Cloudflare carries HTTPS signaling. `WS_FALLBACK=false`; the separate WebSocket fallback would expose files to its server. | Signaling/allocation state temporary; pairing persists locally and receiver downloads remain. No server file archive/backup. Eight relay allocations with rate/reservation caps; public static credentials are not individual authorization. App/relay container logs disabled; separate edge/provider retention remains unverified. | 11 October: native private-peer/firewall/quota/TLS checks, direct transfer, external UDP/TCP/TLS forced relay and one-relayed/one-direct file tests passed. See `deployment/community/turn/README.md`. Real phones, separate restrictive-client networks and throughput remain untested. |
| ntfy 2.28.0 | Server-readable notifications/topics through HTTPS ingress; anyone knowing a topic can read/publish. No auth DB, login, reservations or protected topics. | RAM message expiry 1h, periodic cleanup may lag; subscribers can retain copies. No attachments, mail/phone delivery, Firebase, iOS upstream relay or browser Web Push configured. No durable message backup. | Mounted `ntfy.yml` and earlier unauthenticated two-subscriber/history test; warning logs rotate by size. |
| FreshRSS 1.29.1 | Accounts, feed subscriptions/articles/state on Utilibre; selected feed origins receive backend fetches. | Account/feed-specific native deletion and feed retention; no invented global duration. Core backups: 7 daily + 4 weekly generations. OPML is subscriptions/categories, not a full account backup. | Pinned native export service; disposable-account OPML export/re-import passed. Full account recovery has separate native PostgreSQL/files restore evidence. |
| CryptPad 2026.9.0 | Browser-encrypted documents; account/storage metadata and browser key material remain functional data. | Native settings: inactive unpinned docs 90d, archive 15d, inactive accounts 365d; document ownership/sharing controls apply. Pack backups have no automatic deletion policy. | Mounted pack config and source; keys-only Backup must not be called independent document export. Separate native document-content export and restore coverage documented in guides. |
| Wakapi 2.18.1 | User-configured editor clients send activity metadata; not visitor analytics. Native sharing is opt-in; tested accounts private, public leaderboards disabled. | Native cleanup applies a 3-month window to raw heartbeats, durations and summaries; periodic deletion is distinct from account/settings retention. Automatic WakaTime imports disabled, normal API heartbeat uploads available. Expanded backups have no automatic deletion policy. | Live settings/source; native script/API raw CSV export and upload of one current fictional heartbeat into a second test account passed. Does not certify old-heartbeat imports or export of aggregates/settings. |
| Actual 26.10.0 | Local budget plus synchronized server copy; optional remote encryption must be enabled by user. Exports are separate downloaded copies and need protection. | User controls budgets; expanded backups have no automatic deletion policy. Compatibility depends on Actual version. | Source/native guide review; ZIP export/import test scope is recorded by the data-guide verification, not inferred here. No assertion that every Actual release is compatible. |
| FMD 0.17.0 | Encrypted device location/picture records, server-visible account/push metadata; map tiles and chosen push provider are separate connections. | 300 locations / 5 pictures per account; native location, picture and account deletion. Community backups have no automatic deletion policy. | Selected live config; synthetic account isolation/delete already passed. Android device workflow remains untested; do not infer it from server CRUD. |
| Rallly 4.15.4 | Organizer accounts, poll definitions, participant responses and comments are server-readable. Organizers use approved SSO accounts; guests can vote without an account. | Native poll management/deletion; community backups have no automatic deletion policy. Response CSV is distinct from the whole poll/account. | Actual image and Next.js version checked after the supported security update; pinned native export controls reviewed. The data guide records the precise fictional export check. |
| LiberaForms 4.11.1-p5 | Invited creator accounts and readable form questions/settings; required browser encryption protects answers to creator keys. Shared permissions and attachment handling need separate attention. | Native form/answer controls; pack backups have no automatic deletion policy. Key recovery is not equivalent to password recovery or a full form export. | Earlier synthetic encrypted answer, creator decryption, JSON export, second-account isolation and native database restoration passed; no untested whole-account portability claim. |
| Pollaris 1.2.3 | Readable poll/response data in PostgreSQL; optional mail relay notifications. Management links grant edit/delete authority. | Native closing-date expiry and management-link deletion; community backups have no automatic deletion policy. | Pinned Symfony controllers and `check-pollaris.mjs`; fictional CSV access/export/delete test passed. |
| Priviblur pinned 251a8e6 | Public Tumblr source content is cached; preferences use cookies. | Feed caches 1h, individual posts 15m, Valkey 96 MiB RAM only. Restart clears cache. Upstream/edge retention separate and unverified. | Mounted `priviblur.toml`, compose memory/no-persistence settings; useful cache preserved. |
| Mezzo 1.4.0 | Public Tenor GIF/search/profile metadata cached in memory. | GIF 2h/500 entries, search 20m/200, profile 1h/100. Periodic expiry; restart clears cache. Upstream/edge retention separate. | Actual `MEZZO_CACHE_*` runtime values checked against `compose.additions.yaml`. |
| GotHub pinned 24bedc8-p2 | Public GitHub responses cached by requested URL in memory. | 32 MiB response cache, 5m freshness; clears on restart. No blanket “source content is never stored” claim. | Pinned source patch `serve/serve.go` cache configuration; gateway separately controls access and noindex. |

Exact edge/system/provider log retention and guaranteed off-host recovery remain
unverified. The operator confirms mailbox receipt/monitoring and reports no
explicit mail-message/backup expiry settings; provider defaults and delegated
mailbox access remain unverified.
Only those claims stay unresolved. No retention was shortened, useful public
content cache removed, real user data deleted or analytics introduced to fit the copy.
Synthetic verification records are operational test data, not visitor analytics.

### Native FMD privacy page correction

The native `/privacy` and `/privacy?embedded=true` pages use the same corrected
EN/ES disclosure as the portal's FMD notes, including visible account metadata,
Cloudflare HTTP processing, browser OpenStreetMap tile requests, the selected
push provider, counted retention and backups without automatic expiry. The old
“not given to other parties”, “all important data is encrypted” and “all data”
export assurances are removed from this native page. It does not redirect the
Android registration flow or change native account/export controls.

The narrow four-file source patch and native web override are documented in
[source-patches.md](source-patches.md). A pre-change native community backup,
checksums and FMD SQLite integrity check support rollback. The old upstream
embedded web interface can be restored by removing only `--web-dir` and its
read-only volume, recreating the FMD service alone; restoring its database is
not needed for this presentation-only change. Remove the corresponding exact
`/privacy` gateway rewrite when reverting to the embedded build, which already
provides that route's fallback.

Production verification on 8 October 2026 passed four EN/ES normal/embedded
privacy cases, including native language switching, keyboard links, mobile
layout and no external page requests. The image digest, resource limits,
read-only filesystem and database schema were unchanged; SQLite integrity
passed. The public native API test exercised invitation protection, a fictional
opaque-record round trip and account isolation, then removed both test
accounts. The public FMD security discovery route redirects to the canonical
portal `security.txt` and returns HTTP 200 with the required text content type.

Wakapi scope evidence: pinned `services/housekeeping.go:CleanUserDataBefore`
deletes heartbeats, durations and summaries; `models/user.go:MinDataAge` applies
`DataRetentionMonths`. `WAKAPI_SUBSCRIPTIONS_ENABLED=false` prevents the upstream
paid-subscription retention exception. No cleanup was triggered manually and no
real activity was deleted for this review.
