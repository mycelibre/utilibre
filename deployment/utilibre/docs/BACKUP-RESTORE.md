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

The core helpers require `scripts/check-backup-input.py` (Python standard
library only). Snapshot directories, files and their ancestors must belong to
root/the executing operator and must not be group/other writable. Symlinked
inputs are rejected. Root-owned sticky ancestors such as `/tmp` are allowed
when the actual snapshot is private. Copy an off-host snapshot into a protected
operator-owned directory before using it; do not relax permissions to bypass
this check. This establishes who controls the input, not whether an arbitrary
third-party archive is safe. Use only trusted native backups.

Both helpers ignore inherited `TAR_OPTIONS`; extended ACL handling stays
disabled explicitly. Native Unix modes/ownership are still preserved. Restores
use umask `077` and private staging directories. Checksums detect changed backup
bytes, not the authenticity of an untrusted archive. No ACL vulnerability is
claimed fixed by these precautions.

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
owned by UID 65534/GID 82 **on the mounted, backup-excluded disk** at
`/opt/utilibre/temporary/privatebin`. Follow `docs/PRIVATEBIN-STORAGE.md` to
recreate the mount and its non-secret volume marker first. The archived
`system/privatebin-temporary.fstab` records the mount; a replacement disk needs
its own UUID. Neither the disk nor user pastes are restored from the archive.
Never replace a running data directory during a
routine update. The former `privatebin` content-restore target now fails closed
to avoid resurrecting expired records. Run
`node deployment/utilibre/tests/check-privatebin-restore.mjs` from the repository
for an isolated configuration recovery and new-paste test. It does not copy
live pastes or prune old snapshots.
