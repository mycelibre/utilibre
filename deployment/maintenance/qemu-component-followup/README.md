# QEMU component attribution — 12 October 2026

Read-only assessment of five named source-package findings on this Utilibre VM.
No package installation, daemon restart, live guest-agent RPC, VM operation or
exploit fixture was performed. This does **not** assess or patch the separate
Proxmox hypervisor, running kernel, other QEMU binaries or any other CVE.

## Exact installed scope

Both `qemu-guest-agent` and `qemu-utils` are
`1:10.0.13+ds-0+deb13u1`. Complete installed files/symlinks match the exact
authenticated Debian archives:

| Package | Files | ELF programs | Archive SHA-256 |
|---|---:|---|---|
| qemu-guest-agent | 12 | `/usr/sbin/qemu-ga` | `7d7d6be6a52d6ea21eabdb78f686e4bb886f933171d33f5f3cf3cf2390343abd` |
| qemu-utils | 16 | `qemu-img`, `qemu-io`, `qemu-nbd`, `qemu-storage-daemon` | `6d31339b1630153fe7c5f8a51426b8fa6ce35731aeb015a84f2d333c4e4dca30` |

Original source `.dsc`, upstream tar and Debian patches were checked against
authenticated APT source indexes. `policy.mjs` pins their relevant Meson and
Debian install mappings; the reviewer requires exact whole-package payloads,
the expected native executable set and unchanged source hashes. Source code
under `hw/sd`, `hw/i386` and `hw/9pfs` enters system-emulator source sets, not
these guest-agent/block-tool targets. The tools have their own block/utility
dependencies; the guest agent has its own QAPI/commands and utility target.
Documentation describing a protocol does not add its server implementation.

## Narrow findings

| CVE | Actual affected component | Guest agent | Utilities |
|---|---|---|---|
| [2022-3872](https://security-tracker.debian.org/tracker/CVE-2022-3872) | SDHCI device buffer data port | component absent | component absent |
| [2023-1386](https://security-tracker.debian.org/tracker/CVE-2023-1386) | emulator 9p passthrough filesystem | component absent | component absent |
| [2026-81627](https://security-tracker.debian.org/tracker/CVE-2026-81627) | x86 VAPIC device setup | component absent | component absent |
| [2026-93834](https://security-tracker.debian.org/tracker/CVE-2026-93834) | emulator 9pfs concurrent path handling | component absent | component absent |
| [2026-12080](https://security-tracker.debian.org/tracker/CVE-2026-12080) | guest-agent SSH authorized-key handling | **affected; left open** | component absent |

Debian's tracker explicitly describes source packages. These observations
justify at most nine narrowly keyed `not-affected` drafts, not a global QEMU
waiver. The real guest-agent finding must not be closed by the other packages'
absence evidence. Other block-format, network-storage and guest-agent findings
remain outside this assessment.

`review.mjs` produced nine drafts from two complete inventories, with no system
changes. Three focused policy tests reject source-family broadening, other
versions/scopes, altered/missing files and—explicitly—an attempted exemption
for CVE-2026-12080 on the guest agent. Drafts expire after seven days and require
fresh scanner identity; they never modify the decision ledger. Raw findings
remain retained. Private evidence is under
`/var/lib/utilibre-maintenance/qemu-component-followup-20261012/`.

The same four emulator exclusions can follow exactly one local guest-agent
derivative, `1:10.0.13+ds-0+deb13u1+utilibre1`, only after its completed native
release and independent control-plane postcheck. The policy pins that candidate
package, executable and single patched source-file hashes. The reviewer compares
the complete live payload, verifies all other files against the original signed
archive, and compares complete source trees: only `qga/commands-posix-ssh.c`
may differ. Original Meson/build graph hashes must remain exact. A merely
prepared build, incomplete restart/postcheck, other version or unknown binary
cannot inherit a review. `qemu-utils` must remain the original signed version.
The SSH-key CVE mitigation stays in its separate single-CVE repair reviewer.

## Remaining guest-agent repair assessment

The native guest agent is running, PID 851 at inspection, with no native reload
operation. Its binary includes the affected SSH-key handler. Lack of observed
use is not a security fix.

The upstream stable-branch
[fix 332ab334](https://github.com/qemu/qemu/commit/332ab334bc6b0b43bc17c90820fec068b63a666b)
is identified for QEMU 10.0.14. It changes one source file,
`qga/commands-posix-ssh.c`, to perform SSH-key operations with the target user's
effective credentials and restore credentials afterwards. The exact patch
SHA-256 is `8b7b122ef83e47078e0f31188405ca1d7dc86f8ba941b2f886abf81295b7e21e`.
It applies to the authenticated installed-version source with zero fuzz and
zero offsets. It uses existing GLib/POSIX APIs: a native guest-agent-only
backport is plausible without replacing libc or installing a system emulator.
This is source-compatibility evidence, **not a built or tested release**.

The existing upstream `qga-ssh-test` can be reused, but its test build skips
`initgroups`; a passing unit suite alone would not prove the privileged path.
A later build must retain the native package/configuration, exercise normal
RPC/credential restoration with synthetic accounts in an isolated environment,
and obtain an explicit safe guest-agent restart window. No real SSH keys,
authorized_keys files or user homes should enter those tests.

The VM cannot establish whether the separate hypervisor is about to issue a
freeze/backup/management command. Before activation, confirm the control plane
has no active backup/freeze task, use its supported read-only guest freeze-status
check, then coordinate a short guest-agent restart. Do not write directly to the
already occupied virtio guest-agent channel from this VM or assume systemd's
`active` status means no RPC is in progress.

## Recheck

```sh
node --test deployment/maintenance/qemu-component-followup/policy.test.mjs
node deployment/maintenance/qemu-component-followup/review.mjs
node deployment/maintenance/qemu-component-followup/assess-guest-agent.mjs
```

The source/package acquisition uses existing authenticated native indexes and
downloads only the two exact binary archives plus original source; no host APT
repositories are changed. All inspection stays within package/source paths.
