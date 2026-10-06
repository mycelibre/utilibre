# Browser toolbox review — 2026-10-06

## Public-reader expansion checkpoint — October 6, after the edge update

This section supersedes older deployment states below. Installation, a passing
homepage, successful content retrieval, and public readiness are separate checks.

| Application | Listener | Verified / remaining work |
| --- | --- | --- |
| Rallly 4.15.3 | app LAN 3123; `poll.utilibre.org` | Public HTTPS and native Utilibre OIDC now pass: two approved synthetic users reached account setup; the non-approved user was denied. Email-login bypass routes remain blocked. Onboarding, poll creation and guest voting still need end-to-end verification. |
| Priviblur 251a8e6 | app LAN 3139; `tumblr.utilibre.org` | Tumblr staff blog and an individual post rendered locally; security dependency updates, private-network egress blocks and RAM-only cache. Public HTTPS now responds successfully; public content/media and Spanish browser checks remain. Modified-source archive linked prominently. |
| Mezzo 1.4.0 | app LAN 3140; `tenor.utilibre.org` | A real local GIF search returned results and a proxied GIF returned HTTP 200 with image/gif. Public HTTPS now responds successfully; final public content/browser test pending. |
| FMD Server 0.17.0 | app LAN 3141; `fmd.utilibre.org` | Invitation token required. Two synthetic accounts demonstrated opaque-location round-trip and account separation, then both accounts/data were deleted. Public HTTPS now responds successfully; public API and real Android/push tests remain. |
| Dumb | app LAN 3142; proposed `lyrics.utilibre.org` | Homepage works, but Genius search fails and a lyric URL returns a soft error. Not publicly advertised as working. |
| DeGoog 1.0.0 core | loopback 3143 | Public-instance lockdown denies unauthenticated settings API reads/writes. Indexer defaults off. No engines installed: the separate official extensions repository has no identified license. |
| LibreMDB | loopback 3144, stopped | IMDb search/title requests failed. Published image contains Node 18 / Next.js 12; public deployment requires a supported build and working upstream access. |
| 4get 03ba5d7 | loopback 3145 | Built with Apache and PHP 8.4 on Alpine 3.23; real DuckDuckGo and Wiby searches passed. No rotating proxies or browser-challenge workarounds. Public gateway/abuse review remains. |
| SafeTwitch | loopback 3146 | Discovery API returns real categories. Static frontend served by current pinned nginx; old backend has unrestricted URL-fetch routes. Must harden and test playback before opening publicly. |
| AnonymousOverflow | loopback 3147 | Real Stack Overflow question and answers rendered through the API. Reachability-aware govulncheck found 14 advisories across three old dependency modules. Dependency/runtime remediation, quota/cache and public HTTPS checks remain. |
| GotHub 24bedc8 | loopback 3148 | Public Utilibre GitHub repository rendered. Image uses Alpine 3.16 and older dependencies; update and review before exposing it. Upstream seeks maintainers. |

Runtime recipes are `deployment/community/compose*.yaml`. Evaluation services
have loopback listeners, capability drops, read-only roots, resource limits,
disabled IPv6, and firewall blocks on private/host destinations. These controls
are not an independent security audit or a complete open-proxy defense. The
reader evaluation stack does not restart automatically. Native language settings
are used where available; Priviblur requires the complete Spanish preference
restore URL, not only a `language` parameter. Experimental entries are searchable
in the bilingual catalog and software list, with no launch links and no claim
of public availability; they are not featured on the default homepage.

Merge `deployment/community/Caddyfile.community` on the separate edge VM,
preserving the existing Cloudflare-only trusted proxy ranges. The file supplies
Rallly, Priviblur, Mezzo and FMD routes; adding a route does not complete their
end-to-end tests. Do not publish the loopback evaluations. Do not open FMD
registration or replace its Android authentication with a browser login gate.
The unsupported `lyrics.utilibre.org` block has now been removed from the
deployment file so applying it does not expose a nonfunctional reader. The
remaining Caddyfile passes local adaptation and provisioning validation; this
does not establish successful certificate issuance or connectivity on the edge.
The four new public routes now pass ordinary verified HTTPS GETs after the
operator's edge update. The same-day recheck also found 21 of the 22 previously
enabled service roots reachable from this VM. SearXNG's public IPv4 connection
times out from this VM, and this VM has no IPv6 route; its local `/healthz`
returns OK and the operator confirms public search works. Treat this as a
vantage-specific connectivity failure, not evidence of a general search outage.
No SearXNG limiter or proxy-trust configuration was weakened for these probes.

Rallly uses the AGPL distribution without purchasing a key or altering license
checks. Native `instance_settings.footer_links` contains English/Spanish return
links and the matching upstream source. The original three QA identities remain
retired. A fresh `20261006b` run verified public password + MFA login, completed
the approved OIDC callback, and rejected the outsider. All three fresh identities
were then retired too: groups cleared, passwords made unusable, sessions/tokens/
MFA fixtures revoked. The two empty synthetic Rallly accounts and their app
sessions were deleted; no owner credentials or real user data were changed.
Run-specific QA scripts refuse credential overwrites or reused usernames.
Community snapshot `2026-10-06T12-31-17-122Z` passed a disposable
PostgreSQL restore and FMD SQLite integrity checks. It is on-host only and
unscheduled, not a complete backup/recovery service.

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
- Priviblur, Mezzo, Dumb, LibreMDB, DeGoog, 4get, SafeTwitch, AnonymousOverflow
  and GotHub are **not submitted**: public readiness is incomplete. Mezzo and
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
- Rallly remains staged, not publicly enabled. Licensing is not itself a
  mandatory-purchase blocker: the developer's [May 30 clarification](https://github.com/lukevella/rallly/discussions/1714)
  confirms the AGPL code may be self-hosted without purchasing a key. The
  [commercial terms](https://rallly.co/terms-of-use) expressly preserve
  open-source rights. No paid license was purchased and no license checks were
  modified; operational readiness still needs testing before launch.
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
