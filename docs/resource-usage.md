# Resource usage and operating limits

This document distinguishes measurements from configured ceilings. Quiet
container memory does not predict concurrent searches, Redlib media transfer,
feed refresh bursts, database growth, RSSHub route cost, or paste abuse.

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
