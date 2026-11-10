# Security maintenance — 10 November 2026

**Deployed and verified. The pending queue fell from 319 to 30 high
package-target records; zero critical records await review.** This is not
completion of all security work or a claim that raw scanner matches vanished.

| Original 319 records | Disposition |
| --- | --- |
| 284 Kerberos occurrences | Signed upstream 1.22.3 installed and verified |
| 2 Symfony HttpClient occurrences | Exact compatible upstream source installed |
| 2 Linux header-package occurrences | Reviewed against affected-component evidence |
| 30 ACL occurrences | Open: compatible caller/library migration required |
| 1 Python-Markdown occurrence | Removed with the explicitly approved unused Apprise integration |

The rebuilds changed image identities, so existing artifact-bound reviews were
revalidated against their exact current bytes and completed release ancestry.
That temporarily increased the pending count. Raw metadata and findings were
retained; no blanket severity change, file exclusion or permanent waiver was used.
Current reviews expire after seven days, and conditional historical Go reviews
also reopen when their guarded code, locks or current runtime changes.

## Installed changes

- **Kerberos 1.22.3:** 16 runtime images, 18 container roles and four unloaded
  host libraries. Services include Linkding, FreshRSS, Rallly, Priviblur, RSSHub,
  Penpot backend/exporter, BreezeWiki, Uptime Kuma, Gathio PostgreSQL, RSS-Bridge,
  LiberaForms, Authentik server/worker, Grist, both TURN services and KitchenOwl.
  Bookworm/Trixie distribution integration and previous local repairs remain.
- **Wallabag and Pollaris:** `ScopingHttpClient.php` from Symfony 5.4.56/7.4.23,
  including the Pollaris worker. Existing HttpClientTrait and ExpressionLanguage
  corrections remain byte-identical. No database migration or access change.
- **KitchenOwl compatibility:** rebuild the same Psycopg2-binary 2.9.12 source
  against native libpq 17.11. Its old bundled libraries depended on private
  helpers removed by upstream Kerberos. Source/version and application features
  remain; 15 bundled native libraries are replaced by system dependencies.

Total: **18 images / 21 container roles**, plus four host libraries. The host
library update restarted no host service and preserved container IDs during
that operation. This batch did not reboot the VM or change disk/retention policy.
The previously completed GRUB reboot remains a separate November 9/10 record.

All exact prior/new image identities, container names, source offers and evidence
hashes are in [status.json](../../deployment/maintenance/security-20261110/status.json).
The [operator recipe](../../deployment/maintenance/security-20261110/README.md)
describes build, verification, release boundaries and rollback.

## Follow-up: optional Kuma integration removed

At **14:51 UTC**, the owner-approved removal of unused Apprise was deployed to
Uptime Kuma **2.5.6**. Read-only inspection found no configured notification
channels. The native availability check now detects Apprise as absent; native
SMTP/ntfy providers and the separate SMTP maintenance-email implementation remain.
This intentionally removes an optional capability, not a Python-Markdown source
repair. No application, account, monitor, access or retention policy was changed.

The final image is
`sha256:342a78264eb0b69ea78826a31bf1f4cd7dfac2b8fb8ac825bb17a35e72363b4c`,
referenced by `utilibre-kuma:without-apprise-20261110`. Only Apprise 1.10.0-1 and
Python-Markdown 3.4.1-2+deb12u1 were purged. **150 retained packages and 48,633
filesystem entries** are unchanged, including previous repairs. The 573 changed
paths are the removed packages' files/cache/directories and exact dpkg bookkeeping;
image runtime configuration is unchanged. No automatic dependency removal.

Both old and new images passed eight ordinary functional checks in fresh,
networkless, bounded containers: setup, authenticated login, native Apprise
detection, ntfy delivery, SMTP delivery, a successful HTTP monitor heartbeat,
status-page creation and monitor deletion. All inputs were fictional; notification
receivers were loopback test sinks. No real email/ntfy message or exploit test.
The saved native SQLite configuration was backed up before deployment; accounts,
monitors, notification settings, tags and status pages match afterward. Repeating
the release verified the current state without recreation; unsupported baseline
preparation rejected safely. Existing release/lineage unit suites pass **24 tests**.

The **14:53:24 UTC** complete fleet scan covers 109 runtime images, 175 containers,
113 source inputs and the host with no incomplete targets, using the same local
Trivy 0.75.0 advisory snapshot. The removed packages and Markdown finding are
absent, with no new high/critical candidate findings. Existing Kuma repairs were
revalidated using 171 exact, expiring payload/component decisions; raw findings
remain. Current fleet totals are **24,771 raw package-target records**, including
**66 critical / 3,354 high** raw matches, distinct from **0 critical / 30 high
pending**. All pending high records concern the separate ACL migration.

After release, all 175 production containers remain running (90 healthy checks,
85 without container health checks), with no failed systemd unit. Only Kuma's
container was replaced; no host service was restarted. Its public status page
returns HTTP 200. This check does not establish historical uptime or every
provider's live external connectivity.

[Removal recipe, commands and rollback](../../deployment/maintenance/security-20261110/kuma-without-apprise/README.md).
Private evidence: `security-20261110/kuma-without-apprise/` under the existing
maintenance evidence root. The old exact image and protected SQLite snapshot
remain available. Future upstream upgrades must preserve the package-absence
gate and native workflows or explicitly review a replacement integration.

## Verification and practical limits

- Initial batch scan completed **13:34:21 UTC**: 109 runtime images, 175 containers,
  113 source inputs and host assessment checked; no incomplete target.
  Trivy 0.75.0, advisory DB updated **06:59:14 UTC**, retained unchanged for
  the before/candidate comparisons. All candidate gates found no new high or
  critical findings. Archived results are not future security clearance.
- That initial scan recorded **24,782 package-target records**, including
  **66 critical / 3,356 high** version-based matches. Exact mitigation/component
  reviews distinguished these from its **0 critical / 31 high pending** queue.
  The later Kuma follow-up and latest counts are recorded above.
- 15 ordinary Kerberos API operations before/after each candidate; isolated
  KDC ticket acquisition, GSS and SPNEGO exchanges and ticket destruction pass
  for both Debian suites. Complete payload, ELF consumer, public ABI and SONAME
  checks pass. Mounted native plugins and future downloads are not covered.
- Gathio's synthetic PostgreSQL/PostGIS/XML/DocumentDB workflow, role isolation,
  dump/restore and GDAL pass. TURN has seven isolated protocol/authentication/
  quota checks; no public relay load test or capacity promise is inferred.
- Wallabag's native two-account workflow/export/isolation and Pollaris's
  two-session Chromium poll creation/vote/export/delete pass. Pollaris made zero
  external browser requests during that fixture. Twenty ordinary HttpClient
  operations pass per original/candidate image. No credential-leak reproduction.
- KitchenOwl's synthetic account isolation, recipe import/export and actual
  isolated PostgreSQL UTF-8/transaction checks pass. The offline, unprivileged
  same-source driver rebuild matches the original extension SHA-256. This does
  not establish byte-for-byte reproducible images or Debian packages.
- Both clean source preparations apply the 11 distribution integration patches
  sequentially without fuzz. Existing evidence/workspaces are preserved on
  repeated invocation. All 16 recorded recipe gates and eight negative cases
  pass; two comparison tests keep unrelated package changes visible.
- **75 focused policy tests pass.** Separately, 50 retired-command guard checks
  and 83 condition-policy checks pass (these suites overlap; do not add them
  together as unique tests). No exploit reproduction or live security probe.
- Final live inspection: **175 running production containers**, **90 healthy**
  configured health checks, **85 without container health checks**, zero failed
  systemd units. This is not end-to-end verification of every public feature.
  Root filesystem has approximately **42 GiB available**; no pruning occurred.

## Repeatability and source availability

The existing finite build/release system now recognizes this exact batch.
Inputs, compiler images, package hashes, compatible source commits, native
fixtures, file scope and required gates are recorded. Networkless preparation
and verification remain separate from explicitly authorized production release.
No LLM, moving dependency resolution or automatic conflict repair is required.

Signed MIT source, Debian source packages, final recipes and Psycopg2 source
with notices are published through the existing source-serving route:
[Kerberos source archive](https://tools.utilibre.org/utilibre-source/security-kerberos-20261110-r2-source.tar.gz)
(HTTP 200 checked). The original archive remains available.
[Symfony source archive](https://tools.utilibre.org/utilibre-source/security-symfony-20261110-source.tar.gz)
contains the original/repaired components and MIT notices.
Compiler images and reviewed binary packages are retained locally; they are
prerequisites for replay, not artifacts claimed to exist in GitHub.

Private evidence remains under
`/var/lib/utilibre-maintenance/security-20261110/`; raw scan and exact review
records remain in the existing maintenance directory. Public reports contain
no user documents, account fixtures, runtime configuration or secret values.

## Remaining blockers

1. **30 libacl1 records, CVE-2026-54369:** a compatible caller/library migration
   remains necessary. Earlier automatic approval review rejected the custom
   repair/reproduction path. It was not retried or treated as resolved.

The earlier Kuma Python-Markdown blocker is resolved by the separately approved
removal above. The corresponding optional Apprise capability is unavailable;
native notification providers remain. No upstream fixed-version claim is made.

Rollback preserves data: restore only the recorded previous image/configuration
for the affected service group and repeat its health/route/companion checks.
No schema migration was introduced. Host rollback needs the retained four
authenticated previous packages and a fresh resident-consumer check; image
rollback does not reverse user activity or persistent data changes.
