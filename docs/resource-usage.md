# Resource usage and operating limits

## Reviewed image retirement — October 10, 2026

The owner authorized trimming obsolete images while preserving running software
and recovery options. `scripts/cleanup-reviewed-images.mjs` records a dry-run
plan with exact image IDs, then rechecks references before applying it. This is
a finite reviewed batch, **not an enabled periodic prune policy**.

Removed **77** older images across twelve reviewed image families. Preserved
current and documented previous releases, all images used by running **or stopped**
containers, and image references found in deployment/build configuration. Other
families, untagged upstream digests, build images, security-repair candidates and
images with unclear recovery roles were outside this deletion batch. The root
Compose default also retains its older portal tag; this is deliberately more
conservative than simply keeping the newest two tags of every repository.

Actual filesystem space recovered was **5.12 GiB**, from about **8.22 to 13.34 GiB**
available. All 175 container IDs/image references/running states/start times were
unchanged, including the 164 running containers. Every protected image remained.
No containers, volumes, user files, source archives, configurations, backup
generations or service routes were removed or restarted. The off-host backup
timer remains active. This inventory check is not a new end-to-end app audit.

The private exact-ID plan and completed result are at
`/opt/utilibre/reports/image-cleanup-3d8aLT/{plan,result}.json`. Removed images
are no longer available for instant local rollback; older versions require a
rebuild from their historical recipes/inputs (upstream availability still matters).
The retained current rollback pairs in the script supersede earlier historical
notes claiming all older images are still installed. BreezeWiki's retained
versions still have their documented media limitations; preservation does not
establish a fully working frontend. WBO was not restarted or disturbed.

Removal used explicit tags mapped to reviewed full IDs with native
[`docker image rm --no-prune`](https://docs.docker.com/reference/cli/docker/image/rm/),
without `--force`, broad image pruning, volume pruning or service recreation.
Docker's shared layer estimates were not presented as actual disk savings.

## Disk attribution and dependency cleanup — October 10, 18:19 UTC

Before this pass the 128 GiB root filesystem had about **3.7 GiB available**
(98% used), below the native backup jobs' 5 GiB floor. Read-only `du -x` and
Docker disk reports identified these principal consumers:

| Area | Observed use before cleanup | Interpretation |
| --- | --- | --- |
| Containerd image/layer storage | about 73 GiB | About 16 GiB compressed content plus 58 GiB unpacked snapshots, rounded. Includes active software, previous releases and build layers, not just saved user data. |
| Three application source workspaces | about 19 GiB | `/opt/utilibre/src`, `community-src`, `expanded-src`; substantial generated dependencies, but also live bind-mounted CryptPad source and Whisper assets that must remain. |
| Local static packs and source offers | about 2.8 GiB | `pack-static` and `toolbox-public`; includes required application assets and licensing/source distributions. |
| Operator reports | about 1.7 GiB | Build/test/recovery evidence; not removed in this pass. |
| Root tooling and caches | about 7.5 GiB | Includes coding/test tools and browser binaries; not application documents. |

Docker separately reported 293 images, 110 active image records, 62.98 GB of
image data and 22.51 GB reclaimable, plus 18.09 GB build cache with 4.379 GB
reclaimable. **Do not add these numbers to the table:** shared image/cache layers
overlap and Docker GB differs from `du` GiB. Some unused images are rollback
versions; none was removed. Examples of large active images were Penpot's
exporter (2.78 GiB), Uptime Kuma (2.32 GiB) and Authentik (1.79 GiB). These sizes
are software bundles, not measurements of visitor data.

The existing bounded BuildKit cleanup selected 14 candidates but Docker freed
**0 bytes**. Its estimated 2.01 GiB was not reported as an actual saving.
Instead, six exact generated `node_modules` directories were removed under
`/opt/utilibre/src`: BentoPDF, ChartDB, drawDB, Chitchatter, Super Productivity,
and Sketchforge. Each had an existing package manifest/lockfile, no tracked
dependency contents, no container bind-mount overlap, and no process cwd/exe
conflict in the preflight. Source, locks, built output, models, images, data,
backups and running services were preserved. Dependencies can be reinstalled
from the respective pinned lockfile before another build; the removed folders
are not a restorable copy of their former installed contents.

Root free space rose to **8.3 GiB**, approximately **4.7 GiB reclaimed**, with
94% used. All 164 containers remained running; no unhealthy container or failed
systemd unit was reported after cleanup. This is not a fresh app-workflow test.
The Storage Box job then passed its free-space gate, uploaded all 24 backup
groups, applied the approved remote retention and passed another download/
isolated identity-restore test. See [backups](backups.md).

GitHub is not a whole-VM backup: private configuration, secrets, encryption
keys, databases and server files need their own recovery source. Rebuilding
images also depends on upstream availability and the pinned build inputs.
Retained images accelerate recovery/rollback; deleting old images requires a
separate reviewed keep-set, not a broad `docker system prune -a`. No complete
bare-VM rebuild or restoration of the separate Caddy VM was tested here.

## Bounded disk cleanup — October 10, 2026

Available root-filesystem space increased from about **5.0 GiB to 9.4 GiB**
(96% to 93% used). Removed only regenerable caches: selected unshared, reclaimable
BuildKit records via `scripts/reclaim-build-cache.mjs --apply` (Docker reported
1.652 GB reclaimed), root npm's download cache (about 2.9 GiB) and downloaded apt
package archives (about 168 MiB). Net filesystem measurements also include
ongoing writes and the 24.8 MB Restic installation, so these figures are not an
exact additive ledger. A pip-cache purge could not run because pip is absent;
that cache was left alone.

No container, image (including inactive rollback images), volume, installed
package, application file, source tree, user document, backup generation or log
retention policy was removed/changed. All 164 running containers remained up
with no unhealthy status reported; no systemd unit was failed at the final check.
This was not a complete end-to-end service retest. npm/build/package downloads
may need fetching again for later builds. Cache cleanup is not a storage-growth
solution, and 93% used still warrants caution.

Native [encrypted Storage Box backup preparation](../deployment/storagebox/README.md)
does not expand this filesystem. No application state has moved off-host.

For the current 16-vCPU VM, measured portal CPU improvement and serving limits,
see the [October 8 capacity report](capacity-2026-10-08.md). Older observations
below are historical snapshots.

Per-service CPU/quota/throttling, memory and synthetic-probe history is collected
by `utilibre-performance.timer`. Run `node scripts/performance-monitor.mjs report`
for the latest readings and local pressure flags. The capacity report records
retention, thresholds, workflow results and the targeted disk cleanup.

This document distinguishes measurements from configured ceilings. Quiet
container memory does not predict concurrent searches, Redlib media transfer,
feed refresh bursts, database growth, RSSHub route cost, or paste abuse.

The October 7 ZIP/chart/audio/paint additions each have a **configured** 128 MiB
serving limit and 0.5 CPU ceiling. Their processing cost is mainly on visitors'
devices; large images, audio and archives can exhaust browser memory. OmniTools
background removal now serves its model/runtime assets locally (about 344 MB
for all mirrored variants; the default model alone is about 88 MB). These
downloads add bandwidth and cache/disk use. No new concurrent-user capacity
claim follows from these limits; the measured baseline is in
[expanded operations](expanded-operations.md#capacity-baseline--october-7-2026).

The strategic reset removed several previously measured services. A fresh
post-removal baseline and controlled active measurements are required before a
broad announcement.

## Surviving historical observations

The following point observations were recorded on 2026-08-28 through
2026-09-03 while a larger stack was running. They are useful only as rough
working-memory context:

| Component | Observed memory | Qualification |
| --- | ---: | --- |
| Portal | about 18.6–22.4 MiB | Static delivery and status activity; old build |
| SearXNG | about 127.7–170.1 MiB | Quiet/post-search points, not a concurrency test |
| Root Valkey | about 8.1 MiB | Ephemeral limiter state |
| Anubis | 13.75 MiB at one active point | Not a settled idle mean |
| Redlib | about 5.6–15.2 MiB across startup and bounded checks | No representative concurrent media workload |
| FreshRSS | 27.9 MiB at one quiet point | No multi-user refresh benchmark |
| Internal RSSHub | 186.9 MiB at one quiet point | No intended-route concurrency test |
| PostgreSQL | 63.4 MiB at one quiet point | Larger former database set; not a growth forecast |
| Additional Valkey | 8.1 MiB at one quiet point | Ephemeral cache |
| PrivateBin | 45.3 MiB at one quiet point | No sustained creation/read test |

Do not add these values to infer a production minimum or present them as a
peak. Record new measurements after all retired containers, volumes, images,
and routes are out of the active topology.

## Current growth and load risks

### Portal

The portal has no database or task upload path. Its normal costs are static
assets, fixed config/status responses, and short internal health checks.
Unexpected growth usually indicates logs, repeated health fan-out, an image
build/cache issue, or traffic outside the intended edge boundary.

### SearXNG

Search fan-out creates outbound sockets and upstream latency. Image proxying
can dominate transfer even when HTML results are small. Limiter/cache state is
ephemeral; the SearXNG cache is re-creatable. Observe query rate, engine errors,
timeouts, image bytes, memory, and file-descriptor pressure without logging
queries.

### Redlib and Anubis

Redlib proxies Reddit images and video. Crawlers, hotlinking, large media, and
Range requests can make it the largest bandwidth consumer. Anubis increases
automation cost but does not reduce bytes for accepted traffic or stop a
volumetric attack. Observe aggregate challenge outcomes and per-host bytes;
stop the pair if traffic cannot be sustained or explained.

### FreshRSS and PostgreSQL

Persistent cost grows with users, feeds, retained items, favorites, labels,
refresh frequency, and database maintenance. A feed with large entries or
enclosures can create disproportionate CPU, storage, or transfer. Set user and
feed quotas before opening requests; measure refresh duration, failed origins,
database size, table/index growth, WAL, connections, and backup duration.

### Internal RSSHub and Valkey

Route complexity and source latency determine cost. RSSHub can consume
substantial memory even when quiet, and an expensive or unstable route can
generate repeated fetch/retry load. Keep intended routes operator-approved,
cache limits finite, request timeouts bounded, and the service private. Stock
RSSHub does not enforce that route set, so resource containment remains an
account-opening gate. The Valkey cache is re-creatable and should not be
backed up.

### PrivateBin

Persistent disk grows with ciphertext size and expiry. The application limits
individual pastes to roughly 2 MiB, disables file upload, defaults to one-day
expiry, and permits at most one week. Monitor total data size, inode use,
creation/read rates, purge success, and backup growth. Encryption does not make
storage free or abuse harmless.

## Disk and temporary storage

| Component | Persistent state | Temporary/re-creatable state |
| --- | --- | --- |
| Portal | None | Bounded tmpfs and immutable image layers |
| SearXNG | Re-creatable named cache volume | Bounded `/tmp`; cache may be rebuilt |
| Root Valkey | None | Memory/tmpfs; cleared on restart |
| Anubis | Challenge bbolt file and signing key | Bounded `/tmp`; logical expiry does not compact pages immediately |
| Redlib | None | Bounded `/tmp`; process-local upstream state |
| FreshRSS | Application data/extensions and PostgreSQL records | Application caches and temporary work |
| PostgreSQL | Database directory and WAL | Shared memory and temporary query work |
| RSSHub/additional Valkey | None intentionally | Memory/tmpfs cache, cleared on restart |
| PrivateBin | Ciphertext and metadata | Bounded temporary runtime paths |

Inspect attribution with `docker system df -v`, service-specific directory
sizes, and PostgreSQL size queries before deleting anything. Broad Docker or
filesystem prune commands can remove unrelated data and are not an operating
procedure.

## Monitoring without browser analytics

Prefer aggregate operational measurements:

- public-host request and byte totals without client/path/query labels;
- container CPU, memory, PIDs, restarts, and network I/O;
- host free disk, inode, RAM, swap, and OOM events;
- SearXNG engine errors and latency without query text;
- Redlib host bytes and Anubis challenge outcomes;
- FreshRSS refresh duration/failure counts and PostgreSQL size/connections;
- RSSHub route error counts without credentials; and
- PrivateBin store size, expiry purge success, and rate-limit events.

Do not enable access logs or visitor profiling merely to count use. If
aggregate metrics are retained, disclose them and keep their labels and
retention bounded.

Useful local checks include:

```sh
sh scripts/check-health.sh
sh scripts/verify-network.sh
docker stats --no-stream
docker system df -v
df -h /
df -i /
(cd deployment/utilibre && docker compose ps)
```

## Required post-reset measurements

Before broader announcement, record:

1. quiet CPU/RAM/PIDs after at least 15 minutes;
2. one English and one Spanish SearXNG search through the real edge;
3. one small Redlib page/media/Range request and cancellation through Anubis;
4. one controlled FreshRSS refresh using an ordinary feed and an intended
   RSSHub route, plus an isolated check of the unenforced route surface;
5. one PrivateBin create/read/delete and one expiry purge using nonsensitive
   test data;
6. database, persistent-directory, cache, log, and network counters before and
   after the checks;
7. bounded short concurrency that does not stress external sites; and
8. edge reachability plus rejection from unauthorized private and external
   hosts.

Revise ceilings and quotas only when measurements justify the change. If one
service approaches a host limit, remove its public route and stop it before
raising limits speculatively.
