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

## SSH candidate prepared; separate activation remains

A compatible backport of Debian's GSSAPI repairs is built at
`1:10.3p1-1~bpo13+1+utilibre2`. It preserves the four earlier corrections.
825 upstream unit cases, the targeted before/after credential-state regression,
12 isolated native protocol checks and the live read-only preflight pass.
A private Kerberos realm verifies successful delegation and GSS rekeying;
no production credentials or accounts were used. The reset-hook check has a
source/native-state proof, not a complete protocol exploit reproduction.

The host still runs `utilibre1`; its two GSSAPI findings remain open. A new
console maintenance window is needed. The [SSH recipe](../../deployment/maintenance/ssh-server-followup/README.md)
contains exact inputs, tests, activation and rollback. This candidate does not
change the last completed fleet count of 0 critical / 73 high pending.

## 01:10 UTC scan: Candlr deployed and rebuild inputs repaired

Candlr's new frontend uses the reviewed Sharp 0.35.5, source-map-js 1.2.2,
Undici 8.12.2 and Vite 8.3.3 build graph. Its older native/backend repairs,
account behavior and privacy configuration remain unchanged. The canonical
lockfile now captures these fixes for future builds. Native before/after TLS,
image, source-map, two-account isolation and save/export/delete checks pass.
Chromium renders the saved record after reload, hides disabled integrations,
and works at a simulated 390px width without external requests. No real-phone
coverage is claimed. The existing release checks passed after activation.

A clean offline replay passed. Of 60 compiled files, 59 were byte-identical;
the server entrypoint changed only in Astro's per-build encryption key. Keep
that randomness: this establishes repeatable preparation, not identical build
bytes. The exact image, source offer, commands and rollback are in the
[Candlr recipe](../../deployment/maintenance/security-20261103/README.md#candlr-build-inputs--4-november).

The complete **01:10:26 UTC** fleet scan and exact-byte revalidation leave
**0 critical / 66 high pending**. Seven high build-input findings were removed;
45 reviews were revalidated specifically against the new Candlr image. The
remaining ACL finding was kept open. Raw totals are 24,414 records, including
64 critical and 2,898 high; pending lower severities are 5,149 medium, 5,439 low
and 949 unknown. Coverage remains 109 images / 175 containers, 83 source
inventories and 508 host packages, against the same retained advisory snapshot.
The high categories above now contain **25** build-input records; other
categories remain unchanged. SSH and Expat still await separate activation.

## PairDrop rebuild lock corrected without a rollout

The canonical PairDrop lock now selects body-parser 1.20.9, matching the repair
already present at runtime. Only that dependency entry changed. Clean offline
installation, the old-crash/fixed-survival parser regression, seven legitimate
requests per state, native routing and WebSocket limits pass. Two Chromium
sessions completed an exact-byte direct transfer with no outside HTTP requests.
This does not retest public relay service or physical phones.

The focused same-database source comparison removes one high parser finding and
retains the separate medium qs finding. The disposable replay image is explicitly
ineligible for deployment because it uses a historical intermediate base. No live
PairDrop container, relay setting or user transfer was changed. The last full
fleet count above remains the 01:10 checkpoint until the next complete scan.
[Commands and evidence](../../deployment/maintenance/security-20261103/README.md#pairdrop-canonical-parser-lock).


## 01:35 UTC scan: Bookplate deployed

Bookplate's pinned rebuild now uses markdown-it 14.3.3 and Vite 8.3.3. The complete
offline build, 82 upstream tests, two-account isolation, save/reload, native ZIP
export and deletion pass. Existing fonts and their layout metrics are bundled
from the prior image, removing build-time Google Fonts fetching. The mobile-width
Chromium view was inspected; no outside browser requests were observed. No real
phone, parser complexity benchmark or byte-identical second build is claimed.
Its production release and public source verification passed without a schema
or account-policy change. [Exact recipes, scope, limits and rollback](../../deployment/maintenance/security-20261103/README.md#bookplate-rebuild-inputs-and-offline-fonts--4-november).

The complete **01:35:06 UTC** fleet scan leaves **0 critical / 63 high pending**.
This includes PairDrop's one corrected source finding and Bookplate's two.
The remaining build-input category is **22**, with the other high categories
unchanged. Raw observations: 24,405 records, 64 critical and 2,895 high. Pending
lower severities: 5,145 medium, 5,437 low and 949 unknown. Coverage remains 109
images / 175 containers, 83 source inventories and 508 host packages, using the
same retained advisory database. These are pending review/repair counts, not a
claim that the raw matches vanished or that the fleet is vulnerability-free.
SSH and resident host Expat activation still need their separate windows.


## 01:46 UTC scan: three dependency recipes repaired

Actual Budget, Grist and Kuma canonical dependency recipes now retain the parser,
redirect and HTTP-client repairs already made in their later runtime layers.
The same-database source checks remove ten high findings. Their isolated native
consumer tests pass; Actual additionally passes Chromium budget creation,
ZIP export/import, sync and reload; Grist passes private document/formula,
two-account isolation, import/export, deletion and synthetic stopped restore;
Kuma passes fresh setup and authenticated Socket.IO login. All test state is
synthetic and external network access is disabled. Existing production images
were not replaced. Intermediate replay images are explicitly nondeployable.
Historical-tag overwrite attempts are rejected, and repeated preparation reuses
the checked candidate without a rebuild. [Commands and limits](../../deployment/maintenance/security-20261103/README.md#actual-grist-and-kuma-dependency-lock-replay--4-november).

The complete **01:46:23 UTC** scan leaves **0 critical / 53 high pending**,
including 12 tracked build-input findings. Raw observations: 24,391
records, 64 critical and 2,885 high. Pending lower severities: 5,141
medium, 5,437 low and 949 unknown. Coverage and advisory snapshot
are unchanged. SSH, Expat and the other unresolved categories above remain open.

## 02:09 UTC: SSH deployed and Expat activated

The operator supplied separate SSH-console and reboot windows. OpenSSH client,
server and SFTP packages now run `1:10.3p1-1~bpo13+1+utilibre2`; the release
verified exact payloads, active SSH, unchanged host keys/effective configuration
and unchanged Docker. The subsequent VM reboot activated the already-installed
Expat 2.10.0-1. All observed host library mappings match the new payload. Native
narrow/wide parsers, Python and private D-Bus consumer checks pass. All 175 prior
containers returned; SSH, Docker, D-Bus and the guest agent are active, and no
systemd units failed. This does not claim every application's user journey was
retested after reboot. The maintenance pause can end.

The **02:09:10 UTC** complete same-database scan and exact installed-source
reviews leave **0 critical / 43 high pending**. Raw observations remain 24,381
records, including 64 critical and 2,879 high. Pending lower severities: 5,137
medium, 5,437 low and 949 unknown. Coverage remains 109 images / 175 containers,
83 source inventories and 508 host packages. Changed SSH package identities
required rechecking earlier repairs as well as the new GSSAPI fixes; three raw
critical matches were reopened and then resolved by that verification, not by
changing a scanner threshold. The 18 SSH and two Expat reviews expire in seven
days and apply only to their exact package/advisory identities.

The remaining high records are 30 ACL, six JOSE v3 build-input, five GRUB, one
Penpot Guava and one Kuma Python-Markdown. Six canonical Go module graphs now
match the exact already-built/tested codec and JOSE v4 repair inputs; those
source-only checks account for the other six removed high records. Their
separate replay work does not change production applications.

[SSH source and build inputs](https://tools.utilibre.org/utilibre-source/openssh-gssapi-utilibre-20261104-source.tar.gz)
are public and hash-verified: 2,244,843 bytes, SHA256
`336ad19d6c645eb44b6976dfb7dd0fc6c7a06b70199af27d0fdfa113b5680b85`.
Private evidence: `ssh-gssapi/checks/{proposal,release,review}.json`,
`ssh-gssapi/source-offer.json`, `expat-host/{release,review}.json`, and
`reboot-20261104/{before,after}.json`, under this release's evidence directory.
Rollback retains the three preceding SSH packages and Expat package; coordinate
the same console/consumer-refresh safeguards. No bootloader files, account data
or retention policies were changed.


## JOSE v3 rebuild checks completed

All six tracked v3 inputs now require the exact previously reviewed RSA patch.
Fresh native suites pass 262 tests before and after, reproducing the old modulus
boundary and verifying rejection afterward. Anubis and OpenGist build and pass
native checks offline; OAuth2 Proxy/Wakapi retain their previously tested exact
builds and immutable-binary verification. The source-only review leaves **0
critical / 37 high pending** against the 02:09 complete scan. No application
image was deployed for this change, no raw finding was deleted, and the review
expires in seven days. The [recipe notes](../../deployment/maintenance/security-20261103/README.md#mandatory-jose-v3-backport-in-rebuilds--4-november)
record command boundaries, earlier rejected attempts and evidence limitations.
Remaining high categories: 30 ACL, five GRUB, one Penpot Guava and one Python
Markdown. Penpot's next candidate is under isolated testing, not yet deployed.
