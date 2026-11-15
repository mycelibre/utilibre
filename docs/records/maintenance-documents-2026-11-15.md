# Maintenance and document journeys — 15 November 2026

The operator's Search Console export was downloaded and analyzed **before**
implementation. Its actual observation period ends on 13 November, despite
its “last three months” filter. It is search-performance evidence, not an
indexing report or a measure of tool completion. Page and property aggregation
and omitted queries prevent reconstructing individual visitor journeys. Raw
queries, share access information and the original export remain private.

The export supports attention to small-screen entry points and preserving
existing direct service URLs. It does not establish that the document workflow
is already the most popular task or that Guatemala is the primary audience.
The document work below remains a usability hypothesis. The sampled current
www collection URL redirects to the canonical non-www URL successfully; old
www rows alone are not evidence of a present redirect defect.

## Delivered journeys

* `/es/colecciones/documentos-y-tramites` and
  `/en/collections/documents-and-applications`: immediate PDF/image/transfer
  entry points, native localized merge/compress/OCR links, and a worked
  PDF → transfer → reopen exercise using the existing fictional A/B pages.
* Existing image, scanned-document and transfer guides retain their content
  and gain a failure-report link. PDF/QR help and all three curated collections
  also expose the existing voluntary feedback route.
* Catalogue help for BentoPDF, miniPaint, image compression and PairDrop, plus
  the global footer, link to the existing guest feedback form when LiberaForms
  is enabled. Its URL is resolved from canonical configuration, with the
  existing contact channel as an explicitly qualified fallback.
* Reports can be made before a task succeeds. The form asks the tool, expected
  task, problem and optional contact information. The portal sends no document,
  task URL, diagnostics or referral context; it opens a plain link in another
  tab with `noopener noreferrer`. Authorized operators can read submitted
  responses. No automatic feedback event, tracking or new backend was added.

The application interfaces were not patched. These are portal navigation and
instructions; moving a file between applications remains an explicit manual
step. Original files, saved collections, access controls and quotas are
unchanged. Existing design tokens/components were reused without CSS changes.

## Checks and observed limits

* Typecheck, lint, production build, FOSS/build gates and **127 unit tests** pass.
  **10 Chromium desktop/mobile-viewport tests** pass, including language,
  download, saved collection and reporting journeys.
* The production image also passes a separate check of its embedded public
  configuration: real native links, download, explicit collection saving,
  failure reporting and no automatic external application requests. The normal
  suite's mocked configuration cannot override the release's embedded config;
  that failed test invocation is retained separately, not counted as a product
  failure or silently removed.
* Synthetic miniPaint resize: 1200×800 → 600×400, valid 89,248-byte PNG. Separate
  transparency and EXIF-orientation fixtures pass. No application upload or
  outside asset origin appeared in these checks.
* Native BentoPDF merge preserves A/B page order; compression changes the
  synthetic scan from 68,472 to 37,189 bytes. English and Spanish OCR produce
  useful text and searchable output; the English accent needs manual correction.
  Headless Markdown print-handler/PDF output passes; the OS print dialog was
  not automated. No unexpected application writes or outside asset origin.
* The Spanish A/B PDFs were merged, sent through PairDrop to a second isolated
  browser context, downloaded byte-for-byte and reopened with the existing
  pinned PDF.js test parser: two pages in order, 1,185 bytes. Direct WebRTC mode
  was confirmed. Both browsers ran on this VM; this is not a fresh physical
  iPhone or different-network test. The operator's earlier successful iPhone
  report is retained as operator evidence, without inventing browser/network
  details.
* Six live EN/ES pages return HTTP 200 through Node fetch with one description,
  one H1, correct canonical/hreflang, image alt attributes and no noindex.
  Cloudflare returns HTTP 403 to Python urllib’s default client; Chromium and
  Node work. This does not establish Googlebot/Bingbot access, so no firewall
  policy was weakened or indexing acceptance claimed.
* The feedback destination was inspected without submitting a response. The
  browser test intercepts that optional destination to verify a GET with no
  referrer, query, fragment or task state. It does not retest backend encryption
  or send a test email.

Private evidence is in `/var/lib/utilibre-maintenance/search-20261115/`:
`analysis.md`, the original export and parsed tables, `unit.log`,
`final-e2e.log`, `portal-staging.json`, `public-pages.json`, before/after screenshots,
`image-check.json`, `image-properties.json`, `pdf-check.json`,
`merge-transfer.json`, frozen before/after image scans and `portal-release.json`.
The candidate image is recorded in
[portal-inputs.json](../../deployment/maintenance/security-20261115/portal-inputs.json).

## New security findings reviewed

The 15 November 10:34 UTC complete scan had **0 critical / 62 high pending
package-target records**. Thirty-two newly reported records concerned
CVE-2025-6020, four PAM packages in each of eight Bookworm images. Debian now
states that the prior distribution patch was not correctly applied at build
time. Those packages are **not called patched** here.

Read-only inspection of all eight exact running image identities and their PAM
configuration found `pam_namespace` unused, no active namespace directories,
no added container capabilities, `cap_drop: ALL`, unprivileged execution and
`no-new-privileges`. This matches the upstream documented configuration
workaround. No authentication settings or running application were changed.
The existing triage mechanism records **32 exact mitigated reviews**, owned by
admin@utilibre.org, expiring **22 November 2026 at 23:04 UTC**, or requiring
immediate reassessment if the PAM/configuration/capability boundary changes.
Raw findings remain present. The read-only check does not automatically approve
or extend reviews.

The remaining pending count is **0 critical / 30 high**, all ACL
CVE-2026-54369 package-target records, not 30 independent vulnerabilities.
The compatibility and caller-migration gap documented in the
[14 November release](security-2026-11-14.md#remaining-acl-issue-and-exact-next-action)
remains open. No unstable ACL replacement or suppression was introduced.
The unreviewed raw scan still includes 58 critical / 3,890 high occurrences;
those totals include previously reviewed backports and mitigations.

Evidence/commands:

```sh
python3 deployment/maintenance/security-20261115/check-pam-exposure.py
```

Inputs are pinned in `pam-inputs.json`; protected results and the exact review
batch are under `/var/lib/utilibre-maintenance/security-20261115/`. The command
reads the reviewed runtime configuration only and fails on image drift.

Primary sources checked:
[Debian PAM record](https://security-tracker.debian.org/tracker/CVE-2025-6020),
[upstream PAM advisory/workaround](https://github.com/linux-pam/linux-pam/security/advisories/GHSA-f9p8-gjr4-j9gx),
[Debian packaging issue](https://bugs.debian.org/1107919),
[ACL status](https://security-tracker.debian.org/tracker/CVE-2026-54369).

## Scope and rollback

Only the portal was recreated, from an exact tested image built on the prior
runtime image; no package resolution was performed. Offline Trivy 0.76.2 scans
of both images used the same recorded advisory database and found no package
vulnerability difference (both empty). Unrelated container identities/images
were checked unchanged. Source was built from committed baseline
`002f2a33d7ed5d432b24c93299a91abf938a8cb9` plus the eight explicitly listed portal
files, so unrelated worktree edits did not enter the release.

The previous portal image remains
`utilibre-portal:vikunja-retention-20261112`, identity
`sha256:a9cdd99d55808fd4471feb7b8cc6dcdca3cb88521431419d15a5e6d6f0295fbe`.
The new image is `utilibre-portal:documents-feedback-20261115`, identity
`sha256:0f6098fddf71b14f6045984cc30378eccbd64406a1448b3cad71c022cbe692af`.
Use the existing release lock, restore only `PORTAL_IMAGE` in the existing
project's protected `.env`, then recreate **only portal**, with `--no-deps
--no-build --pull never`. Check the exact image, native health and EN/ES routes.
A repeated release invocation verified the already-active artifact and left
the container ID unchanged. The private release receipt preserves the old pin. There is no database or
user-data migration to reverse. No Caddy change is required.

## Archived scan databases and recovery

Six completed historical scan caches contain nine advisory databases plus
nine matching metadata files. Their exact inputs total 15,066,867,039 bytes.
The compressed reconstruction archive is 3,467,908,219 bytes, held separately
from saved account backups under the existing encrypted Restic repository and
`maintenance-advisory-databases-20261115` tag. The account-backup retention
selector does not expire this reconstruction archive; no retention policy
or content backup was changed.

The current `/var/cache/utilibre-security` database, raw findings, sources,
application/user data, running/rollback images and existing backups are outside
the cleanup scope. The finite helper checks for active open files, processes
and container mounts, and verifies the restored archive and each member against
its recorded hash before any local removal.

Snapshot: `dd7ddfe79a88ce7dd2edf7bc2dbc589c7d673695747d450dca9732d70a16b7b3`.
Archive SHA256: `cd29ed22ce39c1ff3183d0a8f2ec09d8c647512cc037979f20200b5a6facc946`.

To replay an archived assessment, first restore the original advisory data to
a new private directory with enough space:

```sh
sudo sh deployment/storagebox/restic.sh restore dd7ddfe79a88ce7dd2edf7bc2dbc589c7d673695747d450dca9732d70a16b7b3 \
  --target /var/lib/utilibre-maintenance/restored-nov15-advisories --verify
```

Within that restore, the original files are
`dev/shm/utilibre-advisory-archive-20261115/advisory-databases.tar.zst` and
`manifest.json`. Verify the archive SHA-256 above, list the tar members and
compare all 18 names/sizes/hashes with the restored manifest. The archive
contains only relative paths under `/var/lib/utilibre-maintenance`. After
checking that the selected historical caches are idle, extract it there,
without overwriting any different newer inputs. Recheck each member hash
before replay. Do not silently download a new advisory database and call that
an archived replay. Markers in the six old cache directories identify the
snapshot and these instructions.

The private `advisory-archive-result.json` is the completion receipt: native
restore verification, full archive/member hashes, exact removed files and
measured free-space change. The archive test does not establish recovery of
all application data or the complete VM.

Completed retirement: all 18 original files matched the restored member hashes;
15,066,914,816 bytes (14.03 GiB) were reclaimed.
Root free space at the checkpoint is 22.68 GiB.
Only this operation's two RAM scratch directories were removed afterward.
