# Resource usage and operating limits

Measurement dates: 2026-08-28–2026-08-30

This document distinguishes **measured** observations from **planning estimates** and configured ceilings. A quiet-container snapshot is useful for detecting obviously unsuitable services, but it does not predict FFmpeg peaks, coordinated abuse, upstream latency, or sustained media transfer.

## Measurement method and scope

The launch stack and optional rimgo were started only on the configured private
address. After health checks settled, several snapshots were recorded with
`docker stats --no-stream`, along with Docker image/storage reports. The final
snapshot includes newly built Redlib after startup and health checks.
Functional smoke requests included a controlled Dailymotion tunnel cancellation
after its first response chunk and a bounded local-only Redlib settings
concurrency check. No representative page/media concurrency benchmark, soak
test, completed Cobalt media download, FFmpeg-path test, or third-party load
test was run. Redlib's configured crawler denial was checked with one identified
bot user agent, and one small proxied image Range request was bounded to 1 KiB;
neither is a production-load measurement.

The measurement therefore represents **idle or nearly idle working memory**, not peak memory. CPU percentages are one short sample and are included only to show that no service was busy at the instant sampled. Network counters included startup and smoke-test traffic and are not used as bandwidth forecasts.

## Measured quiet snapshot

| Service | Measured RAM | Point CPU sample | Configured CPU ceiling | Configured RAM ceiling | PID ceiling | State in milestone 1 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Portal | 22.44 MiB | 0.01% | 0.50 CPU | 256 MiB | 128 | Core |
| Cobalt | 49.38 MiB | 0.00% | 1.50 CPU | 1,536 MiB | 256 | Core |
| SearXNG | 135.8 MiB | 0.00% | 1.00 CPU | 768 MiB | 256 | Core |
| Valkey | 8.121 MiB | 0.17% | 0.25 CPU | 128 MiB | 100 | Core/internal only |
| Anubis | 13.75 MiB in one post-cutover point sample | 3.12% during that point; not a settled idle claim | 0.25 CPU | 128 MiB | 128 | `privacy-frontends`; Redlib gate |
| Redlib | 7.102 MiB | 0.00% | 0.50 CPU | 256 MiB | 128 | `privacy-frontends` launch profile |
| rimgo | 12.57 MiB | 0.09% | 0.50 CPU | 256 MiB | 128 | Optional/off by default |

The initial measured stack without Redlib totaled approximately **215.7 MiB**;
including optional rimgo in that same snapshot it was approximately **228.3
MiB**. Later pre-Redlib points ranged from about **210.4 MiB** to **248.4 MiB**
as SearXNG caches and tests changed. After the 2026-08-30 Redlib build/start,
one point sample recorded portal **21.68 MiB**, Cobalt **51.5 MiB**, SearXNG
**170.1 MiB**, Valkey **8.141 MiB**, and Redlib **5.59 MiB**: approximately
**257.0 MiB** total. Redlib, portal, and Cobalt showed 0.00% point CPU; Valkey
0.24%; SearXNG was active at 3.08%, so this is neither a settled idle minimum
nor an active peak. With Anubis, the configured launch ceilings total **4.00 CPUs and 3,072
MiB RAM**; adding optional rimgo makes **4.50 CPUs and 3,328 MiB RAM**. These
are ceilings, not reservations or expected simultaneous use. Launch memory
reservations total 608 MiB.

No representative active peak was measured. A successful SearXNG HTML query and a rimgo gallery/media smoke request completed, but sampling their tiny one-off requests would not provide a defensible production peak. The documented Dailymotion example resolved through the portal and Cobalt; its tunnel delivered a first chunk before controlled cancellation. That exercise did not complete the download or enter a demonstrated FFmpeg-heavy path, and no resource sample or soak was recorded for it. The portal's browser tests exercised all local tools, but the processing load was in the test browser rather than the portal container.

## Disk footprint and temporary storage

| Component | Approximate image virtual size | Persistent disk | Bounded temporary storage |
| --- | ---: | --- | --- |
| Portal | 227 MB | None | `/tmp` tmpfs, 32 MiB |
| Cobalt | 438 MB | None; no media volume | Read-only root and no writable media volume; short-lived tunnel state is held in process memory |
| SearXNG | 374 MB | Named `searxng-cache` volume; rebuildable, not a query-history database | `/tmp` tmpfs, 128 MiB |
| Valkey | 65.8 MB | None; RDB and AOF disabled | `/tmp` tmpfs, 16 MiB; `/data` tmpfs, 128 MiB; `maxmemory` 96 MiB |
| Anubis 1.27.0 | 15,715,456 bytes (about 15.0 MiB) | `data/anubis/anubis.bdb`; transient challenge state, not content | Read-only root; `/tmp` tmpfs, 16 MiB; bbolt data directory bounded by host monitoring |
| Redlib | 35.6 MB locally built image | None; no database or volume | Read-only root; `/tmp` tmpfs, 32 MiB; OAuth/device state is process memory |
| rimgo | 38.2 MB | None | In-process cache, approximately 25 MiB by upstream design |

Image sizes are Docker-reported virtual sizes; shared layers mean their sum is
not exact occupied disk. After the Redlib source build, `docker system df`
reported 1.267 GB of images (38.24 MB reclaimable), 327.7 kB in containers, one
0-byte volume, and 5.455 GB of BuildKit cache, of which 5.101 GB was
reclaimable. Much of that cache is consistent with the Rust/BoringSSL compile,
but the aggregate can include earlier or other-project cache. Root free space
was approximately 85 GiB. The only named persistent Docker volume is the
re-creatable SearXNG cache.

Inspect attribution first with `docker system df -v`. If disk is needed and the
operator accepts slower Redlib rebuilds/rollback, `docker builder prune` is an
optional manual cleanup. It can remove cache useful to other projects; do not
run it blindly or replace it with a broad Docker prune.

The configured launch tmpfs size limits sum to 336 MiB including Redlib, but
tmpfs consumes host memory only as pages are used. It is not additional
guaranteed capacity outside container/host memory accounting. After the partial
Dailymotion tunnel was cancelled, inspection found no media artifact in
Cobalt's writable layer or `/tmp`. Cobalt's no-volume, read-only layout and
that bounded observation prevent a known persistent media archive in the tested
path; they do not justify a claim of forensic erasure or prove every upstream
code path never buffers bytes in memory or kernel/container storage layers.

## Per-service operating profile

### Portal

- **CPU/RAM:** measured 18.63–22.44 MiB with effectively idle point CPU; static delivery and small validation/status operations should remain light. Ceiling: 0.50 CPU and 256 MiB.
- **Persistent/temporary disk:** no database or volume; 32 MiB tmpfs for temporary runtime needs. Static assets live in the immutable image.
- **Ingress/egress:** ordinarily small HTML, JavaScript, CSS, and self-hosted WASM responses. Browser tools add no processing traffic after their assets load. `POST /_portal/media` accepts at most an 8 KiB JSON body.
- **Database:** none.
- **Likely abuse:** media request floods, oversized/malformed JSON, spoofed proxy headers, arbitrary URL attempts, and repeated status calls.
- **Controls:** exact Origin allowlist, strict provider/URL validation, private literal-address rejection, fixed upstream address, 10 requests per 10 minutes per client by default, maximum two in-flight gateway jobs, 45-second upstream wait, fixed high-level status targets, and container ceilings.

### Cobalt

- **CPU/RAM:** measured 43.69–71.62 MiB at quiet points. URL resolution is usually light, while FFmpeg or local processing can burst CPU and memory. Ceiling: 1.50 CPU and 1,536 MiB; processing priority defaults to 10.
- **Persistent/temporary disk:** no media volume or database; root is read-only. Cobalt can stream a result, keep short-lived tunnel metadata in process memory, or return an upstream URL. Local processing is forced to `never` in this deployment, but operators must still avoid claiming that media bytes can never touch any transient storage layer.
- **Ingress/egress:** potentially the dominant cost. Tunnel delivery sends provider traffic into the VM and media bytes back out to the visitor. A returned external media URL shifts delivery to the external provider/CDN. The intended approximately 500 MB result ceiling is not enforceable by the selected Cobalt release.
- **Database:** none; the API-key file is a read-only secret, not a user database.
- **Likely abuse:** open-API reuse, request floods, long content, repeated extraction, bandwidth relay, provider bans, and resource-heavy processing.
- **Provider state:** the default/live host allowlist is exactly `dailymotion.com,dai.ly`; every other provider is disabled. YouTube is temporarily disabled after two live failures on pinned 11.7.1 matching [official open Cobalt issue #1562](https://github.com/imputnet/cobalt/issues/1562).
- **Controls:** private binding, server-held API key, exact CORS origin, portal rate/concurrency limits, Cobalt rate/tunnel limits, supported 30-minute duration target, the Dailymotion-only provider allowlist, all other services disabled, no cookies/accounts/playlists/batch picker, and edge exposure of exact `GET /tunnel` only.
- **Measured function:** the documented Dailymotion example resolved through the portal/Cobalt path, its tunnel returned a first chunk, and the client then cancelled it. No media artifact was found in the Cobalt writable layer or `/tmp` afterward.
- **Unmeasured gap:** the partial tunnel/cancellation is not a completed download or evidence for an FFmpeg-heavy path, peak resource use, sustained transfer, or soak behavior. A controlled full completion plus resource and cleanup observations remains a pre-launch test using media the operator is authorized to use.

### SearXNG

- **CPU/RAM:** measured 127.7–165.4 MiB across quiet and post-search points. General searches fan out to the small General set, while a selected specialist tab fans out only to that category; concurrent searches can still create CPU, socket, and memory bursts. Ceiling: 1.00 CPU and 768 MiB.
- **Persistent/temporary disk:** one rebuildable cache volume plus a 128 MiB `/tmp` tmpfs. No query/result database is configured.
- **Ingress/egress:** ordinary HTML results are modest; fan-out multiplies outbound requests, and image proxy use can materially increase egress.
- **Database:** none. It depends on internal Valkey only for limiter state.
- **Likely abuse:** automated scraping, crawler traffic, distributed clients, engine CAPTCHAs/bans, slow upstreams, and cache growth.
- **Controls:** official public limiter, exact trusted proxy address, HTML output only, selected engines, no autocomplete/API formats/metrics, image proxy, no public instance directory registration, container ceiling, and crawler guidance.
- **Measured function:** bounded English and Spanish checks on 2026-08-30 returned substantial General lists led by Google CSE, and category probes returned rows for images, news, videos, IT, science, and maps. The General fan-out remains limited to five broad/reference indexes plus query-specific currency results; specialist engines are queried only when their category is selected. Standard Google failed the Spanish canary, Mwmbl/Yahoo/Wikidata failed locally, and several popular scraper engines were CAPTCHA/rate-limited. Query-log redaction was separately verified by confirming that a test query was absent from logs and a redaction marker was present. These were functional checks, not a load test or a guarantee of future upstream availability. See `docs/searxng-engine-review.md`.

### Valkey

- **CPU/RAM:** measured 8.062–8.121 MiB at quiet points. Ceiling: 0.25 CPU and 128 MiB; application data has a 96 MiB maximum with all-keys LRU eviction.
- **Persistent/temporary disk:** no volume. RDB snapshots and AOF are disabled. `/data` and `/tmp` are bounded tmpfs mounts and clear on restart.
- **Ingress/egress:** Docker-network traffic from SearXNG only; no host or public port.
- **Database:** an ephemeral limiter keyspace, not a durable application/user database.
- **Likely abuse:** limiter-key cardinality and memory pressure produced indirectly through SearXNG.
- **Controls:** internal-only network, memory cap/eviction, PID/CPU/RAM ceilings, no persistence, warning-level logs, and no published port.

### Redlib

Anubis is the public ingress immediately in front of Redlib:

- **CPU/RAM:** one post-cutover point sample showed 13.75 MiB and 3.12% CPU;
  this caught activity and is not presented as a settled idle mean. Limits are
  0.25 CPU, 128 MiB RAM, and 128 PIDs with a 32 MiB memory reservation. The mild default challenge deliberately moves the proof
  work to a fresh visitor's browser; measure actual gate memory and challenge
  throughput after announcement rather than treating the ceiling as usage.
- **Persistent/temporary disk:** ignored bbolt state at `data/anubis/`; logical
  challenge TTL 30 minutes. Freed bbolt pages can remain until compaction. The
  stable signing key is a small ignored secret. Neither store contains Reddit
  page/media bodies by design.
- **Ingress/egress:** challenge HTML/JavaScript and accepted Redlib traffic.
  The gate does not reduce the byte cost of traffic that passes it and does not
  absorb volumetric attacks; Cloudflare remains the outer traffic boundary.
- **Controls:** exact private bind, Cloudflare-only origin assumption, current
  default policy without Thoth, narrow `/info`/official updater exceptions,
  24-hour authorization cookie, read-only root, 16 MiB tmpfs, WARN logging,
  and localhost-only metrics. The difficulty-2 challenge is intentionally mild
  to limit visitor CPU/battery cost.

- **CPU/RAM:** measured 5.59–7.102 MiB in post-start/check Docker point samples;
  a later cgroup current value was 8,085,504 bytes. Across startup, one live
  page, and the bounded synthetic settings check described below, cgroup memory
  peaked at 15,958,016 bytes (about 15.22 MiB) and cumulative CPU use was
  339,556 microseconds with no throttling. Ceiling: 0.50 CPU and 256 MiB; 32 MiB
  reservation. This does not measure real concurrent page/media proxying.
- **Persistent/temporary disk:** no database or volume; read-only root; 32 MiB
  `/tmp` tmpfs. OAuth/device/connection state is process-local and clears on
  restart. The locally built patched image was approximately 35.6 MB.
- **Ingress/egress:** ordinary HTML is modest, but images/video are proxied
  through Redlib. Crawlers, hotlinking, large video, and Range requests can
  turn it into a material ingress/egress relay.
- **Credentials:** no personal Reddit account, cookie, password, or
  operator-supplied token. Upstream obtains spoofed OAuth tokens while
  emulating an official Android client and browser/TLS fingerprints; the
  operator explicitly accepted this policy/availability risk.
- **Likely abuse:** bulk scraping, crawler fan-out, media hotlinking, expensive
  community/post parsing, settings-cookie misuse, and Reddit blocking of the
  VM's egress or emulated identity.
- **Controls/gaps:** direct Redlib is Docker-network-only behind Anubis, noindex, RSS
  omitted, HLS/autoplay off, local same-origin redirect patch, read-only root,
  tmpfs and CPU/RAM/PID limits. Anubis adds a scraper-cost gate, not a guarantee;
  stop the service when abuse or blocking becomes unreasonable.
- **Localization:** upstream UI is English-only. Portal cards, status, privacy,
  acceptable-use, and router behavior remain English/Spanish.
- **Measured function:** one `/r/privacy` request returned real posts (63,051
  bytes in 0.874 seconds). A local-only synthetic check served 1,000
  `/settings` responses at concurrency 10 without sending repeated requests to
  Reddit. Cumulative network counters after startup/tests were roughly 193 kB
  received and 133 kB sent; they are not a production bandwidth forecast.

### Optional rimgo

- **CPU/RAM:** measured 12.57 MiB idle with low CPU during a small private gallery and ranged-media smoke test. Ceiling: 0.50 CPU and 256 MiB.
- **Persistent/temporary disk:** no volume or database; upstream design uses a small in-process cache.
- **Ingress/egress:** can be moderate or high because images, galleries, and videos are relayed through the VM. Hotlinking can make it a general bandwidth sink.
- **Database:** none.
- **Likely abuse:** hotlinking, video/range-request floods, crawlers, provider blocking, and upstream breakage.
- **Controls/gap:** private binding and container limits exist, but rimgo has no built-in application limiter and reviewed 1.4.2 has an unsafe `/search` external redirect. Its roughly 25 MB process cache expires entries after about 30 minutes or earlier eviction/restart. It remains disabled until an official fix is re-reviewed; language and bandwidth risks remain additional gates.

## Deferred-service estimates

These services were not installed or measured. Values below are planning information only.

| Service | CPU | RAM | Persistent disk/database | Temporary disk and bandwidth | Decision |
| --- | --- | --- | --- | --- | --- |
| Invidious | Official public guidance: approximately 2 vCPU | Official public guidance: approximately 4 GiB | Approximately 60 GiB plus persistent PostgreSQL and backups | Potential media relay; official guidance is approximately 200 Mbit/s and around 20 TB transfer or unmetered service | Deferred because database, Companion, rotating egress/anti-bot, bandwidth, disk, reliability, and operations do not fit milestone 1 |

Do not turn these estimates into Compose limits without a fresh official-upstream review and measurements on an isolated private deployment.

## Bandwidth risk

No defensible bytes-per-user forecast can be derived from the smoke tests. The order of concern is:

1. **Cobalt tunnel traffic:** one allowed result can approach the unenforced 500 MB policy target, and repeated results can consume both ingress and egress.
2. **Redlib media relay:** Reddit images/video are proxied; crawlers and
   hotlinking can create traffic unrelated to interactive page views.
3. **rimgo media relay:** images and video are proxied, and hotlinking can
   create sustained uncorrelated traffic; this is one reason the profile is off.
4. **SearXNG image proxy:** normal HTML is small, but image proxying and
   automated fan-out can increase both directions.
5. **Portal static assets:** bounded and cacheable; the self-hosted QR WASM is
   about 1.5 MiB and the lazy PDF JavaScript chunk is about 587 KiB.

Before broader public announcement or public-instance listing, determine the
provider's transfer quota and alerting. Inspect aggregate daily interface/
Docker counters and disable Cobalt or the Anubis/Redlib pair quickly if usage
cannot be explained. Do not infer safety from low idle RAM.

## Restart, failure, and cleanup behavior

- All services use `restart: unless-stopped`; explicit operator stops remain stopped.
- Health checks exist for portal, Cobalt, SearXNG, Valkey, Anubis, and Redlib. Anubis waits for healthy Redlib and SearXNG waits for healthy Valkey at creation, but readiness is still verified after every restart.
- Portal rate counters, Cobalt tunnel metadata, and Valkey limiter state are memory-only and reset on restart. Resetting counters is an availability/abuse tradeoff, not persistence failure.
- Portal, Cobalt, Valkey, Anubis, Redlib, and rimgo use read-only roots. Portal/SearXNG/Anubis/Redlib/Valkey temporary locations are bounded tmpfs. Docker logs rotate at 10 MB times three files per container by default.
- The only persistent volume, `searxng-cache`, may be removed to clear rebuildable cache. It should not contain downloaded media or deliberate query history.
- A service can be disabled quickly with `docker compose stop SERVICE`; disabling SearXNG also permits stopping Valkey. Use the optional profile explicitly when addressing rimgo.

## Aggregate monitoring without browser analytics

No browser analytics or visitor profiling is needed to answer the operational
questions that matter here. Prefer aggregate requests, bytes, errors, challenge
outcomes, container network I/O, and resource pressure:

- Cloudflare's zone **HTTP Traffic** request/data-transfer totals can show
  overall demand; do not export, retain, or publish unique-visitor and country
  breakdowns merely because the dashboard offers them.
- Caddy's native Prometheus metrics can provide per-host request/response
  counters without client-IP, path, user-agent, referrer, cookie, or session
  labels. Keep the admin/metrics endpoint on loopback and do not expose it.
- Anubis's existing metrics bind is container-loopback-only with debug off.
  Its aggregate labels cover challenge method/algorithm/host/policy action,
  not paths, client addresses, user agents, or sessions.
- `docker stats --no-stream` gives rough per-container network I/O and resource
  use. It is not a historical traffic database.

Do not enable Caddy access logs merely to count visits. If aggregate metrics
are retained, disclose them plainly as operational measurement—not as “no
measurement at all”—and avoid persistent high-cardinality labels. See
[Cloudflare zone analytics](https://developers.cloudflare.com/analytics/account-and-zone-analytics/zone-analytics/),
[Caddy metrics](https://caddyserver.com/docs/metrics), and
[Anubis metrics policy](https://anubis.techaro.lol/docs/admin/policies#metrics-server).

Operators should also use the following local checks on a schedule appropriate to expected traffic:

```sh
sh scripts/check-health.sh
sh scripts/verify-network.sh
docker stats --no-stream
docker system df
df -h /
docker compose logs --since=15m
```

Treat low disk, repeated restarts, OOM events, rising log volume, limiter failures, unexplained egress, and sustained CPU as reasons to stop one service before the whole VM becomes unstable. A practical initial local warning point is 15% root filesystem free; choose a stricter threshold if the provider does not offer recoverable storage. Do not expose Docker statistics or an internal metrics endpoint publicly.

## Required production measurements

After edge routing and source firewalling are installed—but before broad announcement—record:

1. quiet core memory/CPU after 15 minutes;
2. one authorized, short direct-result Cobalt request and one authorized tunnel request;
3. Cobalt writable-layer/volume state after success, failure, client cancellation, and container restart;
4. one English and one Spanish SearXNG search through the real edge limiter path;
5. one small Redlib community/post/media request through the real edge,
   including Range/cancellation observation and a redirect-patch regression;
6. short controlled concurrency within published limits, without targeting third-party services repeatedly;
7. per-service network counters and host free disk before/after those checks; and
8. reachability from the edge plus rejection from one authorized external test host.

Document observed peaks and revise ceilings only when the measurements justify it. If the host approaches a ceiling, prefer stopping the affected service over raising limits speculatively.
