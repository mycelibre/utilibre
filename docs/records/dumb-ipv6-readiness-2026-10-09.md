# Dumb IPv6 readiness, 9 October 2026

Internal deployment record. The owner supplied the VM-specific address and
gateway on 9 October. IPv6 now works and its guarded configuration is persistent.
Genius still returns an anti-bot challenge over that route. The private Dumb
candidate and public LRCLIB deployment are unchanged.

## Initial observed state, before the supplied allocation

- `eth0` has the existing private IPv4 address and an IPv6 link-local address
  only. There are no global IPv6 addresses or usable IPv6 default routes.
- `/etc/netplan/50-cloud-init.yaml` configures only IPv4. Its generated networkd
  file has IPv6 link-local addressing; `net.ipv6.conf.eth0.accept_ra` is `0`.
  That sysctl alone does not establish whether RA reception is disabled:
  networkd uses its own userspace RA implementation and disables the kernel
  implementation. No usable RA-derived address or route is present. This
  session did not alter RA settings or assume upstream advertisements exist.
- All 93 Docker networks currently have IPv6 disabled. The candidate uses the
  existing IPv4-only `utilibre-additions_lyrics` network. Adding a host IPv6
  address alone would not give this container native IPv6 connectivity.
- Genius resolves to two public AAAA addresses. One ordinary `curl -6` search
  request failed before HTTP with exit 7 and status `000`, consistent with the
  missing route. It provides no evidence about Genius accepting IPv6 requests.
- The IPv6 host input policy currently defaults to ACCEPT and SSH listens on
  `[::]:22`. No service should acquire public IPv6 reachability accidentally.
  Existing edge and SMTP source restrictions are IPv4; they must not be
  bypassed by publishing the same services on IPv6.

A 20-second passive capture observed no router advertisements on `eth0`; this
short observation does not prove that the LAN never advertises a prefix.

Private diagnostic evidence is under
`/opt/utilibre/reports/dumb-ipv6-20261009/`. No packet contents, credentials,
private records, or application state were read for these checks.

## Routing alternatives considered before the supplied allocation

The original prerequisite was **one** usable route:

1. A global IPv6 **address and prefix assigned to this VM**, with the gateway
   reachable through its `eth0` LAN and confirmation of upstream routing and
   firewall permissions. An allocation belonging only to the physical host is
   insufficient. If the network instead delivers RA/SLAAC or DHCPv6 to this
   particular LAN, confirm that arrangement and its upstream router rather
   than inventing a static address.
2. An existing operator-controlled host, such as the edge, that already has
   usable IPv6 and can offer a restricted HTTP CONNECT or SOCKS route. First
   verify its ordinary Genius search and lyric requests. Its outbound address
   is unknown from this VM; sharing a physical host does not establish whether
   the egress is the same.

No DNS change is required for an outbound-only experiment. No proxy from another
public instance, third-party relay, browser-per-query backend or challenge
solver is part of this preparation.

## Prepared implementation sequence

For a VM-assigned address, retain the current network and firewall snapshots,
then install a separate IPv6 input guard **before** adding any address: allow
loopback, established return traffic and essential IPv6 control messages; deny
new external service connections. Keep all current IPv4 rules and addresses
unchanged. Do not flush shared chains or enable IPv6 on existing Docker bridges.

Use only the confirmed address/prefix and gateway for a temporary
`ip -6 address add` and `ip -6 route add` on `eth0`. Avoid a networking restart.
Check duplicate-address detection and a route to a resolved Genius AAAA, then
make one search and one lyric request with `curl -6`. Record HTTP status and
challenge headers, without publishing returned lyrics. If the route fails,
remove only the exact address/route added for this test. Do not persist an
untested network configuration.

If direct host IPv6 succeeds, prepare either a dedicated service network with
an operator-routed prefix or a tightly restricted local egress proxy using the
existing native `PROXY` option. That choice still requires the actual routed
prefix or proxy endpoint; it cannot safely be populated from the current
facts. A dedicated network must retain loopback-only published candidate ports
and independent IPv6 forwarding rules. Do not use host networking: native Dumb
binds its port on every host interface.

After host connectivity and its inbound guard pass, the confirmed host settings
can be added as a separate Netplan override. Native candidate retrieval remains
a separate requirement for publishing Dumb. Validate the merged
configuration against a temporary root with `netplan generate --root-dir`
before considering activation. Persist the inbound guard ahead of address
configuration and retain a scoped rollback. An edge-owned proxy instead uses
the already prepared private `DUMB_REVIEW_PROXY` environment file and requires
no IPv6 changes to this VM or its Docker daemon.

Final native acceptance remains search, lyrics, annotations and same-origin
images, with TLS verification enabled, no external browser requests, resource
bounds intact, and the actual provider/route visibility documented. A successful
alternate route would not retroactively prove an IP-only cause for the original
challenge. Public LRCLIB stays available until that acceptance passes.

References: [Netplan address, route and RA configuration](https://netplan.readthedocs.io/en/stable/netplan-yaml/),
[Docker IPv6 network configuration](https://docs.docker.com/engine/daemon/ipv6/),
and the project's existing IPv4-only boundary in `docs/firewall.md`.

## Supplied allocation and guarded check, 9 October

The owner supplied `2a01:4f8:2200:350b::43/128` for this VM, with on-link gateway
`2a01:4f8:2200:350b::1`, while retaining IPv4 `10.10.1.43`.
The owner also explicitly required the VM's own firewall against host-local
and same-LAN traffic, independently of the Proxmox guard.

Installed and enabled `utilibre-ipv6-guard.service` before assigning the address.
Its dedicated `ip6 utilibre_ipv6_guard` nftables table drops new inbound TCP/UDP
and IPv6 forwarding, allows loopback and established/related replies, and
permits essential ICMPv6 errors, neighbor discovery and bounded echo requests.
Neighbor/router discovery requires hop limit255; multicast listener discovery
requires hop limit1 and a link-local/unspecified source. It has no packet log.
The helper atomically replaces only that table. It never flushes Docker or IPv4
rules; stopping the unit does not open the firewall.

The temporary address passed duplicate-address detection. The default route
uses the supplied on-link gateway with metric200, and neighbor discovery resolves
that gateway to a reachable MAC. Initial HTTPS attempts to Genius, Utilibre and Debian
timed out before TCP connection, including the first owner-requested retries. A narrowly
filtered packet capture saw the expected source address and outbound SYN packets
on eth0, with no replies. The local input drop counter did not increase during
those initial external checks. The later successful route check is recorded
below; the initial timeouts are historical.

A separate disposable namespace/veth check exercised the active host guard:
new peer TCP to a proven-listening host ULA socket timed out and incremented the
drop counter; a host-initiated TCP exchange received its exact response; ping
and neighbor discovery worked in both directions. The rule structure remained
unchanged, and the test namespace, interfaces, listeners and route were removed.
This tests host-local/same-link filtering without scanning other machines.

At13:49 UTC, after the owner's upstream work, Utilibre and Debian returned
HTTP200 over IPv6 using `2a01:4f8:2200:350b::43`. Genius search and lyric requests
completed TLS but returned HTTP403 with `cf-mitigated: challenge`. The network
path works; native content retrieval from Genius is still unavailable through
the checked IPv6 route. No further retries or challenge solver were used.

The native Netplan merge was validated against a temporary root and preserved
the original IPv4 address, gateway and DNS. After external connectivity passed,
`/etc/netplan/60-utilibre-ipv6.yaml` and the networkd guard dependency were
installed. `netplan generate` and `systemd-analyze verify` passed; networkd now
requires the enabled guard. The already-tested runtime address/route remain
active, without a network restart. The next boot will use the persistent files;
a VM reboot was not performed as part of this check.

To withdraw this allocation later, first remove only the two installed IPv6
override/dependency files and regenerate Netplan/reload systemd, then remove the
exact route and address below. Keep the inbound guard enabled; do not restore a
whole firewall snapshot over rules that other services may have updated meanwhile.

```sh
ip -6 route del default via 2a01:4f8:2200:350b::1 dev eth0 metric 200
ip -6 address del 2a01:4f8:2200:350b::43/128 dev eth0
```

The active guard also passed a systemd reload with the same rule structure.
IPv4 retained its original address/gateway, and the public portal still returned
HTTP200 over IPv4. The failed13:46:30–13:46:36 UTC retry preceded the successful
13:49 routing check and is not a current network blocker.

Private evidence: `/opt/utilibre/reports/ipv6-enable-mjgd6dm4/` and
`/opt/utilibre/reports/ipv6-guard-20261009/`. Source files are
`deployment/utilibre/ipv6-guard.nft`, `scripts/utilibre-ipv6-guard`,
`systemd/utilibre-ipv6-guard.service`, `netplan-ipv6.yaml` and
`systemd/networkd-ipv6-guard.conf`. The remaining Dumb prerequisite is an
authorized request path that returns ordinary Genius content, or a compatible
upstream correction. The checked IPv4 and IPv6 paths are challenged; this does
not prove an IP-only cause or failure on every possible route. No Proxmox
management access was used from this VM.
