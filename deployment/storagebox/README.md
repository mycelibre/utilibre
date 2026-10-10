# Encrypted off-host application backups

## Status — 10 October 2026

**Production application snapshots copied and download/restore verified;
daily scheduling enabled with owner-approved 7-daily/4-weekly retention.** After the
owner ran the interactive authorization procedure,
key-only login with strict host verification succeeded on port 23. Remote `df -h`
reported 20T total, 2.5T used and 18T available (rounded output, not a throughput
measurement). A separate format-2 Restic repository was initialized only after
confirming its directory did not exist. Existing VM backups, retention settings
and mounts were untouched. Caddy needs no block for this client.

At 17:00 UTC a fictional file passed encrypted SFTP backup, repository metadata
check, byte-identical restore with verification, and wrong-password rejection.
Snapshot: `2a9f979a`. Private evidence:
`/opt/utilibre/reports/storagebox-remote-restore-5BB6pC/result.json`.
A separate full repository `check --read-data` then passed both initial data
packs with no errors. That earlier test used fictional data. The owner subsequently
confirmed saving the Restic password outside the VM; its recovery copy was not
independently inspected and the value was never printed in chat.

At 17:10 UTC, snapshot `288c028d` copied 24 native backup groups, **112,712,577
bytes** in the selected manifests/payloads (about 113 MB), plus the suite's
decryption key pair inside Restic encryption. All **94** selected backup/key
files were downloaded into a fresh private directory and matched their originals.
The downloaded Authentik PostgreSQL dump also restored successfully in a
disposable networkless container and passed the existing owner-record/archive
checks. Evidence: `/opt/utilibre/reports/storagebox-restore-xjnYt2/result.json`.
Temporary downloaded copies were removed after checking, not original snapshots.
This is not a whole-VM or every-application functional restore.

The hardened systemd service then completed successfully at 17:13 UTC, snapshot
`7fb3ee84`; Restic reported 21,066 additional bytes on that repeat. This one
repeat is not a prediction of future storage savings. After the owner approved
retention, the 18:19 UTC production run passed (snapshot `4e54f792`), including
native expiry/pruning and a subsequent repository metadata check. Two application
snapshots remained; superseded same-day snapshot `7fb3ee84` expired. The earlier
fictional rehearsal was outside the policy and remained. Existing local timers
continue unchanged except the restored original-community coverage below.
At 18:19:59 UTC, all 94 downloaded files from the retained snapshot matched,
and a fresh isolated Authentik database restore passed. Evidence:
`/opt/utilibre/reports/storagebox-restore-dLweZi/result.json`.

The SMB address `//YOUR-STORAGEBOX-HOST/backup` names a share. It is not
the SSH repository path. Restic will use the separate relative directory
`utilibre-app-backups` under the SSH account's home, not initialize the share
root and not synchronize with `--delete`.

Components: Debian `restic 0.18.0-1+b4` (Restic reports 0.18.0), native OpenSSH
SFTP, and small setup/command wrappers. No filesystem mount, database service,
public endpoint or application credential distribution is involved. Upstream
Restic is BSD-2-Clause; this is the distro package, not a claim of latest upstream.

## Finish SSH authorization

1. Prefer a dedicated Storage Box subaccount confined to an application-backup
   directory. Update `HostName` and `User` in the private SSH configuration if
   one is created. The supplied main account works technically but its key can
   access unrelated backups too; a subdirectory is **not** an access boundary.
   Do not give this credential to hosted apps. Enable SSH access in Hetzner.
2. On a new host, supply `UTILIBRE_STORAGEBOX_HOST` and
   `UTILIBRE_STORAGEBOX_USER` in the operator's environment. The checked-in SSH
   template contains placeholders, not the production account. Use the actual
   hostname/account shown by Hetzner; do not commit them. Local preparation has
   already run on this VM and is safe to repeat without those variables:

   ```sh
   sudo node /home/ubuntu/freetools/deployment/storagebox/prepare.mjs
   ```

   Credentials are outside Git in `/opt/utilibre/storagebox/private` (0700).
   Existing keys/password/configuration are never overwritten. The setup's
   scanned `known_hosts.candidate` is **untrusted**, not automatically installed.
   Its scan targets the current private SSH configuration; a subaccount change must
   be checked independently with the live SSH prompt.
3. In the VM terminal, run:

   ```sh
   sudo sh /home/ubuntu/freetools/deployment/storagebox/authorize.sh
   ```

   Compare the prompted host fingerprint to the Storage Box overview in the
   Hetzner Console before accepting. Enter the Storage Box password only in
   that terminal. Native `install-ssh-key` adds this public key without replacing
   other authorized keys. A subsequent key-only `pwd` verifies login. The script
   does not create a repository. Do not use `StrictHostKeyChecking=no` or overwrite
   remote `.ssh/authorized_keys`.
4. Securely save a recovery copy of `private/restic-password` outside this VM,
   for example in the owner's password manager. The repository cannot be
   decrypted without it. Keep SSH access recovery separate too. Do not paste
   either secret into chat, Git, a public source bundle, or a support ticket.

## Initialize and rehearse before scheduling

After verified SSH access, inspect remote quota/free space with the native
`df` command. Check whether `utilibre-app-backups` already exists before
initializing; never repurpose another repository. The wrapper fixes the host,
private credential files, strict host checking, two concurrent SFTP operations,
two Go execution threads, low CPU/I/O priority and a **4 MiB/s** upload/download
cap. These are conservative settings, not measured capacity or a quota guarantee.
It disables the local Restic cache and serializes invocations with `flock`.

```sh
sudo ssh -F /opt/utilibre/storagebox/private/ssh_config utilibre-storagebox df -h
sudo sh /home/ubuntu/freetools/deployment/storagebox/restic.sh init --repository-version 2
```

The initial fictional off-host rehearsal has passed. To repeat it explicitly:

```sh
sudo node /home/ubuntu/freetools/deployment/storagebox/test-restic.mjs --remote
```

It creates one tiny fictional snapshot, checks repository metadata, restores that
exact ID into a new private directory with `--verify`, compares bytes and tests
wrong-password rejection. It does not delete old snapshots or initialize the
repository again. The repeatable smoke test does not reread all historical data
as the repository grows. Use bounded native `check --read-data-subset` checks as
appropriate; a separate full read was completed while the repository was small.
Do not restore over a running application's files.

Then copy **completed native application snapshots**, not live database files.
Use exact paths, never a root-directory wildcard. Verify their manifests first:
`sha256sum --check --status SHA256SUMS` from that snapshot directory; some newer
apps use `SHA256.json`, and TRIP uses `manifest.json` with a SHA-256 for
`trip-state.tar.gz`. Use each application's documented verifier. Missing markers,
partial files or a job still writing are not a completed snapshot. For pack
snapshots also require `COMPLETE`.

Example command shape (replace the capitalized arguments with reviewed paths):

```sh
sudo sh /home/ubuntu/freetools/deployment/storagebox/restic.sh backup \
  --host utilibre-vm --tag native-app-snapshots \
  EXACT_COMPLETED_SNAPSHOT_DIRECTORY /opt/utilibre/pack-backup-key
```

The pack decryption key is deliberately included **inside the encrypted Restic
backup**, because the already-encrypted suite archives need that separate key.
Never upload it as a plaintext sibling file. This does not replace the separate
off-VM recovery copy of the Restic password.

See [the recovery matrix](../../docs/backups.md) for applications and native
restore steps. The pooled `community-backups` directory contains multiple app
families: selecting only its newest directory would omit others. Browser-only
documents are not server backups. The thin `restic.sh` wrapper alone does not
generate or select snapshots; the separate native selector below handles the
explicit current coverage.

## Native copy job and schedule

`backup-native.mjs` inspects the newest complete snapshot in each of **24 explicit
backup groups**, verifies every manifest digest, rejects paths outside snapshots,
symlinks, missing files, corrupt/newly changing files, or snapshots older than
36 hours. It never silently falls back from a corrupt newest completed snapshot.
Failures prevent upload rather than reporting partial coverage as complete.
Unfinished generations and ad-hoc rollback directories are not selected. The
`selection.json` stored within each encrypted snapshot identifies exact sources
and their completion times. Upload time is **not** the time of the data snapshot.

Coverage: core FreshRSS/PrivateBin/configuration; identity; expanded account
services; original community services; encrypted CryptPad/Forms/Galene/TURN/
Wallabag suite plus key; calendar/Gathio/Razzia; Opengist/Linkding/Vikunja/Bytestash;
TRIP/Spliit/Donetick/BeaverHabits/family chess/wishlist/KitchenOwl/newsletters/
Addy/SimpleLogin/projects/Chhoto. This is not 24 independent applications and
does not include browser-only documents, cache state or external Caddy VM files.
Add a source and a matching native backup procedure when a new stateful app is
introduced; there is no claim of automatic discovery of future applications.

```sh
sudo node deployment/storagebox/backup-native.mjs           # validate only
sudo node deployment/storagebox/backup-native.mjs --apply   # encrypted copy
sudo node deployment/storagebox/verify-download.mjs         # bounded full download + identity restore
```

The enabled timer runs at **09:15 UTC plus up to five minutes**, after the native
backup jobs. First scheduled activation: 11 October 2026 at 09:16:54 UTC; later
runs retain the configured five-minute jitter. It is persistent across downtime.
The installed service passed a manual run with a configured 512 MiB memory
ceiling, one CPU-equivalent quota, two-hour timeout, strict read-only filesystem
except private reports/status/locks, and the existing 4 MiB/s transport caps.
These are limits, not measured peak use or throughput promises. The script keeps
the existing 5 GiB free-space floor; a restore also budgets space for the download.
The existing operational alert job now checks off-host unit failures and a last
successful copy older than 36 hours; alerts contain no document or account data.
Use `node deployment/community/monitor-alerts.mjs --check-only` to validate
current health without sending email or changing alert acknowledgements. Invalid
backup-success states and timestamps more than five minutes ahead also fail the
freshness check. Both monitoring and backup timers remain enabled.
It also checks original-community and family-chess backup failures. Same-VM
monitoring cannot report a complete VM/network outage by itself.

Two blockers uncovered during validation were repaired: the newer-community
job now also invokes the existing online original-community backup/restore
helper (Rallly/Pollaris/FMD/Kuma/Mumble/onion identity); family-chess closes its
native SQLite backup handles **before** hashing, so later WAL cleanup no longer
invalidates its manifest. Fresh snapshots passed. Old generations were retained,
not rewritten or represented as repaired.

### Approved remote retention — 10 October 2026

The owner approved **7 daily and 4 weekly** snapshots in this repository only.
`retention.mjs` uses native Restic `forget --keep-daily 7 --keep-weekly 4`, scoped
to host `utilibre-vm` and tag `native-app-snapshots`, grouping by **host,tags**.
Timestamped source directories must not create a separate group every day.
These are overlapping calendar buckets with data, not eleven guaranteed copies
or a hard 28-day deletion promise. Restic can additionally retain the oldest
snapshot while a bucket count is incomplete. Existing whole-VM backups, native
local retention, other hosts/tags and the fictional rehearsal are unaffected.

Only after a complete successful 24-group upload and metadata check does the job
preview the policy, verify its scope and protection of the new snapshot, apply
the same policy, prune unreferenced data, and run another metadata check. A
failure prevents a new success status. Pruning has a 256 MiB repack budget and
5% unused-data tolerance, alongside existing transport/CPU/memory/time limits;
some unused blocks can remain until later runs. The next successful job retries
pruning even if no additional snapshot expires. Expired snapshot references
cannot be recovered; current retained snapshots still protect their shared data.
Native app deletion does not immediately erase retained backup generations.

Review without deleting anything:

```sh
sudo sh deployment/storagebox/restic.sh forget --json --dry-run \
  --host utilibre-vm --tag native-app-snapshots --group-by host,tags \
  --keep-daily 7 --keep-weekly 4
```

Monitor quota and snapshot age. An accessible SFTP key can delete backups;
this is not an immutable/ransomware-proof repository. Compression/deduplication
savings depend on the input; freshly encrypted pack archives may deduplicate
poorly. Keep the owner's existing whole-VM backups separate.

## Verification and rollback

- `node --check` and shell syntax checks passed.
- Repeating preparation preserved the existing SSH key, password and config.
- Missing trusted `known_hosts` stops the wrapper before network transfer.
- `sudo node deployment/storagebox/test-restic.mjs` passed native format-2 init,
  fictional backup, full data check, byte-identical restore and wrong-password
  rejection (exit 12). It creates a small, root-private local rehearsal under
  `/opt/utilibre/reports/storagebox-local-restore-*`, never live app data.
- Latest core, identity, expanded and pack snapshot checksums passed independently.
- Selector tests passed for three manifest formats, traversal/duplicates/bad
  digests, missing completion markers, corruption, symlinks, freshness and pooled
  application selection. Node/shell/Python syntax and systemd-unit validation passed.
- Actual 24-group upload, 94-file download comparison and native isolated identity
  database restore passed. The installed systemd copy job passed. Other apps'
  archive bytes were verified; their individual functional restores were not all
  repeated from the remote repository. No whole-VM recovery claim follows.
- Seven selector/retention tests pass, including malformed-scope rejection and
  a native Restic rehearsal with fourteen dated application snapshots plus an
  unrelated group: expiry, bounded prune, remaining-snapshot restore and full
  data check passed. This rehearsal uses a temporary local repository.
- Publication review on 10 October reran all seven tests and validated all 24
  live groups. Setup now reads hostname/account only from operator-provided
  variables on first preparation or the existing private SSH configuration.
  Repeating preparation left credentials, trusted host keys and configuration
  byte-identical. A read-only monitor check found all 48 Kuma observations and
  resource/backup checks healthy. No test notification was sent.

For rollback, stop the scoped job and disable the timer if it has been activated:
`systemctl disable --now utilibre-storagebox-backup.timer`, then
`systemctl stop utilibre-storagebox-backup.service`. Disabling the timer stops
future uploads/expiry; it cannot reverse an expiry that already completed.
Do not disable the existing native app-backup timers or revert their coverage/
SQLite correctness fixes merely to stop off-host transfers. Do not delete
the Restic password, pack key or repository until recovery is demonstrably no
longer needed. If revoking access, remove only this dedicated public key through
Hetzner/native administration, never replace the complete authorized-keys file.

For future application file storage, evaluate a separate restricted account and
the specific app's native storage backend. Do not move PostgreSQL/SQLite or hot
application state onto this backup connection. Off-host backups alone do not
free local production disk.

References checked 10 October 2026:
[Hetzner SSH/SFTP](https://docs.hetzner.com/storage/storage-box/access/access-ssh-rsync-borg/),
[non-destructive key installation](https://docs.hetzner.com/storage/storage-box/ssh-keys/add-ssh-keys/),
[Restic 0.18 repository/password/SFTP instructions](https://restic.readthedocs.io/en/v0.18.0/030_preparing_a_new_repo.html),
[native retention and pruning semantics](https://restic.readthedocs.io/en/v0.18.0/060_forget.html).
