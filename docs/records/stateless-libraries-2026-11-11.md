# Stateless runtime libraries — 11 November 2026

This follow-up deployed signed Alpine 3.24 zlib **1.4-r0** for 23 existing
stateless frontends and libxpm **3.5.20-r0** for their 22 nginx images. The
portal uses Node and needs only the zlib update. The application versions,
application files, privacy/access settings, ports, storage and unrelated
runtime fixes are unchanged. This is separate from the preceding BentoPDF
2.8.11 application upgrade.

Deployment completed at 02:36 UTC. All 175 production containers are running;
all 90 configured health checks are healthy, and 85 containers have no Docker
health check. Exactly the 23 selected container identities changed. No
unrelated container changed and no systemd unit is failed. These observations
are a release checkpoint, not uptime or capacity guarantees.

The exact per-service deployment state and old/new image IDs are in
[libraries-status.json](../../deployment/maintenance/releases-20261111/libraries-status.json).
The [operator instructions](../../deployment/maintenance/releases-20261111/README.md#stateless-library-follow-up)
describe preparation, verification, activation and rollback. The finite
[input manifest](../../deployment/maintenance/releases-20261111/libraries-inputs.json)
contains package/checker hashes, explicit approval, image scope and unselected
components. Existing adapters and Compose transaction helpers are reused.

## Verification

- Both signed packages verify against the existing Alpine trust keys. No
  unsigned packages, repository branch changes, package resolution during
  replay, or automatic conflict repair are used.
- Every candidate preserves the complete image configuration and all file
  contents, ownership, modes and links outside the selected package payloads
  and their package bookkeeping. Archive timestamps are excluded. Unrelated
  package records and the existing musl repair remain identical.
- Twenty-three old/new image pairs pass seven ordinary native zlib checks.
  Twenty-two pairs also pass nine nginx compatibility checks, including real
  static HTML, ranges, gzip output, caching, redirects and missing resources.
  Native XPM read/write round-trips preserve a fictional two-by-two-pixel
  image. The portal passes eleven ordinary Node checks on each image.
- The targeted scanner comparison removes **45 medium package findings** for
  CVE-2026-4738 and CVE-2026-94287. All 23 candidate runtime scans have zero
  high/critical findings and complete native APK inventories. Scanners run
  without external networking or automatic advisory/rule refresh. No scanner
  rule, severity threshold or finding suppression was changed.
- The advisory database is the retained 10 November snapshot; exact hashes
  are recorded. The release policy permits at most 48 hours of advisory age.
  draw.io additionally uses a preserved 8 November Java package-identification
  index. Its repeated baseline agrees with the earlier finding set. This
  index is distinct from vulnerability advisory data.
- Twenty-eight focused release-policy/transaction tests pass. Another 85
  historical-proof policy tests pass, and all 30 affected complete historical
  repair proofs pass their read-only recheck. This does not rerun or extend
  historical vulnerability-reproduction fixtures. Twelve existing release
  ancestry tests also pass: 125 focused tests in the final combined run.
  Repeating portal and BentoPDF activation validates their deployed state
  without restarting either container.
- After its library update, public BentoPDF passes synthetic Chromium merge,
  compression, native Markdown printing and English/Spanish searchable OCR.
  No outside asset origin or unexpected upload was observed. English OCR
  still needs the documented accent correction. The operating-system print
  dialog, all PDF operations and real phones are not claimed as tested.

The first scope check correctly rejected unlisted vendor XPM CLI files;
`cxpm` and `sxpm` were then included in the reviewed package payload. An
initial test incorrectly equated XPM's ABI version with its package release;
the official header establishes ABI 30411. draw.io's first scan failed for a
missing Java index. Failed attempts remain private evidence, not passing
checks. No release proceeded on failed evidence; each activated candidate
passed the corrected checks first.

## Keeping previous fixes verifiable

Extending the shared scope/nginx checkers otherwise invalidates historical
receipts that compare against the current script's hash. Thirty previously
completed artifacts now use their original exact checker bytes from commit
`271686f`, with a fixed artifact allowlist and recorded checksums. Unknown
artifacts, changed hashes and unreviewed paths fail. New candidates continue
to bind to current checker source and still need all approval, compatibility
and freshness gates. This change neither approves a new finding exception nor
marks a service secure based on its age.

## Limits and operation

Private evidence is under
`/var/lib/utilibre-maintenance/libraries-20261111/`; it contains synthetic
fixtures, exact package inputs, raw scans, failed attempts and scoped release
receipts. Public summaries contain no credentials, visitor content or activity.

This is a targeted runtime assessment, not a new full-fleet/source/host scan
or proof that every browser dependency is vulnerability-free. The last full
queue checkpoint remains **0 pending critical / 30 high ACL records**. Those
records require compatible caller/library work and are not closed here.
Unselected stateful services and shared gateways require their own workflow,
retention, connection and supervisor checks before a library rollout.

Previous images remain available. Rollback changes only the declared image
pin and recreates that existing service; no data migration, restore or
deletion is involved. The source/configuration archive and pinned predecessor
images are necessary for reconstruction; a Git clone alone is insufficient.
Future application builds must retain the repaired runtime or repeat the
signed package step against newly reviewed inputs. This batch adds no new
service, scheduler, telemetry, paid dependency or notification.

Primary sources checked on 11 November:

- [zlib releases and project information](https://zlib.net/).
- [Alpine's CVE-2026-4738 record](https://security.alpinelinux.org/vuln/CVE-2026-4738).
- [Official libXpm 3.5.20 source](https://www.x.org/releases/individual/lib/libXpm-3.5.20.tar.xz).
- [Debian ACL status](https://security-tracker.debian.org/tracker/CVE-2026-54369).

Implementation and documentation used AI assistance; the recorded commands,
package identities and tests provide the evidence for the stated results.
