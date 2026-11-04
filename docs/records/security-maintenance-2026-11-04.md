# Security maintenance — 4 November 2026

Checkpoint at 00:28 UTC; this is not a claim that all findings are resolved.
No user documents, credentials or detailed scan inventories are published here.

## Completed release

| Scope | Change | Observed verification |
| --- | --- | --- |
| VM guest agent and block utilities | Debian Backports QEMU `1:11.1.2+ds-3~bpo13+4` | Native preparation, exact packages, active agent, unchanged other services; operator confirmed Proxmox ping and thawed status. No VM reboot. |
| Penpot backend/exporter | Official libXi `2:1.8.4-1` | Fourteen native XInput cases per image/state, ABI preservation, application/graphics checks and live release gates. |
| VM libraries | libXi `2:1.8.4-1`, SQLite `3.46.1-7+deb13u2+utilibre1` | Sanitizer regressions, queries, synthetic backup/restore, corruption rejection; no resident consumers and no service restart. |
| Kuma and VM OAuthlib | Two-file identity-binding backport onto Debian 3.2.2 | Both affected grants reproduce the old defect; thirteen fixed/legitimate cases pass. Native Kuma login/Socket.IO and crypto consumers pass; host cloud-init signing tested offline. |

[Recipes, source offers, exact inputs, rollback and limitations](../../deployment/maintenance/security-20261103/README.md).
Private evidence is in `/var/lib/utilibre-maintenance/security-20261103/` and
`security-20261028/qemu-native/`. Completed receipts record artifact identities
and deployment scope. The QEMU maintenance pause has ended.

Thirty-seven targeted Node policy tests and eleven host-update-policy tests pass.
The tests reject wrong artifacts, missing behavior, incompatible scope and
incomplete review evidence. They supplement the native tests above; they are not
an independent penetration test. No notification was sent by these checks.

## Scan and remaining work

The fleet scan completed at **00:19:02 UTC**: 109 images covering 175 containers,
83 source inventories and 508 host packages. It used the deliberately retained
3 November Trivy advisory database. No target scan failure was hidden.

After exact-image revalidation, the queue contains **0 critical and 77 high
package/target records awaiting review or repair**. Raw observations remain:
24,437 records, including 64 critical and 2,909 high. Those are scanner matches,
not counts of confirmed exploitable flaws. Existing, expiring byte-specific
mitigations and component-attribution decisions account for the distinction.
There are also 5,159 medium, 5,441 low and 949 unknown records awaiting review.

| High records still open | Dependency or next engineering step |
| --- | --- |
| 30 ACL records | Legacy tar/rsync callers need the appropriate upstream descriptor-based API migration; a library-only update does not fix them. |
| 36 tracked build-input records | Prepare compatible replacement lockfiles and enforce the repair sequence. Preserve historical baseline locks needed for existing rebuilds. |
| 5 GRUB records | No tested boot/recovery candidate. Prior isolated continuation was rejected by automatic security review. Do not bypass that rejection or write boot files during ordinary library maintenance. |
| 2 host Expat records | Matching candidate exists; resident D-Bus/Python consumers need a coordinated activation plan and verification. |
| 2 OpenSSH server records | Prepare a compatible fix for the GSSAPI extension and test the coupled client/server/SFTP packages; a new console maintenance window is required for activation. |
| 1 Penpot Guava record | Main and Closure Compiler shaded copies need compatible repairs; updating the main dependency alone is insufficient. |
| 1 Kuma Python-Markdown record | Current upstream version still exhibits the reported parsing problem; a version bump alone is not a repair. |

The authenticated QEMU source proves the SDHCI and 9p emulator components absent
from the installed guest-agent/utility packages. This resolves four attribution
records, not four newly patched defects, and says nothing about the Proxmox host.
The same discipline was applied when new image identities reopened older reviews:
no blanket suppression, severity reduction or scan exclusion was added.

All counts describe this checkpoint. Later advisory data, changed artifacts or
expired reviews can legitimately change them. Preserve the raw report, reviewed
decisions and acquisition receipts to explain that change.

## 00:38 UTC follow-up

Markmap's parser/client repair is now live. `markdown-it` 14.3.3 and `undici`
6.29.1 replace only those two entries in its dependency graph. The static bundle
was rebuilt offline; the existing NGINX/runtime repairs were preserved. Native
TLS verification fails as expected before the repair and succeeds afterward.
The ordinary HTTP cases, five bounded Markdown cases, EN/ES editing, SVG/Markdown
export, malicious imports and local-storage failure checks pass. Chromium desktop
and a 390px viewport were tested, with zero external browser requests. This is
not real-phone verification or a large-input parser benchmark.

The completed **00:38:02 UTC** scan leaves **0 critical / 73 high** pending,
including **32** historical/current build-input records. Raw totals are 24,430
records (64 critical / 2,905 high). Pending lower severities: 5,157 medium,
5,440 low and 949 unknown. The same advisory snapshot was retained for comparison.

Host Expat 2.10.0-1 was installed without restarting services. Its parser, Python
binding and private D-Bus tests pass. Existing D-Bus/Python processes still use
the former mapping; the activation guard deliberately rejects completion.
The two host Expat findings remain pending. A **new** maintenance window is
required for consumer refresh or a controlled reboot; the earlier QEMU window
does not cover this. No SSH reload or bootloader change was performed.

The [recipe notes](../../deployment/maintenance/security-20261103/README.md)
contain the complete source offer, exact artifact, activation steps and rollback.

A fresh offline Markmap replay reconstructed the pinned Git tree and produced
eleven static files with identical bytes. Archive timestamps differed. The
private `markmap/replay.json` records this limited reproducibility check; no
byte-for-byte container-image claim is made, and replay changed no running service.
