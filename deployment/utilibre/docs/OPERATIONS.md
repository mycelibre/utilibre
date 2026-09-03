# Operations

Run operational commands as root from `/opt/utilibre`. The Compose file names
the project `utilibre-services`, but working from the correct directory also
ensures the correct `.env` and bind-mounted paths are used.

## Routine status

```sh
cd /opt/utilibre
./scripts/status.sh
./scripts/healthcheck.sh
docker compose ps
docker stats --no-stream
```

`healthcheck.sh` checks container state/health, private HTTP endpoints,
PostgreSQL databases, Valkey, Wakapi database health, disk/memory headroom, and
backup freshness. It returns nonzero on a detected problem. `status.sh` reports
service state, health, port, HTTP result, memory, restarts, and deployed images;
it does not reveal secrets.

## Start, stop, restart, and isolate

Whole new stack only:

```sh
cd /opt/utilibre
docker compose up -d
docker compose stop
```

One service:

```sh
docker compose stop rsshub
docker compose up -d rsshub
docker compose restart rsshub
```

Prefer stopping a single abusive or unhealthy application to exhausting the
shared VM. Do not stop PostgreSQL while Healthchecks, FreshRSS, or Wakapi are
handling requests. `docker compose down` removes only this project's containers
and networks and preserves bind-mounted data, but ordinary operations should
use `stop`. Never add `-v`.

## Logs

```sh
docker compose logs --tail=100 SERVICE
docker compose logs --since=30m SERVICE
docker inspect -f '{{.RestartCount}} {{.State.OOMKilled}}' \
  "$(docker compose ps -q SERVICE)"
```

All containers use Docker's `json-file` driver with `max-size=10m` and
`max-file=3`. Logs are for operational failures and abuse diagnosis; do not
copy user content into issue reports. Application defaults may still log
request paths or error context. In particular, treat RSSHub route paths and
Healthchecks ping UUIDs as sensitive operational data.

Recommended edge posture: do not log request bodies, query strings, paste
payloads, ntfy topic names, Healthchecks ping UUIDs, or Wakapi API paths. If
access logs are needed, redact sensitive path components and retain them only
as long as an explicit security purpose requires.

## Owner credentials

Owner credentials are stored only at:

```text
/opt/utilibre/secrets/admin-credentials.txt
```

It must remain root-owned and mode `0600`. Never print, paste into shell
history, send to ntfy, or copy it into reports/Git. Move an encrypted copy to a
separate trusted system; the same-VM backup is not credential disaster
recovery.

Owner URLs:

- Healthchecks: `https://monitor.utilibre.org/accounts/login/`
- FreshRSS: `https://rss.utilibre.org/i/?c=user&a=profile`
- Wakapi: `https://wakapi.utilibre.org/settings`

Healthchecks and Wakapi registration are closed. FreshRSS has no public
anonymous user-creation flow. Public portal cards must say “beta/on request”
for account-backed services until the operator establishes a user-approval and
email process.

## User administration

Bootstrap account identifiers come from `HEALTHCHECKS_ADMIN_EMAIL`,
`FRESHRSS_ADMIN_USERNAME`, and `WAKAPI_ADMIN_USERNAME`. Keep their real values
in the root-only `.env` and generated owner-credential file; use only variable
names or obvious placeholders in shared documentation and test fixtures.

### Healthchecks

Healthchecks connects to the trusted Proxmox Mail Gateway submission port at
`mx.mailgt.dev:26` using STARTTLS without SMTP authentication. Compose maps that
hostname to the private relay address so certificate validation uses the DNS
name rather than the IP address. The sender is
`Utilibre Monitor <no-reply@utilibre.org>`. Keep `REGISTRATION_OPEN=False` until
an inbox-level delivery test, recovery test, and public-account policy have all
passed. Create another owner only from a root maintenance shell and use the
installed command's help for the pinned version:

```sh
docker compose exec healthchecks /opt/healthchecks/manage.py createsuperuser --help
docker compose exec healthchecks /opt/healthchecks/manage.py createsuperuser
```

The navigation wordmark is configured through Healthchecks' supported
`SITE_NAME` and `SITE_LOGO_URL` settings. Its SVG is mounted read-only from
`config/healthchecks/`; keep that same-host asset when updating the image rather
than patching upstream templates or loading the portal logo cross-origin.
The deployment also loads `config/healthchecks/settings_utilibre.py` as a
minimal Django settings overlay so session and CSRF cookies always carry the
`Secure` attribute on the public HTTPS service.

Do not place a password on a command line. The SMTP certificate must cover
`mx.mailgt.dev` and remain valid; Proxmox Mail Gateway manages its SMTP and API
certificates separately. After any relay or certificate change, validate
STARTTLS from the application VM and send one controlled delivery test before
changing `REGISTRATION_OPEN`.

### FreshRSS

Use the authenticated administrator interface to create and disable users.
Do not restore `FRESHRSS_INSTALL` or `FRESHRSS_USER` bootstrap variables to the
final Compose file: those values would be exposed through container inspection.
The mobile-client API remains available; users set a separate API password in
their profile.

The scheduled updater runs at minutes 13 and 43:

```sh
docker compose exec --user www-data freshrss \
  php /var/www/FreshRSS/app/actualize_script.php
```

### Wakapi

Public signup is closed with `WAKAPI_ALLOW_SIGNUP=false`. The pinned release
still supports controlled onboarding: an existing account can use the Invite
Friends control in Settings to generate a single-use signup link that expires
after 24 hours. Generate it only when the approved recipient is ready, because
the server consumes the code on the first signup submission even if later
validation fails. The control was verified without generating a code or
creating a user.

If a future release removes invitation support and still requires self-signup,
use a private maintenance window: bind access remains private, set signup true
in root-only `.env`, recreate only Wakapi, create the account, immediately set
it false, recreate Wakapi again, and verify `/signup` no longer offers
registration.

WakaTime-compatible clients use:

```text
https://wakapi.utilibre.org/api
```

Users retrieve their own API key from Wakapi. Never record it in shared docs.

`WAKAPI_DISABLE_FRONTPAGE=true` redirects anonymous root requests to login.
Keep this enabled: the pinned upstream front page loads a third-party badge and
describes the upstream hosted service rather than this installation.

The pinned 2.17.6 release also renders `https://wakapi.dev/api` on `/setup` for
logged-out visitors; this value is hard-coded in its embedded template and has
no supported configuration override. Once authenticated, the same page derives
`https://wakapi.utilibre.org/api` from the public request URL and exposes the
user's own API key. Treat the logged-out page as generic upstream documentation,
and verify the authenticated value before onboarding a user. A correction would
require maintaining a custom Wakapi build, so the deployment deliberately does
not patch it for this display-only limitation.

## Credential rotation

Always run a fresh backup first. Rotate one credential family at a time and
test only the dependent application.

- **Application owner password:** use the application's authenticated settings
  or recovery command, then update the protected credential file.
- **Healthchecks `SECRET_KEY`:** a change invalidates sessions and may affect
  signed values. Review release documentation, replace it in `.env`, recreate
  only Healthchecks, and test existing checks before discarding the old key.
- **Wakapi password salt:** do not rotate casually; it affects password
  verification. Follow the exact upstream migration guidance for the installed
  release.
- **Database role password:** create a pre-change backup; alter only that role
  from PostgreSQL, update the matching `.env` variable, recreate only the
  application, and verify connectivity. Keep the old value until validation.
- **ntfy owner alert topic:** generate a new high-entropy topic under
  `umask 077`, update both `.env` and the root-only credentials file, test it,
  then stop using the previous topic. Topic names act like bearer secrets.

Never rotate every database password and app secret in one change.

## Service-specific operations

### ntfy storage and limits

Persistent state is in `data/ntfy`. The configured ceilings are 10 MiB per
attachment, 5 GiB total attachment cache, 50 MiB per visitor, 250 MiB daily
attachment/replay bandwidth per visitor, 1,000 messages per visitor/day, burst
60 with one token replenished every five seconds, 15,000 global topics, and
12-hour message retention plus three-hour attachment expiry. The message and
attachment caches are excluded from longer-lived backups.

Caddy must replace `X-Forwarded-For` with one normalized client address. Keep
ntfy's `proxy-trusted-hosts` empty because there is no remaining intermediary
chain to strip. That setting does not authenticate the proxy: restrict the
published ntfy port to the exact edge VM at the application-VM firewall. ntfy
runs alone on a dedicated, non-internal Docker network so it can reach the
supported iOS relay without accepting traffic from other application
containers.

### ntfy edge-only firewall

`scripts/utilibre-ntfy-firewall` enforces the application-VM side of that
boundary. It inserts one rule at the start of Docker's `DOCKER-USER` chain:
forwarded TCP connections whose original destination is `APP_BIND_IP:NTFY_PORT`
are dropped unless their source is the exact `EDGE_PROXY_IP`. The rule has no
input-interface assumption. `--ctdir ORIGINAL` keeps reply traffic out of its
scope, and host-local `OUTPUT` traffic does not traverse `DOCKER-USER`.

The helper reads `APP_BIND_IP`, `EDGE_PROXY_IP`, and `NTFY_PORT` from
`/opt/utilibre/.env`. All three must occur exactly once and be non-empty; both
addresses must be canonical IPv4 addresses and the port must be in the valid
TCP range. The file must be root-owned and mode `0600` or `0400`. There are no
address or port fallbacks. A missing or invalid value stops before mutation and
does not remove an already-installed drop rule.

Before enabling it, set the exact edge source in the root-only `.env`. Never
use a subnet, hostname, public client address, `0.0.0.0`, or a guessed value.
If an older active helper contains an interface-specific rule, stop it before
replacing the helper so its own `ExecStop` removes that exact old rule:

```sh
cd /opt/utilibre
if systemctl is-active --quiet utilibre-ntfy-firewall.service; then
  systemctl stop utilibre-ntfy-firewall.service
fi
install -o root -g root -m 0755 \
  scripts/utilibre-ntfy-firewall /usr/local/sbin/utilibre-ntfy-firewall
install -o root -g root -m 0644 \
  systemd/utilibre-ntfy-firewall.service \
  /etc/systemd/system/utilibre-ntfy-firewall.service
systemd-analyze verify /etc/systemd/system/utilibre-ntfy-firewall.service
systemctl daemon-reload
systemctl enable --now utilibre-ntfy-firewall.service
```

Confirm the unit and exact rule without printing `.env`:

```sh
systemctl is-enabled utilibre-ntfy-firewall.service
systemctl is-active utilibre-ntfy-firewall.service
/usr/local/sbin/utilibre-ntfy-firewall status
/usr/local/sbin/utilibre-ntfy-firewall apply
/usr/local/sbin/utilibre-ntfy-firewall status
iptables -w 10 -nvL DOCKER-USER --line-numbers
```

Two consecutive `apply` calls must still leave exactly one rule bearing the
comment `utilibre-ntfy-edge-only`. Confirm public publish, subscribe, SSE, and
WebSocket behavior through the edge. A host-local health request must still
work. Test rejection from a separate, authorized non-edge private host; the app
VM itself cannot prove that forwarded traffic is denied because its requests
use the local output path.

To change `APP_BIND_IP`, `EDGE_PROXY_IP`, or `NTFY_PORT`, update the root-owned
`.env`, then reload the unit. The helper validates the replacement values,
installs the new rule first, removes older rules bearing its exact comment, and
verifies one desired rule remains. If insertion or cleanup fails, protection is
left in the fail-closed direction; inspect the chain before retrying.

### ntfy public compatibility check

Run the public-path check after a Cloudflare, Caddy, firewall, ntfy, DNS, or
certificate change, and before describing ntfy as compatible with scripts or
apps:

```sh
cd /opt/utilibre
sh scripts/check-ntfy-public.sh
```

This is a functional check, not a passive health request. It uses an
unguessable one-use topic, opens both JSON and SSE subscriptions, and publishes
one random marker with `Cache: no` and `Firebase: no`. It then confirms live
delivery over both streams and polls the topic to ensure the marker was not
cached. It prints neither the topic nor the marker and removes its local
temporary files on success, failure, or interruption. There is no credential
or stable topic in the script.

Every accepted response must be 2xx and must not contain `cf-mitigated`, `NEL`,
or `Report-To`. The health endpoint must return its expected JSON object and the
stream endpoints must retain their documented content types. A Cloudflare HTML
challenge therefore fails loudly instead of being mistaken for a working ntfy
response.

Bot Fight Mode was disabled for the zone on 2026-09-03 after it challenged
non-browser clients. The check must now pass. A browser-only success does not
clear this release gate; do not add a browser user-agent override to make the
check pass.

### BentoPDF public isolation check

BentoPDF uses browser workers that require a cross-origin-isolated document.
Run the real-browser edge check from the repository checkout after any Caddy,
Cloudflare, or BentoPDF change:

```sh
cd /path/to/utilibre/portal
npm run test:public:bentopdf
```

The test requires exactly one `Cross-Origin-Opener-Policy: same-origin` and one
`Cross-Origin-Embedder-Policy: require-corp`, retains the upstream CSP, and then
checks `window.crossOriginIsolated` and `SharedArrayBuffer` in Chromium. Header
presence alone is insufficient: duplicate or conflicting fields can make the
browser reject isolation.

The 2026-09-03 public check caught that exact failure. The response had
duplicate COOP and conflicting `require-corp`/`credentialless` COEP values, so
Chromium reported no isolation even though text-to-PDF still produced a valid
local file. The Caddy fragment contains the fix: set both
fields with `header_down` inside the BentoPDF `reverse_proxy`, where they replace
the upstream values rather than append to them. After the correction was
applied, the public gate passed with browser isolation and `SharedArrayBuffer`
active. Continue to run it after edge changes. Do not weaken or replace
BentoPDF's CSP to repair the isolation headers.

### PairDrop limitations

PairDrop needs WebSockets. Caddy's normal `reverse_proxy` supports the upgrade;
do not add obsolete manual upgrade headers. No TURN server is installed, so
some cross-network transfers will fail behind restrictive or symmetric NAT.
That is a known limitation, not evidence that files were relayed by Utilibre.

### RSSHub cache

After changing RSSHub, its public proxy route, or DNS, run the functional
public-feed check:

```sh
cd /opt/utilibre
sh scripts/check-rsshub-public.sh
```

It fetches a real, populated feed and requires its Atom self-link to match the
public HTTPS request URL. This catches the failure mode where RSSHub otherwise
works but advertises the private plain-HTTP proxy hop. The derived image uses
the configured `RSSHUB_PUBLIC_URL` instead of accepting forwarded origin
headers from clients.

Valkey is disposable and capped at 256 MiB with `allkeys-lru`. A cache loss is
not data loss. Confirm it without revealing private routes:

```sh
docker compose exec -T valkey valkey-cli INFO memory
docker compose exec -T valkey valkey-cli DBSIZE
```

No browser-dependent RSSHub routes are supported. If a route needs cookies,
site credentials, Browserless, or Chromium, leave it unavailable rather than
adding private accounts or hidden infrastructure.

### PrivateBin

Encrypted payloads live in `data/privatebin`. The URL fragment containing the
decryption key is processed by the browser and is not sent in an HTTP request.
Do not weaken the upstream CSP. Current settings disable file uploads and
discussions, limit text to 2 MiB, and cap expiry at one week.

### Database inspection

Read-only connectivity checks:

```sh
docker compose exec -T postgres pg_isready -U postgres -d postgres
docker compose exec -T postgres psql -U postgres -Atqc \
  "SELECT datname FROM pg_database WHERE datname IN ('healthchecks','freshrss','wakapi','crabfit') ORDER BY 1"
```

Do not expose port 5432, attach a database UI to the public network, or give an
application the PostgreSQL superuser password.

## Proxy-header troubleshooting

Only the edge VM is allowed to assert client identity and scheme. The generated
Caddy blocks must overwrite—not append trust to—untrusted inbound
`X-Forwarded-For` and `X-Forwarded-Proto` values. Symptoms of bad proxy handling
include redirect loops, insecure cookies, CSRF failures, all PairDrop users
appearing as one peer, or every visitor sharing one rate-limit bucket.

Behind Cloudflare, the application fragment must forward Caddy's normalized
`{client_ip}`, not `{remote_host}` and not raw `CF-Connecting-IP`. This is safe
only after the complete edge Caddyfile trusts the current official Cloudflare
CIDRs, selects `CF-Connecting-IP` as its client-IP input, and the firewall
rejects all other public origin traffic. The canonical configuration and
verification procedure are in the repository's `docs/edge-routing.md`. Do not
reload only the site fragment without reviewing those global prerequisites.

Check privately with an explicit Host header without publishing the port:

```sh
set -a
. /opt/utilibre/.env
set +a
curl -I -H 'Host: monitor.utilibre.org' -H 'X-Forwarded-Proto: https' \
  "http://${APP_BIND_IP}:${HEALTHCHECKS_PORT}/"
```

Do not add arbitrary networks to an application's trusted-proxy setting merely
to hide a warning. Identify the exact edge peer first.

## Disk and memory incidents

- At less than 10% disk free, `healthcheck.sh` fails. Inspect PostgreSQL growth,
  ntfy attachments, PrivateBin payloads, FreshRSS cache, backups, and Docker
  logs. Do not start with `docker system prune`.
- At less than 15% `MemAvailable`, the health script fails. Use
  `docker stats --no-stream`, inspect OOM/restart state, and stop the single
  offending optional service first.
- Valkey data can be discarded by restarting Valkey; persistent service data
  cannot.
- The 4 GiB swapfile is emergency headroom, not capacity. Sustained swapping
  means the stack needs tuning or a service must be disabled.

## Backup monitoring

The backup script pings a private Healthchecks check at start/success/failure
and sends failures to a random owner-only ntfy topic. Both identifiers live in
root-only secret storage. Never put them in the public portal or a report.

Check the timer and backup age:

```sh
systemctl status utilibre-backup.timer
systemctl list-timers utilibre-backup.timer
find /opt/utilibre/data/backups -maxdepth 1 -type d -name 'daily-*' -mtime -2
```

See `BACKUP-RESTORE.md` before changing persistent data.
