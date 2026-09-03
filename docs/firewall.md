# Firewall and network exposure

Application ports must be reachable only from the Caddy edge VM over the
private network. This repository does not automatically change the general host
firewall because the active firewall system and the purpose of existing rules
must be verified by the operator first. The additional-services deployment now
includes a narrowly scoped ntfy `DOCKER-USER` helper; it was installed on the
application VM and verified on 2026-09-03. Other service and edge rules remain
operator-managed.

The ntfy helper, unit, installation procedure, and rollback live under
`deployment/utilibre/`. It matches the original destination
`${APP_BIND_IP}:${NTFY_PORT}`, allows the exact verified `EDGE_PROXY_IP`, has no
input-interface assumption, and leaves host-local output untouched. This
documents one deployed application-VM control; it does not claim that the edge
VM's complete firewall was inspected.

## Layered controls

Use all applicable layers:

1. Give the application VM a stable RFC1918, WireGuard, or Tailscale address reachable by the edge VM.
2. Set `PRIVATE_BIND_IP` to that exact address. Compose refuses an unset value; `scripts/verify-network.sh` refuses wildcard values.
3. Permit the configured TCP ports only from the exact `EDGE_PROXY_IP` at the private-network firewall or security-group layer.
4. Apply a host firewall rule that also accounts for Docker's forwarding/NAT behavior.
5. Test from the edge, another private-network host, and an external controlled host.

Launch ports are `PORTAL_PORT`, `COBALT_PORT`, `SEARXNG_PORT`, and
`REDLIB_PORT` (Anubis ingress; Redlib has no host port) when the
`privacy-frontends` profile is enabled. Add
`RIMGO_PORT` only for controlled optional evaluation. Never permit or publish
Valkey `6379`, PostgreSQL `5432`, Docker API `2375/2376`, metrics, debug, or
container-only ports.

Binding a published port to a private address is essential, but it is not a substitute for filtering. Conversely, a firewall rule is not permission to use a wildcard Docker binding.

## Discover the active firewall before editing it

Read-only checks include:

```sh
sudo nft list ruleset
sudo iptables -S
sudo iptables -S DOCKER-USER
sudo ufw status verbose
docker info
```

The presence of a command does not prove that it is the authoritative firewall. Determine whether Docker is using its iptables or nftables backend, whether a cloud/network ACL also applies, and how rules persist across boot. Preserve unrelated production rules.

## UFW-style host rules

The following illustrates the intended policy; replace every uppercase token and include only deployed ports:

```sh
sudo ufw allow in on PRIVATE_INTERFACE proto tcp from EDGE_PROXY_IP to PRIVATE_BIND_IP port PORTAL_PORT
sudo ufw allow in on PRIVATE_INTERFACE proto tcp from EDGE_PROXY_IP to PRIVATE_BIND_IP port COBALT_PORT
sudo ufw allow in on PRIVATE_INTERFACE proto tcp from EDGE_PROXY_IP to PRIVATE_BIND_IP port SEARXNG_PORT
sudo ufw allow in on PRIVATE_INTERFACE proto tcp from EDGE_PROXY_IP to PRIVATE_BIND_IP port REDLIB_PORT
```

Add explicit denies according to the host's existing default policy and management requirements. Do not paste a broad deny rule that could lock out SSH or another application.

Docker-published traffic can be diverted by Docker NAT before UFW's normal `INPUT` rules and may bypass the policy an operator expects. UFW-only rules are therefore not sufficient evidence. Pair them with a Docker-aware forwarding rule or enforce the source restriction in the upstream private-network firewall, then test from an unauthorized host.

## iptables with Docker's `DOCKER-USER` chain

Docker documents `DOCKER-USER` as the place for user filtering before Docker's own forwarding accept rules. At that point destination NAT may already have changed the visible address and port. Match the original destination with conntrack rather than guessing a container address.

For each published port, an operator can adapt this pattern after checking the current chain and interface names:

```sh
sudo iptables -I DOCKER-USER 1 -i PRIVATE_INTERFACE -p tcp \
  -s EDGE_PROXY_IP -m conntrack \
  --ctorigdst PRIVATE_BIND_IP --ctorigdstport PORTAL_PORT -j ACCEPT

sudo iptables -I DOCKER-USER 2 -i PRIVATE_INTERFACE -p tcp \
  -m conntrack \
  --ctorigdst PRIVATE_BIND_IP --ctorigdstport PORTAL_PORT -j DROP
```

Repeat the allow-then-drop pair for Cobalt, SearXNG, Redlib, and optional
rimgo. Integrate established/related handling and rule ordering with the
existing ruleset; inserting all rules at position 1 repeatedly reverses their
order. Conntrack matching can add processing cost, so use a
network/security-group source restriction as the first layer where available.
Configure persistence using the distribution's supported mechanism.

Do not use this example for IPv6 unchanged. If an IPv6 address is bound, build and test an equivalent IPv6 policy. The default deployment should not bind IPv6 unless a private IPv6 route to the edge is intentionally configured.

## nftables-style policy

With Docker's nftables backend, create an operator-owned forward chain at an appropriate priority and match the connection's original destination tuple. The exact base-chain priority and coexistence rules depend on the installed Docker version and current ruleset. The intended rule order is:

```nftables
ct state established,related accept
meta l4proto tcp ip saddr EDGE_PROXY_IP ct original ip daddr PRIVATE_BIND_IP ct original proto-dst { PORTAL_PORT, COBALT_PORT, SEARXNG_PORT, REDLIB_PORT } accept
meta l4proto tcp ct original ip daddr PRIVATE_BIND_IP ct original proto-dst { PORTAL_PORT, COBALT_PORT, SEARXNG_PORT, REDLIB_PORT } drop
```

Treat this as a policy fragment, not a complete replacement ruleset. Validate syntax against the installed nftables version, add the correct hook/interface context, include `RIMGO_PORT` only when deployed, and load it through the host's existing persistent firewall configuration. Never flush the live ruleset merely to install these rules.

## Verification

On the application VM:

```sh
sh scripts/verify-network.sh
ss -lntp
docker compose ps
docker port public-utility-portal-1
docker port public-utility-cobalt-1
docker port public-utility-searxng-1
docker port public-utility-redlib-1
```

Compose-generated container names can differ when `COMPOSE_PROJECT_NAME` changes; use `docker compose ps -q SERVICE` with `docker inspect` if a literal name is absent.

From the edge VM, each deployed private health endpoint should succeed. From an unauthorized private host, all project ports should time out or be rejected. From a controlled external host, test the application VM's public address directly; the private-bound ports must not be reachable.

Also verify:

- no listener on host ports `5432` or `6379` was created by this project;
- the public media hostname rejects `POST /` and every path except exact `GET /tunnel`;
- the public Reddit hostname reaches Anubis, accepted requests reach Redlib only on Docker's service network, and the application port is not reachable from any other source;
- the edge can still reach services after a container restart;
- rules persist after a planned firewall reload (a VM reboot is not required for this test);
- IPv6 does not provide an unintended alternate path;
- DNS resolves only to the edge VM, never to the application VM.

Robots directives, CORS, API keys, and unguessable URLs are not firewall controls.

For the installed Docker release, re-check Docker's official [packet-filtering and firewall overview](https://docs.docker.com/engine/network/packet-filtering-firewalls/) and [`DOCKER-USER`/conntrack guidance](https://docs.docker.com/engine/network/firewall-iptables/) before changing rules.
