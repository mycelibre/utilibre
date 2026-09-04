# Sanitized host assessment

Initial audit: 2026-08-28; current capacity last checked: 2026-09-03

This deliberately sanitized inventory records only facts needed to evaluate
the retained deployment. It omits host names, addresses, provider, physical
location, MAC/SSH details, and other identifying data. Private addresses
belong only in ignored environment files.

## Summary

The VM has enough nominal CPU, memory, and disk for private testing of the
portal, SearXNG, Anubis/Redlib, FreshRSS/PostgreSQL, internal RSSHub/Valkey,
and PrivateBin under their current ceilings. That is not evidence of public
traffic capacity. Search fan-out, Redlib media, feed refreshes, RSSHub routes,
database growth, backups, and paste abuse require post-reset measurement.

No pre-existing production container or data was displaced during the initial
assessment. No firewall, route, DNS, TLS, SSH, time-zone, package, or boot
configuration was changed by the assessment itself.

## Host inventory

| Item | Sanitized observation | Consequence |
| --- | --- | --- |
| Operating system | Debian 13 with a Linux 6.12-series kernel | Current Docker packages and selected `linux/amd64` images are supported |
| Architecture | `x86_64`, 8 logical CPUs | Current images/builds are compatible; summed CPU ceilings are not a throughput guarantee |
| Memory | 15 GiB installed; about 14 GiB available in the initial quiet snapshot | Leaves nominal headroom, but active concurrency was not measured |
| Swap | 4 GiB, effectively unused at the last check | Failure tolerance only; not application capacity |
| Root filesystem | Approximately 99 GiB ext4; 68 GiB free after the 2026-09-03 release-build period | Docker data, databases, pastes, backups, logs, and build cache share one filesystem |
| Separate data filesystem | None observed | Persistent growth competes with OS and Docker capacity |
| Host time zone | UTC | Containers use the configured application time zone where supported |
| GPU | None required | No retained application depends on GPU work |

These are point-in-time observations. Compose values are ceilings, not
reservations or predicted simultaneous use.

## Network assessment

- The VM has a normal private-network interface; identifying details are
  omitted.
- The initial listening-port review found SSH as the only externally listening
  host service.
- No database, cache, RSSHub listener, application reverse proxy, or public
  application port existed before deployment.
- Compose requires exact private bind addresses for portal, SearXNG, Anubis,
  FreshRSS, and PrivateBin.
- Redlib, PostgreSQL, both Valkeys, RSSHub, and Anubis metrics have no host
  port.
- The separate edge VM was not fully assessed by this repository review.

Binding to a private address is not a firewall. Docker-published ports can
interact with host forwarding/NAT rules, so edge-only source restrictions and
tests from unauthorized hosts remain mandatory.

## Initial Docker state

Before project containers were first started, no containers, images, or named
volumes were present. Later project objects are not evidence that a future host
is dedicated. Identify resources by exact Compose project and service before
any cleanup; never apply a broad Docker prune to a shared host.

## Current resource envelope

The root project's configured memory ceilings total approximately 1.5 GiB
when Anubis/Redlib are included. The additional project's configured ceilings
total approximately 5.25 GiB, dominated by PostgreSQL and RSSHub. Combined CPU
ceilings sum to the host's eight logical CPUs. Limits can overlap and do not
reserve resources, so a simultaneous burst could still harm latency or invoke
memory pressure.

Historical quiet observations for retained components are in
[`resource-usage.md`](resource-usage.md). They were captured while a different,
larger topology was running and cannot substitute for a fresh baseline.

The largest capacity uncertainties are:

1. Redlib proxied media and crawler/hotlink traffic;
2. SearXNG concurrent fan-out and image proxying;
3. RSSHub route CPU/memory and source instability;
4. FreshRSS user/feed/item growth, refresh bursts, and PostgreSQL maintenance;
5. PrivateBin creation rate, ciphertext/inode growth, and purge behavior; and
6. backup duplication on the same root filesystem before off-host copy.

## Limits of this assessment

The audit did not establish:

- monthly transfer allowance, sustained throughput, or egress cost;
- public reachability from every external network;
- real edge-to-private access after the reset;
- representative concurrent search, media, refresh, route, or paste load;
- long-duration database/cache/paste/backup growth;
- recovery behavior under low disk or OOM pressure; or
- host-level alert delivery.

Before broader launch, complete the controlled measurements and exposure tests
in [`deployment.md`](deployment.md), [`firewall.md`](firewall.md),
[`resource-usage.md`](resource-usage.md), and
[`launch-checklist.md`](launch-checklist.md). Prefer reducing or stopping the
affected service over raising ceilings from a quiet-host snapshot.
