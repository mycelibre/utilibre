# Galene relay operation

This relay belongs to Galene only. The separate PairDrop TURN option remains
disabled. Use the pinned coturn image built by `deployment/community/turn/Dockerfile`.
Native ICE configuration issues expiring HMAC
credentials; coturn permits only the Galene container as a peer.

## Network and certificate

`turn.utilibre.org` must resolve directly to the real public IPv4 (DNS only).
Forward 3478 TCP/UDP, 5349 TCP and 49160–49191 UDP, preserving port numbers, to
10.10.1.43. The relay binds only that IPv4. There is no IPv6 or TCP-peer relay.
The usual browser-to-relay TCP and TLS transports are supported.
The allocation pool extends privately through 49671. These extra ports need no
router forwarding because Galene is the only permitted peer and reaches them
through the local DNAT rule. The host firewall rejects WAN traffic to that extension.

Install `utilibre-turn-acme.service`, create the webroot
`/var/lib/utilibre-turn-acme/webroot/.well-known/acme-challenge` with mode 0755,
and add `Caddyfile.challenge` to the separate edge. The edge must serve the HTTP
challenge path directly rather than redirecting it to HTTPS. Only the edge and
the app host can read tokens from the private endpoint on port 3189; other paths
and directory listings are unavailable. Access logs are disabled.

Install Debian's certbot package and `certbot-deploy.sh` as executable
`/etc/letsencrypt/renewal-hooks/deploy/utilibre-galene-turn`. First test issuance
with `certbot certonly --dry-run --webroot -w /var/lib/utilibre-turn-acme/webroot
-d turn.utilibre.org --cert-name turn.utilibre.org --key-type ecdsa
--non-interactive --agree-tos --register-unsafely-without-email`, then issue
without `--dry-run`. No email address is registered by these commands.

Run the deploy hook explicitly for initial installation with
`RENEWED_LINEAGE=/etc/letsencrypt/live/turn.utilibre.org python3
deployment/pack/turn/deploy-certificate.py`. Certbot's enabled timer renews the
certificate; test that whole path with `certbot renew --dry-run
--run-deploy-hooks --cert-name turn.utilibre.org`. The hook validates trust,
hostname, lifetime and key matching before replacing private runtime files.
Changed certificates restart only coturn; unchanged files do not restart it.
An actual renewal can briefly interrupt relayed calls.

## Configuration and isolation

Run `prepare.mjs` with the verified `UTILIBRE_TURN_PUBLIC_IP`; it creates the
private secret once and renders configuration without printing credentials.
Use `--tls` only after installing a valid certificate. The script creates a
candidate ICE file; activation copies it to Galene's private data directory with
owner 4003 and mode 0640. Galene refreshes ICE configuration within five minutes.
The certificate hook updates this file when TLS becomes available.

Apply `firewall.sh` before starting `compose.galene-turn.yaml`. Install
`firewall.conf` as `/etc/systemd/system/utilibre-tools-firewall.service.d/
zz-galene-turn.conf`, after the pack firewall hook. UID 4004 is reserved for the
relay. New relay peer traffic may reach only 172.29.99.10 UDP 47800–48311; client
reply traffic and the local STUN health check are allowed separately. Galene's
pack isolation rules remain in force.

A narrowly scoped local DNAT rule lets Galene reach this relay's advertised
public UDP addresses without depending on router NAT reflection. It matches only
Galene's IP, media source ports and the configured public relay destination range.
Matching source NAT keeps the relay's advertised address consistent when the relay
initiates checks toward Galene, avoiding competing private/public connection tuples.
An exact host-input exception admits those packets to coturn. No other host port
or private service is opened to Galene, apart from the two authenticated relay
listener paths described next.

Galene's container alone resolves `turn.utilibre.org` to `10.10.1.43` through
Compose `extra_hosts`. Exact host-input exceptions permit that container to
reach UDP 3478 and TCP 5349. The native server gathers TURN candidates too:
trying the public address from behind this NAT left a TCP dial pending, which
blocked native ICE shutdown and therefore screen-share stop signaling. Local
resolution avoids that path without an upstream fork. The TLS URL/hostname and
certificate validation are unchanged; public browser DNS is unchanged. Do not
replace this with general LAN access or broaden coturn's permitted peer list.

Use coturn's single-address `external-ip` form here. In 4.7.0, the public/private
mapping form implicitly whitelists its private address and defeats a peer-address
deny rule for that host. The native negative test covers this behavior. Firewall
restrictions provide a second independent boundary.

Limits: 256 allocations over 512 UDP relay ports, 250,000 bytes/s per allocation,
64,000,000 bytes/s of bandwidth reservations, 1 CPU and 128 MiB RAM. Coturn
accounts bandwidth in each direction. It reserves the per-allocation maximum even
for an unused ICE candidate: `bps-capacity / max-bps` is a second admission limit.
The reservation ceiling is 512 Mbit/s in each direction, not an observation that
meetings consume that bandwidth. Allocations are not people: each browser can
reserve several, and the native SFU also gathers candidates.
Galene retains its four-client room limit, with 2 CPUs and 256 MiB RAM shared
across meetings. Its UDP range is 47800–48311. These are
configured ceilings, not a guarantee for arbitrary video quality or network loads.
The initial 2,000,000 / 500,000 settings admitted only four reservations, despite a
higher allocation count. Four-person tests rejected that configuration. Enlarging
the port/count pool alone did not fix it; the reservation budget also had to change.
Headroom accommodates multiple streams, interfaces and replacement connections.
The October 8 simultaneous-meeting test also reproduced exhaustion of the former
64-allocation ceiling after a sequence of meetings, including reservations left
after browser termination. The 256-allocation ceiling includes room for that
overlap; it must not be advertised as 256 participants. See the dated capacity
report for actual workloads and results.

## Verification and rollback

`check-security.py` uses temporary synthetic credentials and echo endpoints to
check authentication, peer isolation, an allowed media roundtrip, and denial of
an otherwise-responsive Galene socket outside the media range. It closes the
allocation and removes the echo process on exit. Do not print runtime secrets.
It also verifies the relay certificate from the SFU network namespace and proves
an unrelated, otherwise-responsive host TCP listener remains inaccessible.

`GALENE_SOAK_SECONDS=180 node deployment/pack/check-galene-lifecycle.mjs` creates
its own password-protected, expiring two-client group, exercises native screen
share/stop and rejoin, checks continuing media and last-moderator-exit handling,
then removes the group. It never uses the real room or administrator. This is
same-host Linux Chromium with synthetic media, not a real-phone or external
network test. Optional `GALENE_LIFECYCLE_LAB=1` targets the separately prepared
loopback lab; it does not provision or change production.

To undo only the October 9 local-listener repair, remove `extra_hosts` from the
Galene Compose service and the two listener exceptions from `firewall.sh`, then
recreate only Galene at an empty-room window. Delete the corresponding live rules
explicitly (reapplying the older script alone does not remove them):

```sh
iptables -w -D INPUT -s 172.29.99.10 -d 10.10.1.43 -p udp --dport 3478 -j ACCEPT
iptables -w -D INPUT -s 172.29.99.10 -d 10.10.1.43 -p tcp --dport 5349 -j ACCEPT
docker compose -f deployment/pack/compose.galene.yaml up -d --no-deps galene
```

No image or stateful-data rollback is needed: the deployed application remains
`utilibre-galene:1.2.1-p2`. This rollback restores the known stalled-dial path;
use it only if the narrow networking change itself produces a regression.

`check-galene-external.mjs` supports `GALENE_FORCE_RELAY=udp|tcp|tls` and
`GALENE_CHECK_CLIENTS=2|4`. Use a disposable, expiring, presentation-only group,
never production moderator credentials. Every participant must receive audio and
decode video from every other participant. The selected candidate's relayProtocol
and relay-only policy establish relay use. Behind this shared NAT, Chrome may
classify the selected relay candidate as peer-reflexive; that alone does not mean
the call bypassed the relay. The manual GitHub workflow exposes these options.

`check-galene-load.mjs` and the separate `galene-load.yml` workflow exercise
simultaneous four-person groups from independent runners. The October 8 tests
passed eight rooms over UDP for two minutes and TLS for five minutes, plus four
rooms with automatic ICE selection. Use the [capacity report](../../../docs/capacity-2026-10-08.md)
for delivered resolution, resource figures, startup reservations, and the two
earlier unexplained signaling disconnects. Start with at most four provisioned
meetings; a capacity pass is not a promise of arbitrary quality or call duration.

Restore the prior STUN-only ICE file first when rolling back, then stop only
`utilibre-galene-turn` and remove its dedicated firewall hook/rules. Preserve
the private secret and certificates for recovery. Never flush global firewall
tables or change other service containers. The ordinary direct-call repair is
independent of this relay.

## October 8 verification

The deployed Galene `1.2.1-p2` client changes only the native Simulcast selection
from auto to off (two HTML option attributes, guarded at build time). Automatic
simulcast failed four-person relay checks; this single-layer setting passed.
Users retain native controls; an older tab can retain a previous session setting.
This observation does not establish an upstream codec defect or arbitrary video
capacity. Remove the default adjustment after the same default-client checks
pass on a supported upstream/configuration update.

[External run 37829493087](https://github.com/mycelibre/utilibre/actions/runs/37829493087)
passed four-person UDP, TCP and TLS relay checks using the deployed defaults and
three fresh, expiring rooms. Every browser received audio and decoded video from
the other three. The preceding explicit-off run 37829049211 also passed.
The native security check passed anonymous/expired/incorrect-credential denial,
six concurrent reservations, unrelated-peer denial, a permitted media roundtrip
and denial of a responsive out-of-range Galene socket. Temporary rooms and the
diagnostic remote branch were removed. Tests use synthetic media; real phones,
long meetings and screen sharing remain unverified.

The public certificate expires January 6, 2027. A staging renewal with deploy
hooks passed. Keep the edge HTTP challenge block for future renewals.
`deployment/pack/backup.mjs` now includes the relay settings, shared identity,
certificate/key and `/etc/letsencrypt` renewal state in the encrypted private
archive. Its restore check verifies matching native moderator/relay credentials,
room limits, hostname and TLS key pair. It does not restore over production.
