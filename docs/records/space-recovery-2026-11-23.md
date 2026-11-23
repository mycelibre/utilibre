# VM space recovery — 23 November 2026

The Utilibre VM's root filesystem is 330 GiB as shown by `df -h` (353,836,253,184 bytes). Before this cleanup it was 97% used, with 11,528,970,240 bytes available. Afterward it was 84% used, with 54,996,283,392 bytes available: **43,467,313,152 bytes (40.48 GiB) recovered**. The separate 15 GiB disk mounted at `/opt/utilibre/temporary` was not changed. No running application, saved account work, application backup, or current security scanner cache was removed. The final container check found 175 running, 90 healthy, and none unhealthy.

The biggest remaining allocations were `/var/lib/containerd` (about 161 GB), `/var/lib/utilibre-maintenance` (about 59 GB), and `/opt/utilibre` (about 46 GB). These contain current images, repeatable build inputs, and application data as well as older evidence. A blanket Docker prune or deletion of those trees would remove useful rollback or recovery material.

## What was reclaimed

- Removed an obsolete Redlib scan cache, reconstructible npm/pnpm caches, and an unused older Node installation after checking the active version.
- Removed five old upstream image tags with no container references. Their exact IDs and checks are in the private recovery record; these five images were not archived.
- Copied two older maintenance trees to encrypted Storage Box snapshots, restored and compared them, then removed only ten old build/cache subdirectories from the first and five from the second.
- Archived eight unused, older locally patched Docker images as a checked `docker save`/zstd file. Restic restored and verified it, and the SHA-256 matched before the local image IDs were removed. `docker load` has not been rehearsed.
- Copied 20 more historical build/cache paths (including a frozen scan database) to a third encrypted snapshot. Restic restored and verified 251,334 files. An independent comparison found zero differences in contents, names, symlinks, permissions, ownership, and modification times across all 20 paths. Checks found no process, container mount, or filesystem mount using them before deletion.
- Removed two exited November 4 build containers without mounted volumes. Their resulting packages remain in the maintenance records; the containers' writable layers were not archived.

## Recovery references

| Archived input | Restic snapshot |
| --- | --- |
| Full `security-20261103` maintenance tree | `d02e1b06d34fa27f7afa967bbdff344fc39b28cdd95b4d4a397c60b827c72c47` |
| Full `security-20261028` maintenance tree | `1e40cdb1161970d30a28f9170dfc7c53be5d518e0720bb2e2c2b8cfe321c11fe` |
| Eight older locally patched Docker images | `c91dcd695860a3dc4142a5e1bc813bcba7e87840f6ffe6787d8657cfefe3e540` |
| The 20 selected historical build/cache paths | `200a3e7689e3eaed8da662d841c047756316c436c73305cc951b1745c8d66218` |

From the repository root, restore a named snapshot to a **new private directory** and inspect its files before copying anything back to a working path:

```sh
sudo install -d -m 700 /root/utilibre-recovery
sudo sh deployment/storagebox/restic.sh restore SNAPSHOT_ID --target /root/utilibre-recovery --verify
```

The image snapshot contains `dev/shm/utilibre-old-images-20261123.tar.zst` under the restore directory. Its expected SHA-256 is `852c72d05cd1924c98e0f4dea9523217f52a6e8daf6616ba0bd34214aec4c001`. After checking it, `zstd -dc` piped to `docker load` can import those eight tags in an isolated recovery context. Do not overwrite live maintenance paths or load old images merely because a snapshot exists.

These maintenance snapshots use the `maintenance-evidence` or `maintenance-images` tags. The normal daily application-backup retention selects `native-app-snapshots`; it does not expire these archives automatically. Review these tags deliberately when the evidence is no longer required. Private per-path manifests, restore logs, comparisons, and deletion results are in `/var/lib/utilibre-maintenance/space-recovery-20261123` on this VM. They are operational evidence, not a substitute for the off-host snapshots.
