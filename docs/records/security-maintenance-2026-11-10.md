# Security maintenance — 10 November 2026

**Deployed and verified. The pending queue fell from 319 to 31 high
package-target records; zero critical records await review.** This is not
completion of all security work or a claim that raw scanner matches vanished.

| Original 319 records | Disposition |
| --- | --- |
| 284 Kerberos occurrences | Signed upstream 1.22.3 installed and verified |
| 2 Symfony HttpClient occurrences | Exact compatible upstream source installed |
| 2 Linux header-package occurrences | Reviewed against affected-component evidence |
| 30 ACL occurrences | Open: compatible caller/library migration required |
| 1 Python-Markdown occurrence | Open: compatible verified repair unavailable |

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

## Verification and practical limits

- Full scan completed **13:34:21 UTC**: 109 runtime images, 175 containers,
  113 source inputs and host assessment checked; no incomplete target.
  Trivy 0.75.0, advisory DB updated **06:59:14 UTC**, retained unchanged for
  the before/candidate comparisons. All candidate gates found no new high or
  critical findings. Archived results are not future security clearance.
- Raw fleet totals remain **24,782 package-target records**, including
  **66 critical / 3,356 high** version-based matches. Exact mitigation/component
  reviews distinguish these from the **0 critical / 31 high pending** queue.
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
2. **One Kuma Python-Markdown record, CVE-2019-25781:** no verified compatible
   correction for the existing Apprise notification dependency. Removing it
   would disable legitimate functionality. It remains open.

Rollback preserves data: restore only the recorded previous image/configuration
for the affected service group and repeat its health/route/companion checks.
No schema migration was introduced. Host rollback needs the retained four
authenticated previous packages and a fresh resident-consumer check; image
rollback does not reverse user activity or persistent data changes.
