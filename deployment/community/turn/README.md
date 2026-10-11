# Separate PairDrop relay option

Activated and checked 11 October 2026. This supersedes the **old PairDrop** port recipe in
`docs/next-features.md`. Galene owns 3478/5349 and 49160–49671; do not alter it.

Reuses PairDrop 1.11.2's native `RTC_CONFIG` and the existing pinned coturn
4.7.0-p1 image. No file storage, new authentication service or WebSocket fallback.
The operator confirmed persistent Proxmox forwards on 10 October. The separate
relay is **live**, with exact-byte public browser transfers verified on 11 October
over UDP, TCP and TLS. An initial failed relay check was rolled back while fixing
same-relay peer permissions; the final paths passed before being advertised.

## Boundaries and tests

- Listeners: `turn.utilibre.org:3479` TCP/UDP, TLS TCP 5350, relay UDP 49700–49731.
  Forward these unchanged to `10.10.1.43`. No HTTP Caddy block is needed. The
  existing `turn.utilibre.org` DNS-only record, HTTP certificate challenge and
  certificate renewal are reused; the independent copy hook never restarts Galene.
- 8 allocations; 125,000 bytes/s per allocation; 1,000,000 bytes/s aggregate
  reservation budget. Coturn accounts input and output separately. Allocation
  reservations are not people, achieved throughput or a monthly traffic budget.
  This fixes the older inconsistent 8 × 250,000 / 1,000,000 reservation settings.
- UID 4005 is reserved for this host-network service. 128 MiB, 0.5 CPU, 64 PIDs,
  read-only root, dropped capabilities and no container/coturn request logging.
- Native private/special-use denials plus UID-scoped firewall: public UDP peers
  on ports 1024–65535 and this relay's own UDP ports 49700–49731 only. Coturn
  translates its own public peer address to the private relay IP; the explicit
  allowance for that IP needs the independent port firewall. Unrelated host/LAN,
  Galene, metadata endpoints, IPv6 and TCP peer relay remain blocked. Coturn's
  native address mapping handles same-relay traffic; no additional NAT rules.
- Static client credentials become readable by every visitor after activation.
  They are **not per-user authorization** and can be reused outside PairDrop.
  Quotas limit resource use, not fair access; an abusive client can exhaust them.
  Native credentials, runtime files and certificate keys never enter Git.
- WebRTC encrypts file traffic between the participating browsers. The relay
  handles connection addresses and encrypted packets, not a stored file archive.
  This is different from PairDrop's server-readable WebSocket fallback, which
  remains disabled. Peer connections can expose participant network addresses.
- The mounted RTC file uses only Utilibre's STUN/TURN, with no third-party STUN
  fallback. Direct WebRTC remains preferred; PairDrop chooses the relay when
  needed. PairDrop container logging is now also disabled.

Actual checks: local TLS certificate/hostname/chain; anonymous allocation
challenge; wrong-password rejection; eight simultaneous reservations; ninth
refused with 486; private/metadata/Galene permissions refused. Two allocations
on the production relay exchanged the exact synthetic payload in both directions;
the same public address on an unrelated port was dropped by the UID firewall.
An independent UID-filter test also denied traffic from a relay-range socket to
an otherwise responsive private UDP listener. Repeated certificate-copy hooks
were idempotent; Galene's original process stayed healthy and was not restarted.
The loopback lab transferred the exact synthetic payload with relay candidates
and hit its quota. Two isolated Chromium profiles transferred an exact synthetic
file through the live public PairDrop direct path. The following external Linux
Chrome checks then passed through public HTTPS/WebSocket signaling and selected
WebRTC candidates, with no third-party HTTP requests or unexpected script errors:

| Check | Public run |
| --- | --- |
| Both clients forced through UDP TURN | [38096981575](https://github.com/mycelibre/utilibre/actions/runs/38096981575) |
| Both clients forced through TCP TURN | [38097061830](https://github.com/mycelibre/utilibre/actions/runs/38097061830) |
| Both clients forced through TLS TURN; certificate validated | [38097118716](https://github.com/mycelibre/utilibre/actions/runs/38097118716) |
| One relayed and one direct peer; public UDP relay ports exercised | [38097064883](https://github.com/mycelibre/utilibre/actions/runs/38097064883) |

Two browser profiles share the external runner in each test: this is not a
physical-phone or two independently restrictive-client-network test. Bandwidth
ceilings are configured, not measured throughput or monthly traffic forecasts.
An idle snapshot was about 5 MiB relay memory; that is not a capacity benchmark.

## Render, test and activate

Run from the repository root. Rendering and certificate installation do not
start a disabled service. Reuse the verified NAT address, never guess it.

```sh
set -a
. deployment/community/turn/auction.env
set +a
UTILIBRE_TURN_PUBLIC_IP=$(node -e 'console.log(JSON.parse(require("fs").readFileSync("/opt/utilibre/pack-data/galene-turn/settings.json")).publicIp)') node deployment/community/turn/prepare.mjs
RENEWED_LINEAGE=/etc/letsencrypt/live/turn.utilibre.org python3 deployment/community/turn/deploy-certificate.py
sh deployment/community/turn/firewall.sh
```

After the actual NAT/firewall forwarding is confirmed, persist the independent
firewall hook and certificate deploy hook through the existing mechanisms:

```sh
install -m 0644 deployment/community/turn/firewall.conf /etc/systemd/system/utilibre-tools-firewall.service.d/zz-pairdrop-turn.conf
install -d -m 0755 /etc/systemd/system/docker.service.d
install -m 0644 deployment/community/turn/docker-firewall.conf /etc/systemd/system/docker.service.d/utilibre-pairdrop-turn.conf
install -m 0755 deployment/community/turn/certbot-deploy.sh /etc/letsencrypt/renewal-hooks/deploy/utilibre-pairdrop-turn
systemctl daemon-reload
docker compose -f deployment/community/compose.turn.yaml --profile public-turn up -d --no-build turn
# Before routing visitors only: this test deliberately occupies all allocations.
python3 deployment/community/turn/check-security.py
# Clear test-only allocation-establishment state before enabling visitors.
docker compose -f deployment/community/compose.turn.yaml --profile public-turn restart turn
docker compose -f deployment/community/compose.yaml -f deployment/community/compose.pairdrop-turn.yaml up -d --wait --wait-timeout 60 --no-deps --no-build pairdrop
```

The Docker pre-start hook applies this host-only boundary before any container
auto-restart. It fails closed: a missing runtime settings file or failed firewall
command prevents Docker startup until repaired. The existing tools-firewall hook
also reapplies it after Docker starts. Do not restart Docker merely to test this
ordering; inspect the effective units and test the idempotent script directly.

Run the manual `PairDrop bounded relay check` GitHub workflow once per UDP/TCP/TLS
transport, waiting for each run before dispatching the next (GitHub keeps only
one pending run per concurrency group). Also run UDP with `receiver_direct=true`
to exercise the public relay port range. It uses native RTC and isolated clients;
it needs no repository secret, uploads no artifact and checks exact downloaded
bytes and selected relay candidates. Until external checks pass, do not describe
cross-network transfers as verified. If they fail, immediately restore direct
PairDrop as below. Update bilingual help only after the actual deployment passes.
Test the independent certificate hook twice; unchanged material must not restart
the relay. The existing certbot timer owns renewal; no second ACME account/job.
Always include `compose.pairdrop-turn.yaml` when updating the live PairDrop
application; using only the base file intentionally restores direct-only mode.

## Rollback

```sh
docker compose -f deployment/community/compose.yaml up -d --no-deps --no-build pairdrop
docker compose -f deployment/community/compose.turn.yaml --profile public-turn stop turn
```

Remove only the new router forwarding rules if no longer needed. Leave firewall
denials in place for the dormant UID; they contain no traffic history. Disable
only the new PairDrop renewal/firewall hooks (including the Docker pre-start
drop-in, followed by daemon-reload) if retiring this option. Preserve
Galene, its secrets and certificate renewal. No user files or documents are
deleted by this rollback. Do not publish the private RTC file as an audit artifact.

Primary interfaces: [PairDrop hosting](https://github.com/schlagmichdoch/PairDrop/blob/v1.11.2/docs/host-your-own.md),
[coturn release](https://github.com/coturn/coturn/releases/tag/4.7.0),
[native public/private peer-address mapping](https://github.com/coturn/coturn/blob/4.7.0/src/client/ns_turn_msg.c).
