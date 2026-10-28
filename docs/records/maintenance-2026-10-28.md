# PairDrop, disk headroom and security review — 28 October 2026

Checkpoint: 07:15 UTC. This is a maintenance record, not a clean-security or
uptime claim. No application image, database, access policy or retention setting
was changed. No VM reboot was performed at this checkpoint.
The authorized reboot and its verification were subsequently completed; see the
post-reboot result below.

## PairDrop

The overnight direct-transfer check had already received the exact synthetic
file when it failed to find a nominated ICE statistics record. Its diagnostic
showed a connected peer. A fresh run of the original check passed; the failure
was intermittent, not a demonstrated failed file transfer.

The checker now uses the transport's selected candidate-pair identifier, with
the existing successful/nominated-pair fallback, and waits at most five seconds
for statistics. It retries observations, not file delivery. Missing statistics,
missing candidate records and an incorrect connection mode still fail. Only
candidate types are recorded; no peer addresses, SDP or room identifiers.

Six regression cases pass, as does the real HTTPS synthetic transfer. The
scheduled journeys service then passed all eight workflows: portal EN/ES/mobile,
PDF/OCR, chart export, image export, ZIP round trip, QR/offline/mobile, PairDrop
and Pollaris create/vote/export/delete. The previous failed service state cleared.
Coverage is Linux Chromium with mobile emulation and two browser sessions on
this VM; this does not establish phone or cross-network relay coverage.

Reference: [WebRTC selected candidate pair](https://developer.mozilla.org/en-US/docs/Web/API/RTCTransportStats/selectedCandidatePairId).

## Disk

Root filesystem availability rose from approximately **12.5 GiB to 27.3 GiB**;
reported usage fell from 94% to 87%. No disk resizing or backup pruning occurred.

- Retired 860 untagged image records older than seven days, referenced by neither
  containers nor repository/configuration inputs. All tagged images were kept.
  Exact-ID plans, immediate reference checks and Docker's non-force removal were
  used. The final check confirmed every protected image and original container
  unchanged. This recovered about 1.5 GiB, not the sum of image virtual sizes.
- Removed 21 untracked, unmounted `node_modules` directories from reviewed build
  checkouts. Source, lockfiles and build output remain. This recovered about
  5 GiB. Rebuilding those projects requires reinstalling their locked dependencies.
- Compressed 11 inactive historical build/cache trees. Each archive was compared
  against its original with GNU tar, including content and metadata, and hashed
  before the unpacked tree was removed. Approximately 4.86 GiB of local compressed
  archives preserve these inputs. Packages and evidence outside the selected
  worktrees, public source offers, user content and backups remain untouched.
- Explicitly selected older BuildKit records recovered only about 12 MB. Shared
  layers were retained; cache estimates were not treated as reclaimed space.

The existing cleanup scripts remain operator commands, not new scheduled jobs.
Four tests cover reference protection, invalid/recent ages, active records and
excluded cache types. The image command also reads nonignored untracked project
files so in-progress repair manifests protect their referenced images.

Private receipts: `/opt/utilibre/reports/image-cleanup-utZJ6t/` and
`/var/lib/utilibre-maintenance/maintenance-20261028/`.

To restore an archived worktree before rerunning its historical build, use the
exact archive path and SHA-256 in `build-tree-archive-result.json`. Check free
space, confirm the original directory is absent and verify the archive hash;
then extract that archive with
`tar --acls --xattrs --zstd -xpf ARCHIVE -C /var/lib/utilibre-maintenance`.
Do not extract over a newer working tree. This restores build material, not user
data. Retired untagged build images have no immediate image rollback; retained
tagged releases and source-based rebuild inputs are the recovery path.

## Security assessment

The fresh scan completed at **07:07:09 UTC** using Trivy 0.75.0 and the same
advisory database as October 27 (database timestamp 07:13 UTC). Coverage:
109 running-image identities, 58 source inventories, and host packages; all
reported checked, with no failed extraction targets. This deliberate comparison
did not refresh advisory data. Separate Caddy and Proxmox hosts are outside it.

At the checkpoint:

| Measure | Result |
| --- | ---: |
| Raw critical package/target records | 71 |
| Critical records awaiting review | 0 |
| Critical records with verified existing mitigation | 16 |
| Critical records with package/component non-applicability evidence | 55 |
| Raw high package/target records | 3,395 |
| High records still awaiting review | 813 |

The initial nine critical pending records were `linux-libc-dev` matches for
CVE-2026-98959, CVE-2026-99078 and CVE-2026-99083. Exact installed inventories
contained headers/docs, not the affected executable kernel components. Linux
CNA commit `75b5151ba0413f17172c96bed07d8a67f865a230` supplied the affected file
paths. These are narrow component decisions, not kernel fixes or suppressions.

Older seven-day decisions expired during this session and reopened additional
records. Existing reviewers rechecked actual library/package bytes, preserved
native regression evidence, source patches, component inventories and exact
image lineage. SSH source/payload checks were also repeated for the three
critical reviews due to expire later that morning. No decision was extended
solely because it had previously been accepted. Raw observations and severities
are retained; reviews still expire after seven days.

Of the 813 remaining high records, 449 were already pending in the initial queue;
364 are expired reviews requiring further revalidation. These are package/target
records, not unique vulnerabilities or confirmed exploits. Priorities are:

1. Evaluate pinned Brotli and curl fixes against the affected Alpine runtime
   images, preserving current privacy/source patches and native workflows.
2. Prepare exact lockfile updates for Undici/body-parser and rebuild the affected
   Go binaries; verify each real consumer before deployment.
3. Revalidate the remaining older mount, ncurses, Python and other local repairs;
   retain unresolved source-component matches and missing evidence explicitly.

The exact grouped work list, candidate versions, affected targets and distinction
between new/unreviewed and expired reviews are in private `handoff.json`.
This batch did **not** patch or close all high findings. A fixed-version string
is a candidate input, not compatibility evidence or deployment approval.

## Kernel and completion boundary

Running: `6.12.111+deb13-cloud-amd64`. Installed and selected by GRUB:
`6.12.113+deb13-cloud-amd64`. GRUB syntax and initramfs readability passed.
The guest agent is active, and all running containers whose Docker restart
policy is `no` have enabled systemd supervision. No failed unit was observed.

The installed update fixes the referenced Btrfs and mlx5 issues. The separate
ksmbd Kerberos issue remains unfixed in Debian stable, but
`CONFIG_SMB_SERVER_KERBEROS5` is disabled in both installed kernels; no Btrfs,
mlx5 or ksmbd module was loaded during inspection. This does not assess other
kernel vulnerabilities or the Proxmox kernel.

Sources checked October 28: [Btrfs](https://security-tracker.debian.org/tracker/CVE-2026-98959),
[mlx5](https://security-tracker.debian.org/tracker/CVE-2026-99078),
[ksmbd](https://security-tracker.debian.org/tracker/CVE-2026-99083).

Reboot remains dependent on the operator confirming current Proxmox-console
access and paused backup/snapshot jobs. The previous kernel remains available
in GRUB's advanced menu. After a reboot, verify `uname -r`, mounted data volumes,
systemd failures, container health and the bounded journeys suite before declaring
activation complete. No database migration or data rollback is involved.

The PairDrop checker change is already used by the host's existing daily job;
there is no application deployment for this change. It can be rolled back by
restoring the prior checker file. All other code changes extend existing
operator-only cleanup/review tools; they do not add automatic approvals or an LLM
to the scheduled execution path.

## Post-reboot result — 07:54 UTC

The operator explicitly requested the reboot. Preflight found no active guest
backup/build jobs, package-operation locks, unhealthy containers or failed units.
A normal systemd reboot was used, allowing services to stop cleanly. The operator
reported the VM had returned, and the following checks independently passed:

- The boot ID changed and the running kernel is now
  `6.12.113+deb13-cloud-amd64`, matching the intended installed kernel.
- All 175 previously running containers returned, with the same image identities;
  none was unhealthy. Previously stopped containers were not started for testing.
- The root, EFI, TRIP data and temporary-data mounts returned with their original
  sources. Root free space was approximately 27.1 GiB.
- systemd reported running with no failed units; the QEMU guest agent was active.
- All eight existing bounded workflow checks passed again after reboot, including
  the direct PairDrop transfer and Pollaris cleanup. Browser/device limitations
  remain those described above.

Private before/after receipts are `maintenance-20261028/reboot-before.json` and
`maintenance-20261028/reboot-after.json` under `/var/lib/utilibre-maintenance`.
The kernel activation is complete. No application images or database schemas
changed. The 07:15 security assessment and its remaining high-severity backlog
are separate from these boot checks; this verification did not rerun or refresh
the vulnerability scan.
