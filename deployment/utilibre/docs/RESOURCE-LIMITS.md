# Resource limits

Limits are ceilings, not reservations. They intentionally permit individual
bursts while keeping the combined configured memory ceiling below the host's
ordinary low-load safety target. CPU ceilings sum above eight CPUs, which is
acceptable because they are independent maximums, not guaranteed shares.

## Configured ceilings

| Container | Memory | CPUs | PIDs | Primary growth risk |
|---|---:|---:|---:|---|
| PostgreSQL | 2 GiB | 2.0 | 256 | feeds, checks, heartbeats, paste metadata |
| RSSHub | 1.5 GiB | 1.5 | 256 | abusive/concurrent upstream routes |
| Healthchecks | 1.25 GiB | 1.0 | 256 | checks and notification processing |
| FreshRSS | 1 GiB | 1.0 | 256 | feed history and refresh bursts |
| Wakapi | 768 MiB | 1.0 | 256 | heartbeat history and aggregation |
| ntfy | 512 MiB | 0.5 | 128 | message/attachment replay and connections |
| VERT | 512 MiB | 0.5 | 128 | static delivery; conversion runs in browser |
| PairDrop | 512 MiB | 0.5 | 128 | concurrent signaling/WebSockets |
| BentoPDF | 384 MiB | 0.5 | 128 | static delivery; PDF work runs in browser |
| OmniTools | 384 MiB | 0.5 | 128 | static delivery; tools run in browser |
| PrivateBin | 384 MiB | 0.5 | 128 | encrypted paste requests |
| Valkey | 384 MiB container / 256 MiB cache | 0.5 | 100 | RSSHub cache churn |

Crab Fit has no running container and therefore no allocation.

PostgreSQL is configured with 512 MiB shared buffers, 1.5 GiB effective cache,
4 MiB work memory, 64 MiB maintenance memory, at most 100 connections, and a
1 GiB maximum WAL size. Wakapi limits its pool to five connections. Valkey is
ephemeral, has persistence disabled, and evicts least-recently-used keys at its
256 MiB cache ceiling.

## Low-load observation

Snapshot captured on 2026-08-30 after the isolated whole-stack restart,
health convergence, persistence checks, and private functional test traffic.
It is a point-in-time low-load observation, not a capacity benchmark.

| Container | Observed memory |
|---|---:|
| Healthchecks | 295.6 MiB |
| RSSHub | 186.9 MiB |
| Wakapi | 93.2 MiB |
| PostgreSQL | 63.4 MiB |
| PrivateBin | 45.3 MiB |
| PairDrop | 29.6 MiB |
| FreshRSS | 27.9 MiB |
| ntfy | 16.3 MiB |
| Valkey | 8.1 MiB |
| VERT | 7.5 MiB |
| OmniTools | 7.4 MiB |
| BentoPDF | 2.8 MiB |
| **New stack total** | **approximately 784 MiB** |

Host snapshot from the same acceptance window:

- 15 GiB RAM total, 2.7 GiB used, 12 GiB available;
- 4 GiB swap total, 0 bytes used;
- load average 0.39 / 0.42 / 0.28;
- root filesystem 99 GiB total, 19 GiB used, 76 GiB available (20% used);
- `vm.swappiness=10`, `vm.overcommit_memory=1`.

One instantaneous CPU sample showed a transient BentoPDF health/static request,
so no “idle CPU” number is asserted from that sample. Run a longer controlled
observation before using CPU figures for capacity planning.

## Persistent and temporary storage

- ntfy permits at most 5 GiB of cached attachments and expires attachments
  after three hours. Its SQLite message cache expires entries after 12 hours.
  Both expiring caches are deliberately excluded from longer-lived backups.
- PostgreSQL is persistent and is the most important long-term growth target.
- FreshRSS data/extensions and PrivateBin encrypted payloads are persistent.
- PrivateBin limits a paste to approximately 2 MiB and expiry to at most one
  week; automatic purge is enabled.
- RSSHub Valkey and all configured container `/tmp` paths are disposable tmpfs.
- BentoPDF, VERT, and OmniTools have no upload volume.
- Local backups keep seven daily and four weekly sets. Weekly sets use hard
  links where possible, but PostgreSQL dumps and changed archives still consume
  real space.

The health script fails below 10% disk free. Add an owner alert before the host
falls below 20% because local backup headroom and PostgreSQL maintenance can
require significantly more than the size of live data.

## Bandwidth and abuse risks

| Service | Expected pattern | Main risk/control |
|---|---|---|
| ntfy | small messages, long polls/WebSockets, optional attachments | replay/attachment amplification; per-visitor limits, 10 MiB object and 250 MiB daily visitor ceiling |
| BentoPDF | static JS/WASM assets | initial asset egress plus observed jsDelivr runtime GETs; selected files remain in browser |
| VERT | static JS/WASM assets | large codecs plus observed jsDelivr FFmpeg GETs; no server conversion endpoint |
| OmniTools | static assets | asset egress; tested tools are intended client-side |
| Healthchecks | tiny pings and authenticated pages | automated abuse/check floods; registration closed |
| PairDrop | signaling over server, payload normally WebRTC peer-to-peer | many sockets; no TURN bandwidth but some NAT pairs fail |
| FreshRSS | server fetches subscribed feeds | slow/large feeds and refresh bursts; staggered schedule |
| RSSHub | server fetches upstream platforms | scraping amplification/blocking; timeouts, retries, cache, no browser automation |
| PrivateBin | encrypted payload upload/download | storage/request abuse; 2 MiB limit, short expiry, traffic limiting |
| Wakapi | frequent small heartbeat requests | high client frequency and long retention; signup closed, 12-month cleanup target |

Do not interpret client-side processing as zero server bandwidth: the server
still sends application assets. It means selected file contents should not be
uploaded for the tested local operation.

## Hardening and documented exceptions

All new containers use `no-new-privileges`, restart `unless-stopped`, explicit
health checks, log rotation, memory/CPU/PID ceilings, no privileged mode, no
host networking, and no Docker socket. Capabilities are dropped completely
where the pinned image supports it.

Exceptions retained because blind hardening broke or conflicts with official
entrypoints:

- VERT's nginx master starts as root and receives only
  `NET_BIND_SERVICE`, `CHOWN`, `SETGID`, and `SETUID`; its root filesystem is
  read-only and writable nginx paths are tmpfs.
- OmniTools uses the official root/nginx entrypoint and the same minimal nginx
  capabilities. Its tested root filesystem is read-only; writable nginx paths
  are limited to tmpfs.
- FreshRSS uses its official root bootstrap/cron entrypoint and writable
  persistent data/extension mounts. It is not forced read-only or capability-
  empty.
- PostgreSQL and ntfy need persistent writable state; both run as explicit
  non-root UIDs and drop capabilities.
- PairDrop's official image starts as root, but runs read-only with all
  capabilities dropped and only tmpfs scratch space.
- PrivateBin's s6 supervisor requires executable `/run`; that path is a small
  tmpfs while the root filesystem stays read-only.

These exceptions must be re-tested at every image update; do not copy them to a
different image merely because the service name is similar.

## Tuning triggers

- **Healthchecks approaches 1 GiB:** inspect worker count, query latency, and
  checks volume before raising its ceiling.
- **RSSHub sustains high CPU/RAM:** identify abusive routes, stop RSSHub if
  necessary, review caching/rate controls, and do not deploy Chromium as a
  shortcut.
- **PostgreSQL approaches 1.5 GiB or connections approach 100:** inspect
  `pg_stat_activity`, slow queries, table/index growth, and application pools.
- **Swap use persists or OOM/restarts occur:** stop the offender and reduce
  workload; do not enlarge all limits.
- **ntfy storage approaches 5 GiB:** confirm attachment expiry and topic abuse;
  do not delete an active SQLite DB.
- **disk exceeds 70%:** test backup retention, PostgreSQL growth, Docker logs,
  and stale source/build data while there is still safe maintenance headroom.

Useful commands:

```sh
cd /opt/utilibre
docker stats --no-stream
docker compose exec -T postgres psql -U postgres -Atqc \
  "SELECT datname, pg_size_pretty(pg_database_size(datname)) FROM pg_database ORDER BY pg_database_size(datname) DESC"
docker compose exec -T valkey valkey-cli INFO memory
du -xsh data/ntfy data/freshrss data/privatebin data/backups
df -h /opt/utilibre
free -h
```
