# Expanded deployment operations

Work from `/home/ubuntu/freetools`. Caddy is on a separate VM at `10.10.1.3`;
application gateways bind `10.10.1.43`. Preserve its existing Cloudflare-only trust.

| Newer service | Public hostname | Application-VM port |
| --- | --- | --- |
| Priviblur | tumblr.utilibre.org | 3139 |
| Mezzo | tenor.utilibre.org | 3140 |
| FMD | fmd.utilibre.org | 3141 |
| Dumb | lyrics.utilibre.org | 3142 — upstream blocked |
| 4get | 4get.utilibre.org | 3145 |
| SafeTwitch | twitch.utilibre.org | 3146 |
| AnonymousOverflow | overflow.utilibre.org | 3147 |
| GotHub | gothub.utilibre.org | 3148 |
| Pollaris | pollaris.utilibre.org | 3149 |
| Binternet | binternet.utilibre.org | 3150 |
| BiblioReads | biblioreads.utilibre.org | 3151 |
| TransLite | translate.utilibre.org | 3152 |
| Rimgo | rimgo.utilibre.org | 3153 — media upstream rate-limited |
| Kittygram | gram.utilibre.org | 3154 |
| QR Tools | qrtools.utilibre.org | 3155 |
| DeGoog | degoog.utilibre.org | 3156 |
| Mumble | mumble.utilibre.org | 64738 TCP **and** UDP — TCP voice and inbound UDP routing verified; UDP audio not yet tested |

DeGoog's direct port 3143, LibreMDB's 3144 and Kuma administration 3135 remain
loopback-only. Do not route them through Caddy. The current Caddy HTTP blocks are
in `deployment/community/Caddyfile.community`. Mumble instead needs DNS-only and
TCP/UDP forwarding; keep its join password separate from SuperUser credentials.
Credentials are private in `/opt/utilibre/mumble/runtime.env`, not in this repo.

## Scheduled maintenance

```sh
systemctl list-timers 'utilibre-*' --no-pager
systemctl status utilibre-account-backup.service utilibre-monitor-alerts.service
node deployment/community/monitor-alerts.mjs
```

Daily guarded SearXNG updates run at 02:20 UTC with jitter, community snapshots
at 04:10, identity/expanded-account snapshots at 04:40, and the original service
backup at 08:20. Account snapshots briefly stop account applications for consistency,
restart only previously running services, then verify isolated restores.
Recovery state in `/run/utilibre-account-backup-state.json` is consumed by the
locked `ExecStopPost` recovery handler after interruption. Do not run backup scripts
concurrently outside their systemd locks.

The five-minute monitor watcher alerts after two consecutive failed/stale
observations; it also watches 10 GiB disk headroom, 5% inode headroom and 5% available
memory. Alerts repeat no more than every 12 hours for an unchanged condition;
recovery sends one notification. Mail goes from `no-reply@utilibre.org` to
`admin@utilibre.org` via the private relay with verified STARTTLS. It includes no
visitor queries or backup contents. It cannot independently detect whole-VM loss.

No automatic deletion policy was chosen for new snapshots. The backup guards
refuse new runs below 5 GiB free and notify the operator. Off-site storage still
needs an operator-provided destination; on-host snapshots are not disaster recovery.
The operator explicitly deferred off-site backup work on October 6; keep the
existing local schedules unchanged and do not purchase or provision storage.

## Recheck the new launches

```sh
node deployment/community/check-qr-offline.mjs
node deployment/community/check-new-readers.mjs --only=gram
node deployment/community/check-degoog.mjs
node deployment/community/check-mumble.mjs
# After the edge forwarding is applied; pins the private server certificate:
node deployment/community/check-mumble.mjs --public
# Optional outside-network test via a temporary local Tor SOCKS listener on9151:
node deployment/community/check-mumble.mjs --tor --voice
```

The default Mumble check verifies private-network TLS/protocol authentication.
`--public` additionally checks public-hostname TCP authentication, not UDP audio.
`--tor --voice` uses an independently routed TCP connection, pins the server's
LAN certificate before sending credentials, and verifies a valid Opus silence
packet through server loopback. No other participant hears the probe. This
passed on October 6. A direct connection from the application VM times out
despite working external TCP access, consistent with missing NAT reflection.
Reader tests make real upstream requests: do not loop them against
429/challenge responses. Rimgo's cooldown honors longer upstream Retry-After
values and otherwise waits ten minutes; its state is in memory.

Rimgo's previously stale public media URL was rechecked at 20:15 and 20:27 UTC:
`CF-Cache-Status: BYPASS`, `Cache-Control: no-store`, `Retry-After: 601`.
That cache problem is resolved for the tested URL, but the separate Imgur429
persists. Do not repeatedly retry or purge unrelated Utilibre hosts.

BreezeWiki p2 adds per-host rejection backoff (minimum ten minutes; longer
upstream Retry-After is respected), strips upstream challenge documents, and
sandboxes media responses. Six offline transport tests and a Racket response
integration test guard this behavior. This does not remove Fandom's image block.

DeGoog uses official 1.0.0 plus three pinned AGPL SearXNG engines. Run
`init-degoog.mjs` only for private credential initialization; run
`configure-degoog.mjs` to install/configure the curated engine set, then restart
the DeGoog service. The script preserves existing identity/credentials and saves
private pre-change settings. Its native privacy panel links the source archive.

## Mumble

Use a [Mumble client](https://www.mumble.info/downloads/), not a web browser:

- Server: `mumble.utilibre.org`
- Port: `64738`
- Password: request access from `admin@utilibre.org`; it is not published here.
- Certificate: self-signed. Compare its SHA-256 fingerprint before accepting it:
  `83:FA:6A:F8:C6:79:77:E0:FE:4E:DA:3B:1F:6C:83:D6:E5:B2:49:60:CA:96:9E:DD:87:FD:86:E1:4C:38:EB:01`

Public TCP authentication and voice fallback are verified. A credential-free
[GitHub-runner check](https://github.com/mycelibre/utilibre/actions/runs/37525936562)
also verified pinned TLS and rejection of invalid credentials. Its tagged UDP
packets (nonce `5574696cc9adeaa7`) reached the application VM and the Mumble
container at `172.29.92.10:64738` on October 6 at 20:22 UTC. Inbound UDP forwarding
is therefore verified. This is not an authenticated UDP audio/return-path test.
Public status pings stay disabled (`ALLOWPING=false`); missing unauthenticated
ping replies are not a firewall failure. No Mumble firewall change was needed.
The Kuma monitor remains an explicitly private TCP-listener check. The join
password is separate from the private SuperUser administrator password.

The manual `Mumble external connectivity` workflow sends no production secrets.
It emits three small UDP probes and reports **sent**, not **delivered**. To repeat,
capture only those tagged packets on the application VM while dispatching it:

```sh
timeout 60 tcpdump -i any -nn -XX 'udp dst port 64738 and udp[8:4] = 0 and udp[12:4] = 0x5574696c'
# Run separately while the capture is active:
gh workflow run mumble-external.yml
```

Compare the full eight-byte nonce printed by the workflow with the capture;
do not capture unrelated voice packets or treat a green send-only step as UDP
audio verification. The workflow is manual-only, not recurring monitoring.

En español: instalá un cliente de Mumble, conectate a `mumble.utilibre.org` en
el puerto `64738` y pedí la contraseña a `admin@utilibre.org`. Compará la huella
del certificado antes de aceptarlo. La voz por TCP está verificada; falta
verificar UDP desde una conexión externa. No compartás la contraseña de SuperUser.
