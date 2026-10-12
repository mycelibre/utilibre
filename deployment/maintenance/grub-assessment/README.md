# Read-only GRUB assessment — 12 October 2026

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
