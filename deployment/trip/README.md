# TRIP restricted installation

The native production application is installed with durable bounded storage,
closed OIDC access and daily private backups. Public HTTPS and native desktop
and mobile sign-in/rendering passed on 9 October 2026 with `1.50.1-p2`.
The gateway binds `127.0.0.1:3224` for local verification and
`10.10.1.43:3224` for the existing Caddy edge only (`10.10.1.3`). Public access
does not open registration or remove the existing service-membership gates.

## Exact software and narrow changes

Upstream is [TRIP](https://github.com/itskovacs/trip), release `1.50.1`, revision
`856b1edfe81a735fce4b544c2e16a6518cebf164`, MIT. The Dockerfile pins the reviewed
amd64 upstream image. `restricted.patch` contains instance configuration/security
changes; `dependencies.patch` separately locks compatible Angular 21.2.24 and
Pillow 12.3.0 security updates. `rendering.patch` disables Angular's inline
critical-CSS loader through its supported build setting, keeping the existing
CSP, and handles the native absent-share metadata response without throwing an
application exception. Python binary wheels are checked against
`runtime-wheels.txt`. The existing reviewed Squid 7.7 image is reused as an image
only; TRIP has separate proxy containers, networks and firewall rules.

Clone upstream into a clean dedicated checkout, select that exact revision,
run `python3 prepare.py /path/to/checkout`, then
`./build.sh /path/to/checkout`. The build uses a pinned Node image, `npm ci`, the
reviewed lock, hash-checked Python wheels and an offline final image build.
Builders have CPU/RAM limits and are not runtime services. Remove the instance
patch when upstream has equivalent provider/egress controls, ownership checks
and safe native rendering; remove dependency overrides once the selected
upstream lock contains the reviewed fixes. Remove the rendering patch when the
selected upstream build works under this CSP and handles unshared-trip metadata
normally. Repeat the visual and cached-app update checks before removing it.
Recheck before removing a boundary.

## Storage, identity and startup

`/opt/utilibre/trip/state.ext4` is a **1 GiB** dedicated filesystem mounted at
`/opt/utilibre/trip/data`, with nodev/nosuid/noexec. The image must be created only
at a new path and mounted over an empty directory. Never replace it to rerun an
initialization command. The mount unit survives reboots and is required by the
application unit. This bounds all active application data and native user
backups together; it is not an enforced per-user quota.

Before any identity mutation, take a consistent private Authentik PostgreSQL
backup and coordinate with identity maintainers. `configure-oidc.py` creates the
separate native `trip` application/provider with **all three** gates: approved
membership, verified email, and the service-specific `utilibre-trip-members`
group. It does not change global policies or existing users. Runtime credentials
live in `/opt/utilibre/trip/private/runtime.env`, mode 0600, never in source.
The native callback is `https://trip.utilibre.org/auth`.

Before first startup, `seed-admin.py` runs native migrations and creates an
internal bootstrap administrator. It refuses any installation with an existing
account and prints no password. Run it in a disconnected container with only the
new data directory mounted. It prevents TRIP from making the first admitted OIDC
user an administrator. Operator administration uses native models/API; never
promote all OIDC users or add a new authentication layer.

`utilibre-trip.service` runs `start-boundary.sh` before starting the supervised
Compose stack. Host and namespace firewall rules are restored before accepting
requests. The gateway also restricts ingress, and startup fails closed. Container
restart policies are off; the systemd unit restarts the whole scoped stack and
reinstalls boundaries if any member exits. Do not use a standalone container
restart policy, which could recreate a namespace without its firewall rules.

`Caddyfile.pending` records the separately managed edge block. The public route
now serves the native app through Cloudflare and Caddy; actual public native
MFA/OIDC and rendering checks passed. Real members still require deliberate
operator provisioning through the existing service group.

## Backup and recovery

The enabled timer runs `backup.py` daily at 04:10 UTC with up to 20 minutes of
spread. It checks the existing 5 GiB host free-space floor **plus** a snapshot
estimate, stops only this service for consistency, archives its data and private
runtime configuration, writes a SHA-256 manifest, then restarts it through the
firewall-aware unit. Backups are mode 0600 under `/opt/utilibre/trip/backups`.
There is no automatic pruning or off-host copy. A host loss can affect both the
application and these backups. Do not call native user ZIPs full server backups:
they intentionally omit unrelated users and several sharing/account details.

For recovery, verify the saved hash, stop this service, preserve the current
state separately, and restore the selected archive into an empty bounded
filesystem. Restore the private configuration separately with mode 0600, verify
ownership (application uid/gid 1000), and start through the service unit. Do not
extract over populated real state without the project's existing recovery
approval. `check-operator-recovery.py` demonstrates extraction and native serving
in a disconnected disposable container using a marked fictional snapshot.

## Verification and cleanup

Evidence is in `docs/trip-review-2026-10-09.md` and private operational reports.
The later `docs/trip-rendering-2026-10-09.md` records the public desktop/mobile
regression, narrow fix, real tile view and native service-worker update check.
The native scripts cover MFA/OIDC, two-user isolation, sharing/revocation, PDF
limits, ZIP scope/import, ownership/rendering regressions, egress, rate limits,
recovery and deletion. They use only distinct synthetic identities. Scripts
with fixture state are not designed for repeated execution on a populated real
account. `check-providers.py` sends two fictional external requests; it must not
become a recurring probe or load test. The separate approved public-landmark
route check was one request, not a load benchmark.

`identity-qa.py` supports explicit `prepare` and `retire` actions, scoped to its
named synthetic identities; retirement disables them and revokes sessions,
tokens, MFA devices and memberships. The old disposable pilot's reports remain
dated evidence, but `compose.pilot.yaml` is historical, not the active service.
Its 256 MiB tmpfs was only for fictional work and is not the production volume.
The private upstream-report draft has not been sent or included in public source.

`check-layout.mjs` uses the separately named rendering fixtures prepared with
`UTILIBRE_TRIP_QA_RUN=render`. It permits one bounded real map view only when its
report does not already exist; subsequent views use fixture tiles. Do not turn
it into a recurring external map probe. `check-render-cleanup.py` deletes only
those two native fixture accounts and verifies only their exact owned records;
then retire their identity fixtures. `check-worker-update.mjs` uses retained p1
and p2 assets at a disposable loopback origin. A normal reload downloads the
native worker update, and closing/reopening the tab applies it while preserving
saved preferences. Do not clear users' storage or unregister their worker.

For rollback, stop only `utilibre-trip.service` and its backup timer. Preserve the
data filesystem, private configuration and backups. Remove this service's public
edge block if withdrawing public access. For a rendering-only rollback, preserve
current state and select the retained p1 image in the scoped compose file, then
restart through the firewall-aware service unit; this restores the known p1
styling defect. The pre-p2 source archive/manifest and configuration are preserved
in the private rendering report's rollback directory. Never flush shared
firewall tables, alter unrelated identity policies or prune other services.
