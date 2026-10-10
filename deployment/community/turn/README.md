# Separate PairDrop relay option

Checked 10 October 2026. This supersedes the **old PairDrop** port recipe in
`docs/next-features.md`. Galene owns 3478/5349 and 49160–49671; do not alter it.

Reuses PairDrop 1.11.2's native `RTC_CONFIG` and the existing pinned coturn
4.7.0-p1 image. No file storage, new authentication service or WebSocket fallback.
The separate option is prepared and locally tested, **not activated for visitors**.
The live PairDrop application still uses its existing direct-only configuration.

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
- Native private/special-use/self-address peer denials plus UID-scoped firewall;
  only public UDP peers on ports 1024–65535 may receive new relay traffic. No
  private LAN, Galene SFU, metadata endpoint, IPv6 or TCP peer relay. The single
  `external-ip` form avoids coturn's implicit private-address allow exception.
- Static client credentials become readable by every visitor after activation.
  They are **not per-user authorization** and can be reused outside PairDrop.
  Quotas limit resource use, not fair access; an abusive client can exhaust them.
  Native credentials, runtime files and certificate keys never enter Git.
- WebRTC encrypts file traffic between the participating browsers. The relay
  handles connection addresses and encrypted packets, not a stored file archive.
  This is different from PairDrop's server-readable WebSocket fallback, which
  remains disabled. Peer connections can expose participant network addresses.
- The candidate RTC file uses only Utilibre's STUN/TURN, with no third-party
  fallback. The **currently live direct configuration is unchanged**.

Actual checks: local TLS certificate/hostname/chain; anonymous allocation
challenge; wrong-password rejection; eight simultaneous reservations; ninth
refused with 486; private/metadata/Galene/self-public-IP permissions refused.
An independent UID-filter test also denied traffic from a relay-range socket to
an otherwise responsive private UDP listener. Repeated certificate-copy hooks
were idempotent; Galene's original process stayed healthy and was not restarted.
The loopback lab transferred the exact synthetic payload with relay candidates
and hit its quota. Two isolated Chromium profiles transferred an exact synthetic
file through the live public PairDrop direct path. No third-party HTTP requests
or unexpected JavaScript errors occurred. These are not phone, cross-network,
public-NAT or bandwidth-throughput tests.

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
install -m 0644 deployment/community/turn/firewall.conf /etc/systemd/system/utilibre-edge-firewall.service.d/zz-pairdrop-turn.conf
install -m 0755 deployment/community/turn/certbot-deploy.sh /etc/letsencrypt/renewal-hooks/deploy/utilibre-pairdrop-turn
systemctl daemon-reload
docker compose -f deployment/community/compose.turn.yaml --profile public-turn up -d --no-build turn
python3 deployment/community/turn/check-security.py
docker compose -f deployment/community/compose.yaml -f deployment/community/compose.pairdrop-turn.yaml up -d --no-deps --no-build pairdrop
```

Run the manual `PairDrop bounded relay check` GitHub workflow once per UDP/TCP/TLS
transport. It uses the native public RTC configuration and two isolated clients;
it needs no repository secret, uploads no artifact and checks exact downloaded
bytes and selected relay candidates. Until external checks pass, do not describe
cross-network transfers as verified. If they fail, immediately restore direct
PairDrop as below. Update bilingual help only after the actual deployment passes.
Test the independent certificate hook twice; unchanged material must not restart
the relay. The existing certbot timer owns renewal; no second ACME account/job.

## Rollback

```sh
docker compose -f deployment/community/compose.yaml up -d --no-deps --no-build pairdrop
docker compose -f deployment/community/compose.turn.yaml --profile public-turn stop turn
```

Remove only the new router forwarding rules if no longer needed. Leave firewall
denials in place for the dormant UID; they contain no traffic history. Disable
only the new PairDrop renewal/firewall hooks if retiring this option. Preserve
Galene, its secrets and certificate renewal. No user files or documents are
deleted by this rollback. Do not publish the private RTC file as an audit artifact.

Primary interfaces: [PairDrop hosting](https://github.com/schlagmichdoch/PairDrop/blob/v1.11.2/docs/host-your-own.md),
[coturn release](https://github.com/coturn/coturn/releases/tag/4.7.0).
