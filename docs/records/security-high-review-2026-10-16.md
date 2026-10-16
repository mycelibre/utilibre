# HIGH finding review — 16 October 2026

Scope: the 56 HIGH package-target records awaiting review after the preceding
application-advisory/PyJWT release. These are not 56 distinct vulnerabilities.
This record does not replace the private scanner report or claim all maintenance
is finished. Changes were prepared on `review/high-findings-20261016`, preserving
unrelated work in the production checkout. AI assistance was used; decisions
below are tied to source, package and test evidence, not scanner assertions.

## Disposition

| Original group | Records | Result |
| --- | ---: | --- |
| Kernel findings attributed to userspace headers | 8 | Exact header inventories and pinned Linux CNA records establish no affected implementation in those packages. Actual kernels are not cleared. |
| Xserver passive-grab cleanup | 4 | Existing fixes verified in authenticated patched source and installed host/exporter payloads; compiled real-function regression passes. No new Xserver deployment. |
| OpenSSH advisory attributed to unrelated binary siblings | 6 | Actual dpkg inventories exclude the affected client/server component. No whole-source-package waiver. |
| SSH CLI username validation | 1 | Native stable backport built, tested and deployed in all three coupled SSH packages. |
| Legacy ACL library/callers | 30 | Unresolved: new library APIs require caller migration and compatibility/race testing. |
| GRUB gettext lifecycle | 5 | Unresolved: no compatible tested boot-chain release/recovery window. |
| Actual SSH-server GSSAPI issues | 2 | Unresolved in source; inspected effective GSSAPI authentication/key-exchange settings are off. No mitigation decision inferred from that alone. |

Result: **19 of the original 56 addressed; 37 HIGH records remain open across
four advisory IDs**. The pending CRITICAL count remains **0**, not zero raw
observations: the ledger still retains 42 CRITICAL and 2,658 HIGH raw records.
Existing decisions expire and are reopened when artifact identities change.
The complete queue has 21,955 package-target records; lower severities were not
silently discarded or represented as reviewed by this batch.

The post-release host scan changed the SSH package identities, temporarily
reopening earlier exact-version decisions. A fresh source/payload/test review
re-established those nine prior records, six component attributions and the
new client repair (16 decisions total). This is revalidation, not sixteen
additional newly fixed bugs. All decisions are exact-key and expire in seven
days; raw observations are retained.

## Actual production change

At **09:18:03 UTC**, after the operator confirmed the Proxmox console was
available, `openssh-client`, `openssh-server` and `openssh-sftp-server` changed
from `1:10.0p1-7+deb13u4+utilibre2` to `1:10.0p1-7+deb13u4+utilibre3`.
No other package, application container, host key, SSH configuration, kernel,
bootloader or VM power-state change was made by this release. SSH is active and
the Docker PID is unchanged. The package manager's native SSH service handling
was inside the separately authorized maintenance window.

The backport is upstream
[0c4c9a7b](https://github.com/openssh/openssh-portable/commit/0c4c9a7b320bd7ff61c4a2dc345cb2e27e9663b2).
The intended CLI behavior is documented in the
[OpenSSH release notes](https://www.openssh.org/releasenotes.html#10.6).
It does not claim every newer OpenSSH advisory is fixed.

## Verification and replay

- Complete native Debian build: **742 upstream unit cases passed**.
- CLI regression: four invalid argument forms accepted by the old client are
  rejected for the intended reason by the new client; four ordinary usernames
  and a literal configured username remain supported. No injection executed.
- Existing native SSH suite: **11 checks passed**, including prior regression
  controls, SSH/SFTP, forwarding, 512 KiB content round trips across 16 KiB
  rekeys, rejected changed host keys, PAM and private-realm Kerberos.
- Two Xserver real-function fixtures passed against native host/DHI source.
  Full UAF exploitation was neither performed nor claimed.
- **27 focused Node tests passed**, with zero skips/failures, covering header
  scope and primary evidence, component attribution, Xserver release/source
  bindings and host-refresh failure/freshness handling. No portal UI changed.
- Header review inspected seven locations; ACL inspection covered 36 locations
  with no unverified entries. Only code/package metadata was inspected.
- Release checks matched all five native SSH executables and three packages,
  clean dpkg state, unchanged configuration/key bytes and active services.
- Final live read-only checks also matched the listener process's executable to
  the installed candidate and verified the CLI rejection without connecting.
  Repeating the source/payload reviewer produced zero additional decisions and
  did not alter packages or the ledger.
- Build/test containers had no external network or production mounts. The SSH
  protocol tests used only isolated loopback and synthetic accounts/keys.

The existing per-component mechanisms are extended, not replaced:
[SSH](../../deployment/maintenance/ssh-server-followup/README.md),
[header attribution](../../deployment/maintenance/historical-header-final/README.md),
[Xserver](../../deployment/maintenance/xvfb-single-screen-final/README.md), and
[ACL](../../deployment/maintenance/mount-acl-final/README.md).
The SSH runbook contains exact commands, candidate/source identities and
three-package rollback instructions. No byte-identical build claim is made.

`deployment/maintenance/refresh-host-review.mjs` reuses the existing Trivy
summarizer and queue. `prepare /private/new-directory` scans only an isolated
copy of OS identification and dpkg status using the existing Trivy 0.75.0 and
cached advisory database; a separate network namespace prevents any request.
It records raw output, input/scanner/database hashes and checks unchanged inputs.
`publish DIRECTORY` is a separate explicit report operation, not a package
deployment: it replaces only the host section and rebuilds the existing queue.
It rejects concurrent report/package changes. Image/source results and the
original fleet completion timestamp stay unchanged, so it cannot fabricate a
fresh fleet clearance. Tests reject empty/failed/stale/mixed-database inputs.

The fleet scan remains **15 October 10:32:24 UTC**; host-only refresh is explicitly
timestamped on 16 October. Advisory data was updated **15 October 07:10:08 UTC**,
not refreshed for this comparison. Its 1.6 GiB database identity was recorded
before/after, but an extra database snapshot was not retained given the 8 GiB
disk recovery floor. Exact later replay needs that database content; preserved
raw evidence is not current security clearance. Normal freshness gates remain.

## Private evidence

All paths below are under `/opt/utilibre/reports/`; generated inputs, raw scans,
package manifests and private reports are not committed or publicly published.

| Path | Evidence |
| --- | --- |
| `high-headers-20261016/` | Pinned CNA records, full header inventories, eight proposals |
| `high-xvfb-20261016-r5/` | Fresh source/quilt proof, installed payloads, two compiled fixtures, four proposals |
| `high-acl-20261016.json` | 30 unresolved records, 36 live locations, retained caller-proof hash |
| `high-host-boot-20261016.json` | Ten unchanged boot-file hashes, installed/candidate packages, kernel gap |
| `high-review-activation-20261016/` | First 18 exact decisions, backups, raw-scan hash |
| `ssh-username-20261016-input/` | Pinned source, patch and preparation receipt |
| `ssh-username-20261016-output/` | Packages, complete modified source, build dependency lock and log |
| `ssh-username-20261016-check/` | Native tests, exact proposal/release, source review, 16-key activation and backups |
| `ssh-host-scan-20261016/` | Raw host scan, input snapshot, database identity, prior report and publication receipt |

The authoritative active files remain `/var/lib/utilibre-maintenance/security.json`,
`security-queue.json` and `security-decisions.json`. No notifications, cache
purges, indexing requests or public probes were sent in this work.

## Exact remaining work, not an all-clear

1. **ACL (30 records):** the [Debian tracker](https://security-tracker.debian.org/tracker/CVE-2026-54369)
   documents a new descriptor-based ABI rather than an individually backportable
   correction. Previously observed tar/rsync calls still use legacy APIs.
   Complete an explicit compatible caller migration and native/application
   tests before replacing libraries; no suppression or fake version change.
2. **GSSAPI (two server records):** the two newer fixes must account for Debian's
   separate key-exchange extension and credential lifecycle. Retain the disabled
   configuration; do not enable GSSAPI or copy upstream hunks blindly. A tested
   native candidate and a new SSH window are needed for a source-level repair.
3. **GRUB (five records):** stable `2.12-9+deb13u2` remains vulnerable according to
   the [vendor tracker](https://security-tracker.debian.org/tracker/CVE-2025-61662).
   Its installed cloud-package hooks can rewrite both BIOS and EFI boot paths.
   A module-only update is insufficient because the EFI image embeds the module.
   Follow the [boot assessment](../../deployment/maintenance/grub-assessment/README.md):
   compatible tested boot-chain artifact, recoverable boot disk/ESP/EFI state,
   confirmed Proxmox rescue path and a separately approved reboot window.
4. **Additional actual-kernel gap:** CVE-2026-98260 affects the running
   `6.12.111+deb13-cloud-amd64`. Header-only attribution never clears this.
   The [Debian tracker](https://security-tracker.debian.org/tracker/CVE-2026-98260)
   still lists that stable package as vulnerable. The pinned Linux CNA identifies
   6.12.112 as fixed on that branch, but the inspected APT candidate was 6.12.111.
   Await/test a compatible vendor update and coordinate a separate reboot.
   This manual kernel gap is **additional to**, not hidden within, the 37 count.

No broad pruning was performed. The offline build used bounded temporary RAM
storage; root free space remained approximately 8.5 GiB. Existing application
data, backups, source offers and failed test evidence were preserved.
