# Backup and restore

`scripts/backup.sh` creates a checksummed `data/backups/daily-*` directory with:

- a custom-format dump of the FreshRSS PostgreSQL database;
- FreshRSS data and extensions;
- PrivateBin encrypted payload storage;
- Compose configuration, scripts, docs, edge references, and root-only secrets.

RSSHub and Valkey hold no durable data. The backup job keeps seven daily and
four Sunday weekly sets. Local backups are not disaster recovery; copy a tested,
encrypted copy to a separate trusted system.

Run a backup and verify its checksums:

```sh
cd /opt/utilibre
backup=$(./scripts/backup.sh)
(cd "$backup" && sha256sum -c SHA256SUMS)
```

Supported restore targets are `freshrss`, `freshrss-files`, and `privatebin`.
Always rehearse first:

```sh
./scripts/restore.sh "$backup" freshrss --rehearsal
./scripts/restore.sh "$backup" freshrss-files --rehearsal
./scripts/restore.sh "$backup" privatebin --rehearsal
```

A live restore requires an interactive terminal and an exact confirmation. It
preserves the previous database or data directory rather than silently erasing
it. Run `scripts/healthcheck.sh` after every restore.
