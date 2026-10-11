# PrivateBin temporary disk — VM144

Applied 11 October 2026. This disk holds temporary data, not saved account work.
PrivateBin shares it with Family Chess's expiring games/sessions, Anubis's
challenge store and SearXNG's cache. Their separate directories, recovery and
verification are documented in [the backup policy](../../../docs/backups.md#other-temporary-services--11-october-2026).
Saved account work and its backups are unchanged.

- Device: VM144 `scsi2`, QEMU serial `drive-scsi2`, 10 GiB. The owner confirmed
  its Proxmox backup exclusion; host configuration was not independently read.
- ext4 mounted by UUID at `/opt/utilibre/temporary`, `nodev,nosuid,noexec`.
  Exact applied entry: `system/privatebin-temporary.fstab`.
- Data: `/opt/utilibre/temporary/privatebin`, owner 65534:82, mode 0750.
  `/srv/data` inside the pinned PrivateBin 2.0.6 container.
- No new data backup. Application backups keep configuration only. Proxmox's
  disk exclusion applies to backups, not ordinary ZFS/VM snapshots or old copies.
- Global upload admission stops below 1 GiB available, or when space cannot be
  read. One PHP worker and the existing 35,000,000-byte ciphertext ceiling bound
  a request; the reserve is not promised usable capacity, 100 slots or a quota.
- Native maximum one-week expiry, one-day default, 25 MB browser attachment
  limit and minute-by-minute native expiry cleanup are unchanged.
- Container memory and memory-plus-swap ceilings are both 768 MiB. New PrivateBin
  request buffers cannot be swapped to the root disk. This does not erase past
  swap contents, storage blocks, journal history or historical snapshots.

## Missing-disk behavior

The unmounted parent is root-owned mode 000, with no application children. Compose
uses a long bind with `create_host_path: false`; a missing source fails startup.
Never manually create that child on the system disk. PHP additionally requires
the disk's `.utilibre-temporary-volume` marker, returning 503 (including health
checks) when it is absent or invalid. The marker is a deployment check, not an
authentication secret or an alternative to the actual mount/exclusion.

The `nofail` mount is ordered before `docker.service` with a ten-second device
timeout. Missing storage must not prevent unrelated services or the VM booting.
The purge wrapper verifies the host mount before native cleanup. These settings
do not require restarting Docker or modifying its existing TURN firewall hook.

When the disk returns, mount it and recreate **only** PrivateBin; do not assume
an old container bound before mounting automatically sees the new filesystem:

```sh
systemctl start opt-utilibre-temporary.mount
mountpoint -q /opt/utilibre/temporary
findmnt /opt/utilibre/temporary
cd /opt/utilibre
docker compose up -d --no-deps --force-recreate --wait privatebin
systemctl start utilibre-privatebin-purge.service
systemctl start utilibre-privatebin-purge.timer
```

## Recovery and rollback

Restore configuration and stable settings, not expired pastes. Provision an
**identified empty replacement disk**, excluded in Proxmox, then update the
UUID in `/etc/fstab` and `system/privatebin-temporary.fstab`. Never format an
existing data disk to repair a mount failure. Keep the unmounted parent empty
and mode 000; after mounting, set the disk root to root:root 0711, create its
`privatebin` directory as 65534:82 0750, and put the exact line
`utilibre-privatebin-temporary-v1` plus newline in the marker (root:root 0444).
Validate `findmnt`, the Compose model, health, a fictional paste and expiry.

A code rollback must keep this mounted storage path, missing-source protection,
marker guard, one-week ceiling and backup exclusions. Do not revert to the old
`data/privatebin` bind or restore an old user-content snapshot. If the disk is
unavailable, leave this service stopped while repairing storage. Other services
continue independently. Do not detach the shared disk until **all four users**
are stopped and any separately authorized migration has been verified.

The mount definition is saved in the ordinary configuration archive; `/etc/fstab`
itself must be installed explicitly on a replacement host. This is not a
whole-VM disaster-recovery test. No production reboot was performed.

## Focused checks

```sh
node --test deployment/utilibre/tests/privatebin-storage.test.mjs
node --test deployment/utilibre/tests/backup-policy.test.mjs deployment/utilibre/tests/privatebin-upload-limit.test.mjs
node deployment/utilibre/tests/check-privatebin-uploads.mjs
node deployment/utilibre/tests/check-privatebin-restore.mjs
```

The storage test runs a disposable container with the real Compose bind options
and a missing synthetic source; it must fail without creating a directory. The
isolated upload test checks invalid/missing markers, the 1 GiB boundary, native
25 MB encryption/download, one-week expiry and cleanup. `--public` performs one
real synthetic upload/download then deletes it; use deliberately, not repeatedly
as a health probe. The restore test backs up configuration/account work without
pruning, then starts an empty isolated PrivateBin and exercises fictional text.

References checked 11 October 2026:
[Docker bind configuration](https://docs.docker.com/reference/compose-file/services/#volumes),
installed systemd 257 `systemd.mount(5)` (`nofail`, `x-systemd.before`, device
timeout), and [Proxmox backup scope](https://github.com/proxmox/pve-docs/blob/master/vzdump.adoc).
