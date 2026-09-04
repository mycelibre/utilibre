# Firewall and network exposure

Application ports must be reachable only from the separate Caddy edge VM over
the private network. The repository includes an opt-in Docker-aware helper and
systemd unit. They are deliberately not enabled by a normal deployment: an
operator must first verify the active firewall and keep an edge-side test
session available so a bad source address cannot silently cut off every public
service.

## Required exposure

The only host-published application ports are:

- `PORTAL_PORT`;
- `SEARXNG_PORT`;
- `REDLIB_PORT`, which terminates at Anubis;
- `FRESHRSS_PORT`; and
- `PRIVATEBIN_PORT`.

Never permit or publish PostgreSQL `5432`, Valkey `6379`, RSSHub `1200`,
Anubis metrics, direct Redlib, the Docker API, or application debug/admin
listeners. Bind every published port to the exact private application address,
not `0.0.0.0` or `::`.

## Layered controls

1. Give the application VM a stable private address reachable by the edge.
2. Bind Compose listeners to that exact address.
3. Permit retained ports only from the exact edge peer at the network firewall
   or security-group layer.
4. Add a Docker-aware host firewall rule where Docker forwarding/NAT requires
   it.
5. Test from the edge, another private host, and a controlled external host.

Binding is not a substitute for filtering, and a firewall rule is not
permission to use a wildcard binding.

## Inspect before editing

Use read-only checks first:

```sh
sudo nft list ruleset
sudo iptables -S
sudo iptables -S DOCKER-USER
sudo ufw status verbose
docker info
```

Determine whether Docker uses iptables or nftables, how rules persist across
boot, and whether a cloud/network ACL also applies. Preserve unrelated rules
and management access.

## UFW-style illustration

Replace every token and include only deployed ports:

```sh
sudo ufw allow in on PRIVATE_INTERFACE proto tcp from EDGE_PROXY_IP to PRIVATE_BIND_IP port PORTAL_PORT
sudo ufw allow in on PRIVATE_INTERFACE proto tcp from EDGE_PROXY_IP to PRIVATE_BIND_IP port SEARXNG_PORT
sudo ufw allow in on PRIVATE_INTERFACE proto tcp from EDGE_PROXY_IP to PRIVATE_BIND_IP port REDLIB_PORT
sudo ufw allow in on PRIVATE_INTERFACE proto tcp from EDGE_PROXY_IP to PRIVATE_BIND_IP port FRESHRSS_PORT
sudo ufw allow in on PRIVATE_INTERFACE proto tcp from EDGE_PROXY_IP to PRIVATE_BIND_IP port PRIVATEBIN_PORT
```

Docker NAT can bypass an operator's expected UFW `INPUT` policy. Pair this
with a Docker-aware forwarding rule or enforce the exact source restriction in
the upstream private-network firewall, then verify from an unauthorized host.

## Docker-aware filtering

Docker documents `DOCKER-USER` as the user filtering point before its own
forwarding accept rules. Destination NAT has already changed the visible
tuple, so the supplied helper matches the original destination and port with
conntrack. It derives the one interface that owns `PRIVATE_BIND_IP`, permits
the exact `EDGE_PROXY_IP` to continue through any pre-existing `DOCKER-USER`
rules, and drops every other source for each of the five retained ports.

```sh
sudo deployment/utilibre/scripts/utilibre-edge-firewall validate
```

Validation reads only the five port values, `PRIVATE_BIND_IP`, and
`EDGE_PROXY_IP` from the root-owned `.env`; it never sources the file or prints
its contents. It refuses symlinks, permissive modes, public addresses,
ambiguous interfaces, duplicate ports, and an inconsistent route. The helper
uses its own alternating `UTILIBRE-EDGE-A` and `UTILIBRE-EDGE-B` chains and one
tagged jump. It never flushes `DOCKER-USER`, `INPUT`, `OUTPUT`, or an unrelated
chain. Re-applying an unchanged policy is a no-op; a changed policy is built
and verified before its jump replaces the prior one.

This policy is IPv4-only by design. Do not add an IPv6 listener until an
equivalent, tested IPv6 policy exists.

## Safe installation and activation

Do this from the application VM while another operator session is available
on the edge VM. Installing the files is harmless; activating the unit changes
packet filtering.

```sh
sudo install -m 0755 deployment/utilibre/scripts/utilibre-edge-firewall \
  /usr/local/sbin/utilibre-edge-firewall
sudo install -m 0644 deployment/utilibre/systemd/utilibre-edge-firewall.service \
  /etc/systemd/system/utilibre-edge-firewall.service
sudo systemctl daemon-reload
sudo /usr/local/sbin/utilibre-edge-firewall validate
```

Before first activation, retain a root-only diagnostic snapshot. Do not use a
full-table restore as routine rollback because that could overwrite unrelated
rules added after the snapshot.

```sh
sudo install -d -m 0700 /var/lib/utilibre-edge-firewall
sudo sh -c 'umask 077; set -C; /usr/sbin/iptables-save -t filter > /var/lib/utilibre-edge-firewall/before-first-enable.rules'
```

Then, with the edge-side session ready to test all five private listeners:

```sh
sudo systemctl enable --now utilibre-edge-firewall.service
sudo /usr/local/sbin/utilibre-edge-firewall status
```

Immediately verify the portal, SearXNG, Redlib through Anubis, FreshRSS, and
PrivateBin from the edge VM, then verify their normal HTTPS names from a
controlled external host. Run the local health checks on the application VM.
Finally, confirm from a different private-network source that every retained
port is rejected or times out. A test from the application VM itself does not
exercise the forwarded `DOCKER-USER` path and is not a substitute.

If any allowed request fails, roll back only the managed policy:

```sh
sudo systemctl disable --now utilibre-edge-firewall.service
sudo /usr/local/sbin/utilibre-edge-firewall remove
```

The unit reapplies the policy with Docker on later boots and removes only its
tagged jump and dedicated chains when stopped. Re-run the edge, external, and
unauthorized-source checks after Docker or firewall upgrades.

## Verification

On the application VM:

```sh
sh scripts/verify-network.sh
ss -lntp
docker compose ps
(cd deployment/utilibre && docker compose ps)
```

From the edge, each retained private listener should respond. From an
unauthorized private host and a controlled external host, all five ports
should time out or be rejected. Also verify:

- neither database/cache nor RSSHub has a host listener;
- direct Redlib and Anubis metrics are container-network-only;
- DNS resolves only to the edge;
- the rules survive a planned firewall reload; and
- removed application ports and hostnames no longer resolve or accept
  traffic.

Crawler directives, CORS, cookies, and unguessable URLs are not firewall
controls.
