# PrivateBin temporary disk — VM144

Applied 11 October 2026. This disk holds temporary data, not saved account work.
PrivateBin shares it with Family Chess's expiring games/sessions, Anubis's
challenge store and SearXNG's cache. Their separate directories, recovery and
verification are documented in [the backup policy](../../../docs/backups.md#other-temporary-services--11-october-2026).
Saved account work and its backups are unchanged.

- Device: VM144 `scsi2`, QEMU serial `drive-scsi2`, expanded from 10 to **15 GiB**
  on 11 October. The owner confirmed
  its Proxmox backup exclusion; host configuration was not independently read.
- ext4 mounted by UUID at `/opt/utilibre/temporary`, `nodev,nosuid,noexec,prjquota`.
  Exact applied entry: `system/privatebin-temporary.fstab`.
- Data: `/opt/utilibre/temporary/privatebin`, owner 65534:82, mode 0750.
  `/srv/data` inside the pinned PrivateBin 2.0.6 container.
- No new data backup. Application backups keep configuration only. Proxmox's
  disk exclusion applies to backups, not ordinary ZFS/VM snapshots or old copies.
- Global upload admission stops below 1 GiB available, or when space cannot be
  read. One PHP worker and the existing 35,000,000-byte ciphertext ceiling bound
  a request. With project quotas active, the existing native `disk_free_space`
  check sees the smaller of quota headroom and physical free space. The reserve
  is not promised usable upload capacity or a fixed number of slots.
- Native maximum one-week expiry, one-day default, 25 MB browser attachment
  limit and minute-by-minute native expiry cleanup are unchanged.
- Container memory and memory-plus-swap ceilings are both 768 MiB. New PrivateBin
  request buffers cannot be swapped to the root disk. This does not erase past
  swap contents, storage blocks, journal history or historical snapshots.

## 10 / 5 GiB allocation

Native ext4 project quotas enforce two independent **byte ceilings**:

| Pool | Project ID | Hard limit | Directories |
| --- | --- | --- | --- |
| PrivateBin | 14401 | 10 GiB / 10,485,760 KiB | `privatebin` |
| Other temporary services, combined | 14402 | 5 GiB / 5,242,880 KiB | `family-chess`, `anubis`, `searxng-cache` |

The other tools share 5 GiB; it is not 5 GiB per tool. Existing files have the
appropriate project ID and all service directories have `+P` inheritance, so new
files remain charged to their pool. This does not change ownership, encryption,
expiry, upload size, account access or backup selections. There is no new network
service, application quota database or custom upload engine. Debian `quota`
4.09-1+b1 supplies the administrator commands; e2fsprogs remains 1.47.2-3+b12.
The optional quota RPC service is disabled.

These limits are **not preallocated physical reservations**. Filesystem metadata
and reserved blocks consume part of the 15 GiB device; measured non-root free
space immediately after expansion was 15,563,309,056 bytes (about 14.49 GiB).
PrivateBin also retains its 1 GiB admission margin. A nominal 10 GiB ceiling is
therefore not a promise of 10 GiB of uploaded files. Inode capacity is shared;
there is no per-pool inode reservation. No service's RAM allowance was increased.

Check without listing records:

```sh
findmnt --mountpoint /opt/utilibre/temporary
quotaon -P -p /opt/utilibre/temporary
repquota -P -n /opt/utilibre/temporary
```

Quota IDs/limits are native filesystem state and survive remounting. `prjquota`
in the persisted fstab enables enforcement. Do not remove it or change project
IDs as a workaround for a full pool. Add any future temporary application to the
appropriate pool deliberately; new top-level directories are not automatically
assigned by an application registry.

For a **replacement empty filesystem**, enable ext4's `project` feature and
internal `prjquota` inode while unmounted, then mount with the documented flags.
After restoring configuration and creating empty service directories, assign
PrivateBin project 14401 and the other three project 14402, enable `+P` on every
directory, and apply the limits with native `setquota`. For an existing store,
stop its writers first and preserve every file's current ownership/mode.
Do not format an existing disk or use the example fixture test against it.

```sh
# Only after verifying the actual excluded mount and the prepared directories:
mountpoint -q /opt/utilibre/temporary || exit 1
chattr -R -p 14401 /opt/utilibre/temporary/privatebin
find /opt/utilibre/temporary/privatebin -xdev -type d -exec chattr +P {} +
for service in family-chess anubis searxng-cache; do
  chattr -R -p 14402 "/opt/utilibre/temporary/$service"
  find "/opt/utilibre/temporary/$service" -xdev -type d -exec chattr +P {} +
done
setquota -P 14401 0 10485760 0 0 /opt/utilibre/temporary
setquota -P 14402 0 5242880 0 0 /opt/utilibre/temporary
```

The production resize retained the device UUID and used native unmounted
filesystem checks. A remount coordination check detected a duplicate mount;
the extra mount was removed before quotas were assigned and services restarted.
Post-resize quota assignment preserved aggregate file hashes, owners and modes;
no pre-resize byte-hash comparison is claimed. No data backup or purge was made.
Only the four disk-using services were paused; account services and their data
were untouched. Never attempt to shrink the disk back as a rollback.

The disposable quota test checks growth with fictional data, inherited project
IDs, combined accounting across two directories, an actual quota-exceeded write,
independent space in the other pool and limits persisting after remount. It uses
a small loop filesystem and removes only that fixture. It does not fill the
production disk to test a limit or claim a VM reboot test.

Verified at 05:33 UTC: 20 focused storage/quota/admission/backup-selector tests
passed. Live PrivateBin's PHP reports exactly 10,737,418,240 total bytes for
`/srv/data`; a public 25,000,000-byte synthetic upload was downloaded with the
same SHA-256 and then deleted. Maximum one-week expiry, oversized-input rejection,
EN/ES UI checks and no unexpected browser destinations passed. Public chess
two-player/spectator and Anubis challenge tests passed. SearXNG's EN/ES queries
returned results through the HTTPS private edge, not an independent external
network. All four containers are healthy and the cleanup/update/backup timers
are active. Tests use Chromium desktop/mobile emulation, not physical phones.
Evidence: `/opt/utilibre/reports/temporary-quota-final-20261011-tzGQuc/`,
`/opt/utilibre/reports/privatebin-uploads-wrShcU/` and
`/opt/utilibre/reports/family-chess-quota-20261011/`.

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
marker guard, project quotas, one-week ceiling and backup exclusions. Do not revert to the old
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
sudo node --test deployment/utilibre/tests/temporary-quota.test.mjs
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
timeout), installed `tune2fs(8)`, `chattr(1)`, `setquota(8)` and
[ext4's project-aware free-space implementation](https://github.com/torvalds/linux/blob/v6.12/fs/ext4/super.c),
and [Proxmox backup scope](https://github.com/proxmox/pve-docs/blob/master/vzdump.adoc).
