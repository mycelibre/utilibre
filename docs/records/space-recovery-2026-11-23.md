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
