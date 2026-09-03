# Sanitized host assessment

Initial audit: 2026-08-28; updated after Redlib build/testing: 2026-08-30; current capacity rechecked: 2026-09-03

This is an internal, deliberately sanitized inventory of the application VM. It records the facts needed to justify the milestone-1 architecture without publishing the host name, MAC addresses, private addresses, public addresses, provider, physical location, SSH details, or other identifying data. The private bind address belongs only in the ignored `.env` file.

## Summary

The VM has enough CPU, memory, and disk headroom for the portal, Cobalt,
SearXNG, SearXNG's small Valkey limiter, and Redlib under the conservative
Compose limits. It now has 4 GiB of swap, but that is recovery headroom rather
than application capacity; the limits and bounded tmpfs/log settings remain
important. Invidious remains unsuitable because its official
public-instance bandwidth, storage, database, rotating-egress, and operational
requirements are far larger than this project's intended envelope. Redlib was
approved as a narrow operator policy exception after this capacity review;
optional rimgo remains held back for security/public-operation reasons.

No pre-existing production container or data was displaced. No firewall, route, DNS, TLS, SSH, time-zone, package, or boot configuration was changed during the assessment. No host inventory was sent to an external service.

## Host inventory

| Item | Sanitized observation | Consequence |
| --- | --- | --- |
| Operating system | Debian 13 with a Linux 6.12 series kernel | Current Docker packages and the selected `linux/amd64` images are supported. |
| CPU architecture | `x86_64` | All selected upstream images provide a compatible build. |
| Logical CPU count | 8 | The configured launch ceilings including Anubis and Redlib total 4.00 CPUs, leaving capacity for the host and short bursts. |
| Memory | 15 GiB installed; approximately 14 GiB was available in the initial quiet snapshot | The launch ceiling including Anubis and Redlib is 3,072 MiB. Quiet measurements remain far below it; see [resource-usage.md](resource-usage.md). |
| Swap | 4.0 GiB configured and effectively unused in the 2026-09-03 capacity snapshot | Treat it as failure tolerance, not as a reason to raise application ceilings. Memory ceilings, bounded tmpfs mounts, and host-level observation remain launch requirements. |
| Root filesystem | One approximately 99 GiB ext4 filesystem; about 85 GiB free after the Redlib build/test pass and 68 GiB after the 2026-09-03 release builds | Adequate for the pinned images and rebuildable cache, but media, build cache, and logs must not persist without bounds. |
| Project location | A dedicated Git working tree below an operator home directory | Repository files, ignored runtime configuration, and host secrets remain separate from Docker volumes. |
| Separate project/data filesystem | None observed | Docker data, build cache, logs, and the repository compete for the same root filesystem. |
| Host time zone | UTC | Containers use `TZ=America/Guatemala` where supported; correctness does not depend on the host's display time zone. |
| GPU | None assumed and none required | No AI inference, OCR, or other GPU service is included. |

The inventory is a point-in-time assessment, not a capacity guarantee. The approximately 15 GiB shown by Linux is the binary-unit display of the VM's assigned memory; application limits in Compose use the explicit values documented in `.env.example`.

## Network assessment

- The VM has a normal primary Ethernet interface with a private-network address. Its name and address are intentionally omitted here.
- Loopback is present as expected. No Tailscale installation or Tailscale interface was found.
- The initial listening-port review found SSH as the only externally listening host service. No application service, database, cache, or general-purpose HTTP reverse proxy was already listening.
- Caddy, nginx, Traefik, Apache HTTP Server, and HAProxy were not introduced on this VM. The portal's Node server serves only its own static application and fixed application endpoints.
- Compose requires an exact `PRIVATE_BIND_IP` and rejects an unset value. It publishes portal, Cobalt, SearXNG, Anubis (the Redlib ingress), and optional rimgo only on that address. Redlib and Valkey have no host port.
- The edge VM is outside this repository and was not modified. Reachability from the real edge source, denial from an unauthorized host, public DNS, and public TLS therefore remain manual launch tests.

Binding to a private address is not a firewall. Docker-published ports can interact with host firewall rules in surprising ways, so the source-address restrictions and external verification in [firewall.md](firewall.md) remain mandatory.

## Pre-existing Docker and service state

Before project containers were started:

- Docker Engine was version 29.7.2 and Docker Compose was version 5.5.0;
- no Docker containers were present;
- no Docker images were present;
- no Docker named volumes were present;
- Docker storage use was therefore effectively empty apart from engine metadata; and
- no existing production workload was identified on the VM.

The test containers and volumes created later all belong to this repository's Compose project. They are not evidence of a pre-existing service. Project cleanup must identify them by the configured Compose project name rather than deleting unrelated Docker objects on a future shared host.

## Storage after private build and testing

The following are approximate image virtual sizes reported during the private test. They must not be added as exact physical disk use because images can share layers and Docker reports virtual as well as reclaimable storage differently.

| Image | Approximate reported size |
| --- | ---: |
| Portal production image | 227 MB |
| Cobalt | 438 MB |
| SearXNG | 374 MB |
| Valkey | 65.8 MB |
| Redlib source build | 35.6 MB; no persistent data volume is created |
| Optional rimgo | 38.2 MB |

After the Redlib source build, `docker system df` reported 1.267 GB of images
(38.24 MB reclaimable), 327.7 kB in containers, one 0-byte named volume, and
5.455 GB of BuildKit cache, of which 5.101 GB was reclaimable. Much of the new
cache is consistent with the Rust/BoringSSL compilation, but Docker's aggregate
figure can include cache from earlier builds or other projects and must not be
attributed blindly. About 85 GiB remained free on `/`, so immediate disk
pressure was not observed.

These numbers include a local build/test state, not a long-running production
forecast. Docker logs are bounded to 10 MB per file and three files per
container by default. SearXNG's named cache is rebuildable but is not assigned a
hard Docker volume quota. Operators should inspect `docker system df -v`, the
SearXNG volume, and root free space regularly. If the build cache is reviewed
and space is genuinely needed, `docker builder prune` is an optional manual
cleanup; it slows future Redlib rollback/rebuilds and can remove cache useful to
other projects. Never substitute a broad, unreviewed Docker prune.

## Resource decision

The configured launch deployment is intentionally limited to:

- the lightweight catalog server and its narrow upstream-integration glue;
- one protected Cobalt instance;
- one SearXNG instance;
- one internal, memory-only Valkey limiter; and
- one small Redlib instance with no database or persistent volume.

At their configured ceilings these services can consume up to 4.00 CPUs and
3,072 MiB RAM including Anubis. Earlier core measurements without Redlib were far below that
ceiling; Redlib itself measured 7.102 MiB in a quiet point and peaked at about
15.22 MiB across startup, one live page, and a short local synthetic check.
The full observations are in [resource-usage.md](resource-usage.md). This leaves substantial nominal host
headroom, but it does not prove capacity for concurrent FFmpeg jobs,
high-volume search traffic, Reddit crawler traffic, or sustained media relay.

The optional rimgo profile adds a 0.50 CPU and 256 MiB ceiling and measured about 12.6 MiB idle. It remains off because reviewed 1.4.2 has an unsafe `/search` external redirect; it also has no built-in limiter, is English-only, and can become a high-bandwidth relay.

Invidious is deferred even though the VM has 8 logical CPUs and 15 GiB RAM. Official public-instance planning calls for approximately 2 vCPU, 4 GiB RAM, 60 GiB disk, 200 Mbit/s, and roughly 20 TB transfer or unmetered bandwidth, in addition to PostgreSQL, Companion, rotating YouTube egress, and continuing operational work. Allocating most of the free disk and a large unknown share of network capacity would violate the conservative public-utility goal.

## Limits of this assessment

The audit did not establish:

- the VM provider's monthly transfer allowance, sustained throughput, or egress cost;
- public Internet exposure from a separate external probe;
- whether the edge VM can reach every configured private port;
- production request concurrency or representative Cobalt FFmpeg peaks;
- long-duration growth of the SearXNG cache; or
- host-level alert delivery.

Before launch, the operator must fill those gaps using controlled traffic and
the launch checks in [deployment.md](deployment.md),
[edge-routing.md](edge-routing.md), [firewall.md](firewall.md), and
[resource-usage.md](resource-usage.md). Do not raise Redlib limits or enable
Invidious/optional rimgo merely because a quiet-host snapshot shows free memory.
