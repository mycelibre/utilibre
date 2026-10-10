# Reactive Resume visitor-statistics correction — 8 October 2026

Reactive Resume 6.0.0-p1 is deployed. Public résumé view/download analytics,
analytics-specific visitor identifiers and deduplication, and browser download
events are disabled. Native account access, editing, sharing and exports remain
available. Historical real records were neither inspected nor deleted.

## Evidence and precise conflict

The original live image was
`ghcr.io/reactive-resume/reactive-resume:v6.0.0@sha256:29f418bd46d23f1d7cd9a73ec7f6bc46681926cb1ff617ac388064f45ee790d0`,
matching source revision `bc71f636c02a80ac6d731e17d2ee13501275295c`.
This was established from the actual container and its compiled server files,
not from upstream defaults or private résumé records.

- `packages/api/src/features/resume/service.ts` recorded non-owner public views
  while retrieving a résumé and recorded download events through a separate
  native endpoint. Both used `shouldCountForStatistics` in `access-policy.ts`.
- `view-dedup.ts` used an analytics key based on résumé and trusted-client
  information with a one-hour counting window. Redis was not configured, so the
  selected implementation used a process-local map. This was not daily
  fingerprint deduplication; daily totals were separate PostgreSQL records.
- `resume_statistics` held totals and last-view/download timestamps;
  `resume_statistics_daily` held per-day aggregates. The installed environment
  schema and startup wrapper exposed no statistics-disable option.
- Browser `use-resume-export.ts` sent a download-statistics request. The share
  sheet displayed the resulting totals. Owner self-views were excluded, but
  that did not satisfy Utilibre's prohibition on visitor analytics.

## Narrow correction and reproduction

[`resume-no-tracking-source.patch`](../deployment/expanded/resume-no-tracking-source.patch)
changes three native source files: the shared counting predicate returns false
before visitor-key construction or deduplication, the browser download event is
removed, and the owner statistics widget is removed. Authentication and rate
limiting continue independently. The legacy download-event endpoint still
checks access and accepts compatible callers, but cannot increment statistics.

[`Dockerfile.resume`](../deployment/expanded/Dockerfile.resume) extends the exact
upstream image. Its preparation script requires the SHA256 of every edited
compiled artifact and of the shared service containing both write paths, then
asserts each replacement. Browser JavaScript/CSS URLs and their local references
are versioned so a cached old download handler is not presented as the current
build. There are no new application routes, databases or export services.

Build with:

```sh
docker build --network=none -f deployment/expanded/Dockerfile.resume \
  -t utilibre-resume:6.0.0-p1 deployment/expanded
node deployment/expanded/check-resume-no-tracking.mjs
```

The complete pinned native source, readable patch, lockfile and build/check
recipes are published in
[the corresponding source archive](https://tools.utilibre.org/utilibre-source/reactive-resume-utilibre.tar.gz).
Remove the patch only when a verified upstream opt-out stops identifier/dedup
processing as well as storage and browser events. The removal condition is in
the existing source-patch manifest.

## Verification and recovery

- An isolated native instance used a fresh temporary PostgreSQL database and
  fictional account. Tripwires before analytics identifier construction and
  inside deduplication were never reached. Both counter tables remained empty
  after repeated public reads, a PDF download and a direct legacy download-event
  request. Native owner JSON export and sharing-off access denial passed.
- Public HTTPS repeated the owner/public/PDF/JSON/sharing checks using only the
  existing, explicitly marked synthetic QA identity. No browser statistics
  requests were sent. Both statistics tables had zero rows for that newly
  created fictional résumé. Each test résumé was deleted through native
  trash/purge controls; the QA identity/account was disabled again and its
  sessions, tokens and temporary MFA were revoked.
- The existing backup/restore helpers gained an optional `--resume-only` scope.
  The pre-change snapshot was checksum-verified and restored into a disposable
  networkless PostgreSQL container: 29 tables restored successfully. The helper
  still uses the original full-stack behavior when that option is omitted.
- The production change recreated only Resume. Its command, CPU/memory/PID
  limits, read-only filesystem and logging setting stayed unchanged. Database
  schema was identical before and after. Public health/sign-in returned 200.
- All 25 persistent source patches applied and reversed against their pinned
  source trees. Temporary test containers/networks were removed.

The snapshot is `/opt/utilibre/expanded-backups/2026-10-08T23-47-04-477Z`.
It remains a private backup on this VM, not protection against losing that VM
or physical server. Roll back only the Resume image to the pinned upstream
digest above and recreate that service; no database migration was introduced,
so a routine image rollback does not require restoring or overwriting user data.
A rollback would also re-enable the upstream visitor-statistics behavior and
must be treated as a privacy regression, not a completed correction.

Existing aggregate statistics, if present, can remain in live state and older
backups. Their contents were not inspected and they were not erased to make
the current policy true. Expanded-service backups still have no automatic
deletion policy. Evidence reports and temporary QA lifecycle records remain in
the root-restricted operational report directory, not public source archives.
