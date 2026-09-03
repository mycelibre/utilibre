# Backup and restore

## Scope and limitations

Backups are written under `/opt/utilibre/data/backups` with root-only
permissions. They protect against an application mistake or a bad update, but
they remain on the same disk and VM as production. They are **not disaster
recovery**. Copy successful archives to a separate trusted system using
authenticated encryption and test that independent copy.

The backup job intentionally excludes Docker images, the disposable RSSHub
Valkey cache, browser caches, build caches, and temporary test data.

## Backup contents

Each `daily-YYYYMMDD-HHMMSS/` directory contains:

- separate PostgreSQL custom-format dumps for `healthchecks`, `freshrss`,
  `wakapi`, and the currently unused `crabfit` database;
- ntfy configuration in the configuration archive; its 12-hour message cache
  and three-hour attachment cache are deliberately excluded rather than
  extending their retention;
- FreshRSS data and extension directories;
- PrivateBin encrypted payload storage;
- Compose, non-secret template, root-only `.env`, documentation,
  configuration, scripts, system and systemd source files, edge/catalog
  artifacts, and the root-only secrets directory;
- `SHA256SUMS` covering every dump/archive;
- a timestamped `backup.log`.

Because the configuration archive includes `.env` and owner credentials, the
entire backup is sensitive even though PrivateBin payloads are encrypted.

The script uses `flock` to reject overlapping runs, writes into a uniquely named
incomplete directory, creates PostgreSQL-consistent logical dumps, verifies
completion before renaming, and removes only its own incomplete directory on
failure. Failed logs are retained separately as root-only
`failed-YYYYMMDD-HHMMSS.log` files. The local policy keeps the newest seven
daily backups and four Sunday weekly hard-link snapshots.

## Scheduled backup

The intended systemd units are:

```text
utilibre-backup.service
utilibre-backup.timer
```

Confirm installation and schedule rather than assuming they are active:

```sh
systemctl cat utilibre-backup.service
systemctl cat utilibre-backup.timer
systemctl is-enabled utilibre-backup.timer
systemctl list-timers utilibre-backup.timer
```

The nightly job reports start/success/failure to a private Healthchecks path.
On failure it also publishes a terse alert to an unguessable owner-only ntfy
topic. Those bearer identifiers are stored only in root-protected files.

## Manual backup

```sh
cd /opt/utilibre
umask 077
./scripts/backup.sh
```

The final line is the new backup directory. Validate it:

```sh
backup=/opt/utilibre/data/backups/daily-YYYYMMDD-HHMMSS
(cd "$backup" && sha256sum -c SHA256SUMS)
find "$backup" -maxdepth 2 -type f -printf '%M %u:%g %p\n'
```

Never send the command output if it includes inventory you do not intend to
disclose. Review backup failures in the corresponding root-only failed log and
the systemd journal:

```sh
journalctl -u utilibre-backup.service --since today
```

## Non-destructive restore rehearsal

In rehearsal mode, `restore.sh` verifies all checksums, restores a selected
database into a uniquely named temporary database (or extracts a file archive
under `/tmp`), validates it, and removes the rehearsal copy. It never
overwrites live data.

```sh
cd /opt/utilibre
backup=/opt/utilibre/data/backups/daily-YYYYMMDD-HHMMSS
./scripts/restore.sh "$backup" healthchecks --rehearsal
./scripts/restore.sh "$backup" freshrss --rehearsal
./scripts/restore.sh "$backup" wakapi --rehearsal
./scripts/restore.sh "$backup" privatebin --rehearsal
./scripts/restore.sh "$backup" freshrss-files --rehearsal
```

The unused `crabfit` database can also be rehearsed. A rehearsal pass proves
that the archive is structurally restorable; it is not an application-level
functional test.

## Scripted live restore

The script also supports one explicitly selected live target. It validates the
complete checksum set, requires an interactive terminal, and requires the exact
confirmation phrase `RESTORE TARGET`:

```sh
cd /opt/utilibre
./scripts/restore.sh data/backups/daily-YYYYMMDD-HHMMSS healthchecks --live
./scripts/restore.sh data/backups/daily-YYYYMMDD-HHMMSS privatebin --live
```

Database restores stop only the dependent application, rename its current
database to a timestamped recovery name, create and restore the replacement,
and start that application again. File restores similarly retain the old data
directory with a `.pre-restore-TIMESTAMP` suffix. The script never deletes
these rollback copies. Inspect service health before removing one during a
later, separate maintenance action.

Supported targets are `healthchecks`, `freshrss`, `wakapi`, `crabfit`,
`privatebin`, and `freshrss-files`. Configuration and secrets remain a
manual recovery operation because restoring them can affect every service at
once.

ntfy has no data restore target. Its messages and attachments are expiring
caches, not durable service records. After loss or replacement, ntfy starts
with an empty cache and clients cannot replay notifications that were cached
before the event.

## Manual PostgreSQL restore fallback

Use this lower-level fallback only when the scripted restore cannot be used.
Selecting the wrong database is destructive. The following pattern preserves
the current database under a timestamped name rather than dropping it. Replace
`healthchecks` consistently with exactly one of `freshrss` or `wakapi` when
restoring another app.

1. Confirm the backup and run the rehearsal:

   ```sh
   cd /opt/utilibre
   backup=/opt/utilibre/data/backups/daily-YYYYMMDD-HHMMSS
   (cd "$backup" && sha256sum -c SHA256SUMS)
   ./scripts/restore.sh "$backup" healthchecks --rehearsal
   ./scripts/backup.sh
   ```

2. Stop only the dependent application and create a new restore database:

   ```sh
   docker compose stop healthchecks
   stamp=$(date -u +%Y%m%d%H%M%S)
   restore_db="healthchecks_restore_$stamp"
   docker compose exec -T postgres createdb -U postgres -O healthchecks "$restore_db"
   docker compose exec -T postgres pg_restore -U postgres --no-owner \
     -d "$restore_db" < "$backup/postgres/healthchecks.dump"
   ```

3. Inspect the restored schema. Then, only after independently confirming the
   names, disconnect clients and swap database names while preserving the old
   database:

   ```sh
   old_db="healthchecks_before_$stamp"
   docker compose exec -T postgres psql -U postgres -d postgres \
     -v ON_ERROR_STOP=1 -v old_db="$old_db" -v restore_db="$restore_db" <<'SQL'
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'healthchecks' AND pid <> pg_backend_pid();
ALTER DATABASE healthchecks RENAME TO :"old_db";
ALTER DATABASE :"restore_db" RENAME TO healthchecks;
SQL
   ```

4. Start only the application and perform its functional test:

   ```sh
   docker compose up -d healthchecks
   docker compose ps healthchecks
   docker compose logs --tail=100 healthchecks
   ```

5. Keep the old database until validation and another backup have succeeded.
   Its removal is a separate explicit maintenance decision.

If any identifier differs from the exact expected pattern, stop. Do not adapt
this procedure to an unidentified database.

## Manual file-data restore fallback

Perform this only after checksum validation, a successful rehearsal, and a new
backup. Stop the one service. Rename its current directory to a timestamped
recovery path—do not delete it—then extract the archive from the backup root.

PrivateBin example:

```sh
cd /opt/utilibre
backup=/opt/utilibre/data/backups/daily-YYYYMMDD-HHMMSS
(cd "$backup" && sha256sum -c SHA256SUMS)
./scripts/restore.sh "$backup" privatebin --rehearsal
./scripts/backup.sh
docker compose stop privatebin
stamp=$(date -u +%Y%m%d%H%M%S)
mv data/privatebin "data/privatebin.before-$stamp"
tar -C data -xzf "$backup/files/privatebin-data.tar.gz"
chown -R 65534:82 data/privatebin
docker compose up -d privatebin
```

Use the same preserve-and-extract pattern for `freshrss-data.tar.gz`, applying
its documented owner. ntfy message and attachment caches are intentionally not
restored. Verify application behavior before removing any preserved file or
directory.

## Configuration and credential recovery

Extract `configuration.tar.gz` only into a temporary root-only directory first:

```sh
umask 077
work=$(mktemp -d /tmp/utilibre-config-restore.XXXXXX)
tar -C "$work" -xzf "$backup/files/configuration.tar.gz"
```

Compare individual files and install only the intended one. Never extract it
blindly over `/opt/utilibre`, and never expose the extracted `.env` or
credentials. Securely remove the temporary copy after use according to the
storage medium's limitations.

## Recovery checks

After any live restore:

```sh
cd /opt/utilibre
docker compose ps
./scripts/healthcheck.sh
./scripts/status.sh
./scripts/backup.sh
```

Also run the restored application's core functional flow, check ownership and
restart counts, and verify Cobalt/SearXNG remain identical to their independent
baseline.
