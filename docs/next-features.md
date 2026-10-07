# Minimal-glue feature delivery

Baseline: 2026-10-07; repository `1603ee1`. Preserve unrelated untracked
exports/artifacts. No additional listings, registration changes, or analytics.
Production portal publishing is already authorized; Caddy remains on the
separate edge VM. See the activation follow-up below for the later owner approval,
Hetzner allowance research, public WBO verification and remaining TURN networking.

| Capability | Baseline / upstream mechanism | Bounded implementation | Operations and verification |
| --- | --- | --- | --- |
| My Utilibre | Canonical TypeScript catalogue; no collection store | Versioned local ID lists, named collections, keyboard order, JSON portability, fragment preview and explicit save | No backend/dependency; schema, storage failure, fresh-browser sharing tests |
| Open with Utilibre | Existing Redlib router; SearXNG Hostnames plugin | Strict reviewed paths, original/copy actions; native preference configuration and LibRedirect instructions | Preserve submitted URLs; no URL fetch during conversion; hostile-input and destination checks |
| Image preparation | OmniTools 0.6.0, miniPaint 4.14.3 | Native resize/compress workflow and explicit file handoff where needed | No new processor; synthetic dimensions/format/transparency/network checks |
| Offline tools | QR Tools already has offline assets | Small explanatory entry point using native controls, no portal service worker | Fresh prepare, interrupted preparation, disconnected reopen, update/removal where supported |
| Device sharing | PairDrop 1.11.2 upstream share target | Expose documented application integration and ordinary fallback | Inspect receiver request path; no invented cross-origin inbox; actual hardware unavailable |
| Starting projects | Existing downloadable PDF, image and CSV fixtures; draw.io / Excalidraw native imports | Localized editable diagram and workshop board plus existing samples, contextual links | Import, edit/export/reopen checks; no remote importer |
| PairDrop / TURN | Direct WebRTC + Cloudflare STUN, no TURN, WS fallback off | Native feedback/help; separately disabled coturn option | Bounded synthetic direct/failure checks; relay activation needs network and capacity decision |
| Guest collaboration | Excalidraw 53973c3 local editor; no collaboration stack | Separate maintained upstream pilot, no custom room protocol/storage API | Two sessions, reconnect/export/assets/persistence/limits; no public claim from container health |

## Implemented journeys and boundaries

- `/en/my-utilibre` / `/es/mi-utilibre`: pin, reorder by keyboard, name collections,
  select a starting collection, export/import, reset only the toolkit key, and
  explicitly save a shared fragment preview. No portal database, account, telemetry
  or document transport. Limits: schema v1; 12 collections; 64 IDs/collection;
  256 total pins; 80-character names; 32 KiB imports. Retired IDs remain inert.
- `/en/tools/open-privately` / `/es/herramientas/abrir-con-privacidad`: reviewed
  Reddit paths and deterministic redd.it IDs, original/copy/open actions. Community
  `?sort=` is also mapped into the Redlib sort path. Unknown query fields, repeated
  values and fragments are retained; only six named UTM fields plus `share_id`
  and `rdt` are removed (the exact UTM names are in the code/guide). No URL
  fetching or remote short-link resolver. Other frontends were not added without
  verified path mappings. SearXNG's native Hostnames preference is optional/off,
  preserves query/hash, and cannot perform the opener's path validation/translation.
  Turn it off and repeat a search for original results. Rankings are unchanged.
- `/en/guides/prepare-image` / `/es/guias/preparar-imagen`: one-image native
  miniPaint editing/export, optional explicit OmniTools compression handoff. Native
  previews and actual downloaded dimensions/bytes; no custom codec or size-search
  loop. **Not** an automated batch/ZIP workflow. OmniTools compression uses its
  native 1920-pixel maximum dimension; a target size is not guaranteed. Keep
  originals and inspect output. No invented cancellation control or animation
  preservation. MiniPaint requires Tools → Settings → Transparent for transparent
  PNG output; the default is opaque. JPEG cannot preserve transparency.
- `/en/offline-tools` / `/es/herramientas-sin-conexion`: QR Tools only. Its native
  PWA handles caching/install/update. Added buttons call existing size/update/cache
  removal methods. Preparation now caches the existing FileSaver asset; failed
  installation rejects instead of activating an incomplete worker. No portal SW,
  cross-origin readiness claim, or preloaded models. Size is measured on demand on
  the device, not guessed. Removal preserves localStorage and user downloads.
- PairDrop native file share target: tested with a programmatic multipart POST
  intercepted by its active SW, exact bytes in IndexedDB, and queue consumption by
  its receiving page. **Not physical-device/OS-share verification.** Missing SW can
  send a POST to the server. Its text receiver puts content in URL queries; no
  local-only promise and no new portal share receiver. Normal paste/file pickers
  remain the recommended fallback. Native outgoing sharing is not proof of an OS
  receiving target.
- `/en/guides/starting-projects` / `/es/guias/proyectos-de-practica`: five exercises
  using local .drawio, .excalidraw, survey CSV, existing fictional JPEG and scan PDF.
  The six new localized diagram/board/CSV files carry `examples/LICENSE.txt` (CC0).
  Imported files can replace editor scenes; download existing work first. Guides
  link to explicit-save tool collections; files themselves are not in the links.
- PairDrop still uses direct WebRTC, Utilibre signaling, Cloudflare STUN, and
  **no production TURN or WebSocket file fallback**. Native offline/connection and
  transfer states are retained; the bilingual transfer guide explains discovery,
  acceptance, downloads, stalled connections and safe fallback without inferring
  a network cause. Coturn is a separately disabled, tested loopback option below.
- Excalidraw remains the local editor. Its complete upstream collaborative app
  depends on Firebase scene/image persistence as well as a room service. Instead
  of writing a replacement backend, WBO started as a separate loopback-only guest-room
  pilot. The later activation follow-up records its public HTTPS verification.

New complete EN/ES guides also cover My Utilibre and Open with Utilibre. Existing
image/transfer guides are updated rather than duplicated. Guide index, navigation,
privacy, provenance, sitemap and public-path audit allowlist include the new routes.
There are 46 canonical public document routes, not 46 independent tools. No
IndexNow notification or instance-list submission was sent in this batch.

## Components and glue inventory

The portal reuses its existing TypeScript DOM/static-rendering architecture. No new
portal package dependency. Existing tool versions remain in `catalog/upstreams.ts`.

| Files / configuration | Upstream interface and reason for glue |
| --- | --- |
| `portal/src/utilities/toolkits.ts`, `pages/my-utilibre.ts` | Canonical catalogue IDs, browser localStorage/clipboard/download APIs. Catalogue did not previously expose personal ordered collections; bounded schema and text-only rendering are necessary. |
| `portal/src/tools/private-router.ts` | Platform URL parser and Redlib a4d36e9 routes. Strict supported paths, tracking removal, community-sort mapping and original link need a small adapter. No network calls. |
| `pages/next-feature-guides.ts`, `offline-tools.ts`, examples; existing route/template/i18n changes | Static explanations, downloads and native import instructions; no pipeline, editor or template platform. |
| `qr-offline-controls.js`, `prepare-qr-offline.mjs` | QR Generator Offline 0fde700-p3 (MIT), native `window.pwa` methods and existing SW precache. Small controls plus two packaging corrections, not a new caching framework. Published corresponding integration/source archive. |
| `config/searxng/settings.yml`, native Redlib banner in Compose | SearXNG 2026.10.7-6671d89be (AGPL-3+) Hostnames plugin, default off, and existing branding links. Redlib's supported HTML banner offers bilingual return links on `/info` only; no response rewriting/global overlay. |
| `turn/prepare.mjs`, Dockerfile and optional Compose files | Coturn 4.7.0, BSD-3-Clause, official pinned image digest in Dockerfile. Renders bounded config, creates private secrets, strips executable file capabilities so cap-drop/no-new-privileges works. No authentication service. |
| `wbo/`, `compose.collaboration.yaml` | WBO 2.9.0 at f37875a6b427397e579e2a869caf073ae87ee264 (AGPL-3+, original notices retained), complete Node/Socket.IO/SVG stack. Dependency manifest/lock pins security fixes, nginx configuration bounds ingress. No application protocol/storage fork. |

WBO upstream tag commit is dated 2026-06-17. Its supported dependency ranges were
reviewed: Handlebars 4.7.10, Socket.IO 4.8.4; overrides for grpc-js 1.14.5,
protobufjs 7.6.5, engine.io 6.6.10, socket.io-parser 4.2.7, Jaeger propagator 2.9.0.
The resulting production dependency audit reported zero known vulnerabilities on
2026-10-07; this is not a security guarantee. Recheck overrides on updates. All
OpenTelemetry exporters/SDK are disabled and backend egress is isolated.

## Verification evidence — 7 October 2026 UTC

Environment: Chromium on this Linux VM; desktop and modest mobile emulation, not
Windows/Opera, physical phones, OS installations, cross-NAT networks, or load tests.
Synthetic content only. Local unit/browser checks do not prove Internet reachability.

- Toolkit: fresh-profile fragment preview without writes; explicit save; JSON
  roundtrip; ordering; scoped reset; blocked storage; malformed/oversized/versioned
  data; inert retired IDs; keyboard management focus. No contents uploaded.
- Opener: hostile schemes/credentials/lookalikes/ports/encodings/dot segments,
  meaningful/repeated query/hash preservation, community-sort translation,
  unsupported paths, original link, stale-output clearing, no conversion request.
  LibRedirect 3.4.0 source bc58841e99aae3b560948e926edfa834482165dc reviewed for
  custom instance and original-site controls. **Extension installation itself not
  tested.** Its MV2 build must not be promised on current Google Chrome; no browser
  downgrade/security-policy workaround recommended. Firefox remains the documented
  option. Official Chromium-install instructions conflict with Chrome's retirement
  timeline; use platform guidance for actual compatibility.
  Redlib's deployed backend returned 200 and 25 posts for the mapped
  `/r/Guatemala/new/?sort=new` destination; `/info` returned both native Utilibre
  links. A browser request through **public DNS** also returned 200 for `/info`
  and both links. The separate private-edge browser request returned 403, so that
  edge path must not be used as a substitute for the working public path.
  A headless public subreddit navigation did not reach post content within its
  15-second content deadline; public challenge-to-content completion is therefore
  not established by the backend check or the deliberately allowed `/info` route.
  No challenge or access policy was disabled to obtain a successful check.
- SearXNG: latest image staged then deployed using existing guarded updater;
  production EN/ES searches passed through private valid-HTTPS edge; 28 engines
  preserved; `/config` confirms plugin disabled by default and browser opt-in
  persists. Public-DNS hairpin timeout and existing `/stats` edge-template mismatch
  are documented with exact rollback in `docs/updates.md`.
- QR: `check-qr-lifecycle.mjs` passed old→new worker update, interrupted first
  preparation rejection/retry, fresh disconnected tab, text QR and PNG/SVG/PDF,
  cache-only removal preserving preferences/history. `check-qr-offline.mjs --backend`
  passed deployed p3 EN/ES desktop/mobile, output decode, centered quiet zones,
  all exports, synthetic camera and no external/application-upload requests.
  To repeat the old/new lifecycle check after release, stage the retained p2 and
  p3 images on distinct loopback ports and set `QR_PREVIOUS_PORT` and `QR_NEXT_PORT`.
  The checker no longer assumes production still runs the previous image.
- Image: `check-practice-guides.mjs` downloaded/reopened 600×400 PNG, **89,248
  bytes**, from the published fictional JPEG; `check-image-properties.mjs` passed
  transparent PNG (after native setting) and EXIF orientation 6 JPEG→upright PNG.
  No uploads/outside hosts in these flows. These cases are not all orientation,
  animation, browser or codec combinations. Image Scrubber's synthetic opaque paint
  and EXIF-removal regression also passed without outside requests.
- Starting projects: both localized draw.io files imported, edited, downloaded
  with Save as → Download → OK, reopened with edit retained. Both Excalidraw files
  imported, rectangle added, saved/reopened native JSON with four text elements.
  Both survey CSVs produced labeled SVGs with values 12/8/6. Both scan PDFs rotated,
  downloaded and reopened in BentoPDF 2.8.8. `check-starting-projects.mjs`; miniPaint
  exercise covered by image checks above. No application uploads/outside hosts.
- PairDrop `check-pairdrop.mjs`: real HTTPS signaling, discovery, receiver consent,
  exact-byte file transfer, selected direct candidate confirmed by WebRTC stats.
  Two isolated contexts on one VM. Native browser-offline message observed;
  no simulated cause attribution. `check-pairdrop-share.mjs` passed SW reception
  and consumed queue; emulation only, no shared file sent to a peer by that test.
- TURN `check-turn.mjs`: exact data-channel payload with forced selected relay;
  quota error 486 observed after two candidate-gathering peers consumed the four
  allocations (allocations are not users). 128,000 B/s/allocation and 256,000 B/s
  total are configured **lab** ceilings, not measured throughput/monthly budget.
- WBO `check-collaboration.mjs`: two independent sessions, bidirectional drawing,
  disconnect/reconnect, server scene replay and SVG download; zero external requests.
  62 native upstream board/rate-limit tests passed using the built dependency set;
  includes max children, geometry admission, item trimming and rate-limit disconnects.
  Gateway 65,537-byte request rejected with 413. These are not a concurrency estimate.
  The 12-connection gateway cap is configured, not an independently measured
  simultaneous-user capacity. No image-upload tool exists in this WBO build.
- Finish review: reviewer scored keyboard-focus and new-tab-disclosure fixes
  resolved; inherited ledger design retained. Captures in `.impeccable/review/toolkits/`.
- Release gates: TypeScript and ESLint passed; 83 unit tests passed; 70 desktop/
  mobile browser cases passed across the full run and targeted rerun after updating
  the community-sort expectation. Seven IndexNow-selection tests, private config
  validation, SearXNG pagination/redaction checks and optional Compose parsing passed.
  No extra portal dependency was added. Build output: main JS 323.04 kB raw /
  107.44 kB gzip; CSS 26.84 / 6.07 kB. These are bundle sizes, not field performance.
- Production after release: all **46** sitemap pages passed the bounded HTTPS SEO
  audit (HTML content, unique metadata, reciprocal language annotations, canonical,
  robots, same-origin scripts and security headers). Six My Utilibre browser cases
  passed on public DNS. Separate desktop/mobile smoke checks passed all six new
  localized guides, opener/original-link/no-fetch behavior, both offline pages and
  current QR links; no script errors or horizontal overflow. Unknown route returned
  404. The configuration-mocking guide/router tests are development tests: running
  them directly against production initially failed their fixture-host/count
  assumptions because production embeds its real configuration in SSR HTML. The
  separate live checks deliberately use the real configuration instead.
  No indexing/rankings/traffic or field Core Web Vitals result is inferred.

## TURN option — disabled public profile

PairDrop v1.11.2 reads static RTC JSON; no supported short-lived-credential endpoint
was found. Publicly delivered credentials are **not per-user authorization** and
could be reused outside PairDrop. Global quotas/rates, peer-range denials and a
real bandwidth allocation are essential. No uncapped relay was enabled.

To reproduce the synthetic loopback lab (never apply lab allowances publicly):

```sh
node deployment/community/turn/prepare.mjs --lab
docker compose -f deployment/community/compose.turn.yaml --profile lab up -d --build turn-lab
node deployment/community/check-turn.mjs
docker compose -f deployment/community/compose.turn.yaml --profile lab stop turn-lab
```

Public activation originally required all of these concrete owner inputs: dedicated real DNS
hostname; explicit IPv4 bind/public NAT addresses; approved allocation count and
per-allocation/global B/s based on hosting bandwidth allowance; monthly usage/stop
policy; working certificate renewal; firewall/NAT access. The later Hetzner research
supports a bounded first allocation; NAT IPv4 and certificate renewal remain missing.
Render only after setting
`UTILIBRE_TURN_BIND_IP`, `UTILIBRE_TURN_PUBLIC_IP`, `UTILIBRE_TURN_HOST`,
`UTILIBRE_TURN_CAPACITY_APPROVED=yes`, `UTILIBRE_TURN_TOTAL_QUOTA`,
`UTILIBRE_TURN_MAX_BPS`, `UTILIBRE_TURN_TOTAL_BPS`. Maximum configured allocations
accepted by this option: 32. Run the renderer without `--lab`.

Private files are generated under `/opt/utilibre/turn` (0700 directory; 0600
credential/config; no secret printed or committed). Mount a matching TLS chain and
key as `certs/fullchain.pem` and `certs/privkey.pem`, readable by UID 65534 only as
needed. Renewal must atomically replace files and restart this optional container.
Change rtc.json to root:1000 mode 0640 for PairDrop. This file will intentionally
be delivered to clients; the root-only credential file is the operator copy.

Listeners/NAT: 3478 TCP+UDP, 5349 TCP TLS, 49160–49191 UDP relay. No TCP peer relay,
DTLS, IPv6 peer relay, private/multicast/metadata/own-server peers in this first
option. Caddy HTTP reverse_proxy cannot provide TURN; **there is no TURN Caddy
block**. Provision these network rules separately. Docker uses host networking
but explicit bind IP; 128 MiB, 0.5 CPU, 64 PIDs, read-only filesystem, no capabilities,
no persistent traffic logs. Health is a local STUN check; it is not an allocation
or public reachability test. Use existing host/provider bandwidth monitoring for
aggregate usage, not file/peer logs; monitoring access/allocation remains a blocker.

After approval only, activate profile `public-turn`, then apply the companion
`compose.pairdrop-turn.yaml` with the existing community Compose to replace the RTC
mount. Preserve `WS_FALLBACK=false`. Force a controlled cross-network relay test,
verify certificate/auth/quota rejection and usage accounting before advertising it.
Rollback: recreate PairDrop from its original Compose without the optional override,
stop the `turn` service, and close only its dedicated ingress rules. Do not delete
credentials during a rollback. Public TLS/NAT and forced relay on different physical
networks remain unverified.

## Guest collaboration pilot — initial loopback setup

Start with `docker compose -f deployment/community/compose.collaboration.yaml
--profile pilot up -d --build`; source checkout must be exact WBO revision above at
`/opt/utilibre/src/whitebophir`. The port is **127.0.0.1:3169**, no public hostname.
Use an authorized SSH tunnel if testing from another computer. WBO is independent
of the existing local Excalidraw; do not replace its URL or documents.

English exercise: open the local pilot, create a fictional named board, copy its
board URL to a second independent browser profile, draw a rectangle in each, then
briefly disconnect/reconnect one profile. Both rectangles should reappear. Use
Download to save SVG and reopen the file. If disconnected, reconnect to the same
URL; do not repeatedly recreate boards. Export before the pilot stops.

Ejercicio en español: abrí el piloto local, creá una pizarra con nombre ficticio y
copiá su URL a otro perfil independiente. Dibujá un rectángulo en cada sesión,
desconectá y reconectá una; ambos deben reaparecer. Usá Download para guardar SVG
y reabrí el archivo. Si perdés conexión, volvé a la misma URL. Exportá antes de
detener el piloto. La interfaz puede seguir en el idioma que ofrece WBO.

Privacy/persistence: server-readable guest SVG scenes, **not E2EE**. Anyone knowing
or guessing a board URL can participate; it is not a private access-control token.
Closing a tab does not delete a board or revoke others. Native guest users can
erase individual objects but cannot clear a whole board as moderator. No image
upload/storage integration is advertised. No external assets observed; telemetry
disabled, backend network isolated, container logs disabled. Native scene files use
64 MiB tmpfs: survive disconnect/reconnect, **lost on container stop/recreation**.
No public user data exists here; no backup/recovery guarantee or expiry clock.

Limits: 256 live items (upstream trims oldest items above the limit, rather than
promising unlimited preservation); 128 stroke children; 8192 coordinate bound,
not a byte limit. 250 writes/5s, 40 constructive actions/10s, 190 destructive/60s;
native text policy also applies. Since nginx is the trusted peer, backend IP limits
form a conservative shared budget. Gateway: 12 concurrent connections (not users),
5 dynamic arrivals/s plus 50 burst, 64 KiB HTTP body. Static assets excluded from
arrival limiting after a real initial 429 failure was diagnosed. Backend 256 MiB,
0.5 CPU/64 PIDs; gateway 32 MiB/0.25 CPU/32 PIDs. Storage exhaustion/disk-failure
recovery was not tested; this is a small synthetic pilot, not durable hosting.

Public operation now uses the guarded LAN override described below, plus
`deployment/community/Caddyfile.collaboration-pilot` on the separate VM.
Keep noindex and disclose the temporary/server-readable storage before entry.
Do not promise private rooms based on upstream homepage wording. Rollback is stop
pilot/gateway and remove only its added edge route. Export first: stopping deletes
the pilot's tmpfs scenes. It does not touch Excalidraw or other services.

## Release and rollback

Production permission already established for portal/existing service updates.
QR p3 was deployed and its source archive published; Redlib recreated with native
banner and no source patch; SearXNG updated by its guarded updater. Portal source
release is `f8df3908e4b47bf0c33cf1c235478d198086ab33`, pushed to GitHub and built/
deployed with portal-only Compose recreation on 2026-10-07. At that initial release,
public TURN/WBO were disabled. See the later activation follow-up for changes.

Rollback image: `public-utility-portal:pre-toolkit-20261007`, preserved image ID
`sha256:ba753fe500d10fec11baf39b33018fc8eb28622485e0078ffe4e6eafd99b8dd2`.
Private environment backup: `/var/lib/utilibre-portal-release-20261007-VHTGtY/environment.private`.
Previous source URL ends in commit `d2ae9889c56e97a31c66826f4c01d23927ffbd48`.
The previous integration archive is preserved in `/opt/utilibre/source-update-WkAdRX/`.
New source archive includes 489 reviewed Git-indexed files, not unrelated exports.

After checks, the synthetic TURN, WBO and old/new QR staging containers were
stopped. WBO's temporary test drawings were discarded with its tmpfs; no visitor
documents were present. Existing public PairDrop, QR and Excalidraw were untouched
by that cleanup. Stopped pilot containers and images remain available for review.

Before portal deployment tag the running image and retain the private environment
backup. Run typecheck/lint/unit/browser/config/SEO checks, commit only scoped files,
publish the reviewed Git-indexed integration archive, set SOURCE_CODE_URL to that
commit and build/recreate **portal only** using root Compose. Do not use a broad
stack rebuild. Runtime data and unrelated dirty work remain untouched. For portal
rollback, use the retained image with a temporary Compose image override and restore
only SOURCE_CODE_URL; do not restore a whole stale env over SearXNG's newer pin.
Toolkit JSON is forward-versioned; an older portal ignores its key but does not
delete it. QR rollback uses retained `utilibre-qr-offline:0fde700-p2`, whose older SW
may update on next online visit; do not delete visitors' browser data. Redlib banner
rollback is a reviewed prior banner value and redlib-only recreation. SearXNG rollback
is independently documented in `docs/updates.md`.

Spacing follow-up (2026-10-07): the collection heading originally touched its
selector (0px gap). A scoped 1.5rem heading margin now gives 24px at default text
size, preserving all controls and storage behavior. Checked English/Spanish,
desktop/mobile, and gap scaling at enlarged text size; eight toolkit browser
tests passed. A separate pre-existing wide masthead overflow at CSS-only 200%
root font size was observed; this local heading fix does not change global
navigation or claim to resolve that unrelated text-enlargement issue. Rollback
image for this CSS follow-up: `public-utility-portal:pre-toolkit-spacing-20261007`;
restore the portal source reference to `f8df3908e4b47bf0c33cf1c235478d198086ab33`.

## Activation follow-up — 7 October 2026

The owner authorized installation/activation subject to privacy and security, and
identified a Hetzner auction server. Current official auction/traffic documentation
states a standard dedicated 1 Gbit/s uplink has unlimited traffic. Optional 10 Gbit/s
has 20 TB outgoing/month and overage charges. The actual Robot contract was not
available; do not confuse the VM's virtual NIC speed with that contract. No purchase
is required by the standard plan for this bounded option. Sources checked today:

- https://docs.hetzner.com/robot/general/server-auction-faqs/
- https://docs.hetzner.com/robot/general/traffic/
- https://docs.hetzner.com/robot/dedicated-server/network/10g-uplink/
- https://raw.githubusercontent.com/coturn/coturn/4.7.0/examples/etc/turnserver.conf

TURN: `turn/auction.env` prepares 8 allocations, 250,000 B/s per allocation,
1,000,000 B/s combined capacity. Coturn accounts input/output separately; the
aggregate setting is about 8 Mbit/s in each direction, not a measured network-wire
cap, a monthly budget or a guarantee of eight users. This conservative policy is
small relative to the standard 1 Gbit/s uplink; it does not promise transfer speed.
Credentials delivered to public browsers are reusable; the existing global limits
and public-peer-only restrictions remain essential. WS file fallback stays disabled.
No TURN listener or PairDrop RTC change has been activated.

Remaining TURN dependency is concrete network/certificate access, not another
generic bandwidth permission: point `turn.utilibre.org` **DNS-only** to the actual
public NAT IPv4; forward 3478 UDP/TCP, 5349 TCP and 49160–49191 UDP to the same ports
on 10.10.1.43, preserving relay ports. Do not publish a nonfunctional AAAA record.
Supply that verified IPv4 as `UTILIBRE_TURN_PUBLIC_IP` and a certificate/key for the
hostname with a renewal path. The current hostname resolves through Cloudflare;
ordinary Cloudflare/Caddy HTTP proxies cannot provide this TURN path. No remote
edge/Robot/DNS credentials were available. Do not guess NAT addresses from outbound
HTTP. After provisioning, render with the auction env file, activate public-turn,
perform forced cross-network relay/TLS/quota tests, then apply the PairDrop RTC
override. Use Robot Traffic statistics and existing host monitoring for totals;
no per-file/peer analytics. Investigate unexpected sustained saturation or an abuse
notice; disabling this optional relay returns PairDrop to its existing direct mode.

WBO: `https://collab.utilibre.org/` now serves the matching bilingual landing page
through Cloudflare/Caddy. The upstream head hook adds one native-dialog warning
before drawing, including for direct room links; no scene access, fetches, protocol
or storage code added. Landing template avoids upstream durable/private-room claims.
Native UI preserved. A file-scoped Impeccable color exception permits upstream
black (`rgb(0, 0, 0)`) in this separate app, not a new portal palette color.

Deployment uses `compose.collaboration.yaml` plus `compose.collaboration-lan.yaml`,
profile `pilot`. Restart policy is unless-stopped; this explicitly means drawings
are lost on container restart. Bindings: 10.10.1.43:3169 and operator loopback3169.
`wbo/firewall.sh` restricts forwarded LAN access to edge 10.10.1.3, blocks application
and gateway egress/host access, and allows only gateway→WBO. Fixed isolated subnets
172.29.94.0/24 and 172.29.95.0/24 were checked for conflicts. Persistence uses the
existing utilibre-tools-firewall systemd service's `wbo.conf` drop-in. Existing
Excalidraw and PairDrop containers/configuration are unchanged.

Observed checks at 23:01–23:04 UTC: two independent Chromium sessions drew and saw
each other's rectangles, reconnected and exported SVG over both loopback and
**public HTTPS**. EN/ES notices and landing pages, simulated 390px mobile layout,
foreign-Origin 403, oversized-body 413, corresponding-source download and no
third-party browser requests passed. These are not real-phone, capacity or uptime
tests. A first immediate post-recreation test timed out waiting for the notice;
after confirming HTTP readiness the unchanged workflow passed. Application egress to the
host and internet was blocked; an untrusted bridge client could not reach LAN3169.
Caddy block validates locally; the actual remote Caddy configuration/log policy
was not inspected. Public response has CSP, no-referrer, no-store and noindex.

Catalogue integration is explicitly a temporary pilot, not default/featured. Its
launch route, privacy answers, My Utilibre selection and complete guide use existing
templates. Guide URLs: `/en/guides/shared-whiteboard`, `/es/guias/pizarra-compartida`.
Routes automatically enter the public sitemap; rooms never do. No search/instance
submission is part of this follow-up. Source publication:
`sh deployment/community/publish-wbo-source.sh` includes exact upstream, lockfile,
integration and build recipe, without scenes or secrets. The public landing links
to `/utilibre-source/wbo-utilibre.tar.gz` (archive backup retained on replacement).

WBO rollback: first warn participants to download SVG; stop only this Compose
project and remove its edge route/catalogue enablement. Stopping destroys tmpfs
scenes and is not recoverable from a backup. Leave Excalidraw/PairDrop untouched.
Retain the dedicated firewall guard while its listener exists. No current user
boards should be deleted for a test or rollback without this warning.

Release checks: typecheck, lint, build, FOSS policy and 84 unit tests passed;
12 desktop/mobile guide/toolkit browser checks passed. Sitemap now contains 48
canonical portal documents, including both collaboration guides, not board URLs.
The existing Uptime Kuma now has a five-minute HTTPS monitor named
`WBO · temporary pilot`, added with the scoped updater; existing history/settings
were preserved and its private SQLite backup retained. This monitors reachability,
not collaborative drawing. During an idle observation WBO used about 43 MiB and
nginx 2.3 MiB; these are observations, not load/capacity estimates.

Portal follow-up rollback image: `public-utility-portal:pre-wbo-20261007`; prior
source reference `22edbe4aecb2fab2285b44375fcfaf5e4b344b85`. Restore only that portal
image/source reference and remove WBO enablement if rolling back discovery; do not
revert the complete environment or the unrelated SearXNG update. Source archives
are published from reviewed indexed files before the portal-only release.

Deployment completed: `ff88935` was pushed and built/recreated **portal only**.
Public checks at 23:12 UTC confirmed both new guide URLs, localized launch links,
six instructions per guide, pilot-view visibility and no horizontal overflow at
1280/390px. Screenshots were inspected. The read-only production SEO audit passed
all 48 canonical pages. The public status page exposes WBO monitor49; no uptime
percentage is inferred from this first observation. WBO source archive serves
HTTP200 as a downloadable binary; 498 reviewed integration source files were
published, with the prior archive in `/opt/utilibre/source-update-Utzavg`.
Public TURN remains disabled pending the network/certificate items above.

## Collab discoverability follow-up — 7 October 2026

The public app was already working, but the default eight-task starter selection
excluded pilots and its record was named only “Draw together · temporary pilot”.
The homepage search also silently limited new searches to the anonymous-ready
view, so a visitor looking for Collab there received no result. All-tasks/pilot
views did contain WBO; this was discovery friction, not a deployment outage.

The task name now includes “Collab (WBO)” in both languages. Search initiated from
Start here, or a direct query URL without an explicit view, searches all catalogue
tasks and visibly selects All tasks. Explicit public/account/pilot and category
filters remain scoped; the unsearched starter set stays unchanged. Pilot help now
distinguishes usable experimental services from unavailable ones. WBO stays in the
pilot classification with its non-sensitive/temporary-storage warning; no service,
registration, retention, or access rule changed. Direct destination:
`/en/?view=pilots&q=wbo#catalog` (Spanish: `/es/?view=pilots&q=wbo#catalog`).

Focused checks cover EN/ES search, direct query URLs, visible view selection,
working launch links, pilot warnings and explicit-filter preservation on desktop
and simulated mobile. Typecheck/lint/build and the existing unit suite are the
release gates. Portal-only rollback uses
`public-utility-portal:pre-collab-discovery-20261007` and source reference `ff88935`;
WBO itself must not be restarted or have its temporary boards erased for this UI fix.

Released as `438ca50`: 84 unit tests and six desktop/mobile guide/discovery checks
passed, alongside typecheck, lint, build and configuration validation. Live EN/ES
homepage searches and server-rendered direct query URLs return the Collab record,
correct localized launch and All tasks selection. Desktop/mobile captures were
inspected without overflow. Portal only was recreated; WBO's original start time
remained 23:02:23 UTC and its board storage was untouched.

## Collab public classification — 7 October 2026

At the operator's request, Collab now belongs to Use now and the Images, audio
and design category, not Pilots. It remains searchable in All tasks; the curated
eight starter tasks are unchanged. Public pilot labels were removed without
changing the anonymous room model, server-readable content, temporary storage,
export warning, service limits or access controls. The existing status monitor
was renamed to “Collab · WBO”, preserving its history.

Release checks: typecheck, lint, build, configuration validation, 84 unit tests
and six desktop/simulated-mobile guide/discovery tests passed. Tests explicitly
assert that Collab appears in Use now and not Pilots. Direct catalogue routes:
`/en/?view=public&q=wbo#catalog` and `/es/?view=public&q=wbo#catalog`.
Portal-only rollback image: `public-utility-portal:pre-collab-use-now-20261007`.
Do not restart WBO for this catalogue change: that would erase temporary boards.

## Primary references consulted

- SearXNG Hostnames: https://docs.searxng.org/dev/plugins/hostnames.html
- LibRedirect: https://libredirect.manerakai.com/docs.html
- PairDrop: https://github.com/schlagmichdoch/PairDrop/tree/v1.11.2/docs
- Share targets: https://developer.chrome.com/docs/capabilities/web-apis/web-share-target
- Origin boundaries: https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy
- Chrome MV2 retirement: https://developer.chrome.com/docs/extensions/develop/migrate/mv2-deprecation-timeline
- LibRedirect reviewed code: https://github.com/libredirect/browser_extension/tree/bc58841e99aae3b560948e926edfa834482165dc
- Excalidraw persistence: https://github.com/excalidraw/excalidraw/blob/53973c3a423fbd75a4ce68107786b4fcb90e4968/excalidraw-app/data/firebase.ts
- WBO: https://github.com/lovasoa/whitebophir/tree/f37875a6b427397e579e2a869caf073ae87ee264
- Coturn: https://github.com/coturn/coturn/tree/4.7.0
- Redlib banner/routes: https://github.com/redlib-org/redlib/tree/a4d36e954cf1bd64f209cd8868c5a29edc81b374

Retrieved 2026-10-07; installed source/configuration, not documentation alone,
determines the public claims.
