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

## ACL follow-up: assessment completed, repair still open

At **15:46 UTC**, the existing read-only ACL collector checked all **30 high
records** against **36 host/container locations**: 29 immutable images and the
host, with no unverified locations. It records actual installed library hashes,
versions, caller packages and selected isolation settings. No user-content tree
was traversed, package replaced, service restarted or vulnerability reproduced.
The October caller observation is linked by hash and explicitly remains
historical; it was not rerun or presented as a new behavioral test.

The host has `libacl1 2.3.2-2+b1`, also the candidate in its locally cached APT
metadata. Debian's current [CVE-2026-54369 record](https://security-tracker.debian.org/tracker/CVE-2026-54369)
still lists Bookworm 2.3.1-3 and Trixie 2.3.2-2 as affected. It lists 2.4.0-1 as
fixed in Forky/Sid, with a Trixie point-release update planned rather than an
individual patch backport. Thus an up-to-date stable installation can still
carry this finding. This vendor check was made on 10 November 2026; it is not
an assertion about future stable packages.

The retained signed-vendor assessment checked GNU tar `1.35+dfsg-7` and rsync
`3.5.2+ds1-2`. Tar still imports the legacy pathname ACL functions; rsync imports
both old and new APIs. The deployed Bookworm rsync build does not enable
`HAVE_LIBACL_AT`. An import alone does not prove exploitable behavior, but these
facts do not establish the complete safe-caller migration needed to close the
remaining records. The newer vendor binaries also require a libc version that
Bookworm does not supply. No Sid crossgrade or library-only closure was made.

One **separate medium CVE-2026-54370** attribution was revalidated for the new
Kuma image. Live package/command checks and an isolated read-only image check
confirmed the affected `getfacl`, `setfacl` and `chacl` tools and `acl` package
are absent. The existing reviewer recorded a seven-day, exact-artifact
not-affected decision; raw scanner evidence remains. Its two policy tests pass,
including refusal to close the high library CVE using CLI-absence evidence.
This is a component-attribution correction, not a source-code repair.

Private evidence in `security-20261110/`: `acl-current-request.json`,
`acl-vendor-followup.json`, `acl-cli-reviewed-decisions.json`,
`acl-cli-policy-tests.tap` and `acl-followup-result.json`. Their identities and
the explicit unresolved status are recorded in `status.json`. **Zero high
findings were closed by this follow-up; no ACL candidate was deployed.**
The earlier automatic approval rejection of the custom ACL repair/reproduction
path for cybersecurity risk remains recorded and was not bypassed. A later
repair needs a compatible vendor/caller update and ordinary functional checks;
an incomplete library-only change must not be presented as full remediation.

Two unrelated host decisions (libpcap CVE-2026-0799 and the setuptools vendored
jaraco.context CVE-2026-23949) expired during this review. Fresh read-only
package, whole-payload and authenticated-source checks matched their previously
tested installed repairs. Their exact decisions were renewed for seven days
through the existing recorder. Historical regression evidence was retained,
not rerun or described as fresh. Evidence: `expired-host-reviews.json`.
The final recorded pending total remains **0 critical / 30 high**.

### Official ACL candidate compatibility, later follow-up

The existing authenticated **ACL 2.4.0** Bookworm candidate now has a pinned,
repeatable ordinary compatibility check against **all 29 affected runtime
images**. Baseline and candidate runs preserve fictional file content and
access/default ACLs through copying, archive creation/extraction and rename.
The one image with rsync also preserves those properties through its native
copy flow. Candidate CLI reads agree with the original CLI. All existing
dynamic library exports are retained. The host passes static payload/export
comparison only; its processes never loaded the test library.

Two representative images passed a preflight, and two complete runs have
identical normalized results. The two policy tests include thirteen rejected
input changes. Changed package checksums fail before preparation, and an
existing output report is preserved rather than overwritten.
An initial fixture-packaging failure is retained and is not attributed to an
application. Tests used UID 65534 in bounded, networkless, read-only disposable
containers with synthetic scratch data. No user content, application volumes,
notifications or production service changes were involved.

[Recipe, limits and replay instructions](../../deployment/maintenance/mount-acl-final/README.md)
and [exact inputs](../../deployment/maintenance/mount-acl-final/acl-vendor-compatibility-inputs.json).
Private evidence: `acl-vendor-compatibility-verified/result.json`, the retained
preflight/initial results and `acl-vendor-compatibility-checks.json`. Their hashes
are in the batch status. **This completes a compatibility prerequisite, not the
ACL repair.** No Trixie-native package, safe-caller migration, complete application
workflow verification or production deployment is claimed. All 30 high ACL
records remain open; the earlier rejected custom repair/reproduction path was
not retried.

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

### 11 November: scoped exposure reduction completed

FreshRSS 1.30.4 keeps its exact previously repaired image. Its configuration now
drops all Linux capabilities and retains eight for the tested native
startup/Apache/cron flow. FSETID, MKNOD, NET_RAW, SETFCAP, SETPCAP and SYS_CHROOT
are removed. Web workers remain UID/GID 33; root supervision and necessary
filesystem privileges remain. This is defense in depth, not ACL remediation.

Two complete ordinary baseline/candidate runs passed: native initialization and
account creation, saved fictional article, OPML export, browser login, actual
cron/PAM refresh from a loopback feed, reading that article, Apache reload and
graceful shutdown. Apache request logging remained empty. The isolated browser
stayed on the fixture origin; there were no production data mounts or Internet
feeds. The test used SQLite, 1 CPU, 512 MiB and 128 PIDs. PostgreSQL configuration
was not changed. Production native health and a public Chromium login at
`rss.utilibre.org` passed separately; there were no unrelated browser requests.
A Python request to the `feeds` alias received an edge 403, while normal
Chromium loaded the login. Edge rules were not changed to bypass that restriction.

The core backup and restore helpers now enforce operator/root-owned protected
snapshot paths, reject symlinks and writable inputs, ignore inherited
`TAR_OPTIONS`, explicitly keep extended ACL handling disabled and use private
restore staging. Native Unix ownership/modes are preserved. These checks accept
trusted native backups, not arbitrary third-party archives. All **25 configured
native backup locations** and their ancestors passed the read-only ownership
review. Other backup families were inspected for explicit ACL handling but were
not changed or run against user content. Seven focused backup-policy tests pass;
a new deployed native backup and all its checksums pass, without pruning or a
live restore. Retention and temporary-content exclusions are unchanged.

The scoped release reused the existing lock/recreation/rollback adapters,
preserved its configuration and recovery snapshot, and verified that the resolved
Compose diff contains only FreshRSS's capability fields. Only FreshRSS was
recreated. Repeated verification made no changes. Image/data mounts, accounts and
other containers were preserved; no migration or host restart occurred.

Post-release: **175 running containers, 90 healthy configured checks, 85 without
container health checks**. One older failed updater unit remains:
`utilibre-privatebin-update.service` stopped at its “Unreviewed live image” guard
on 10 November at 21:09 UTC. PrivateBin's running container remains healthy. That
baseline review is separate from this rollout and was not bypassed or cleared.

The last complete scanner assessment remains 10 November 14:53 UTC, with
**0 pending critical / 30 pending high ACL records**. No finding was suppressed
or closed by this configuration change, and no full rescan is claimed. The
official ACL 2.4.0 compatibility preparation remains available; a library upgrade
alone does not establish migration of the affected callers. Operator commands,
exact evidence and rollback are in the existing
[maintenance README](../../deployment/maintenance/security-20261110/README.md).

### Remaining complete-repair prerequisite

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
