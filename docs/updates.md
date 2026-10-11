# Updates and rollback

Updates are deliberate, one service at a time. Production uses immutable
version/digest pins; Redlib is built from an exact source commit and pinned
base images. SearXNG has the guarded, daily updater below; other services
remain manual. Production never runs a floating `latest` tag.

## Maintenance coverage from 11 October 2026

Expansion is paused by the owner. `scripts/review-upstream-maintenance.mjs`
reads the existing catalogue, including all eleven ready creative additions,
instead of keeping a separate twelve-application list. The initial run checked
108 providers without lookup failures. This is catalogue coverage, not a count
of running or publicly usable services. Held builds remain held.

`utilibre-maintenance-review.timer` is enabled for 03:20 UTC daily plus up to
15 minutes' jitter. The read-only systemd run passed in production. It uses
Node 24, the existing authenticated GitHub CLI and Git, at most three concurrent
lookups, 25-second request deadlines, 256 MiB RAM and 25% of one CPU. It does
not install packages, pull images, execute upstream code or query visitor data.
The private report is `/var/lib/utilibre-maintenance/latest.json`; SearXNG's
installed reference is read from its guarded updater's deployment manifest.

```sh
node --test scripts/review-upstream-maintenance.test.mjs
systemctl start utilibre-maintenance-review.service
node scripts/review-upstream-maintenance.mjs --only=freshrss
node deployment/community/monitor-alerts.mjs --check-only
```

The existing five-minute monitor/SMTP workflow now flags reports older than
36 hours, missing upstream/advisory lookups, failed maintenance units and new
high/critical published advisories requiring review. It also covers the saved-
records backup unit. Alerts still require two observations and use the existing
12-hour repeat interval. A manual `--check-only` sends no mail and changes no
alert state. No new analytics or notification service was installed.

Review the report weekly and security alerts promptly. A changed default branch
is not a release recommendation. GitHub coverage is published repository
advisories, paginated up to 300 with partial results labelled; GitLab/Forgejo
advisories need primary-source review. This is not an SBOM/dependency scan or
proof that a project is secure. Keep lockfile/image security review in each
release gate. [GitHub advisory API](https://docs.github.com/en/rest/security-advisories/repository-advisories).

The new tools reuse `docs/creative-batch-2026-10-11.md` and their canonical
`reviewDocument`/exact-source fields. Rebuild only the changed application;
repeat its native synthetic import/edit/export check, browser-network review,
and source-offer check. For Grist, Candlr and Bookplate also repeat account
isolation and native restore tests in `deployment/records/`. HTTP readiness
alone does not approve a release. Preserve prior images and database-compatible
recovery snapshots before each change. No moving-tag automatic upgrade was added.

Pause this reviewer with `systemctl disable --now utilibre-maintenance-review.timer`;
it does not alter any application. The canonical check is also available through
`deployment/utilibre/scripts/update-check.sh` and `/opt/utilibre/scripts/update-check.sh`.

### FreshRSS security update

FreshRSS was updated from 1.29.1 to **1.30.1**, source
`4a810f1624b9d0b97b4400614cf9aacc8ada40e3`, official image index
`sha256:48b63b9bc3d042a1301c32971b01af8841c7f059b452589c5bf77f475ba44c61`.
The published [high-severity feed-fetch advisory](https://github.com/FreshRSS/FreshRSS/security/advisories/GHSA-fv9v-wcrw-mhg6)
affects the former version; [1.30.1](https://github.com/FreshRSS/FreshRSS/releases/tag/1.30.1)
also includes authentication/import hardening. Uptime Kuma's newly published
GHSA-wf2j-5mc7-5c4w is fixed in 2.5.4; installed 2.5.5 was retained. This review
does not dismiss Kuma's documented authenticated-monitor/network trust boundary.

The FreshRSS candidate passed an isolated native PostgreSQL/files restore,
login and fictional-article check before rollout. Native JSON/ZIP article export,
two independent account imports and reopening passed with 1.30.1. The fixture
was removed through native controls; no real account content was edited.
Evidence: `/opt/utilibre/reports/freshrss-browser-restore-m_085ovb/` and
`/opt/utilibre/reports/freshrss-articles-odriazkn/` (private recovery data).

Production retains closed registration (`max_registrations=1`), silent logging,
text-first CSP, no-referrer, and the existing refresh interval. The supported
`INTERNAL_HOST_ALLOWLIST=rsshub:1200` keeps the private integration without
allowing other internal destinations. Native resolver tests rejected loopback,
LAN, metadata IPv4, IPv6 loopback and NAT64 metadata addresses, and the wrong
RSSHub port. A native EFF Atom fetch succeeded. Login over verified private-edge
HTTPS loaded without external browser assets; this is not an independent public
network test. Authenticated export/import checks used isolated synthetic accounts.

For rollback, retain the former 1.29.1 image with digest
`ab6b363102ccdbc39f6a62db926f567c61a5289bf25ba460f1c34423d8cc1a4d`
and the pre-update native snapshot above. Do not downgrade a migrated database
blindly or overwrite newer account work. Preserve current data first, then use
the reviewed native restore workflow if schema compatibility requires it. Restore
only the FreshRSS pin and recreate only FreshRSS with its privacy overlay; never
replace the entire live Compose file. The old version has known security issues,
so prefer disabling access during repair over leaving a vulnerable rollback public.

### Reviewed disk cleanup

Root use fell from 93% (11 GiB available) to 88% (18 GiB available) after removing
eight explicitly reviewed build-dependency directories, npm's downloadable cache,
and 616 MB of unused Docker build cache older than 24 hours. Filesystem figures
are rounded observations, not sums of `du` values (dependencies share hardlinks).
`scripts/clean-reviewed-build-caches.mjs` defaults to dry-run and refuses symlink,
tracked-file and container-mount overlaps. No user data, source checkout, live
static output, image, rollback image, backup or temporary-data disk was removed.
Deleted caches must be regenerated from retained pinned manifests; they cannot
be instantly restored. The retained Graphite Sass dependency is still needed by
Vvveb's build and was deliberately left alone.

## Guarded SearXNG automation

`scripts/searxng-maintain.py` checks the official registry, resolves an immutable
image, checks source/license labels, and refuses unexpected image formats or
manual configuration/runtime drift. Run from the repository:

```sh
python3 scripts/test-searxng-maintain.py
python3 scripts/searxng-maintain.py --check
python3 scripts/searxng-maintain.py --stage --notify
python3 scripts/searxng-maintain.py --apply --notify
```

Check is the default. Stage runs a disposable loopback-only SearXNG and Valkey
project with a fresh secret/cache. It verifies actual English/Spanish browser
searches, not just `/healthz`. Apply first verifies the old deployment, tests
the candidate, saves a private configuration backup, then replaces **only**
the SearXNG container. Post-update searches use verified HTTPS through the
private Caddy edge; failure restores and re-tests the previous image.
Limiter/proxy-trust policies remain intact. No application gets Docker access.

The root `.env` gets only an immutable `SEARXNG_IMAGE` override after success.
State, configuration backups and interrupted-update journals live under
`/var/lib/utilibre-searx-updater` (private); the non-secret deployed-version
manifest is `/opt/utilibre/update-public/searxng.json`. Old images/backups are
retained. A failed rollback retains its journal; the next apply attempts safe
recovery and stops for review. Do not prune images needed for rollback.

The systemd units in `deployment/utilibre/systemd/` run daily at 02:20 UTC with
up to ten minutes' jitter. Enable only after a successful stage and notification
test. Pause with `systemctl disable --now utilibre-searx-update.timer` (this does
not interrupt an active run). Review `journalctl -u utilibre-searx-update` and
the private `last-run.json`. The verified STARTTLS relay sends updates/failures
to `admin@utilibre.org`. An outstanding update becomes urgent after five days
and overdue after seven; a newer daily release does not reset that clock.

This automation cannot guarantee the listing's uptime/freshness requirements:
registry failures, upstream regressions and failed notification delivery need
operator attention. Public-IP checks from this VM are not independent uptime
evidence; retain an external monitor. Automatic rollbacks cover this stateless
search service, **not** schema-migrating databases or other applications.

### Verified SearXNG update: 2026-10-07

The official registry's latest image at 22:16 UTC was
`docker.io/searxng/searxng:2026.10.7-6671d89be@sha256:cc026dbee25b864d7f9731957cd5ef36ba2e2d61abd2996d57f1b863483e7409`.
Its source revision is `6671d89bede8c9fc108b17bb98916170f5657650`, its image
creation time is 09:22:18 UTC, and its amd64 manifest digest is
`sha256:2a8660b510454a7f9f052e614b69c18b102a4c5c751f87076cc67cf5e14c6c44`.
The [official source comparison](https://github.com/searxng/searxng/compare/d48c4b555421e824342c51d68482dd0898e54d0f...6671d89bede8c9fc108b17bb98916170f5657650)
contains one Wikidata empty-description fix and its regression tests; it adds
no configuration migration. Source and AGPL-3.0-or-later image labels passed
the updater's checks.

`python3 scripts/searxng-maintain.py --apply` succeeded at 22:17 UTC, without
sending notifications. It checked the existing service, staged the candidate
with an isolated cache/secret, ran English and Spanish searches, verified the
configuration backup, recreated only production SearXNG, and repeated searches
through the real Caddy HTTPS route at its private address with certificate
verification. Each search contained at least three result links. The `.env`
pin and public deployment manifest were updated by the guarded workflow; the
Compose fallback and source/license records were also synchronized.

Additional checks passed: seven updater regression tests, engine/pagination
and query-redaction regressions, Compose validation, healthy container with
zero restarts, `/config` reporting the new version and 28 engines, and loaded
settings retaining native branding, HTML-only output, public limiter, and the
exact optional Reddit hostname mapping. The General preference is called
“Hostnames plugin” and starts disabled. Opting in persists in that browser's
preference cookie while a new browser remains opted out. Upstream uses a
reversed checkbox: a checked DOM input means the plugin is disabled.

Public IPv4 remains unreachable from this application VM, so these checks do
not establish independent public uptime. `/metrics` returns 404. The deployed
private edge currently serves `/stats` with HTTP 200 and an empty-data page,
despite the repository's direct-edge template denying that path. This edge
policy discrepancy predates the source change and remains for the separate
edge operator; neither limiter policy nor edge configuration was changed.

Rollback material is retained privately under
`/var/lib/utilibre-searx-updater/run-dl6sorj1/`: `rollback-config.tar.gz` and
`rollback.json`, both mode 0600. The old image remains locally available:

```text
Previous pin: docker.io/searxng/searxng:2026.10.4-d48c4b555@sha256:76b0bf285aca014c7191fc4d9234c4bfb358624ac33d8883833d496c059ec072
Previous local image ID: sha256:76b0bf285aca014c7191fc4d9234c4bfb358624ac33d8883833d496c059ec072
Previous amd64 manifest: sha256:b0497f6e93b5e98b1a15c66b333afed176266af34f479a46ed87514f4a441eda
```

If rollback is needed, restore only `SEARXNG_IMAGE` in the root `.env` to that
previous pin, then run `docker compose up -d --no-deps --pull never searxng`
and `node scripts/check-searxng-browser.mjs https://search.utilibre.org/ 10.10.1.3`.
Synchronize the Compose fallback and deployed-version/source records after a
verified rollback. Do not restore the complete `.env` archive over unrelated
changes or prune the retained image. No database migration occurred.

## Before every update

Markmap uses the pinned npm lock in `deployment/toolbox/markmap` (0.18.12-p1).
Review library/parser/sanitizer advisories, then build the static image with
`docker compose -f deployment/toolbox/compose.browser.yaml build markmap`.
Retain the old image before recreating only that service. Run
`node deployment/toolbox/check-markmap.mjs` privately, then with
`MARKMAP_TEST_URL=https://mindmap.utilibre.org` after rollout. This includes
hostile imports, export reopening and draft-removal/storage-failure regressions.
Never turn on imported scripts, frontmatter resource loading or remote images
merely to accommodate an upstream upgrade. Republish exact sources with
`node deployment/toolbox/publish-markmap-source.mjs`; no server-held user data
is involved. Detailed release/rollback evidence is in `docs/toolbox-review.md`.

1. Read official release notes, security advisories, license changes, and
   migration/rollback instructions.
2. Confirm the application still passes Utilibre's access-gap and operating
   policy; an update is also a chance to retire a service that no longer does.
3. Resolve the exact source/tag and immutable image digest.
4. Review new network calls, telemetry, account/registration defaults,
   storage, export/deletion behavior, and resource requirements.
5. Create and verify a current backup. Rehearse a restore for schema-affecting
   FreshRSS/PostgreSQL changes.
6. Record the old pin, image ID, configuration, and rollback command.
7. Test privately before changing the edge-visible deployment.

Never infer that a matching tag points to unchanged bytes. Never update a
database major version through an ordinary single-container image swap.

## Root project

The root helper accepts only retained root services:

```sh
sh scripts/update.sh portal
sh scripts/update.sh searxng
sh scripts/update.sh valkey
sh scripts/update.sh anubis
sh scripts/update.sh redlib
```

Update one service, wait for health, run bounded functional checks, inspect
logs/resource use, and only then continue. Redlib rebuilds locally; preserve
and republish the complete corresponding patched source and build material.

For SearXNG, re-review settings, engines, limiter trust, query-log redaction,
output formats, and image proxy behavior. For Anubis/Redlib, re-test challenge,
cookie, updater exceptions, redirects, media/Range behavior, and absence of a
direct Redlib port.

## Additional project

From `deployment/utilibre/`, use the read-only check first:

```sh
./scripts/update-check.sh
```

It reports upstream release information but does not pull or change anything.
After manual review, the apply helper accepts a complete official image
reference ending in `@sha256:<digest>` for supported single-service updates:

```sh
./scripts/update-apply.sh freshrss FULL_IMAGE_REFERENCE_WITH_SHA256
./scripts/update-apply.sh privatebin FULL_IMAGE_REFERENCE_WITH_SHA256
./scripts/update-apply.sh valkey FULL_IMAGE_REFERENCE_WITH_SHA256
```

RSSHub requires manual review of the internal FreshRSS integration. PostgreSQL
requires a separate database-major migration plan. Do not bypass those guards
with a search-and-replace on a live host.

## Validation after an update

At minimum:

```sh
docker compose config --quiet
sh scripts/check-health.sh
sh scripts/verify-network.sh
(cd deployment/utilibre && docker compose config --quiet && ./scripts/healthcheck.sh)
```

Then test the changed service through the real edge:

- portal: bilingual pages, config/status, 404 and method/body handling;
- SearXNG: English/Spanish search, limiter, diagnostic denials, and redaction;
- Anubis/Redlib: challenge, cookies, page/media/Range, and redirect hardening;
- FreshRSS: login, API if supported, feed refresh, internal curated feed, and
  registration remaining closed;
- PrivateBin: create, read, delete, expiry choices (maximum one week), the
  25 MB attachment limit, oversize rejection and low-space safeguard; or
- RSSHub: only approved internal routes, timeouts/cache, and no public port.

Inspect container restarts, CPU/RAM/PIDs, network I/O, database/directory size,
logs, and edge behavior. A health check alone is insufficient.

## Rollback

Rollback is service-specific:

- restore the old immutable image/source/configuration pin;
- recreate only the affected service with dependencies left intact where safe;
- restore data only when the update migrated or corrupted it; and
- validate through the same private and public checks.

The additional-stack update helper preserves a pre-update Compose copy and
runs a backup. `deployment/utilibre/scripts/rollback.sh` stops or removes
containers while deliberately preserving bind-mounted data. It is not a data
rollback.

Do not roll a PostgreSQL data directory backward by starting an older major
image against it. Use a reviewed logical backup/migration procedure. Do not
delete a failed migration's pre-update state until recovery and a new backup
are proven.

## Documentation and source obligations

In the same change, update the catalog version, privacy/security/resource
facts, exact source/digest manifest, notices, and public source offer. A stale
license notice or version card is a failed update even when the container is
healthy.
