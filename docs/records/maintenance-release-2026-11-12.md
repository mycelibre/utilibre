# Maintenance release — 12 November 2026

Host maintenance and the Gathio, Opengist Git and Vikunja releases are deployed.
This record closes this finite batch, not the remaining application-upgrade or
security queues. Existing account data, access restrictions and unrelated
worktree changes were preserved. No VM reboot or Caddy change was needed.

The finite application release scripts reference the already configured private
backend health endpoints for this deployment. Those literals are a reviewed
exception for preserving the existing release route, not new public listeners,
credentials or an access-control mechanism. New services should continue to use
the documented routing variables. This implementation and record were prepared
with AI assistance and checked against the retained test/release evidence.

## Deployed changes

| Component | Accepted version/change | Evidence and rollback |
| --- | --- | --- |
| Maintenance Node | 24.22.3, explicit paths in installed units | [Host runbook](../../deployment/maintenance/host-tools/README.md) |
| Trivy | 0.76.2 | Same host runbook; retained predecessor binary |
| Host Python | 3.13.18-1~deb13u1+utilibre1, five native Trixie packages | [Source and payload review](host-python-review-2026-11-12.md); all five predecessor packages retained |
| Backup Restic | 0.19.1 with exact repaired Go locks | Explicit backup-wrapper path; previous 0.18 binary retained |
| GitHub CLI | 2.103.3+utilibre1, Go 1.27.4, x/net 0.62.0 | [Native build/release](../../deployment/maintenance/host-tools/github-cli/README.md); telemetry disabled |
| [Events](https://events.utilibre.org/) | Gathio Mongoose 6.13.12, mquery 4.0.4 | [Exact patch, native checks and rollback](../../deployment/maintenance/releases-20261112/gathio/README.md) |
| [Git snippets](https://snippets.utilibre.org/) | Opengist's Git 2.54.1 vendor packages | [Git-only release](../../deployment/maintenance/releases-20261112/git/README.md); application binary unchanged |
| [Tasks](https://tasks.utilibre.org/) | Vikunja 2.8.0, official immutable image | [Release and rollback](../../deployment/maintenance/releases-20261112/vikunja/README.md); predecessor image **and data** required for downgrade |

The owner approved Vikunja's new 30-day project Trash period. Native restoration
and permanent deletion work; hourly cleanup follows the retention period.
Individual tasks already had a Trash period. The English/Spanish guides and
privacy details now explain both. Existing saved-work backup policy remains.

The portal content overlay is
`sha256:a9cdd99d55808fd4471feb7b8cc6dcdca3cb88521431419d15a5e6d6f0295fbe`.
It retains the preceding SEO release and its runtime bytes. Only the four
catalogue/guide source files were copied into its isolated build, so unrelated
uncommitted portal edits were not deployed. Roll back to
`sha256:66dd5e3669b384332c49790fed7a74ab253540bb34b18790cc4e5d57210dbdb6`
through the established portal release path if necessary; reassess the older
retention copy if Vikunja stays at 2.8.0.

## Verification

- Portal typecheck, lint, FOSS policy, production build and **125 tests** passed.
  Four guide journeys cover EN/ES at desktop and 390px mobile viewports; inspected
  screenshots preserve the established design. No physical phone claim.
- **46** maintenance/storage tests and **50** retired-release/conditional-review
  tests passed offline. Unexpected image, executable or guard changes reopen
  conditional reviews; retired activation paths remain blocked.
- Host Python: 2,630 upstream cases, 59 skips; native host-consumer checks and
  690 installed payload hashes passed. Native Restic compatibility and SFTP
  checks passed, including an actual Storage Box archive restore and comparison.
- Gathio: ordinary create/edit, wrong-token rejection, image upload, ICS
  import/export and isolated database restore passed before and after repair.
  An initial gateway timeout rolled back; the corrected gate respects the
  existing DNS refresh period, and the final deployment passed.
- Opengist: two synthetic accounts, private access boundaries, clone/push,
  editing, ZIP and deletion passed in isolation. Public health passed.
- Vikunja: isolated two-account access, native migration and rollback passed.
  Public Chromium/MFA then passed with an explicitly disposable account:
  tasks, exact attachment bytes, ZIP export/import, reload, Trash restore and
  permanent deletion. Desktop/mobile emulation contacted only the task and
  identity origins. The synthetic app account was deleted and the QA identity
  retired. No ordinary user's documents were inspected.

Failed setup attempts remain in private evidence; they are not counted as
passing checks. Native dumps and cold copies were integrity-checked. These
checks do not establish whole-VM disaster recovery or byte-identical builds.

## Final security assessment

The completed fleet assessment at **05:18:39 UTC** covered **109 images,
120 source/tool inputs and 507 host packages**. Trivy 0.76.2 used the 12 November
01:03:48 UTC advisory snapshot, SHA-256
`719de0cb21fdbc1bf3cb433f7ea57f68910c9d1771f8334026035f5fb11ff325`.
It did not run exploitation or vulnerability-reproduction fixtures.

The ledger retains **26,495 package-target records**, including **67 critical
and 4,116 high raw observations**. After exact, expiring reviews, **0 critical
and 69 high records await review**. This is not zero vulnerabilities or blanket
security clearance; medium, low and unknown records remain too.

The 69 unresolved high records comprise:

- 30 ACL library records. A newer API alone does not fix callers using the old
  behavior; compatible distribution/caller repairs remain necessary.
- 27 Git/Git-man records on Debian/DHI targets. The accepted Alpine vendor update
  fixed Opengist's six records, not these other distributions.
- 12 linux-libc-dev records across four targets. Header-package findings are not
  automatically harmless, and this batch does not establish kernel exposure.

The installed GitHub CLI removed one high embedded-module record; Opengist
removed six high records and Gathio two. Twenty-five host Python records received
seven-day, exact-source/payload reviews rather than being erased from scans.

The changed GitHub package identity reopened CVE-2026-48501. Its newer unchanged
application source incorporates the upstream fix from 2.93.0; the exact
2.103.3+utilibre1 artifact received a seven-day review. See the
[upstream advisory](https://github.com/cli/cli/security/advisories/GHSA-8xvp-7hj6-mcj9)
and [Debian package distinction](https://security-tracker.debian.org/tracker/CVE-2026-48501).
No conclusion about past token exposure is implied.

Upgrading Opengist/Vikunja also correctly invalidated the existing conditional
review of 22 historical Go locks. The new
`releases-20261112/review-source-successors.mjs` checks the exact two successors,
all 14 running binaries, previous guards/locks, release receipts and fresh scan.
The existing review condition now binds this evidence, retaining the original
expiry. Historical vulnerable source is still retained and not approved for
activation. This is review maintenance, not 22 additional code repairs.

Private raw evidence and final ledger:
`/var/lib/utilibre-maintenance/host-tools-20261112/final-assessment/`.
Separate release receipts are under `git-vendor-20261112/`,
`vikunja-upgrade-20261112/` and `releases-20261112/gathio/` in the same private
maintenance directory. Reports deliberately exclude credentials and user data.

## Remaining work and operation

The [30-application upgrade matrix](../../deployment/maintenance/releases-20261111/upgrade-status.json)
now has **9 deployed and 21 held**. Its source findings describe the recorded
candidates, not automatically the running services. Opengist's Git dependency
repair above does not complete its separately held application-version upgrade.
The holds identify exact patch conflicts, migrations and missing native/privacy
checks. They are not automatic approval to deploy moving upstream versions.

All five host maintenance tools now participate in the existing deterministic
daily review. Version/advisory drift reports candidates; approved application
updaters keep their existing gates. No LLM is required for these recurring
checks, and arbitrary incompatible upgrades are not automatically installed.

Only cold, reconstructible build caches were removed after encrypted Storage
Box archival and verified restores. Account work, backups, source and rollback
artifacts were preserved. At final observation root had about **11 GiB free**
(97% used); **21 GiB RAM available**, with 1.5 GiB swap used. No failed systemd
units were observed. Disk headroom remains a constraint for further builds.
The cache runbook records the two archive snapshot identities and restoration
steps. A whole-VM restore rehearsal still requires an isolated target.
