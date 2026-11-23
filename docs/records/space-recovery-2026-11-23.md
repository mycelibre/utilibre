# VM space recovery — 23 November 2026

The Utilibre VM's root filesystem is 330 GiB as shown by `df -h` (353,836,253,184 bytes). Before this cleanup it was 97% used, with 11,528,970,240 bytes available. The first pass reduced usage to 84%; a second pass reduced it to **78% used, with 75,129,237,504 bytes (69.97 GiB) available**. The second pass recovered 20,132,954,112 bytes (18.75 GiB), for **63,600,267,264 bytes (59.23 GiB) recovered overall**. The separate 15 GiB disk mounted at `/opt/utilibre/temporary` was not changed. No running application, saved account work, application backup, or current security scanner database was removed. The final container check found 175 running, 90 healthy, and none unhealthy.

At the start of the second pass, the biggest allocations were `/var/lib/containerd` (about 161 GB), `/var/lib/utilibre-maintenance` (about 59 GB), and `/opt/utilibre` (about 46 GB). These contain current images, repeatable build inputs, public source archives, account backups, and application data as well as older evidence. A blanket Docker image/volume prune or deletion of those trees would remove useful rollback or recovery material.

## What was reclaimed

- Removed an obsolete Redlib scan cache, reconstructible npm/pnpm caches, and an unused older Node installation after checking the active version.
- Removed five old upstream image tags with no container references. Their exact IDs and checks are in the private recovery record; these five images were not archived.
- Copied two older maintenance trees to encrypted Storage Box snapshots, restored and compared them, then removed only ten old build/cache subdirectories from the first and five from the second.
- Archived eight unused, older locally patched Docker images as a checked `docker save`/zstd file. Restic restored and verified it, and the SHA-256 matched before the local image IDs were removed. `docker load` has not been rehearsed.
- Copied 20 more historical build/cache paths (including a frozen scan database) to a third encrypted snapshot. Restic restored and verified 251,334 files. An independent comparison found zero differences in contents, names, symlinks, permissions, ownership, and modification times across all 20 paths. Checks found no process, container mount, or filesystem mount using them before deletion.
- Removed two exited November 4 build containers without mounted volumes. Their resulting packages remain in the maintenance records; the containers' writable layers were not archived.
- In the second pass, removed 23 old dangling images without container references and 14 old unused tagged images. The tagged images were saved as a compressed Docker archive, backed up to the Storage Box, restored, and SHA-256 checked before removal. The 23 dangling images were not archived. Six other dangling images were retained because stopped containers still reference them.
- Pruned only unused BuildKit cache, first records older than seven days and then the remaining unused cache. Docker reported 1.482 GB and 3.6 GB reclaimed respectively. Rebuilding may need fresh downloads; no images, containers, or volumes were pruned by these commands.
- Backed up 16 dated build directories, restored and verified 120,385 files, and independently compared all 16 trees. Removed only four directories (about 0.87 GB allocated). The other 12 remain local because maintained scripts or source-replay records still reference them, sometimes through computed paths.
- Backed up five more old BentoPDF investigation/preview, Texlyre prior-asset, and Calino package-cache directories. Restic restored and verified 62,765 files; independent tree comparisons passed before those five exact directories were removed (about 3.05 GB allocated). Current app builds, published source archives, and security scanner databases remain local.

## Recovery references

| Archived input | Restic snapshot |
| --- | --- |
| Full `security-20261103` maintenance tree | `d02e1b06d34fa27f7afa967bbdff344fc39b28cdd95b4d4a397c60b827c72c47` |
| Full `security-20261028` maintenance tree | `1e40cdb1161970d30a28f9170dfc7c53be5d518e0720bb2e2c2b8cfe321c11fe` |
| Eight older locally patched Docker images | `c91dcd695860a3dc4142a5e1bc813bcba7e87840f6ffe6787d8657cfefe3e540` |
| The 20 selected historical build/cache paths | `200a3e7689e3eaed8da662d841c047756316c436c73305cc951b1745c8d66218` |
| Fourteen older unused tagged Docker images | `5eeac246c26257c53cfcd9d40c5e48d0f6b16c8f27ca91d38338d8bd2eb54cc5` |
| Sixteen dated build directories, four removed locally | `2f0905a616d064b096d8b65833fcfa779c7600589bfea5215b6ca7627845ee79` |
| Five old investigation/asset/cache directories | `11991b933c1763b87a228db26fdf61d0906b71a56e0fb0f3419acfc5734a527a` |

From the repository root, restore a named snapshot to a **new private directory** and inspect its files before copying anything back to a working path:

```sh
sudo install -d -m 700 /root/utilibre-recovery
sudo sh deployment/storagebox/restic.sh restore SNAPSHOT_ID --target /root/utilibre-recovery --verify
```

The image snapshot contains `dev/shm/utilibre-old-images-20261123.tar.zst` under the restore directory. Its expected SHA-256 is `852c72d05cd1924c98e0f4dea9523217f52a6e8daf6616ba0bd34214aec4c001`. After checking it, `zstd -dc` piped to `docker load` can import those eight tags in an isolated recovery context. Do not overwrite live maintenance paths or load old images merely because a snapshot exists.

The second image snapshot contains `var/lib/utilibre-maintenance/space-recovery-20261123/utilibre-old-images-batch2-20261123.tar.zst` under the restore directory. Its expected SHA-256 is `d51bf671106845715c8441f515addfa64154f14e9c8929c740df79eab7ce1333`. Its 14 image IDs and tags were checked against the Docker archive index, but `docker load` has not been rehearsed. Restore a dated build directory only when its historical recipe needs that input; do not replace newer files wholesale.

These maintenance snapshots use the `maintenance-evidence` or `maintenance-images` tags. The normal daily application-backup retention selects `native-app-snapshots`; it does not expire these archives automatically. Review these tags deliberately when the evidence is no longer required. Private per-path manifests, restore logs, comparisons, and deletion results are in `/var/lib/utilibre-maintenance/space-recovery-20261123` on this VM. They are operational evidence, not a substitute for the off-host snapshots.

## Proxmox pool accounting

After cleanup, the guest accepted `fstrim` on `/` and `/opt/utilibre/temporary`: it reported 71.8 GiB and 232 MiB of free extents respectively. These are guest discard reports, **not measured ZFS pool savings**. Weekly `fstrim.timer` is enabled.

The operator then checked Proxmox ZFS volumes. `rpool/data/vm-144-disk-1` reported `used=172G`, `referenced=172G`, `refreservation=none`, and `usedbysnapshots=0B`; `vm-144-disk-2` reported `used=632M`, `referenced=632M`, `refreservation=none`, and `usedbysnapshots=0B`. Both volumes are thin provisioned and have no ZFS snapshot blocks pinned at this measurement. The 335 GiB virtual root size therefore does not reserve 335 GiB from the pool. The guest's 247 GiB of file usage and ZFS's 172 GiB of referenced space are different measurements. No before/after ZFS measurement is available to quantify what the manual trim returned. Do not shrink the live root volume based on guest `df` alone.

The next operator readout showed `rpool` at 3.48 TiB total, 2.13 TiB allocated, and 1.36 TiB free. `zfs list -t snapshot` returned no datasets. VM 144 was the second largest volume at 172 GiB, behind VM 138 at 293 GiB; VM 150 used 168 GiB. This is pool-level evidence, not evidence that any other VM or its data can be deleted. An earlier VM listing marked several large volumes as stopped, but their current state and recovery requirements need to be checked before any retirement decision.

## Further bounded recovery on the same day

The later pass recovered another **10,627,510,272 bytes (9.90 GiB)**, measured as the sum of the free-space change at each removal. The root filesystem ended at **75% used, with 85,736,480,768 bytes (79.85 GiB) available**. The separate temporary disk remained at 5% used. No account backup generation, saved user work, current image, or active mount was removed.

| Removed locally | Measured free-space gain | Off-host recovery |
| --- | ---: | --- |
| One failed November 6 PrivateBin updater's disposable Trivy scan cache | 1,692,749,824 bytes | Recreated by a future scan; the updater's private result record was retained |
| 26 old unused tagged Docker images, each checked for current container and configuration references | 2,236,391,424 bytes | Encrypted Restic snapshot `618a90da0234fbe9ffeb83e8b24d39b07e6caccec54d314e7e26a8cd6f43e128` |
| 20 old official SearXNG image indexes, excluding current containers, configured pins, recorded repair inputs, recent images and the current rollback | 4,221,902,848 bytes | OCI archive in encrypted Restic snapshot `1b655769161dff0ffce1b7f6c02f20eaf29fa45fd84e10bf9ea980dc80ae5894` |
| Eight unreferenced old report/build workspaces | 2,476,466,176 bytes | Encrypted Restic snapshot `69bb14f5dd683b730153021d2e892da08ccdef73cef45bd56cc63b3b494f765f` |

The 26-image archive was restored from the Storage Box and its SHA-256 matched `8956436216a617101803bba5d3e08e3d1bba0d13e242b577c1b648094534bdaf` before deletion. The SearXNG OCI archive was restored and verified independently; its SHA-256 matched `d7a8a4e72406eccec647f36685985559d04bb85572041ecac90d4e2490893abf`, and its index listed exactly the 20 selected immutable image digests. A Docker-format archive also exists in snapshot `11f4b60b564af3f7cf9d328e61d257013b33487764522160963a5742dcf2f1a1`, but that format did not preserve the exact multi-platform index identities. Use the OCI archive for exact historical image recovery. Neither Docker nor containerd import has been rehearsed.

The eight-workspace snapshot restored 26,751 files. Independent comparisons found zero differences in file contents, names, symlinks, modes, ownership or modification times across the eight paths before deletion. A separate old Whisper repair workspace was retained because a preview container still mounts it. Old local account backups were also retained: moving them into an indefinite maintenance archive would change their retention. The private selection, restore, comparison and deletion records are under `/var/lib/utilibre-maintenance/space-recovery-20261123`.

The installed weekly disk-reclaim unit now runs the guarded SearXNG image selector before its existing low-space BuildKit selector. The image selector is read-only by default; the unit's `--apply` mode retains every container image, configured or documented digest, the three newest images and all images younger than 14 days. Its manual run after cleanup removed nothing and the BuildKit selector found zero eligible records. The timer remains active for November 29. Future automatic retirement of old official images does **not** create an off-host archive; a historical rollback beyond the retained window may require pulling its recorded digest from the upstream registry. Pin any image needed for a longer-lived repair before it ages out. The former unit files are preserved privately under `/var/lib/utilibre-maintenance/space-recovery-20261123/systemd-before-image-retention`; restoring them and running `systemctl daemon-reload` rolls back the schedule change without touching running services.

After deletion, `fstrim -v /` reported 41.1 GiB of free extents submitted to the virtual disk. This is not a measured reduction in Proxmox ZFS allocation. Final checks found 175 running containers, 90 healthy, none unhealthy, and a healthy SearXNG container. The weekly service completed successfully. No application was restarted.

The largest remaining guest allocations are about 126 GiB in `/var/lib/containerd`, 51 GiB in `/var/lib/utilibre-maintenance`, and 41 GiB in `/opt/utilibre`. Those trees contain active services, pinned repair inputs, published assets and saved-work backups. Their apparent sizes are not a safe deletion list. The Proxmox pool's new physical allocation has not been measured after this pass; the last operator measurement was 1.36 TiB free before it.
