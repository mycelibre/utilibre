# Backups, restore, and removal

The milestone-1 stack has no account database and no persistent user-media store. Recovery therefore depends primarily on source/configuration and secrets, not on copying Docker volumes. Backups must not become a new archive of queries, media URLs, limiter identifiers, logs, or downloaded files.

## What must be backed up

| Item | Required | Sensitivity | Method |
|---|---|---|---|
| Repository source, lockfile, Compose, static configs, scripts, docs, notices | Yes | Public except uncommitted operator changes | Git at an exact revision plus `scripts/backup.sh` configuration/source archive |
| `.env` | Yes | Secret/private: SearXNG secret, private addressing, public configuration, limits | Separate encrypted operator-controlled backup |
| `secrets/cobalt-keys.json` and `secrets/portal-cobalt-key` | Yes | Authentication secrets | Same encrypted private backup; restore as a matching pair |
| `secrets/anubis-ed25519-key.hex` | Yes | Redlib gate signing secret; changing it invalidates authorization cookies | Same encrypted private backup; never commit or print it |
| Edge Caddy configuration and non-recreatable state | Yes for full-site recovery | Private and outside this repository | Back up on the edge VM using its established procedure; normally let Caddy reissue public certificates rather than copying private keys |
| Host firewall/security-group policy | Yes for full-site recovery | Infrastructure-sensitive and outside this repository | Export through the authoritative firewall/provider mechanism |

The source archive script includes `portal/` and `scripts/` but excludes `.env`, `secrets/`, the generated `config/searxng/limiter.toml`, other generated runtime data, dependencies, builds, browser-test output, and generated QR WebAssembly. Those omitted public build artifacts are reproducible from the exact lockfile. The generated limiter also contains the exact private edge address and must not enter a public archive.

## What is intentionally not backed up

| Data | Reason |
|---|---|
| `searxng-cache` volume | Re-creatable cache, not authoritative data |
| Valkey `/data` tmpfs and process memory | Limiter state may contain privacy-relevant derived address identifiers; RDB/AOF are disabled and all state clears on restart |
| `data/anubis/anubis.bdb` | Transient challenge records have a 30-minute logical TTL and can contain privacy-relevant address/user-agent-derived state; restoring them provides no disaster-recovery value |
| Docker `json-file` logs and host journals | Operational/possibly sensitive, rotated, and not application state |
| Cobalt media or tunnel state | No media volume exists; tunnel metadata is short-lived process memory |
| Redlib OAuth/device/connection state and transient page/media buffers | No database or volume exists; state is process memory or bounded tmpfs and clears on restart |
| Temporary webhook inboxes, events, read-token hashes, and developer rate counters | These are deliberately process-memory-only and clear on expiry, explicit deletion, or portal restart; restoring them would violate the advertised temporary boundary |
| Portal/local-tool inputs and results | They never intentionally reach server storage |
| rimgo memory cache | Optional, non-authoritative, and cleared on restart |
| `config/searxng/limiter.toml` | Ignored file deterministically regenerated from the tracked template and exact edge address |
| Container writable layers/images | Pulled images are digest-pinned and Redlib is reproducibly source-built from the backed-up patch/build recipe; an optional image export is an update rollback artifact, not user data |

Restarting Valkey clears active abuse history and can briefly reduce limiter effectiveness. Avoid doing so during an active incident. Do not add persistence merely to retain limiter identifiers; if incident evidence is needed, use a separately reviewed, access-controlled process with a documented purpose and no more than the same maximum 30-day retention. Limiter state is not part of normal recovery.

There is no required database dump in milestone 1. If a future service adds PostgreSQL or another database, do not enable it until this document includes the official consistent backup, schema migration, restore, encryption, and retention procedure.

## Create a backup

Use a destination that is already encrypted and restricted to the operator. Do not use a directory served by the portal, a Git working tree, a general shared folder, or the Docker volume area.

Create the public/configuration archive:

```sh
task_backup_dir=/MOUNTED_ENCRYPTED_BACKUP/public-utility
umask 077
mkdir -p "$task_backup_dir"
sh scripts/backup.sh "$task_backup_dir"
```

Create the private archive directly on that encrypted destination:

```sh
task_timestamp=$(date -u +%Y%m%dT%H%M%S.%NZ)
task_private_archive="$task_backup_dir/public-utility-private-$task_timestamp.tar.gz"
test ! -e "$task_private_archive"
test ! -e "$task_private_archive.sha256"
tar --create --gzip \
  --file "$task_private_archive" \
  .env secrets/cobalt-keys.json secrets/portal-cobalt-key \
  secrets/anubis-ed25519-key.hex
chmod 600 "$task_private_archive"
sha256sum "$task_private_archive" > "$task_private_archive.sha256"
```

If the destination filesystem is not encrypted, pipe the archive directly into the operator's reviewed encryption tool instead of creating a plaintext intermediate. An archive password in a command argument or shell history is not acceptable. Store decryption keys separately from the backup.

Record the Git revision and deployed image pins alongside the public archive:

```sh
git rev-parse HEAD
docker compose config --images
docker compose images
```

Do not store expanded `docker compose config` output because it can contain secrets. Do not copy Docker logs into the backup.

## Verify the backup without exposing secrets

List archive member names, not contents:

```sh
tar --list --gzip --file /MOUNTED_ENCRYPTED_BACKUP/public-utility/PUBLIC_ARCHIVE.tar.gz
tar --list --gzip --file /MOUNTED_ENCRYPTED_BACKUP/public-utility/PRIVATE_ARCHIVE.tar.gz
sha256sum --check /MOUNTED_ENCRYPTED_BACKUP/public-utility/PRIVATE_ARCHIVE.tar.gz.sha256
```

Confirm the private archive contains exactly `.env` and the matching two Cobalt
files. Confirm the public archive includes `.gitignore`, `secrets/README.md`,
`portal/package-lock.json`, `portal/server/`, `portal/src/`, `scripts/`,
Compose, tracked SearXNG settings/template/redaction code, the complete
`config/redlib/` source-fetch/build/patch material, documents, and license
notices. It must not contain `.env`, either Cobalt key,
`config/searxng/limiter.toml`, other generated runtime data, logs,
`node_modules`, builds, test artifacts, or backup archives.

At a documented interval, perform a restore rehearsal into an isolated non-public VM or directory. Never connect a rehearsal using production public hostnames or allow it to send test requests to real third-party platforms.

## Restore onto a clean application VM

1. Install the reviewed Docker Engine/Compose and Node prerequisites.
2. Restore or check out the exact source revision into a new empty directory.
3. Verify the source archive checksum/signature and extract it if Git is not the recovery source.
4. Place the private archive in an already encrypted operator-only mount.
5. Confirm `.env` and both target secret files do not already exist, then extract into the repository root.

```sh
test ! -e .env
test ! -e secrets/cobalt-keys.json
test ! -e secrets/portal-cobalt-key
tar --extract --gzip \
  --file /MOUNTED_ENCRYPTED_BACKUP/public-utility/PRIVATE_ARCHIVE.tar.gz \
  --directory .
chmod 600 .env
chmod 700 secrets
chmod 444 secrets/cobalt-keys.json secrets/portal-cobalt-key secrets/anubis-ed25519-key.hex
node scripts/init-secrets.mjs
node scripts/render-config.mjs
```

`init-secrets.mjs` validates that the UUID in the portal file exists in the Cobalt key database and reasserts the required host modes. The files are `0444` because Compose bind-mounts them for containers with different non-root UIDs; the host `0700` directory prevents other local users from traversing to them.

Do not restore `searxng-cache`; Compose creates a clean cache volume. Valkey starts with empty memory/tmpfs state. Then validate, pull/build, and start privately:

```sh
docker compose config --quiet
docker compose pull cobalt searxng valkey anubis
docker compose build --pull portal redlib
docker compose --profile privacy-frontends up -d portal cobalt searxng valkey redlib anubis
sh scripts/check-health.sh
sh scripts/verify-network.sh
```

Reapply the application-VM firewall through its authoritative procedure. Restore/validate the separate edge Caddy configuration only after private health and unauthorized-host checks pass. Run the bilingual browser, local no-upload, API-authentication, and network-exposure tests before reopening public traffic.

Because limiter state starts empty, watch SearXNG and portal request rates
closely after a restore. Every temporary webhook receiver from before the
restart is invalid; do not attempt to reconstruct it from edge logs. Start
Anubis with a new empty bbolt file but the
restored stable key. Watch Redlib requests and egress closely; cache warm-up can
make initial searches and Reddit pages slower.

## Verify that media is not persistent

Before and after one small authorized successful request, one rejected/failed request, and one client-cancelled stream, inspect Cobalt locally:

```sh
task_cobalt_id=$(docker compose ps -q cobalt)
docker inspect --format 'readonly={{.HostConfig.ReadonlyRootfs}}' "$task_cobalt_id"
docker inspect --format '{{range .Mounts}}{{println .Type .Destination .RW}}{{end}}' "$task_cobalt_id"
docker diff "$task_cobalt_id"
```

Expected properties are `readonly=true`, one read-only secret mount, no media/tmp volume, and no created media file in `docker diff`. Inspect output locally because an unexpected filename could itself be sensitive.

Allow the configured tunnel TTL to expire, restart Cobalt, and inspect again:

```sh
docker compose restart cobalt
docker compose ps cobalt
task_cobalt_id=$(docker compose ps -q cobalt)
docker diff "$task_cobalt_id"
```

A restart clears process-memory tunnel metadata. Also check that Compose declares only the `searxng-cache` volume:

```sh
docker compose config --volumes
docker volume ls
docker system df
```

These checks demonstrate that the configured container has no writable persistent media path; they do not prove forensic erasure of RAM, kernel buffers, Docker logs, edge logs, provider logs, or a visitor's downloaded file. Review bounded Cobalt/edge logs for accidental URL logging without copying them into a report.

Redlib likewise has no backup volume. Verify the running container rather than
assuming the Compose intent:

```sh
task_redlib_id=$(docker compose ps -q redlib)
docker inspect --format 'readonly={{.HostConfig.ReadonlyRootfs}}' "$task_redlib_id"
docker inspect --format '{{range .Mounts}}{{println .Type .Destination .RW}}{{end}}' "$task_redlib_id"
docker diff "$task_redlib_id"
docker compose restart redlib
docker compose ps redlib
```

Expected properties are `readonly=true`, no mounts, only the configured
memory-backed `/tmp`, and no persistent browsing/OAuth data after restart.
Optional Redlib settings/subscriptions remain in the visitor's first-party
browser cookie, not a server backup. Docker/edge logs and Reddit's upstream
records are separate and are not erased by restarting the container.

## Purge persistent application data

This is destructive. First decide whether the encrypted configuration backup and source record must be retained. Remove/disable the public edge routes before stopping a permanent deployment so clients cannot keep reaching stale backends.

From the verified repository root, remove project containers, networks, and the one named cache volume:

```sh
docker compose --profile privacy-frontends --profile optional down --volumes --remove-orphans
docker compose ps --all
docker volume ls
```

`--volumes` deletes `searxng-cache`. Stopping Valkey already destroys its memory/tmpfs limiter state. The command does not remove images, repository files, `.env`, secrets, edge configuration, firewall rules, or backups.

While `.env` is still available, list project image references before deciding whether to remove them:

```sh
docker compose config --images
docker compose images
```

The locally built portal and patched Redlib images can be removed by their exact
configured tags after confirming no other deployment uses them. Upstream
digest-pinned images may be shared with other Compose projects; do not remove
them merely to tidy this project.

After confirming the current directory is the intended repository, unlink ignored private/generated files explicitly:

```sh
test "$(pwd)" = /ABSOLUTE/PATH/TO/freetools
rm -- .env secrets/cobalt-keys.json secrets/portal-cobalt-key
rm -f -- config/searxng/limiter.toml
rm -rf -- runtime portal/node_modules portal/dist portal/test-results portal/playwright-report portal/public/vendor
```

Replace the absolute-path guard before running it; if the guard fails, stop. The commands intentionally name project-local targets and do not use `$HOME`, `~`, a wildcard, or a broad parent directory.

Edge Caddy sites, certificates, DNS records, and firewall rules must be retired manually on their owning systems. Preserve unrelated routes/rules. Rotate the Cobalt key and SearXNG secret if any copy or backup could remain accessible.

For recoverable repository removal, move the entire repository to an operator-controlled quarantine location first and retain it for the organization's normal recovery interval:

```sh
cd /ABSOLUTE/PATH/CONTAINING/THE/REPOSITORY
test -f freetools/compose.yaml
test -f freetools/portal/package-lock.json
mkdir -p /ABSOLUTE/OPERATOR/QUARANTINE
mv -- freetools /ABSOLUTE/OPERATOR/QUARANTINE/freetools-retired-YYYYMMDD
```

After that interval and a reviewed backup decision, delete only the exact quarantined directory through the storage platform's normal deletion procedure. If ordinary filesystem deletion is the approved procedure, guard the parent and name the one target explicitly:

```sh
cd /ABSOLUTE/OPERATOR/QUARANTINE
test "$(pwd)" = /ABSOLUTE/OPERATOR/QUARANTINE
test -f freetools-retired-YYYYMMDD/compose.yaml
rm -rf -- freetools-retired-YYYYMMDD
```

Delete retained archives only by their exact paths after the retention decision; do not use a wildcard. Flash storage, copy-on-write filesystems, snapshots, and cloud backups can retain unlinked blocks, so `rm` or `shred` alone is not a forensic-erasure guarantee.

## Final removal verification

Verify all of the following:

- `docker compose ps --all` shows no project containers;
- no project-labeled Docker network or volume remains;
- no configured project port listens on the application VM;
- no `.env`, Cobalt key file, generated limiter, backup archive, log export, or temporary media file remains in the retired repository path;
- the edge no longer has the project site routes or sensitive access logs beyond policy;
- DNS no longer directs project names to the edge if the service is permanently retired;
- encrypted backups are either deliberately retained with access controls or deleted through their storage lifecycle;
- secrets are rotated if retained copies cannot be conclusively destroyed.
