# Updates and rollback

Updates are deliberate, one service at a time. Production uses immutable
version/digest pins; Redlib is built from an exact source commit and pinned
base images. SearXNG has the guarded, daily updater below; other services
remain manual. Production never runs a floating `latest` tag.

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
- PrivateBin: create, read, delete, expiry choices, size rejection, and no file
  upload; or
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
