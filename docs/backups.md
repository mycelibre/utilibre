# Backups, restore, and removal

The retained deployment has two different backup classes:

- source, configuration, and secrets needed to reproduce the portal,
  SearXNG, and Anubis/Redlib; and
- persistent user data for FreshRSS/PostgreSQL and PrivateBin.

SearXNG and RSSHub caches and both Valkey stores are re-creatable. Do not treat
them as user-data backups.

## What must be protected

| State | Backup requirement | Consequence if lost |
| --- | --- | --- |
| Git revision, Compose files, reviewed configuration, and manifests | Preserve exact deployed revision or archive | Deployment cannot be reproduced reliably |
| Root `.env`, SearXNG secret, and generated limiter | Encrypted operator-controlled backup | Public configuration and limiter may need regeneration |
| Anubis signing key | Encrypted backup with restrictive access | Existing challenge authorization cookies become invalid |
| Anubis bbolt data | Optional operational backup | Challenge state resets; not user content |
| FreshRSS files/extensions | Required | Configuration/extensions and file-held application state can be lost |
| FreshRSS PostgreSQL database | Required logical dump | Accounts, subscriptions, and reading state can be lost |
| PrivateBin data | Required while unexpired pastes are promised | Ciphertext and deletion/expiry metadata can be lost |

Backups contain sensitive account data, subscription URLs, ciphertext, and
secrets. Encrypt them, restrict operator access, keep them outside live data
directories, and never commit them.

## Root configuration backup

From the repository root:

```sh
sh scripts/backup.sh /operator/controlled/backup-directory
```

The script archives source and nonsecret configuration and intentionally
excludes `.env`, secrets, generated/runtime files, node modules, and
re-creatable SearXNG/Valkey state. Back up `.env`, `secrets/`, and
`data/anubis/` separately in an encrypted store.

Verify that the archive can be listed and that the exact deployed Git revision
is independently recoverable.

## Additional application backup

From `deployment/utilibre/` with healthy PostgreSQL:

```sh
./scripts/backup.sh
```

The script:

- takes a custom-format `pg_dump` of the FreshRSS database;
- archives deployment configuration, FreshRSS files, and PrivateBin data;
- writes checksums before making the backup directory visible as complete;
- refuses concurrent runs; and
- retains the scripted daily/weekly generations.

The built-in retention is an operational default, not a public promise. Copy
completed backups to an encrypted failure domain outside the application VM
and document the actual retention before account requests open.

Read `backup.log` and verify `SHA256SUMS`. A successful exit is not enough if
the copy off-host failed or no restore has ever been rehearsed.

## Restore rehearsal

Use only a complete backup directory. The restore helper verifies checksums
and supports isolated rehearsals:

```sh
cd deployment/utilibre
./scripts/restore.sh /absolute/path/to/backup freshrss --rehearsal
./scripts/restore.sh /absolute/path/to/backup freshrss-files --rehearsal
./scripts/restore.sh /absolute/path/to/backup privatebin --rehearsal
```

Database rehearsal creates a temporary database and removes it afterward.
File rehearsal extracts into a temporary directory. Inspect results and logs;
run rehearsals on a schedule, after schema-affecting updates, and before
claiming that recovery works.

## Live restore

A live restore changes user-visible state and requires an interactive
confirmation:

```sh
cd deployment/utilibre
./scripts/restore.sh /absolute/path/to/backup freshrss --live
./scripts/restore.sh /absolute/path/to/backup freshrss-files --live
./scripts/restore.sh /absolute/path/to/backup privatebin --live
```

Restore the FreshRSS database and files from the same backup generation. Stop
public traffic or place the relevant route in maintenance before beginning.
The helper preserves pre-restore state for manual rollback; do not delete that
copy until the application, account access, counts, permissions, and current
backup all pass verification.

Never restore production data into an Internet-reachable rehearsal service.

## User export and deletion

Before request-based FreshRSS accounts open, document and test the supported
per-user export and deletion paths. Verify that deletion removes the live
account's database and application data without affecting another user.
Explain that older backup generations expire on the published backup schedule
rather than being rewritten immediately.

For PrivateBin, normal expiry and a valid deletion action remove the live
record. Operators cannot promise immediate deletion from older backups. Abuse
reports must identify a paste without publishing sensitive full URLs in a
public issue.

## Whole-service retirement

For a planned persistent-service retirement:

1. stop accepting new accounts or records;
2. announce the date and available export method where circumstances permit;
3. remove the public route and catalog launch at the announced time;
4. take and verify the final required export/backup;
5. stop and remove only the named service containers/networks;
6. preserve data until the stated recovery window ends; and
7. erase the exact data, backup, secret, and configuration targets under a
   documented decision.

`deployment/utilibre/scripts/rollback.sh --remove-containers` preserves bind-
mounted data by design. It does not purge user data. Never use a broad
recursive delete, wildcard, workspace root, home directory, or global Docker
prune as a service-removal shortcut.

## Restore acceptance

A restore is complete only after:

- checksums and archive structure pass;
- expected FreshRSS accounts/subscriptions and application files are present;
- login and one controlled feed refresh work;
- PrivateBin test ciphertext can be retrieved and decrypted with its browser
  key, then deleted;
- internal RSSHub and both private data stores remain unexposed;
- logs show no migration/permission loop; and
- a new post-restore backup completes successfully.
