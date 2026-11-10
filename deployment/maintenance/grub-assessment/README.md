# GRUB vendor assessment and release

## Vendor package installation — 10 November, 11:40 UTC

The operator explicitly confirmed console access and paused backup/snapshot jobs
for a 15-minute window. The eight pinned vendor packages are now installed:
GRUB 2.14-5, signed EFI package 1+2.14+5, and EFI libraries 39-2+b2. Native hooks
successfully installed both BIOS and EFI paths; `update-grub` and its syntax
check passed. Both live EFI loader copies match the authenticated candidate,
and the native/boot module copies match. Shim and firmware boot variables are
unchanged. Docker, SSH and guest-agent PIDs and all 175 running container IDs
were unchanged. No reboot has yet been performed or verified.

`vendor-release.py` is a narrow explicit activation adapter, not an unattended
updater. It requires a current private approval receipt, exact package/input
preconditions, fresh preflight and advisory evidence, the saved boot files and
all eight old packages. It invokes native `dpkg` and hooks, retains local config,
then checks package scope and boot outputs. It does not enable Sid, download,
notify, reboot or accept findings. A repeated invocation refuses the existing
receipt instead of reinstalling. Failure requires operator review; it does not
automatically restore boot state.

Private release evidence is `security-20261109/remaining-high/vendor-release-20261110/`.
The before/candidate/installed scans use the same preserved 10 November database
and show no new high/critical records caused by this change. Raw GRUB matches
remain because of the documented cross-suite advisory limitation. Real VM boot
validation and the corresponding deployed-fix review are still outstanding.
The earlier assessment-only manifests remain unchanged; the scoped user approval
is recorded separately rather than granting a standing deployment permission.

## Vendor-signed candidate follow-up — 10 November 2026

There is now a separate **unmodified Debian package candidate**, pinned in
`vendor-candidate.json`. This does not resume the rejected custom-patch build
below. Debian identifies GRUB 2.14 as fixed for CVE-2025-61662. The current
authenticated Sid input is 2.14-5, with signed EFI package 1+2.14+5 and
`libefiboot1t64`/`libefivar1t64` 39-2+b2. No Sid repository was enabled on the VM.

The isolated APT simulation selects exactly eight upgrades, no additions or
removals, and no libc/kernel upgrade. Six ordinary checks pass: version, the
current boot configuration, a synthetic valid configuration, rejection of an
incomplete configuration, and recognition of both packaged EFI images.
The container runs without networking, as an unprivileged user with a read-only
root, no capabilities, 256 MiB RAM, one CPU and 64 PIDs. It receives authenticated
packages, a private copy of the boot configuration and one pinned public runtime
library. It receives no host boot device, firmware variables or Docker socket.
An executable RAM workspace is needed to run the candidate's tools; other
temporary files remain non-executable. No vulnerability reproduction is run.

`vendor-preflight.py` reuses the distribution signature/index/package checks,
APT simulation and Docker isolation. It performs **no downloads or installation**:

```sh
python3 deployment/maintenance/grub-assessment/vendor-preflight.py \
  --inputs /var/lib/utilibre-maintenance/security-20261109/remaining-high/vendor-inputs \
  --report /var/lib/utilibre-maintenance/security-20261109/remaining-high/vendor-grub-new-check.json
```

Use a new report filename; retained reports are never overwritten. Inputs include
the archived InRelease, compressed package index, archive keyring and exact .debs.
All identities and the current installed-package preconditions are pinned. A
changed package/index is rejected before candidate execution. Repeating the
preflight passed with unchanged host package database and boot files. The first
automated run failed because the staging directory was inaccessible to its
unprivileged user; that failed receipt is retained, alongside the corrected run.

### Ordinary boot and recovery checks

The candidate and the restored previous loader both boot through the installed
shim using authenticated Debian QEMU 10.0.13, OVMF 2025.02-8+deb13u1 and virtio
SCSI. Each loads a Linux kernel into a synthetic RAM-only root and shuts down
cleanly. Both the running `6.12.115+deb13.1-cloud-amd64` kernel and the next
default `6.12.116+deb13-cloud-amd64` kernel passed. The latter is the pinned
replay input. The test uses a fresh 4M OVMF variable template with Secure Boot
disabled, matching the observed setting; it does not test Secure Boot enforcement.

`vendor-boot.py` verifies the retained bundle and fixture hashes before starting
two bounded boot cases. The 45 vendor tool packages were checked against signed
Debian indexes; provenance is in `vendor-boot-packages.json`. The synthetic
initialization and GRUB configuration are retained alongside the runner.

```sh
python3 deployment/maintenance/grub-assessment/vendor-boot.py \
  --inputs /var/lib/utilibre-maintenance/security-20261109/remaining-high/vendor-boot \
  --report /var/lib/utilibre-maintenance/security-20261109/remaining-high/vendor-boot/new-replay.json
```

Use a new report path and normal Python execution without `-O`. No downloads
occur. The unprivileged, networkless container has 768 MiB RAM, one CPU, 128 PIDs
and a 90-second deadline per boot. Only vendor tools and synthetic boot inputs
are mounted read-only. QEMU uses software emulation: no KVM, host devices,
production mounts, firmware variables or container-management socket are passed
inside. An altered bundle is rejected before any container command.

A fresh private boot/configuration archive contains 650 regular files; their
contents match after isolated extraction. The restored EFI loader passed the
same ordinary boot check. Exact authenticated old packages are retained as well.
This is a **boot-file payload and restored-loader rehearsal**, not a full VM
restore, native ownership/ACL restoration test or real production-disk boot.
Private inputs are required for replay; a Git checkout alone does not contain
the recovery archive or archived binary bundles.

### Control-plane backup evidence and disk expansion

The operator supplied OVMF, `boot: order=scsi0`, a separate EFI-state disk with
`efitype=4m`, and a 15 GiB `scsi2` excluded from backups. The pasted 10 November
backup log confirms inclusion of `scsi0` and `efidisk0`, exclusion of `scsi2`,
and successful completion at 00:28:19 after 21m48s. The log's timezone was not
provided. The archive is
`hetzner-backups:backup/vzdump-qemu-144-2026_11_10-00_06_31.vma.zst`.
Its complete integrity and whole-VM restoration have **not** been tested here.
Do not reinterpret the completed job as such a test.

After that 295 GiB backup, the virtual disk was enlarged to 335 GiB. The guest
root partition and ext4 filesystem were expanded online on 10 November, leaving
46 GiB available (86% used). Partition start and boot partitions are unchanged;
the separate 15 GiB temporary disk is unchanged. No reboot or service restart
was needed. This removes the earlier build-space blocker. The current ESP is
`/dev/sdb15`; October device names below are historical. Use recorded partition
identities, not guessed device letters, during recovery.

Private evidence: `proxmox-owner-evidence-20261110.json`,
`proxmox-backup-completion-20261110.json`, `vendor-recovery/boot-files-before.json`
and `vendor-boot/replay-next-kernel.json` under
`security-20261109/remaining-high/`; disk evidence is `disk-expand-20261110/`.

### Candidate security result

The isolated before/after package assessment uses Trivy 0.75.0 with the same
archived database, retrieved 9 November at 06:57 UTC. Its SHA-256 is
`3f021611ab6c0b94ca9f4fb630fb583c200663e8cae430446f89ded1b99fdb29`.
No new high/critical records appeared. The five GRUB records remain in raw
candidate output because the Trixie advisory entry has no fixed version, even
though the installed candidate version is reported correctly as 2.14-5.
Debian's primary tracker marks this vendor release fixed since 2.14-1; the
authenticated signed image also contains the exact new packaged module.
This is a documented cross-suite scanner limitation, not a suppression or a
reason to change the operating-system identity. Raw results and the initial
failed zero-findings assertion are retained. No live decision was recorded;
the five installed host GRUB records remain pending.

### Activation and rollback boundary

At the earlier preparation checkpoint, no GRUB package or live boot file had
been changed. Standing deployment remains disabled in the assessment manifests.
The installation above used a separate scoped approval. Its required decision
was a fresh VM 144
console/maintenance window with backups, snapshots and other guest-agent jobs
paused, followed by an explicitly coordinated reboot. The existing
`grub-cloud-amd64` hooks write BIOS and EFI boot paths during package installation;
this is why ordinary library-update authorization is insufficient.

For a later approved release:

1. Recheck the eight installed-package preconditions, pinned package hashes,
   available disk space, mounted ESP, console and paused jobs. Repeat the
   package simulation against current state; stop if the selected set differs.
   Recheck advisory freshness under the release policy and the scoped vendor
   evidence. The archived successful assessment is not indefinite clearance.
2. Refresh the private boot-file/configuration copy if it changed. Keep the
   exact eight old Debian packages and the successful Proxmox archive available
   outside the guest. Do not enable Sid globally or use a wildcard over the
   mixed assessment package directory.
3. Install only the eight exact candidate files listed in `vendor-candidate.json`
   using the native package manager and hooks. Run native `update-grub` and
   `grub-script-check /boot/grub/grub.cfg`; the trigger-only path does not itself
   guarantee configuration regeneration. Verify both Debian/fallback EFI copies,
   native modules, expected kernel entries and package state before reboot.
4. Coordinate the reboot with the console operator. Verify actual boot, kernel,
   filesystem mounts, guest-agent ping/thaw state and existing service health.
   Only then record exact deployed evidence for the five findings.

If the VM remains reachable, a separately approved rollback uses the eight
retained old packages together, native hooks and configuration regeneration;
an image rollback cannot undo host boot changes. If it cannot boot, use the
Proxmox console/rescue environment to identify and mount root and ESP from the
recorded partition identities before restoring the trusted boot material.
Keep current account data intact. The successful whole-VM archive is a separate
fallback that would also revert newer persistent data; do not force-restore it
over the VM automatically. No restore or reboot is scheduled by these scripts.

Private evidence: `security-20261109/remaining-high/vendor-grub-final.json`,
`vendor-grub-preflight-2.json`, `vendor-grub-preflight-repeat.json`, and the two `vendor-grub-altered-*.json`
rejection reports. The package source is
<https://deb.debian.org/debian/>; vulnerability status is
<https://security-tracker.debian.org/tracker/CVE-2025-61662>.

## Historical October assessment

This is **not a deployed repair or a vulnerability waiver**. It investigates
CVE-2025-61662 only; no GRUB package install, EFI/NVRAM write, `grub-install`,
`update-grub`, VM reboot or live boot test was performed. QEMU guest-agent's
separate short restart window does not authorize a bootloader change.

## Later host activation and interrupted staging

At 19:04 UTC the VM restarted outside this assessment. The read-only follow-up
confirmed the expected kernel, an active guest agent and current libmount
mappings, with no old deleted-library mappings in host processes. That closes
the separate library-activation dependency. It does not repair GRUB or establish
a control-plane filesystem-thaw/boot-restore test.

A later isolated candidate build acquired authenticated QEMU/OVMF tooling only
inside a disposable compiler container. Automatic security review rejected the
continuation because of possible cybersecurity risk. No completed native boot
test or releasable candidate is recorded, and no production boot file changed.
The unfinished prototypes and receipts are retained privately, not presented
as tested release scripts. The idle compiler containers were stopped and kept.
The deployment prerequisites below remain open.

## What is actually installed

The native `grub-common`, `grub2-common`, `grub-pc-bin`,
`grub-efi-amd64-bin` and `grub-efi-amd64-unsigned` packages are
`2.12-9+deb13u2`. `grub-efi-amd64-signed` is
`1+2.12+9+deb13u2`; signed shim is also installed.

- This VM booted in UEFI mode. ESP is `/dev/sda15`, FAT, mounted at `/boot/efi`.
  `BootCurrent` is `0003`, described as `UEFI QEMU QEMU HARDDISK`. Its device
  path specifies a disk, not an individual EFI filename.
- `mokutil --sb-state` and the EFI variable both show **Secure Boot disabled**,
  with platform Setup Mode. This is an existing observation, not a policy change.
- Fallback `/EFI/BOOT/BOOTX64.EFI` and Debian `shimx64.efi` match the installed
  signed shim. Both fallback and Debian `grubx64.efi` match installed
  `grubx64.efi.signed`, SHA-256
  `425ffb5b84e8738084815d9df4a33c0e5f64409c7aadeb3dd3bcf60357551c5a`.
- That EFI image contains the exact current native `gettext.mod` bytes at file
  offset 548648. The native and `/boot/grub/x86_64-efi/gettext.mod` copies match
  SHA-256 `2ab58a070190d5d424b2d2ef287f262de4c0461da5d001e3b4837492d62bab1d`.
  Replacing only `/usr/lib/grub/.../gettext.mod` would therefore not establish
  that the embedded boot image is fixed.

The fallback chain is the likely disk-boot path, based on the disk entry and
installed files. It is **not** a recorded observation of which EFI filename the
firmware executed. No future boot success or rollback is inferred from hashes.

## Critical native installation side effect

`grub-cloud-amd64` is installed and `/etc/grub.d/enable_cloud` exists. Its native
trigger watches `/usr/lib/grub/i386-pc`, `/usr/lib/grub/x86_64-efi`,
`/usr/lib/grub/x86_64-efi-signed` and `/usr/lib/shim`.
Its postinst invokes **both** BIOS `grub-install --target=i386-pc` and EFI
`grub-install --target=x86_64-efi --no-nvram --uefi-secure-boot --force-extra-removable`.
Configuration also runs `update-grub`.

Consequently even installing a seemingly small native module package can
automatically rewrite boot paths. An APT package-count simulation alone would
not prove absence of boot-disk writes. Do not run such a package install as an
ordinary no-reboot library update. Do not disable these hooks merely to make a
candidate appear deployed while the boot image remains unfixed.

## Upstream fix and native source compatibility

The [Debian tracker](https://security-tracker.debian.org/tracker/CVE-2025-61662)
identifies an unregistered-command/use-after-free defect on gettext module
unload. It records native Trixie `2.12-9+deb13u2` as vulnerable/no-DSA (minor),
and `2.14-1` as the first fixed unstable source release. That is not a reason
to install the whole unstable boot stack or to waive this installed finding.

The exact [upstream fix 8ed78fd9](https://github.com/rhboot/grub2/commit/8ed78fd9f0852ab218cc1f991c38e5a229e43807)
stores the registered gettext command and unregisters it on module unload.
It changes one file, 12 additions/7 deletions. Patch SHA-256:
`a215806263a8cc0ab5bf92d269148ea5a76a7740d3de2e3015dd6d4d99a89571`.

Authenticated native source archives were acquired from the existing Debian
indexes and unpacked privately. `patch --dry-run --fuzz=0` succeeds with **five
line offsets in all three hunks**, not zero offsets. The matched contexts are
the same init/fini handlers in `grub-core/gettext/gettext.c`. No patch was applied
to the live source/package/bootloader. A bounded native-source backport build is
plausible without changing the GRUB major version, libc or kernel, but no completed candidate build or boot test is
recorded.

Existing upstream gettext checks (`gettext_strings_test`, `grub_script_gettext`)
can be used in isolated staging, along with the upstream check suite and a
disposable BIOS/OVMF boot environment. Those existing tests do not by themselves
exercise this specific module-unload lifecycle or establish a recoverable
production boot. Building/testing must occur without mounted host block devices,
EFI partition or writable firmware variables.

## Exact remaining deployment prerequisites

1. A reviewed build/tested native candidate that fixes both the installed modules
   and the EFI image actually selected at boot, preserving native modules and
   the existing signed-boot path. A locally rebuilt EFI image will not carry
   Debian's vendor signature. Do not silently replace trust policy or enroll
   new keys. Prefer a compatible vendor-signed fix; a local boot-chain plan
   requires its own explicit decision and testing.
2. Control-plane confirmation of the actual firmware/boot order and access to
   the Proxmox console/rescue path. Generic disk `BootCurrent` alone does not
   establish the exact file path to update or how the firmware will fall back.
3. A verified recoverable copy of the current boot disk/ESP and associated VM
   EFI-variable state, with an identified rollback procedure outside the guest.
   Existing application/source backups are not proof of this recovery. No
   current whole-VM boot restore has been verified by this assessment.
4. A separate planned VM reboot/boot validation window, with console access and
   rollback available. The completed guest-agent restart needed no VM reboot
   and is not this window.

Until these prerequisites are met, retain the findings as unresolved. The
issue concerns bootloader command/module handling, not a remotely verified
HTTP exploit of a Utilibre service; that distinction is not an exemption.

## Evidence/reproduction

```sh
node deployment/maintenance/grub-assessment/inspect.mjs
```

This only reads live EFI/package state, downloads exact authenticated native
source plus the pinned upstream patch, and performs a private dry-run. It checks
that inspected boot-file hashes are unchanged. The private non-user-data record
is `/var/lib/utilibre-maintenance/grub-assessment-20261012/evidence.json`.
No decision ledger, boot configuration or service is changed.
