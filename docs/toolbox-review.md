# Browser toolbox review — 2026-10-06

## Public-reader expansion checkpoint — October 6, after the edge update

### Latest checkpoint — October 6, LRCLIB replacement

**39 services are enabled: 38 web services plus password-protected Mumble.**
With the operator's approval to use suitable replacements, LRCLIB replaces
blocked Dumb at `https://lyrics.utilibre.org/`, using the existing LAN port3142.
The official [MIT frontend](https://github.com/tranxuanthang/lrclib-homepage/tree/f37c07042be1af5fdcc7932d090af32141089751)
uses the documented [LRCLIB search API](https://lrclib.net/docs) through a
bounded, read-only Utilibre adapter. No account/key is required. This provides
lyrics, not Genius annotations or a Genius URL redirector.

Public desktop/mobile search, lyrics preview, keyboard dismissal and recovery
states pass. Those workflows make no direct third-party browser requests.
CSP intentionally blocks Cloudflare's injected inline security script without
breaking the application. Application search logs are absent; edge/upstream
retention is separate. RAM cache:8MiB/128entries/ten-minute freshness;
sequential upstream calls, 500ms spacing, and Retry-After-aware backoff.
The browser dependency audit reports no production advisories; build-only
Tailwind/Vite tooling retains advisories and is not present in the serving image.
Upstream attribution/license and the pinned-source patch are retained.

No safe, verified drop-in was found for the remaining IMDb/Fandom/Imgur readers.
Phantom's current proxy validation needs security work and uses the same blocked
Fandom media source. Rimgu's maintainer recommends Rimgo. Watcharr changes the
movie offering to an account-based watched-list service. Details and reproduction
commands are in [expanded operations](expanded-operations.md#lyrics-replacement).
Off-site backups remain explicitly deferred; existing local schedules are unchanged.

### Previous checkpoint — October 6, QR/Gram/DeGoog launch

**38 services are enabled: 37 web services plus password-protected Mumble.**
Relevant public web workflows and Mumble's TCP voice fallback have passed;
public Mumble UDP audio remains unverified.
The current machine-readable inventory is
[`delivery-checklist.json`](../deployment/community/delivery-checklist.json).
Earlier checkpoints below are historical, not instructions to disable services.
The mobile category cue now derives its count from the nine actual categories;
the stale hard-coded "4 groups" text has been removed in both languages.

- **QR Tools:** public at `qrtools.utilibre.org:443`, backend3155, MIT build
  `0fde700-p2`. Fixed the code being drawn off-center inside its image, including
  worker/fallback rendering and SVG exports. Default margins now measure29pixels
  on all four sides. Public desktop/Spanish-mobile generation, decoding,
  PNG/SVG/PDF export, synthetic camera and offline tests pass. Versioned scripts
  and a new service-worker cache avoid stale Cloudflare/browser assets.
- **Kittygram:** public at `gram.utilibre.org`, backend3154. Actual profile,
  post, image and video workflows pass on desktop/mobile without third-party
  browser requests. Enabled in the portal and Kuma. No upstream Spanish UI exists.
- **DeGoog:** public at `degoog.utilibre.org`, restricted gateway3156; direct
  operator port3143 remains loopback-only. Official1.0.0 image identifies
  revision4a9bcc74. Native SearXNG compatibility loads pinnedAGPL engines
  Mwmbl, Open Library and Hacker News fromSearXNG d48c4b555; no code from the
  unlicensed extension repository is installed. Real search, Spanish/mobile,
  privacy and admin-route denial pass publicly. Native privacy text offers
  return/source links. Search cache is boundedRAM, indexer/favicon persistence
  are disabled, and application/gateway logs are disabled. The source archive
  includes the exact core revision, engines, licenses and deployment material.
- **Mumble:** the operator selected password protection. It is configured on
  `10.10.1.43:64738` TCP and UDP; correct/incorrect-password protocol tests pass.
  Public DNS changed to the direct IPv4 address during final checks. An independent
  Tor-routed check then passed public authentication and TCP voice loopback with
  the server certificate pinned. A valid 20 ms Opus silence packet was relayed
  exactly and separately decoded in Chromium. No other participant hears this
  loopback probe. The app VM's direct timeout is consistent with NAT reflection
  being absent, not proof of a public outage. Native client launch is enabled;
  public UDP voice remains unverified. Credentials are never put in launch URLs.
- **Rimgo:** HTTPS is reachable, but Imgur media still returns429. The gateway
  now removes the erroneous one-year cache header from errors, uses`no-store`
  and supplies`Retry-After`. A per-upstream cooldown prevents repeated requests
  for at least ten minutes, or longer when Imgur asks. This is not a playback fix.
  Cloudflare still has older cached errors: an existing media URL returned a
  cache HIT with the old one-year header, while a fresh cache key returned the
  corrected `no-store`/`Retry-After` response. Purge only the Rimgo hostname's
  cached content in Cloudflare; no Cloudflare API credential is available here.
- **Dumb:** inspecting the deployed binary confirms base revisionf558107 and
  Go1.26.8. Its build tree is markedmodified, so this is not a reproducibility
  claim. Genius403/human challenges persist even with an ordinary browser;
  replacing an already-current container does not resolve that denial.
- **BreezeWiki/LibreMDB:** a fresh BreezeWiki check confirms article text200
  but proxiedimage403. IMDb still requires responses the current reader cannot
  retrieve; the vulnerable old LibreMDB runtime remains stopped. No challenge
  solvers, shared login cookies, rotating proxies or direct-visitor image leakage
  were introduced to bypass these failures.

Account backups now run daily at04:40UTC; identity and expanded PostgreSQL/SQLite
restore rehearsals passed. Interrupted-run recovery and low-disk/failure alerts
are configured. A five-minute host watcher checks Kuma's web-service monitors
and Mumble's explicitly labeled private TCP monitor, plus
disk/inode/memory thresholds and sends verified-STARTTLS mail through
`10.10.1.20:26` while checking the certificate for`mx.mailgt.dev`. Its test was
accepted by the relay. This is not independent monitoring of a wholeVM outage;
backups remain on-host, not off-site. No old backups were deleted.

Public-directory changes for AnonymousOverflow and DeGoog were pushed to
`mycelibre` forks. Both actual PR-creation attempts were denied by GitHub token
permissions. [Prepared submissions](public-instance-submissions.md) distinguish
fork branches, submitted requests and published listings.

### Previous checkpoint — October 6, 18:00 UTC

This checkpoint supersedes older pending-route notes below. **34 services have
passed public HTTPS/workflow checks.** BiblioReads, 4get, AnonymousOverflow and
SafeTwitch are now public, enabled in the catalog, and monitored. The catalog has
43 records covering42 independently maintained applications and one integration.

- **BiblioReads:** `biblioreads.utilibre.org`, LAN3151, revision9508abc-p1.
  Node24/Next15/React19 source build; production npm audit reports zero advisories.
  Build-only PWA dependencies still have advisories; this is not a claim of zero
  vulnerabilities. Public desktop/mobile search, book/cover retrieval, library
  export/delete and native operator link pass. Outbound HTTPS uses allowed hosts,
  public-IP-pinned sockets, size/time/concurrency limits and no visitor credentials.
  Covers are same-origin, resized by Sharp, with a bounded one-hour RAM cache.
  Browser-local library/PWA storage is disclosed; no account or Goodreads login.
- **Second QR tool:** QR Generator Offline, MIT, revision0fde700-p1,
  `qrtools.utilibre.org`, LAN3155. Mini QR remains available separately.
  PNG/SVG/PDF export, QR decoding, Spanish handoff, synthetic camera-stream UI,
  offline loading and desktop/mobile checks pass. This does not certify every
  physical phone camera. External fonts/CDNs removed; jsPDF/JSZip bundled with a
  lockfile and clean npm audit. QR history is memory-only; the service worker
  stores application assets and preferences may remain locally. Camera tracks
  stop on exit; decoded links only open HTTP(S) after an explicit action.
  Public HTTPS still returns525: the supplied Caddy block must be applied.
- **Kittygram:** `gram.utilibre.org` replaces the initially proposed Instagram
  hostname at the operator's request. LAN3154, AGPL3 revision5931c21-p1. Public
  profile/post, proxied images and real video playback pass at the new hostname
  through the protected backend on desktop/mobile, without external browser
  requests. Native operator link configured; upstream has no Spanish translation.
  Media uses exact CDN suffixes, verified TLS, time/size limits, RAM caches and
  restricted egress. No Instagram login/cookies or public JSON API. Signing
  credentials are private and backed up. Public HTTPS still returns525; apply
  the revised Gram block on Caddy before enabling its portal launch.
- **Rimgo:** revisiond2be8e2-p1 on LAN3153, AGPL3. Installed with bounded HTTPS-only
  transport, fixed upstream hosts, private-address denial and bounded API caches.
  Removed response caching that retained upstream media errors and mishandled
  range responses. Album data works; Imgur media still returns429 even directly
  from the host. Not launch-ready or eligible for a directory submission yet.
- **Mumble:** official BSD3 image1.5.915 pinned by digest. Password-protected local
  pilot on127.0.0.1:64738 TCP/UDP,20users, no recording/event logs, no new outbound
  connections. TLS/protobuf authentication and wrong-password rejection pass.
  Native welcome link returns to Utilibre. Public networking and the admission
  policy remain operator decisions; ordinary HTTP Caddy configuration cannot
  carry Mumble's TCP/UDP protocol. The pilot uses a self-signed certificate.

BreezeWiki now runs pinned6d09507-p1 from source with strict image proxying and a
bounded, verified-TLS transport adapter. Actual articles now return200; its image
CDN still returns403 for many images. Full-page browser tests therefore fail.
Dumb was checked last as requested: upstream main is stillf558107 from September26,
and direct Genius search returns403 while the public reader returns500. LibreMDB
also remains blocked: its old Node18/Next12 image is stopped, and IMDb returns an
AWS WAF JavaScript challenge rather than title JSON. No challenge solvers, shared
login cookies or rotating proxies were added. DeGoog extensions still lack an
identified license. Screego inventory found no installation; prior user wording
asked to find it, not to install it.

Source archives and reproducible build/gateway recipes are published for modified
deployments; publisher scripts preserve prior archives. The new on-host snapshot
`/opt/utilibre/community-backups/2026-10-06T17-53-56-714Z` includes Mumble SQLite,
Mumble/Kittygram private configuration and the onion identity. PostgreSQL restore,
SQLite integrity, archive structure and checksums pass. Backups are **not off-site**.

Directory state: PrivateBin is listed; Redlib/SearXNG requests remain open.
RSS-Bridge, ntfy, Priviblur and Binternet have prepared fork branches, not submitted
PRs, because the token cannot create them. BiblioReads' upstream accepts instance
issues, but an actual createIssue attempt was denied by token permissions on
October6. AO's hub reads its main repository's`instances.json`; submission still
needs write permission. SafeTwitch/GotHub need Codeberg credentials. 4get's list is
distributed: an existing operator must add our address. Do not describe any of
these unfinished requests as published. Exact remaining states are maintained in
`deployment/community/delivery-checklist.json`.

### TransLite addition — October 6

Installed `gospodin/translite` at reviewed revision
`7b4b8e51359338219463f14c2a06211b6998a11e` (Unlicense), with PHP8.5.11 on
Alpine3.24. The requested `80600f5` changes its CI build action; this newer pinned
revision incorporates subsequent input-validation fixes. The protected gateway
is `10.10.1.43:3152`; only the separate Caddy VM can reach it over the LAN.
All four engines—Google, DeepL, Yandex and DuckDuckGo—returned actual English ↔
Spanish translations from this VM. This is a point-in-time functional check,
not a promise that unofficial provider endpoints will remain available.

Public `translate.utilibre.org` is now live. The same desktop/mobile translation,
four-engine API, native engine-switching, secure-cookie, input-limit and privacy
checks pass over verified public HTTPS. The bilingual catalog enables its launch
link. The Caddy block is in `deployment/community/Caddyfile.community`. Recheck
with `node deployment/community/check-translite.mjs` without `--backend`.
Backend tests use temporary loopback TLS solely to exercise secure cookies;
they do not verify the public certificate. Cloudflare injects its security script
into public HTML; application JavaScript remains opt-in. No external browser
requests were observed in the tested public workflow, and CSP was not relaxed.

Changes: POST-only text submission, server-enforced 2,000-character limit,
restricted provider hostnames, verified TLS with public-IP-pinned connections,
2MiB/15-second upstream limits, provider cooldown, quotas and private-network
firewall rules. No normal application or gateway request/error logs. Caddy,
Cloudflare and upstream operational records are separate. Referrers are sent
only within this origin, preserving same-origin POST checks without off-site
referrer disclosure. Cross-site POSTs are denied, but ordinary inbound links work.

No shared translation-content cache: only language lists are cached across
requests. Short-lived RAM sessions may hold text during engine/language changes;
they expire after five minutes of inactivity, are collected by subsequent
requests, and disappear on restart. Preference cookies last up to90days. There
are no accounts, uploads, database or persistent visitor-data volume. Audio is
disabled because upstream audio links put submitted text in GET URLs. Provider
selection is explicit: multi-engine mode sends the text to every selected
provider. This is not local, confidential or end-to-end encrypted translation.

Native UI is English; Spanish portal links use the supported `tl=es` target,
not an invented interface-locale parameter. Mobile form text is enlarged to16px
without changing the upstream layout. There is no native external-return-link
setting; no custom Utilibre navigation was added. Matching modified source is
published at `/utilibre-source/translite-utilibre.tar.gz`, with build, gateway,
network rules and source patch in `deployment/community`. A private database
backup is unnecessary for this stateless service; deployment source is tracked.

Run `check-translite.mjs --backend` for browser and input/privacy regressions.
The source build also runs25 fixed-host/private-IP/cache tests. This is a scoped
deployment review, not an independent security audit.

### Pollaris and LibreDNS addition — October 6

Pollaris 1.2.3 (`b6ab5b3309e858a02c042350be82cc7a9c599246`, AGPL-3.0-or-later)
is installed with PHP 8.5.11, PostgreSQL 17.11, an async/cleanup worker and a
restricted nginx gateway. Composer's production-dependency audit reported no
known security advisories. Backend browser tests pass poll creation, anonymous
guest voting, CSV export, administrator-route denial, native Spanish preferences
and deletion. Synthetic polls/responses were removed. The SMTP relay accepted
one deployment test to the operator. This is not proof of inbox delivery.

Public `pollaris.utilibre.org` now passes the same creation, anonymous voting,
CSV export, denied administrator routes, Spanish handoff and deletion workflow
over verified HTTPS. Pollaris is enabled in the bilingual catalog. The app
listener is `10.10.1.43:3149`, restricted to Caddy; the block is in `Caddyfile.community`.
Do not expose `127.0.0.1:3159`, the administrative listener. `admin@utilibre.org`
owns the native admin account; its randomly generated password is stored in
`/opt/utilibre/community-data/pollaris-private/admin.json` (0600), not Git.
Use a private SSH tunnel to administer it. No general user account is required.
No custom return-link UI was added: upstream offers template overrides, not a
native external-footer setting. Spanish portal entry submits the app's native
CSRF-protected preferences form. Rallly now sets its native locale cookie through
a fixed HTTPS handoff too; public Spanish HTML was verified.

Recipes: `compose.pollaris.yaml`, `Dockerfile.pollaris`, `init-pollaris.mjs`,
`init-pollaris-admin.mjs`, and `check-pollaris.mjs`. In the community directory:

```sh
docker compose -f compose.pollaris.yaml up -d --wait pollaris-db
docker compose -f compose.pollaris.yaml run --rm --no-deps pollaris php bin/console doctrine:migrations:migrate --no-interaction
docker compose -f compose.pollaris.yaml up -d
node check-pollaris.mjs --backend
# After the edge is ready, repeat WITHOUT --backend to test real public HTTPS.
```

The backend test uses a short-lived, loopback-only TLS proxy; its self-signed
certificate exception is confined to that test and does not certify public TLS.
Polls are not end-to-end encrypted. The private administration URL is a bearer
credential. Native expiration deletes completed polls six months after their
closing date and incomplete closed polls after seven days. Request bodies are
limited to 128 KiB; writes, page requests, processes and memory are bounded.
No normal nginx/FPM access logs; operational warnings use rotated Docker logs.
Only the worker can contact the specific SMTP relay; the database has no public
port, and the web application has no external network.

LibreDNS was assessed, **not installed**. The supplied URL is a group; its
[`libredns-cfg`](https://gitlab.com/libreops/libredns/libredns-cfg) project is a
whole-host Ansible deployment of PowerDNS Recursor, dnsdist, nginx, certificates,
networking and monitoring, tailored to LibreOps' addresses. Its configuration
also deliberately uses `dnssec=process-no-validate`. Running it unchanged on this
shared host would be inappropriate. A public DNS service deserves a separately
planned, monitored resolver deployment, direct encrypted endpoints and a clear
query-privacy policy. No host DNS, network configuration or DNS ports were changed.
LibreDNS itself offers [DoH and DoT](https://libredns.gr/), not a browser toolbox.

The daily community snapshot job now includes Pollaris's database, secret
configuration and scheduler state alongside Rallly, FMD and Uptime Kuma. The job performs an
isolated PostgreSQL restore and SQLite integrity check, sends a generic failure
alert, refuses to start with less than 5 GiB free, and never prunes backups.
Backups remain on this VM; an off-site destination is still needed. The unrelated
identity/expanded-app snapshots retain their separate scheduling status below.

The public status page now includes 28 monitors, preserving its existing
settings and history. The SearXNG monitor uses verified HTTPS `/healthz` through
the private Caddy edge, explicitly labeled: the public-IP route from this VM is
unreachable, and a non-browser root request is correctly rate-limited. No limiter
exception, forwarded-IP forgery or TLS bypass was added. Daily updater browser
tests remain the separate functional-search check. These same-VM root/liveness
monitors are neither complete workflow tests nor independent outage monitoring.

This section supersedes older deployment states below. Installation, a passing
homepage, successful content retrieval, and public readiness are separate checks.

| Application | Listener | Verified / remaining work |
| --- | --- | --- |
| Rallly 4.15.3 | app LAN 3123; `poll.utilibre.org` | Live. Public OIDC + MFA, onboarding, poll creation, anonymous guest voting, CSV export and deletion pass. A second organizer's deletion attempt returned 403. Email-login bypass routes remain blocked. Stock licensing reminder is disclosed; no checks were modified. |
| Priviblur 251a8e6-p1 | app LAN 3139; `tumblr.utilibre.org` | Live. Public blog/media and Spanish preferences pass after tuning media-specific limits. Patched dependencies, private-network egress blocks and RAM-only cache; full modified-source archive linked prominently. |
| Mezzo 1.4.0 | app LAN 3140; `tenor.utilibre.org` | Live. Public GIF search and all 31 displayed images loaded without HTTP errors. Media-specific limits avoid throttling ordinary results. |
| FMD Server 0.17.0 | app LAN 3141; `fmd.utilibre.org` | Live invitation-only pilot. Public synthetic API registration, opaque-location round-trip, account separation, unauthenticated denial and cleanup pass. Real Android GPS/push/cryptographic end-to-end testing still needs an operator device. No Spanish UI in this release. |
| Dumb | app LAN 3142; proposed `lyrics.utilibre.org` | Homepage works, but Genius search fails and a lyric URL returns a soft error. Not publicly advertised as working. |
| DeGoog 1.0.0 core | loopback 3143 | Public-instance lockdown denies unauthenticated settings API reads/writes. Indexer defaults off. No engines installed: the separate official extensions repository has no identified license. |
| LibreMDB | loopback 3144, stopped | IMDb search/title requests failed. Published image contains Node 18 / Next.js 12; public deployment requires a supported build and working upstream access. |
| 4get 03ba5d7-p2 | app LAN 3145; proposed `4get.utilibre.org` | Bounded public-IP image fetching, redirect validation, ImageMagick resource/coder restrictions and fixed JPEG resizing. Real Wiby/DuckDuckGo searches and image resizing pass. Source published; Caddy HTTPS pending. No rotating proxies or challenge bypasses. |
| SafeTwitch 2.4.5-p1 | app LAN 3146; proposed `twitch.utilibre.org` | Source-built static frontend and Go 1.26 backend, bounded Twitch/CDN-only proxy, image MIME checks, fixed URL-safe playlist encoding, gateway quotas/cache and explicit follow-lookup bounds. Real live-video frames decode and time advances; EN desktop/ES mobile, images and following lookups pass with no third-party browser requests in the tested workflow. Chat is disabled. Caddy HTTPS remains pending; long recordings/clips and every upstream feature are not validated. |
| AnonymousOverflow 937cfee-p1 | app LAN 3147; proposed `overflow.utilibre.org` | Hardened current-Go/dependency build renders a real question and answers. govulncheck reports no reachable vulnerabilities. Fixed-host short-link fetching, bounded JSON cache and quota/backoff tests pass; invalid media tokens are denied. Source published; Caddy HTTPS pending. |
| GotHub 24bedc8-p2 | app LAN 3148; `gothub.utilibre.org` | Live. Fixed static compression writing into the read-only container (gzip requests previously404). Versioned asset URLs avoid cached errors. Public desktop/mobile styling, repository and file checks pass. Bounded GitHub-only egress, gateway limits and full modified source supplied. Upstream seeks maintainers. |
| Binternet 9bb70ef-p1 | app LAN 3150; `binternet.utilibre.org` | Live; operator confirmed public search/images. GPL-3.0 source build on PHP 8.4.21. Desktop/mobile search, images and pagination passed; restricted outbound requests, response/time limits, image validation and gateway quotas. Separate Tor frontend passed homepage/search/images/pagination through an independent Tor client. English UI; no native Utilibre return-link option. |

Runtime recipes are `deployment/community/compose*.yaml`. Unready evaluation services
have loopback listeners; reviewed gateways use Caddy-only LAN listeners. Both use
capability drops, read-only roots, resource limits,
disabled IPv6, and firewall blocks on private/host destinations. These controls
are not an independent security audit or a complete open-proxy defense. The
unready reader evaluations do not restart automatically; 4get, AnonymousOverflow
and GotHub now do; SafeTwitch also restarts automatically after its playback checks. Native language settings
are used where available; Priviblur requires the complete Spanish preference
restore URL, not only a `language` parameter. Experimental entries are searchable
in the bilingual catalog and software list, with no launch links and no claim
of public availability; they are not featured on the default homepage.

Binternet also restarts automatically. Its full modified source is available at
`/utilibre-source/binternet-utilibre.tar.gz` and the patch/build/configuration
are tracked under `deployment/community/`. It has no database, visitor account,
uploads or persistent image cache; bounded images are held in worker memory.
Searches and image requests go to Pinterest and its image CDN from this server.
Author links leave the instance for Pinterest. Gateway access logs are disabled,
but error logs and any edge/upstream retention still apply. Pagination URLs carry
anonymous Pinterest CSRF tokens, never a shared personal login cookie.
Broken upstream `api.php` and non-public PHP files are denied by the gateway.
Binternet's official instance list excludes Cloudflare-proxied hosts. DNS was
confirmed direct after the operator's update and public access was confirmed.
The clearnet/onion listing branch was pushed to `mycelibre/Binternet`, but GitHub
refused upstream PR creation with the current token. It is **not submitted/listed**:
[prepared comparison](https://github.com/Ahwxorg/Binternet/compare/main...mycelibre:utilibre-public-instance-20261006?expand=1).
No cryptocurrency wallet or donation address was configured.

Binternet's onion address is
`http://ued2jl2ahvngdegugysin2fa6malo6omyf33j5tpfgex47erv453wbad.onion/`.
The separate Tor 0.4.9.13 service reaches its own restricted nginx/PHP frontend
through a Unix socket, with no published TCP listener, SOCKS port, control port
or exit-relay role. The clearnet response advertises `Onion-Location`, and the
portal offers a Tor Browser link. Tor protects the visitor connection; Pinterest
requests still leave through the ordinary application-server connection.
Onion requests have a shared budget rather than pretending client IPs are known.
The private onion identity is backed up with mode-restricted community snapshots;
archive/checksum verification passed on October 6. These backups are on-host,
not off-site. Do not publish the identity files. Recipes and corresponding source
are included in the public modified-source archive; no keys are included.

GotHub's `check-gothub.mjs` covers the gzip/identity stylesheet regression plus
desktop/mobile rendering and real repository/file content over public HTTPS.
`publish-gothub-source.sh` retains an earlier archive before publishing matching
patched source. No custom return-link navigation was added. Other reader routes
(`overflow`, `4get`, `twitch`) still returned525 on the latest October6 check.

Merge `deployment/community/Caddyfile.community` on the separate edge VM,
preserving the existing Cloudflare-only trusted proxy ranges. The file supplies
Rallly, Priviblur, Mezzo and FMD routes; adding a route does not complete their
end-to-end tests. Do not publish the loopback evaluations. Do not open FMD
registration or replace its Android authentication with a browser login gate.
The unsupported `lyrics.utilibre.org` block has now been removed from the
deployment file so applying it does not expose a nonfunctional reader. The
remaining Caddyfile passes local adaptation and provisioning validation; this
does not establish successful certificate issuance or connectivity on the edge.
Rallly, Priviblur, Mezzo and FMD pass ordinary verified HTTPS GETs after the
operator's edge update. The same-day recheck also found 21 of the 22 previously
enabled service roots reachable from this VM. SearXNG's public IPv4 connection
times out from this VM, and this VM has no IPv6 route; its local `/healthz`
returns OK and the operator confirms public search works. Treat this as a
vantage-specific connectivity failure, not evidence of a general search outage.
No SearXNG limiter or proxy-trust configuration was weakened for these probes.

SafeTwitch's complete frontend/backend source archives, locked dependencies and
build material are linked from its footer. Its pinned translations submodule is
included. The Go audit found no reachable or imported vulnerable packages; an
unused-module advisory was also reported. Remaining frontend npm audit warnings
are the unpatched `braces` recursion issue and build-only glob dependents; the
static nginx runtime contains neither Node nor these build dependencies. Never
use that toolchain to build untrusted visitor projects. The privacy copy explains
that searches, opened channels and followed-channel lookups reach the proxy;
browser-only preference storage does not mean all those requests stay local.

The catalog now has nine categories and 27 enabled services. JupyterLite's real
Pyodide kernel executed a calculation, a pandas CSV example and a matplotlib chart
in the browser. Initial "No Kernel" while it downloads is not a missing kernel.

Rallly uses the AGPL distribution without purchasing a key or altering license
checks. Native `instance_settings.footer_links` contains English/Spanish return
links and the matching upstream source. A further fresh `20261006c` run completed
the entire poll/vote/export/delete workflow. Its three identity-provider accounts
were disabled and their sessions, MFA fixtures and OAuth tokens retired. Its two
synthetic app users, polls, workspaces and anonymous guest record were deleted.
The original three QA identities remain
retired. A fresh `20261006b` run verified public password + MFA login, completed
the approved OIDC callback, and rejected the outsider. All three fresh identities
were then retired too: groups cleared, passwords made unusable, sessions/tokens/
MFA fixtures revoked. The two empty synthetic Rallly accounts and their app
sessions were deleted; no owner credentials or real user data were changed.
Run-specific QA scripts refuse credential overwrites or reused usernames.
Community snapshots passed disposable PostgreSQL restores and FMD SQLite
integrity checks, including Pollaris after its addition. The daily 04:10 UTC
timer is enabled and its first run passed. Backups remain on-host only, not a
complete backup/recovery service.

### Public directories

- PrivateBin: **published**, confirmed in the [official directory](https://privatebin.info/directory/)
  on October 6. Automated geolocation shows the Cloudflare edge, not necessarily
  the origin's country.
- RSS-Bridge: row prepared on `mycelibre/rss-bridge:utilibre-public-instance-20261006`;
  [create the pull request](https://github.com/RSS-Bridge/rss-bridge/compare/master...mycelibre:utilibre-public-instance-20261006?expand=1).
  GitHub refused PR creation: the current personal token lacks permission.
  The row discloses Germany/Hetzner, Cloudflare and the three enabled bridges.
- ntfy: same credential blocker;
  [prepared comparison](https://github.com/binwiederhier/ntfy/compare/main...mycelibre:ntfy:utilibre-public-instance-20261006?expand=1).
- Existing [Redlib PR 117](https://github.com/redlib-org/redlib-instances/pull/117)
  and [SearXNG request 941](https://github.com/searxng/searx-instances/issues/941)
  remain open. No duplicate requests created.
- Priviblur: source-disclosing row prepared on
  `mycelibre/priviblur:utilibre-public-instance-20261006`;
  [prepared comparison](https://github.com/syeopite/priviblur/compare/master...mycelibre:utilibre-public-instance-20261006?expand=1).
  No upstream pull request has been created.
- Mezzo, Dumb, LibreMDB, DeGoog, 4get, SafeTwitch, AnonymousOverflow
  and GotHub are **not submitted**. Mezzo and
  Codeberg submissions also need forge credentials. No third-party public-host
  directory was found in the FMD project's documentation; its community-server
  page lists alternative implementations, not hosted instances.

### Other requested assessments

From [Private.coffee's services](https://private.coffee/services.html), the
strongest third-party candidates are CyberChef (browser-only data tools),
HedgeDoc (collaborative Markdown), CryptPad (encrypted documents; requires a
separate sandbox origin and storage operations), and FacilMap (shared maps;
disclose external tiles/routing). No general recommendation was treated as
permission to install it. Their own projects were excluded from this shortlist.

No current Utilibre tool replaces EteSync's encrypted contacts/calendar/task
synchronization. Matrix is worth an invitation-only pilot if there is an actual
community and capacity for moderation, media retention, updates and recovery;
it was not installed. Syncplay is feasible and Apache-2.0 licensed, but requires
desktop clients/players and a separate TCP/TLS endpoint (normally 8999), not a
normal Caddy HTTP route. It synchronizes playback rather than storing/sharing
videos. It too was assessed, not installed.

## Current checkpoint: approved-account pilots

This checkpoint supersedes the historical private-setup notes below.

- Public HTTPS and native OIDC sign-in passed for two separate synthetic users
  on `cv`, `design`, `budget` and `wakapi.utilibre.org`. Authentik admits only
  active, email-verified members of `utilibre-approved`; no public signup.
- Single-use, 48-hour invitations fix the approved username/email. The tested
  flow rejects missing tokens and identity overrides, requires email verification
  and TOTP, and grants no administrator role. Test email was captured locally;
  real SMTP delivery was separately confirmed by the operator.
- Recovery passed email-link verification, existing MFA and password reset.
  Neither the owner's password nor their MFA was changed.
- Resume JSON/PDF export, Penpot design archive export, Actual budget download
  and Wakapi private-stat access passed. Other-user requests were denied.
  Synthetic CVs were moved to Trash then explicitly purged; the synthetic
  design and budget were deleted through application APIs. Test accounts and
  sessions were retired afterward; the verified backup retains these fixtures.
  Backup checks restore PostgreSQL into a disposable networkless container and
  verify SQLite integrity. Backups remain on-host, unscheduled, not off-site.
- Penpot pilot limits: 3 teams/profile, 10 people/team, 100 files/team and 1 GiB
  media/team. `admin@utilibre.org` is the configured administrator identity.
- JupyterLite and Whisper Web are linked publicly. CV links select Spanish;
  Penpot uses a first-party language handoff; Actual follows browser language.
  Software-page spacing and bilingual mobile checks pass.
- Wakapi has a small published patch for free-service retention wording and
  empty-account/OIDC-only UI errors. Public registration, paid subscriptions,
  imports and leaderboards are disabled. Raw activity retention is 3 months.
- Rallly is now live as described above. Licensing is not itself a
  mandatory-purchase blocker: the developer's [May 30 clarification](https://github.com/lukevella/rallly/discussions/1714)
  confirms the AGPL code may be self-hosted without purchasing a key. The
  [commercial terms](https://rallly.co/terms-of-use) expressly preserve
  open-source rights. No paid license was purchased and no license checks were
  modified; the current workflow tests are recorded above.
- Return links use native settings only: SearXNG custom footer links,
  PrivateBin `main.info`, PairDrop's About-page custom button, Uptime Kuma's
  status-page Markdown footer, authentik's flow footer, and JupyterLite's
  built-in Help menu configuration. Spanish/English links are provided where
  multiple links are supported; PairDrop has one bilingual-titled button.
  JupyterLite opens the matching-language portal in a new tab. No upstream
  source patches, injected scripts, custom plugins or proxy rewriting were
  added for navigation. Other apps are unchanged.
- BreezeWiki has two independent blockers: `wiki.utilibre.org` returns
  Cloudflare 525 and the Caddy private endpoint also fails its TLS handshake;
  its healthy backend returns 503 on tested articles because Fandom rejects
  server-side requests. Native JSONP/browser fetching is currently disabled.
  Enabling it would expose visitors' IP addresses/requests to Fandom and load
  its scripts; this requires an explicit privacy decision. It also requires
  bounded POST support in the gateway (currently GET/HEAD-only, 1 KB bodies),
  working public HTTPS on the separate Caddy VM, and end-to-end article tests.
  Neither the mode nor the public route was enabled by this navigation change.

Fresh verified snapshots: identity `2026-10-06T03-32-46-594Z`, expanded apps
`2026-10-06T03-32-52-667Z` under their respective `/opt/utilibre/*-backups/`
directories. Restoring those pre-cleanup snapshots requires retiring the
synthetic QA identities again. Portal verification: 55 unit tests, 56 browser
tests, type checking and linting passed.

Approved account requests go privately to `admin@utilibre.org`. To send one
invitation after approval, run from the project root (replace both examples):

```sh
docker compose --env-file deployment/identity/.env -f deployment/identity/compose.yaml exec -T \
  -e 'UTILIBRE_INVITEE={"username":"approved-user","email":"person@example.org"}' \
  server ak shell -c 'exec(__import__("sys").stdin.read())' < deployment/identity/invite-user.py
```

Do not disable group/verified-email policies to open a tool. New client setup
is in `configure-apps.py` and `export-app-env.mjs`; existing owner credentials
must be preserved. App sessions/API keys must also be revoked when removing
access; identity-provider logout alone is not universal app logout.

## Earlier rollout checkpoints

The operator requested restoration/expansion of these applications on October
5. This replaces the earlier access-gap-only exclusion for these tools.
Public enablement is separate from image builds and private health checks.

| Application | Reviewed source | License | Host / private port |
| --- | --- | --- | --- |
| BentoPDF 2.8.8 simple | alam00000/bentopdf, f96cd4e5166f3d51393dfe9f3c440b5bb77802f1 | AGPL-3.0 | pdf.utilibre.org / 3101 |
| VERT | VERT-sh/VERT, c7b9f3921d6f8722c1dc1515799b461622777068 | AGPL-3.0 | convert.utilibre.org / 3102 |
| OmniTools 0.6.0 | iib0011/omni-tools, 922b28ce154e8f22da4a721472889717a95f7562 | MIT | tools.utilibre.org / 3103 |
| IT Tools 2024.10.22 | CorentinTh/it-tools, 5732483fc24a6e6818839060bdf3cc7d9d324b9f | GPL-3.0 | dev.utilibre.org / 3109 |
| hat.sh 2.3.6 | sh-dv/hat.sh, 540d3ccfd2a12b4ed96b78a776c764f899678b6c | MIT | hat.utilibre.org / 3110 |
| draw.io 32.0.2 | jgraph/drawio, v32.0.2 | Apache-2.0 | draw.utilibre.org / 3111 |
| Mini QR 0.33.0 | lyqht/mini-qr, fe46504853c597e44b2e39d3decb5df2184c6605 | GPL-3.0 | qr.utilibre.org / 3112 |

Pinned image digests and reproducible integration builds are in
`deployment/toolbox/compose.yaml` and its Dockerfiles. Upstream license and
source links are in `portal/src/catalog/upstreams.ts`. Sources and local
integration configuration are also published at each tool's
`/utilibre-source/` route. Preserve upstream notices and credits.

## Data flow and limits

All seven serve static applications through unprivileged nginx. User files
are processed on the user's device, with no application upload endpoint.
Only GET/HEAD are accepted. Containers use read-only roots, no capabilities,
no-new-privileges, 192 MB memory, 0.5 CPU, 64 processes and 32 MB tmpfs.
Listeners bind to the private application address; new application ports
accept ingress only from the separate Caddy VM. No existing service or SSH
firewall policy is replaced. Normal nginx access logs are off; Docker error
logs rotate at three 10 MB files. Cloudflare/edge retention is separate and
not asserted to be a fixed number of days.

Browser caches, preferences, saved drafts and downloaded output may remain
on the visitor's device. These are not anonymous browsing services.

- BentoPDF/OmniTools may fetch processing code and language data from
  jsDelivr/unpkg; BentoPDF also uses githack OCR fonts. These providers see
  download requests and network metadata, not selected input documents.
  Remote-URL import/certificate proxy access is blocked. OCR output must be
  reviewed; large jobs depend on client RAM and browser support.
- VERT has external requests, telemetry, embedded payments and remote video
  conversion disabled. Its exact FFmpeg core is bundled locally. The
  integration build patches English/Spanish processing and privacy copy to
  describe this installation; Spanish primary instructions use voseo.
- hat.sh is a static export, not an exposed legacy Next.js server. Its older
  upstream release deserves periodic client dependency/security review.
  Passwords cannot be recovered by the operator. It is not a backup service.
- draw.io uses local/device storage. Cloud integrations, remote export,
  remote URL fetching and telemetry are disabled. It is not collaborative
  storage. Its WAR is verified with the release's SHA-256 before extraction;
  Java server directories are not served.
- Mini QR disables analytics and QR history. Camera use requires browser
  permission. A QR code does not encrypt its content.
- IT Tools retains upstream credit. Inspecting JWT content does not verify
  a token's authenticity. Upstream donation links fund the developer.

## Operation and retirement

Run this independent stack with `APP_BIND_IP=10.10.1.43 docker compose -f
deployment/toolbox/compose.yaml up -d --build --wait`. Apply
`deployment/toolbox/Caddyfile.tools` on the separately managed edge, merging
existing routes without overwriting unrelated hosts. Ensure only one COEP
header survives and disable intermediary script transformation.

Do not add a public URL to runtime enablement until public HTTPS and real
operations work. Stop individual services if an update breaks functionality.
No user-file backup or migration is needed because the server stores no
input files; users must save/export their own work before closing a tool.

## Donation destination

Liberapay replaces Stripe. Set `SUPPORT_URL` only after the operator provides
the actual public Liberapay URL. Do not infer a payee from a GitHub username.
There is no embedded payment script; the visitor explicitly opens Liberapay.

## Community services — October 6 addition

Pinned images and source revisions are in `deployment/community/compose.yaml`
and `portal/src/catalog/upstreams.ts`. These are application-VM deployments;
public HTTPS enablement requires the separate edge routes and verification.

| Application | Release / license | Host / private port | Operating boundary |
| --- | --- | --- | --- |
| RSS-Bridge | 2025-08-05 / Unlicense | bridge.utilibre.org / 3120 | GitHub Trending, The Guardian, Ars Technica only; public HTTP(S) egress only; private addresses blocked; cached responses; 6 requests/minute/IP plus burst |
| ntfy | 2.28.0 / Apache-2.0 option of upstream dual licensing | notify.utilibre.org / 3121 | Public topics; 100 messages/IP/day; 4 KB/message; one-hour RAM cache; no attachments, email, telephone or iOS upstream relay; no Web Push configuration |
| Yopass | 14.10.0 / Apache-2.0 core | secret.utilibre.org / 3122 | One-time retrieval and one-hour expiry enforced; encrypted payloads at most 10 KB; no files; bounded RAM-only Valkey; gateway rate limits |
| PairDrop | 1.11.2 / GPL-3.0 | drop.utilibre.org / 3124 | WebRTC file transfer; Cloudflare STUN; no TURN relay and no WebSocket file fallback; both devices online |
| Uptime Kuma | 2.5.5 / MIT | status.utilibre.org / 3125 | Public read-only status gateway; admin only 127.0.0.1:3135; no Docker socket; 30-day monitor history |

The shared ingress firewall accepts the new private ports only from
10.10.1.3 on eth0. `rssbridge-firewall.sh` additionally blocks its container
from private/link-local destinations and the application host. A test to
10.10.1.43:4173 times out while the three admitted public feeds work. The
systemd unit re-applies the ingress, RSS and BreezeWiki rule sets after Docker restarts. Preserve this
restriction when changing the RSS network address.

Use `docker compose -f deployment/community/compose.yaml up -d --wait` for the
default five-service stack. Merge `Caddyfile.community` on the edge, retaining
its existing TLS policy. Forward an authentic client IP, trusting only
appropriate proxy networks; user-supplied forwarding headers are not evidence
of identity. The public Kuma gateway denies setup, dashboard and admin
WebSocket routes. `bootstrap-kuma.mjs` initializes the owner and status page;
its generated credentials are in the ignored, mode-0600
`secrets/uptime-kuma-admin.json`, never in the source bundle. Keep that file
private. Kuma monitors HTTP response availability, not full workflows, and
cannot independently report an outage of its own application VM.

Rallly 4.15.3 is pulled and staged under the disabled `rallly` Compose profile,
not running or advertised. The pinned source disables guest poll creation on
self-hosted instances. Real support email, SMTP/account setup and the intended
organizer/license arrangement must be resolved before enabling it. No fake
email, shared organizer login, paid license purchase or license bypass is part
of this deployment. Its empty data directory does not contain user polls.

This is bounded configuration and functional verification, not an independent
security audit. Older stable browser-app/bridge releases need ongoing
dependency review. RSS connector breakage, client resource limits, restrictive
WebRTC networks and upstream blocking remain operational limitations.

## Functional verification and remaining public-edge work

October 6 synthetic-file browser checks passed: English/Spanish OCR and a
searchable-PDF download; VERT Markdown-to-HTML conversion with the output
contents verified; OmniTools JSON import/format/download; IT Tools Base64
encode/decode; hat.sh encrypt/decrypt exact-content round trip; draw.io SVG
export with a shape; Mini QR SVG download; PairDrop two-browser file transfer;
Yopass encryption, reveal/decrypt and rejection of a second retrieval. The
Yopass round trip was subsequently repeated successfully over public HTTPS;
PairDrop's full transfer was tested through local browser test proxies.
RSS-Bridge produced entries from all three
admitted sources. ntfy publish/readback and oversized-message rejection
passed, including public ntfy publish/readback. Kuma's public gateway renders the status page and rejects its admin
routes. These are representative operations, not every upstream feature.

All seven browser-tool hosts and the five community hosts above now respond
over public HTTPS. PDF has a single COOP/COEP pair and browser
`crossOriginIsolated` is true. The portal now enables these twelve additions
alongside the four existing services (16 enabled services in total). Public
English/Spanish language handoffs were verified for supported tools; a
translation being available does not mean every upstream string is translated.
Spanish links use BentoPDF's `/es/`, OmniTools/ntfy query preferences,
draw.io's language parameter and allowlisted same-origin handoffs for
VERT, IT Tools, Yopass, PairDrop and Kuma. Unsupported interfaces stay in their
available language. No arbitrary redirect or storage-key input is accepted.
The portal's typecheck, lint, 51 unit tests and 52 end-to-end tests passed,
including first-action visibility at 375 by 812 in both languages.
SearXNG's app health is OK, but its public IPv4 path timed out from this VM;
the status monitor preserves that failure rather than claiming public uptime.

Portal rollback image: `public-utility-portal:pre-toolbox-voseo-20261006`.
The original four enabled IDs were `searxng,redlib,freshrss,privatebin`;
remove the twelve added IDs/URLs before recreating the portal with that image
if rollback is required. Do not stop or recreate the unrelated service stacks.

## Expanded applications — October 6 checkpoint

Configuration is in `deployment/expanded/compose.yaml`. Image digests are
pinned. Credentials are generated only into the ignored mode-0600
`deployment/expanded/.env` and `secrets/wakapi-admin.json`. Never include these
files, data volumes or backups in a published source archive.

| Application | Version / license | Address / app port | Current boundary |
| --- | --- | --- | --- |
| JupyterLite | 0.8.5 + Pyodide kernel 0.8.6 / BSD-3-Clause | python.utilibre.org / 3133 | Running on private app IP; real Python, CSV/pandas and chart tests passed; public HTTPS still 525 |
| Whisper Web | 81869ed62970ff4373509b6004a6c9a3f0c5b64d / MIT | transcribe.utilibre.org / 3137 | Running on private app IP; short audio transcription and text export passed; public HTTPS still 525 |
| Wakapi | 2.18.1 / MIT | wakapi.utilibre.org / 3136 | Public HTTPS owner login and authenticated summary verified, secure HttpOnly cookie, signups rejected with 403; route now reaches Wakapi correctly |
| Reactive Resume | 6.0.0 / MIT | cv.utilibre.org / 127.0.0.1:3130 | Running privately; signups/email login disabled; real owner email and recovery setup pending |
| Penpot | 2.18.2 / MPL-2.0 | design.utilibre.org / 127.0.0.1:3131 | Running privately with database/exporter; signups closed; real owner email and recovery setup pending |
| Actual Budget | 26.10.0 / MIT | budget.utilibre.org / 127.0.0.1:3132 | Running privately; OIDC/user separation not configured; do not publish shared-password setup |
| BreezeWiki | Official compiled distribution / AGPL-3.0 | wiki.utilibre.org / 3134 | Running, but tested Fandom pages return upstream-blocked 503; not advertised as usable |

Only the three ready-to-route hosts are active in
`deployment/expanded/Caddyfile.expanded`. This fragment is validated locally,
not applied by this agent to the separate Caddy VM. The existing public Wakapi
route now reaches the correct backend after its 3136 listener was deployed.
Python and transcription are included in
the portal code but remain runtime-disabled until public workflows pass.
Wakapi is an owner-only pilot, not an open registration service. Its
administrator credentials remain private; email password recovery is not
configured. To provision additional accounts later, establish an explicit
operator-managed enrollment and recovery process first.

JupyterLite runs visitors' code in their browser, not on this server. The
runtime/packages can download from jsDelivr and Python package repositories;
these third parties receive those download requests. Important files must be
downloaded: browser storage is not a backup. The Spanish route
`/es/lab/index.html?path=Empeza-aqui.ipynb` was tested from an English-language
browser. Its notebook explains CSV and chart operations using voseo.

Whisper uses the stable WebAssembly implementation rather than the
experimental WebGPU branch. Utilibre serves its model weights, tokenizer and
WASM locally. The complete short-recording test observed only same-origin
GET requests, no upload requests or third-party requests, and a successful
text download. The first tiny-model download is roughly 75 MB. Long recordings
and real-phone performance are not validated: keep the pilot wording. The UI
is primarily English; multilingual audio, including Spanish, is supported.

Whisper rebuild: extract `whisper-web-utilibre.tar.gz` into
`/opt/utilibre/expanded-src/whisper`, run `npm ci --ignore-scripts`, run
`node deployment/expanded/fetch-whisper-models.mjs` from the integration tree,
copy the `.wasm` files from `node_modules/onnxruntime-web/dist/` into
`public/wasm/`, then `npm run build`. Build `Dockerfile.whisper` with that source
directory as context. The modified source archive includes the regenerated
package lock; model revisions and SHA-256 checksums are recorded in the
downloaded `public/models/manifest.json`. The model Apache-2.0 license is
served alongside the weights. Jupyter's Dockerfile includes pinned direct
build dependencies and publishes the resolved package list.

BreezeWiki's official compiled bundle SHA-256 is
`f1b9bc650a02a4c36c09574620a513c89707a3b7a4db38daf6e2673238593688`.
Its exact source commit is not established; do not describe the binary as a
build of the separately inspected current checkout. Strict proxy mode is on,
JSONP/search suggestions are off, ingress is rate limited and egress blocks
private/link-local destinations. Do not circumvent Fandom's current rejection
or promise every wiki is reachable.

## Initial expanded-service backup and restore test

Run `node deployment/expanded/backup.mjs` as root for a consistent snapshot.
It briefly stops only the running account application containers, dumps their
PostgreSQL databases, archives file/SQLite storage and private configuration,
then restarts those applications. The resulting directory is mode 0700 and
files mode 0600 under `/opt/utilibre/expanded-backups/`.

The initial snapshot `2026-10-06T01-17-51-005Z` passed SHA-256 validation and
`verify-backup.mjs`: real PostgreSQL restores produced 29 Resume tables and
60 Penpot tables; restored Wakapi and Actual SQLite databases passed integrity
checks, including the Wakapi owner flag. The disposable restore container had
no network or production volumes and was removed afterward. No personal
documents/designs/budgets existed yet; this is not an end-user document/export
recovery test. This snapshot is on this VM, not off-site or automatically
scheduled. Arrange recurring off-site backups and account/export/deletion
rehearsals before opening account-based services to a community.

## Requested GUI completion and operator mail settings

The operator explicitly requested every missing tool in the GUI on October 6.
The portal now separates `LISTED_SERVICES` from `ENABLED_SERVICES`: listing
shows a reviewed application's description and access limitation, never an
implicit permission to launch it. The eight additions to the visible catalog
are Whisper Web, JupyterLite, Reactive Resume, Penpot, Actual Budget, Rallly,
BreezeWiki and Wakapi. Only Wakapi adds an enabled public URL in this update;
its entry explicitly says administrator-only pilot. Other entries have plain
unavailable text instead of a dead launch button. Runtime listing is a public
catalog decision, not a database, authentication or proxy change.

The operator supplied `admin@utilibre.org` for administrator ownership and
`no-reply@utilibre.org` as sender. The unauthenticated SMTP relay is
`10.10.1.20:26` (the operator's latest correction after `.28` and `.18`
refused connections). This endpoint returns SMTP 220/EHLO 250, advertises
STARTTLS and does not advertise AUTH. Its certificate is valid for
`mx.mailgt.dev`, not the IP: strict verification using `10.10.1.20` fails
with a name mismatch. A separate, mail-free STARTTLS diagnostic using
`mx.mailgt.dev` as SNI and verification name validated the public CA chain
and negotiated TLS 1.3. Confirm that hostname is the operator's intended
relay identity before configuring clients to use it; do not disable checks.
No email was sent. Settings are saved privately for the expanded stack,
and in a separate, inactive Rallly mail override; email delivery/recovery
is not enabled or verified. The pinned
Reactive Resume transport additionally requires nonempty SMTP user/password
before constructing a transport, so the no-auth relay needs a reviewed
compatibility change or an identity-provider recovery flow. Never insert fake
credentials or disable certificate checks to claim delivery works.

The GUI release passed 53 unit tests, 52 Playwright tests and 18 configuration
tests, plus type checking and linting. Public browser checks found 24 service
rows and 17 launch links in each language, including seven unavailable entries;
Wakapi's launch is explicitly an owner-only pilot, not open enrollment.
Desktop/mobile captures and the independent finish review approved this
bounded catalog extension. Existing visual identity and design tokens remain
unchanged; this is not a claim that the pending services are publicly ready.

## Liberapay activation and identity foundation

On October 6 the operator supplied the Liberapay recipient `mycelibre` and
authorized installation of the recommended identity provider. The public
profile returned HTTP 200, explicitly described Utilibre.org, and exposed a
working donation route. `SUPPORT_URL` is now
`https://liberapay.com/mycelibre/donate`; English and Spanish support links use
Liberapay's verified `en.` and `es.` hosts without changing the recipient.
The existing Donate button and optional-support explanation are enabled.
No payment widgets, scripts, preferential access or donation tracking were
added. Live desktop/mobile checks found no horizontal overflow and no
external browser requests before leaving Utilibre. The updated portal passed
55 unit tests, 54 browser tests, type checking, linting and production build.

`deployment/identity/compose.yaml` installs authentik 2026.8.3, the current
stable upstream release at review, pinned to
`sha256:ab9b4e8cc4ab3f8d1198d2db6aeea66bafea1963b3f2843589e0d163f97d9849`.
The [upstream license](https://github.com/goauthentik/authentik/blob/version/2026.8.3/LICENSE)
licenses the core under MIT; the official image also includes separately
licensed enterprise modules. No enterprise license, trial or paid feature is
activated or required for this deployment. This is shared login infrastructure,
not an additional public utility or a reason to require accounts for anonymous
tools. Upstream branding and attribution remain visible.

The database, worker and server are isolated in a separate Compose project.
Only the server publishes a port, bound to `10.10.1.43:3138`; the persistent
application-port firewall admits that listener only from the Caddy VM at
`10.10.1.3`. Authentik trusts forwarded headers only from that proxy address.
All containers run as non-root with read-only root filesystems, dropped
capabilities, bounded memory/CPU/process counts and rotating container logs.
There is no Docker socket mount or embedded proxy outpost. PostgreSQL has no
published port. Startup analytics, error reporting and update-check outbound
contacts are disabled; operators must track security updates explicitly.
Avatars use local initials rather than Gravatar. New authentication events
have a 30-day retention setting; container logs use size-based rotation, not
that retention period. UI impersonation is disabled; operators still have
technical access to the host and database.

The owner is `akadmin`, with `admin@utilibre.org` as the account email.
Generated credentials are in ignored, mode-0600 `secrets/authentik-admin.json`;
deployment secrets are in mode-0600 `deployment/identity/.env`. Neither belongs
in the source archive. Bootstrap uses a Django password hash, and the bootstrap
override has been removed from the running worker. Public enrollment and
account-request flows remain closed. First login requires the owner to enroll
their own TOTP authenticator; the deployment never submits an enrollment on
their behalf. The local browser check accepts the owner password and reaches
MFA setup without external browser connections. It does not establish public
HTTPS or complete the owner's MFA enrollment.

The SMTP endpoint remains `10.10.1.20:26`, with STARTTLS required and no SMTP
credentials. Its IP does not match the certificate; the user has not yet
confirmed `mx.mailgt.dev` as the intended identity. Certificate verification
has not been weakened, no message has been sent, and email recovery remains
disabled. Sender configuration is `no-reply@utilibre.org`.

The separate Caddy VM needs `deployment/identity/Caddyfile.identity`. The new
configuration passed Caddy validation; the public hostname still returned
Cloudflare HTTP 525 at this handoff checkpoint. Do not claim public login or
SSO integration based on local readiness. No application/provider clients
have been created yet: each account-based service needs its own reviewed OIDC
integration and user-access separation test after the public issuer is ready.

Operator commands (from the project root):

```sh
node deployment/identity/init-private.mjs
docker compose --env-file deployment/identity/.env -f deployment/identity/compose.yaml -f deployment/identity/compose.bootstrap.yaml up -d
# Wait for first-start migrations and default blueprints before configuring.
docker compose --env-file deployment/identity/.env -f deployment/identity/compose.yaml exec -T worker ak shell -c "exec(open('/integration/configure.py').read())"
docker compose --env-file deployment/identity/.env -f deployment/identity/compose.yaml up -d --no-deps worker
node deployment/identity/check-login.mjs
node deployment/identity/backup.mjs
node deployment/identity/verify-backup.mjs /opt/utilibre/identity-backups/EXACT-SNAPSHOT-DIRECTORY
```

The backup script briefly stops only this identity server and worker, dumps
PostgreSQL and archives application data plus private configuration, then
restarts previously running services. Snapshots are private and on this VM,
not automatically scheduled or off-site. The verifier restores the dump into
a disposable, networkless database with no production volumes and checks the
owner record; it checks archive integrity but does not rehearse every possible
future provider, signing-key or user-file recovery. Establish recurring
off-site backup and full recovery procedures before community enrollment.

The initial snapshot at
`/opt/utilibre/identity-backups/2026-10-06T02-39-26-051Z` passed checksum and
archive checks and was restored successfully into the networkless test
database; its administrator record matched. The temporary restore container
was removed, and the production identity server, worker and database were
healthy afterward. The owner has no enrolled MFA device yet and no application
clients exist, as expected for this installation checkpoint.
