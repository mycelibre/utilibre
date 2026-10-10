# Backup and restore

`scripts/backup.sh` creates a checksummed `data/backups/daily-*` directory with:

- a custom-format dump of the FreshRSS PostgreSQL database;
- FreshRSS data and extensions;
- PrivateBin configuration only, never its temporary encrypted payload storage;
- Compose configuration, scripts, docs, edge references, and root-only secrets.

RSSHub and Valkey hold no durable data. The backup job keeps seven daily and
four Sunday weekly sets. Local backups are not disaster recovery; copy a tested,
encrypted copy to a separate trusted system.

Owner policy confirmed 10 October 2026: retain saved account work, but exclude
short-lived sharing content from new application backups. Historical copies are
not rewritten. External whole-VM snapshots require exclusions at their own
backup layer before claiming they contain no temporary data.

Run a backup and verify its checksums:

```sh
cd /opt/utilibre
backup=$(./scripts/backup.sh)
(cd "$backup" && sha256sum -c SHA256SUMS)
```

For a manual check without expiring any old local generations, use
`./scripts/backup.sh --no-prune`. Scheduled generation retention is unchanged.

Supported content restore targets are `freshrss` and `freshrss-files`.
Always rehearse first:

```sh
./scripts/restore.sh "$backup" freshrss --rehearsal
./scripts/restore.sh "$backup" freshrss-files --rehearsal
```

A live restore requires an interactive terminal and an exact confirmation. It
preserves the previous database or data directory rather than silently erasing
it. Run `scripts/healthcheck.sh` after every restore.

PrivateBin recovery restores the pinned application and `config/privatebin`
from the configuration archive into a deployment with an empty data directory
owned by UID 65534/GID 82. Never replace a running data directory during a
routine update. The former `privatebin` content-restore target now fails closed
to avoid resurrecting expired records. Run
`node deployment/utilibre/tests/check-privatebin-restore.mjs` from the repository
for an isolated configuration recovery and new-paste test. It does not copy
live pastes or prune old snapshots.
