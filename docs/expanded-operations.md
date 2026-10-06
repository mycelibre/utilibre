# Expanded deployment operations

Work from `/home/ubuntu/freetools`. Caddy is on a separate VM at `10.10.1.3`;
application gateways bind `10.10.1.43`. Preserve its existing Cloudflare-only trust.

| Newer service | Public hostname | Application-VM port |
| --- | --- | --- |
| Priviblur | tumblr.utilibre.org | 3139 |
| Mezzo | tenor.utilibre.org | 3140 |
| FMD | fmd.utilibre.org | 3141 |
| LRCLIB (replaces Dumb) | lyrics.utilibre.org | 3142 |
| 4get | 4get.utilibre.org | 3145 |
| SafeTwitch | twitch.utilibre.org | 3146 |
| AnonymousOverflow | overflow.utilibre.org | 3147 |
| GotHub | gothub.utilibre.org | 3148 |
| Pollaris | pollaris.utilibre.org | 3149 |
| Binternet | binternet.utilibre.org | 3150 |
| BiblioReads | biblioreads.utilibre.org | 3151 |
| TransLite | translate.utilibre.org | 3152 |
| Rimgo | rimgo.utilibre.org | 3153 — media upstream rate-limited |
| Kittygram | gram.utilibre.org | 3154 |
| QR Tools | qrtools.utilibre.org | 3155 |
| DeGoog | degoog.utilibre.org | 3156 |
| Mumble | mumble.utilibre.org | 64738 TCP **and** UDP — TCP voice and inbound UDP routing verified; UDP audio not yet tested |

DeGoog's direct port 3143, LibreMDB's 3144 and Kuma administration 3135 remain
loopback-only. Do not route them through Caddy. The current Caddy HTTP blocks are
in `deployment/community/Caddyfile.community`. Mumble instead needs DNS-only and
TCP/UDP forwarding; keep its join password separate from SuperUser credentials.
Credentials are private in `/opt/utilibre/mumble/runtime.env`, not in this repo.

## Scheduled maintenance

### Lyrics replacement

LRCLIB's MIT-licensed official web client replaces Dumb at the same hostname
and port. It searches the LRCLIB catalog, not Genius: annotations, Genius links
and artist biographies are not preserved. The upstream interface is English.
The portal explains this in both languages. No custom Utilibre return link was
added, following the native-settings-only rule.

Pinned frontend: `tranxuanthang/lrclib-homepage` commit
`f37c07042be1af5fdcc7932d090af32141089751`, with
`deployment/community/lrclib-source.patch`. The production image contains only
static frontend assets and a dependency-free Node 24 read-only adapter. The
frontend's production dependency audit is clean; older build-only Tailwind/Vite
tooling still has advisories and is not exposed as a development server.

The adapter only calls LRCLIB's documented `/api/search`. It sends an identifying
User-Agent, no visitor headers, serializes requests with a 500 ms gap, and honors
Retry-After (minimum 60 seconds; 403 pauses ten minutes). Responses are limited
to 2 MiB, with an 8 MiB / 128-entry / ten-minute RAM cache. No account, publish
API, arbitrary proxy target, persistent search history or search logging.
Cloudflare/Caddy remain in the data path. Public browser tests confirm that CSP
blocks Cloudflare's injected inline challenge script; the app itself works
without enabling that script. Health monitoring checks only local liveness,
not continuous upstream searches.

Build from the pinned checkout with the patch applied:

```sh
docker build --build-context integration=/home/ubuntu/freetools/deployment/community \
  -f /home/ubuntu/freetools/deployment/community/Dockerfile.lrclib \
  -t utilibre-lrclib:f37c070-p1 /opt/utilibre/community-src/lrclib-homepage
docker compose -f deployment/community/compose.additions.yaml up -d --no-deps dumb
docker exec utilibre-additions-dumb-gateway-1 nginx -t
docker exec utilibre-additions-dumb-gateway-1 nginx -s reload
LRCLIB_CHECK_URL=https://lyrics.utilibre.org node deployment/community/check-lrclib.mjs
```

The Compose service key `dumb` is retained solely to preserve its private network
address/firewall and existing gateway. Its image is now LRCLIB; the public
catalog ID is `lrclib`. The previous stateless Dumb image remains available for
rollback, but still cannot retrieve Genius content. No visitor data was removed.

Other replacements reviewed October 6:

- [Phantom](https://codeberg.org/phantom-org/phantom) at `5517e140` still fetches
  Fandom's blocked media host. Its proxy uses string-prefix URL authorization,
  follows redirects and reads unbounded bodies; not deployed as a safe drop-in.
- [Rimgu](https://codeberg.org/3np/rimgu) explicitly recommends Rimgo instead
  while its own development is paused. No verified Imgur replacement found.
- [Watcharr](https://github.com/sbondCo/Watcharr) is an account-based watched-list
  service, not an anonymous IMDb reader. TMDB-based movie browsers also require
  operator API registration and terms acceptance. No verified LibreMDB drop-in
  was deployed in that replacement review. The later private LibreMDB repair
  below supersedes the obsolete-runtime blocker, not the public data-use gate.

### Reader comparison follow-up — October 6, 21:36 UTC

Working instances are evidence to investigate, not proof that all frontends are
universally broken. This follow-up changes the earlier LibreMDB diagnosis; no
production deployment or privacy setting was changed during these comparisons.

- **LibreMDB:** the [darlopvil fork](https://github.com/darlopvil/libremdb-fork)
  at `b233f4e24acfb4afbe55b7c13798832ca8068086` replaces HTML extraction with
  anonymous IMDb GraphQL POSTs. Using its documented request header, a minimal
  title query from this application VM returned HTTP 200 and the correct title
  for `tt1049413`. The earlier generic GraphQL rejection does **not** establish
  that this method is blocked. This verifies data access, not the complete fork's
  UI, full queries or media. The API response explicitly excludes public use;
  [IMDb's published data-use conditions](https://help.imdb.com/article/imdb/general-information/can-i-use-imdb-data-in-my-software/G5JTRESSHJBBHTGX)
  also restrict extraction and republication. Resolve the public-use basis before
  launching this route. The fork still pins Next 12.2.5 and old dependencies, so
  runtime/security modernization is independently required. No API credentials,
  paid agreement, challenge solver or public deployment was added.
- **Rimgo:** a bounded range request for `wG1nGfK.mp4` at `ri.nadeko.net`
  returned HTTP 200, `video/mp4`, a content range and a valid MP4 signature;
  the same path on `rimgo.utilibre.org` returned 429 with Retry-After 601.
  Nadeko's [privacy page](https://ri.nadeko.net/privacy) identifies version
  1.4.2 and Chile/Movistar hosting. This supports investigating outbound network
  access; it does not prove every Hetzner address is blocked. Rimgo's
  [provider guidance](https://rimgo.codeberg.page/docs/getting-started/unsupported-providers/)
  documents this failure class. The app VM has no global IPv6 address/default
  IPv6 route, regardless of the public edge's AAAA record. No external instance
  was configured as our upstream; no new proxy/provider was provisioned.
- **BreezeWiki:** browser checks loaded the same `/zelda/wiki/Link` article
  at `breezewiki.nadeko.net` and `wiki.utilibre.org`. The other instance's
  browser contacted `zelda.fandom.com` and referenced direct Fandom-CDN images;
  ours retrieved the article server-side but its first proxied article image
  returned 403. Media requests were deliberately bounded, so this is **not** a
  full media-success claim for the other instance. Upstream's
  [configuration guide](https://docs.breezewiki.com/Configuration.html) explains
  the proxy/JSONP distinction. Direct browser media connections could work from
  a visitor's network but would disclose their IP to the upstream; approval and
  accurate privacy wording are needed before changing our configuration. Native
  JSONP/direct-media mode has not been enabled.

### Privacy-preserving repairs — October 6, 22:00 UTC

The operator explicitly rejected direct browser connections to Fandom. Keep
`bw_strict_proxy=true`, JSONP and suggestions disabled, and the same-origin CSP.
Do not enable a direct-media fallback or borrow another public instance as an
upstream. The public catalog still distinguishes visible inventory from a
verified launch; none of these three was newly enabled for public launch.

**BreezeWiki:** deployed gateway changes disable error logs that could include
visitor addresses/article URLs, strip visitor identity headers before the
application, and restrict form submissions to the same origin. Four regression
tests in `deployment/expanded/tests/wiki-privacy.test.mjs` enforce these settings.
Public article text and the new headers were verified. Chromium's network
diagnostics confirmed an external independent-wiki logo was blocked by CSP,
not fetched; a Playwright `request` event alone is not proof of network contact.
The proxied Fandom image still returns 403. Its complete source archive was
refreshed, with the previous archive preserved.

**Rimgo:** deployed `utilibre-rimgo:d2be8e2-p3`
(`sha256:00855ed0135e8a27b524759651b8da7727685fda86740fa75f0fdac23d7886c2`).
Per-host admission now serializes response-header retrieval so simultaneous
image requests see the first 429 cooldown, rather than all reaching Imgur.
Waiting requests honor cancellation, visitor identity headers are removed,
and the custom transport negotiates HTTP/2. Five offline transport tests cover
destination policy, cooldowns, concurrent requests, cancellation and headers.
The public version and media response were checked: the video remains 429,
`no-store`, Retry-After 601. This is a retry/privacy fix, **not restored playback**.
The source patch and complete archive match the deployed p3 changes.

**LibreMDB:** privately repaired the darlopvil fork at `b233f4e24acfb4afbe55b7c13798832ca8068086`.
Node 24.21.0 / Next 16.4.0 replace the unsupported runtime. Package audit reports
zero known vulnerabilities in the reviewed lockfile. The patch also fixes an
over-broad media URL regex: exact HTTPS hosts, public DNS answers passed directly
to TLS, no redirects, bounded responses/time/concurrency and fixed outgoing
headers. Untrusted HTML is sanitized, browser resources remain same-origin,
and error pages do not expose server stacks. GraphQL results have a bounded
16 MiB / 64-entry RAM cache with timed deletion after ten minutes. It fails
closed unless `UTILIBRE_PRIVATE_EVALUATION=true`.

Desktop/mobile checks passed for search `Up`, movie `tt1049413`, and visible
proxied images (17 desktop / 16 mobile), with no third-party browser requests,
JavaScript errors or horizontal overflow. Invalid destinations are rejected and
the invalid-title error discloses no server stack. Four offline security tests
and the production build pass. Impeccable's hardening checks guided these
privacy/error checks while preserving the upstream interface. This sample does
not certify every title, person, list or trailer. React 18 is supported but
deprecated by Next 16; migrate it before Next 17.

The private test container was stopped after verification. It has an explicit
`libremdb-review` Compose profile, a loopback-only binding and no application
logs. No public Caddy route, portal launch, monitoring or directory submission
was added: IMDb public data-use permission remains unresolved. The software's
AGPL license is separate from permission to use IMDb's data.

To reproduce the private check, apply `deployment/community/libremdb-private-source.patch`
to a pristine checkout of the pinned fork, then:

```sh
docker build -f deployment/community/Dockerfile.libremdb-private \
  -t utilibre-libremdb:b233f4e-p1 /opt/utilibre/community-src/libremdb-fork
docker compose -f deployment/community/compose.evaluation.yaml --profile libremdb-review up -d --no-deps libremdb
node deployment/community/check-libremdb-private.mjs
docker compose -f deployment/community/compose.evaluation.yaml --profile libremdb-review stop libremdb
```

### Existing schedules

```sh
systemctl list-timers 'utilibre-*' --no-pager
systemctl status utilibre-account-backup.service utilibre-monitor-alerts.service
node deployment/community/monitor-alerts.mjs
```

Daily guarded SearXNG updates run at 02:20 UTC with jitter, community snapshots
at 04:10, identity/expanded-account snapshots at 04:40, and the original service
backup at 08:20. Account snapshots briefly stop account applications for consistency,
restart only previously running services, then verify isolated restores.
Recovery state in `/run/utilibre-account-backup-state.json` is consumed by the
locked `ExecStopPost` recovery handler after interruption. Do not run backup scripts
concurrently outside their systemd locks.

The five-minute monitor watcher alerts after two consecutive failed/stale
observations; it also watches 10 GiB disk headroom, 5% inode headroom and 5% available
memory. Alerts repeat no more than every 12 hours for an unchanged condition;
recovery sends one notification. Mail goes from `no-reply@utilibre.org` to
`admin@utilibre.org` via the private relay with verified STARTTLS. It includes no
visitor queries or backup contents. It cannot independently detect whole-VM loss.

No automatic deletion policy was chosen for new snapshots. The backup guards
refuse new runs below 5 GiB free and notify the operator. Off-site storage still
needs an operator-provided destination; on-host snapshots are not disaster recovery.
The operator explicitly deferred off-site backup work on October 6; keep the
existing local schedules unchanged and do not purchase or provision storage.

## Recheck the new launches

```sh
node deployment/community/check-qr-offline.mjs
node deployment/community/check-new-readers.mjs --only=gram
node deployment/community/check-degoog.mjs
node deployment/community/check-mumble.mjs
# After the edge forwarding is applied; pins the private server certificate:
node deployment/community/check-mumble.mjs --public
# Optional outside-network test via a temporary local Tor SOCKS listener on9151:
node deployment/community/check-mumble.mjs --tor --voice
```

The default Mumble check verifies private-network TLS/protocol authentication.
`--public` additionally checks public-hostname TCP authentication, not UDP audio.
`--tor --voice` uses an independently routed TCP connection, pins the server's
LAN certificate before sending credentials, and verifies a valid Opus silence
packet through server loopback. No other participant hears the probe. This
passed on October 6. A direct connection from the application VM times out
despite working external TCP access, consistent with missing NAT reflection.
Reader tests make real upstream requests: do not loop them against
429/challenge responses. Rimgo's cooldown honors longer upstream Retry-After
values and otherwise waits ten minutes; its state is in memory.

Rimgo's previously stale public media URL was rechecked at 20:15 and 20:27 UTC:
`CF-Cache-Status: BYPASS`, `Cache-Control: no-store`, `Retry-After: 601`.
That cache problem is resolved for the tested URL, but the separate Imgur429
persists. Do not repeatedly retry or purge unrelated Utilibre hosts.

BreezeWiki p2 adds per-host rejection backoff (minimum ten minutes; longer
upstream Retry-After is respected), strips upstream challenge documents, and
sandboxes media responses. Six offline transport tests and a Racket response
integration test guard this behavior. This does not remove Fandom's image block.

DeGoog uses official 1.0.0 plus three pinned AGPL SearXNG engines. Run
`init-degoog.mjs` only for private credential initialization; run
`configure-degoog.mjs` to install/configure the curated engine set, then restart
the DeGoog service. The script preserves existing identity/credentials and saves
private pre-change settings. Its native privacy panel links the source archive.

## Mumble

Use a [Mumble client](https://www.mumble.info/downloads/), not a web browser:

- Server: `mumble.utilibre.org`
- Port: `64738`
- Password: request access from `admin@utilibre.org`; it is not published here.
- Certificate: self-signed. Compare its SHA-256 fingerprint before accepting it:
  `83:FA:6A:F8:C6:79:77:E0:FE:4E:DA:3B:1F:6C:83:D6:E5:B2:49:60:CA:96:9E:DD:87:FD:86:E1:4C:38:EB:01`

Public TCP authentication and voice fallback are verified. A credential-free
[GitHub-runner check](https://github.com/mycelibre/utilibre/actions/runs/37525936562)
also verified pinned TLS and rejection of invalid credentials. Its tagged UDP
packets (nonce `5574696cc9adeaa7`) reached the application VM and the Mumble
container at `172.29.92.10:64738` on October 6 at 20:22 UTC. Inbound UDP forwarding
is therefore verified. This is not an authenticated UDP audio/return-path test.
Public status pings stay disabled (`ALLOWPING=false`); missing unauthenticated
ping replies are not a firewall failure. No Mumble firewall change was needed.
The Kuma monitor remains an explicitly private TCP-listener check. The join
password is separate from the private SuperUser administrator password.

The manual `Mumble external connectivity` workflow sends no production secrets.
It emits three small UDP probes and reports **sent**, not **delivered**. To repeat,
capture only those tagged packets on the application VM while dispatching it:

```sh
timeout 60 tcpdump -i any -nn -XX 'udp dst port 64738 and udp[8:4] = 0 and udp[12:4] = 0x5574696c'
# Run separately while the capture is active:
gh workflow run mumble-external.yml
```

Compare the full eight-byte nonce printed by the workflow with the capture;
do not capture unrelated voice packets or treat a green send-only step as UDP
audio verification. The workflow is manual-only, not recurring monitoring.

En español: instalá un cliente de Mumble, conectate a `mumble.utilibre.org` en
el puerto `64738` y pedí la contraseña a `admin@utilibre.org`. Compará la huella
del certificado antes de aceptarlo. La voz por TCP está verificada; falta
verificar UDP desde una conexión externa. No compartás la contraseña de SuperUser.
