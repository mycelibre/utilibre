# Backups, restore, and removal

## Current recovery matrix — October 9, 2026

The application snapshots inspected here are on this VM. On October 9, the
owner identified an existing Storage Box and confirmed that the VM has already
been backed up. This is **owner-confirmed backup completion**, not an independently
inspected off-host copy or successful whole-VM restore. Its destination, included
disks, recovery keys and restore procedure have not been inspected from this VM.
No duplicate full-VM backup, new destination, retention change or external
account was provisioned. Keep independent application exports; an on-VM snapshot
and its on-VM decryption key alone cannot survive losing the VM.

| Important state | Completed snapshot tested | Recovery demonstrated | Limit |
| --- | --- | --- | --- |
| Authentik identity/accounts | October 8, 04:42 UTC; 4.1 MiB | Native PostgreSQL restore in a disposable networkless container; owner record and archive checks | Restored browser SSO and whole-host recovery not rehearsed |
| CV / Penpot / Actual / Wakapi | October 8, 04:43 UTC; 340 KiB | CV/Penpot native PostgreSQL restore; Actual account and Wakapi SQLite integrity | Asset archive checks are not a complete restored editing/export workflow |
| Rallly / Pollaris / FMD / Kuma / Mumble; onion identity | October 8, 04:14 UTC; 77 MiB | Rallly/Pollaris native PostgreSQL restore; three SQLite backups checked; private/onion archive structure verified | No restored Android, voice or full SSO workflow; native key files are sensitive |
| CryptPad / LiberaForms / Galene / TURN | October 8, 19:33 UTC encrypted snapshot (plus 19:11 browser-copy check) | Native Forms database login and authorized encrypted answer; restored CryptPad decrypts the collaborative fixture; Galene moderator verifier, room limits, TURN shared credential, TLS hostname/key pair and renewal config match | CryptPad test covers one document/browser state, not every office format; no live state overwritten |
| FreshRSS | October 9, 12:33 UTC | Native PostgreSQL custom dump and matching files restored to a separate network-isolated database/app; browser login, fictional feed and article listing passed | One disposable account/article; external feed retrieval and whole-host recovery not tested |
| PrivateBin | October 8, 19:24 UTC | Fresh normal backup restored into a separate native container; original fragment key decrypts the fictional paste; no-key browser does not display plaintext | On-host synthetic-paste test only |
| Wallabag | October 9, 19:28 UTC synthetic encrypted SQLite snapshot; fresh pack generation at 19:32 UTC after fixture removal | Native password + MFA login, private article read and JSON export from an independently decrypted copy in a networkless container; later pack copy integrity/account table passed | Public TLS route still pending; local recovery only, not an off-host or real-device claim |

Wallabag's new `snapshot.php` uses native SQLite `VACUUM INTO` and streams the
consistent copy into the existing authenticated pack encryption. The daily pack
job now includes `wallabag.sqlite.cms`; its private-config archive already covers
the new owner credential and application secret. The completed
`2026-10-09T19-32-34-241Z` pack generation passed all five checksums, archive
authentication, native Forms recovery and restored meeting/TURN configuration
checks. Wallabag's generic check validates database integrity and an account
record; its separately dated synthetic native-login/read/export restore is the
stronger functional evidence. It does not silently retest every app workflow.
No previous retention rule changed. Old encrypted Wallabag generations can
retain deleted articles until an approved backup-retirement policy removes them.

### Latest encrypted generation recheck — October 9

`deployment/pack/verify-backup.mjs` passed against the complete
`2026-10-09T05-16-42-673Z` generation. All four checksums and authenticated archive
decryptions passed. The native Forms app logged into a **temporary restored
database on the existing database service**, accessed the authorized form and
verified its encrypted fictional answer. This is not a separately isolated
database server. The temporary database and extracted private files were removed;
no live table or datastore was overwritten.

The check also recovered root configuration/secrets, CryptPad's four storage
trees, the Galene moderator verifier/room limits, matching TURN identity and TLS
key pair, and certificate-renewal configuration without printing secret values.
This run does not re-establish browser document decryption, a whole-VM restore,
or recovery of configuration changed after this morning's snapshot. The prior
isolated CryptPad browser result in the matrix remains separately dated.
All four installed backup service units reported their last run successful
(`Result=success`, `ExecMainStatus=0`). No retention policy was changed.

PrivateBin's measured create → backup → restored-browser decryption sequence took
**2.6 seconds** on this already-provisioned VM with a 468 KiB core snapshot. This
is not an outage recovery-time promise: it excludes obtaining another machine,
restoring infrastructure, provider access and operator response. No full-host
RTO has been measured. The much larger community snapshot and growing user data
must not be extrapolated from this tiny fixture.

Private reports and command output are retained under
`/opt/utilibre/reports/readiness-20261008/`. Failed exploratory checks remain in
that private audit history only where retained; successful checks and their
scope above determine the recovery claim. All temporary restore containers,
networks and live PrivateBin fixtures were removed.

### Coverage, timing and retention

- `utilibre-backup.timer`: core FreshRSS/PrivateBin/configuration, around 08:15
  UTC with timer jitter. The native policy keeps seven daily **generations** and
  four Sunday weekly generations; manual backups also consume generation slots.
- `utilibre-community-backup.timer`: community state, around 04:10 UTC.
- `utilibre-account-backup.timer`: identity and expanded accounts, around 04:40
  UTC. It restarts previously running services after consistent snapshots and
  runs native restore checks. This can briefly interrupt account services.
- `utilibre-pack-backup.timer`: CryptPad/Forms/meeting state, around 05:15 UTC.
  Pack archives use OpenSSL CMS authenticated AES-256-GCM encryption, with the
  key outside the snapshot but on the same VM. CryptPad is briefly paused for
  its file snapshot. The private archive now also includes root portal `.env`,
  `secrets/`, `config/`, Compose, TURN identity/certificates and Let's Encrypt
  renewal state. No secret is copied into the public source bundle.
- Identity, expanded, community and core snapshots are root-restricted plaintext
  archives/dumps. Do not describe them as encrypted simply because they are
  private directories. No automatic deletion is enabled for the newer account,
  community or pack sets; monitor disk growth. Pack/account jobs refuse low-disk
  work below their configured 5 GiB floor.

Daily successful scheduling gives a nominal recovery-point interval of about
24 hours plus jitter. Failures, disk exhaustion or a missing snapshot extend
possible data loss; verify the latest completed generation and timer status.
It is not a promise to recover every edit since the last successful snapshot.

WBO boards, ntfy notifications, Yopass secrets, search caches, limiter counters
and transient challenge records are not durable document backups. WBO and
browser-only tools require user exports. Keep Anubis's stable signing key in the
encrypted root-secret backup; transient bbolt challenges can be regenerated.
Native expiry/deletion does not rewrite old backups or recipient copies.

### Repeat a bounded rehearsal

Run from `/home/ubuntu/freetools`, one job at a time, using exact complete
snapshot paths. These helpers restore only into disposable targets; the pack
Forms check uses a new temporary database within the existing database service,
not a separate isolated server:

```sh
node deployment/identity/verify-backup.mjs /opt/utilibre/identity-backups/EXACT-SNAPSHOT
node deployment/expanded/verify-backup.mjs /opt/utilibre/expanded-backups/EXACT-SNAPSHOT
node deployment/community/verify-backup.mjs /opt/utilibre/community-backups/EXACT-SNAPSHOT
node deployment/pack/verify-backup.mjs /opt/utilibre/pack-backups/EXACT-SNAPSHOT
node deployment/pack/check-restored-pad.mjs /opt/utilibre/pack-backups/EXACT-SNAPSHOT
/opt/utilibre/scripts/restore.sh /opt/utilibre/data/backups/daily-EXACT-SNAPSHOT freshrss --rehearsal
```

`node deployment/utilibre/tests/check-privatebin-restore.mjs` creates one
fictional paste and a new normal core backup, then starts a clone on an internal
Docker network with a loopback-only bridge. It verifies decryption and removes
its live fixture, bridge, network and container. Its normal backup remains under
the existing retention policy; it never restores over live paste data.

### Recovery order and acceptance

1. Recover the exact source/build recipes, private configuration, numeric UIDs,
   mounts, secrets, certificates and firewall rules. Obtain the pack decryption
   key separately. Never regenerate keys over existing state.
2. Restore identity PostgreSQL and native account databases/files from matching
   generations before dependent applications. Restore CryptPad's blob, block,
   data and datastore together; restore Forms' database/uploads and key material.
3. Start restored applications privately. Check login, account separation,
   document access, decryption/export, quotas and expiry using controlled data.
   A successful checksum or an HTTP 200 alone is insufficient.
4. Restore Galene configuration/native tokens and the matching TURN credential;
   validate certificate/key pairing, install the renewal service/hook and scoped
   firewall rules, then test invitations and real media.
5. Restore public routing only after acceptance, take a new verified snapshot and
   confirm scheduled jobs. Preserve pre-restore live data for rollback.

The sections below retain the core-stack operational details. The matrix above
supersedes their earlier, narrower description of which services are backed up.

### FreshRSS browser rehearsal, 9 October

`deployment/utilibre/tests/check-freshrss-restore.py` creates one uniquely named
fictional account and uses the installed native models to add a feed and article
without fetching outside content. It snapshots the live database and matching
files in the normal formats, verifies checksums, and deletes only that new
account through the native CLI. It does not invoke backup generation pruning.
The retained snapshot is private; no existing snapshot or retention rule changed.

A separate PostgreSQL container and the exact installed FreshRSS image then
restore that snapshot on an internal network with no Internet route. A
loopback-only bridge allows the test browser to log in and view the fictional
subscription and article listing. No other account or article is opened.
All rehearsal containers, network, bridge and extracted temporary files are
removed afterward. The first attempts identified a test-only duplicated `/i`
base path; the completed rehearsal corrected the clone URL only.

The completed create/snapshot/restore/browser sequence took 6.1 seconds on this
VM. This excludes replacement infrastructure and is not a recovery-time promise.
Evidence: `/opt/utilibre/reports/freshrss-browser-restore-9nbye0vn/result.json`
and its private browser screenshot. The scope is one account and article
listing, with no remote feed fetching, offsite restore or host-loss rehearsal.


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

FreshRSS subscription OPML export/import and native disposable-account deletion
were verified on 8 October. The bilingual /your-data guides and
[data-verification.md](data-verification.md) describe the exact export and
deletion scope for all ten stateful applications. FreshRSS registration remains
closed; guide availability does not open it.
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
