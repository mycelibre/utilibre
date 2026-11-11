# Alpine vendor library follow-up — 11 November 2026

This batch addresses 94 of the 124 pending high package-target records from the
12:50 UTC scan. It uses official signed Alpine packages, preserving the earlier
application and privacy repairs. The separate 30 ACL records are not waived.

**Final result:** 94 fixed and deployed; **0 critical / 30 high records pending**
after the complete 14:07 UTC fleet scan and exact component revalidation.
[Machine-readable status](../../deployment/maintenance/releases-20261111/vendor-status.json).

## Inputs and preparation

[`vendor-inputs.json`](../../deployment/maintenance/releases-20261111/vendor-inputs.json)
binds 31 exact predecessor images, 81 container roles and their existing Compose
projects to the selected packages. libxslt changes from 1.1.43-r3 to 1.1.43-r4 on
each existing Alpine branch (3.22, 3.23 or 3.24). Two PostgreSQL images also change
krb5-libs from 1.22.2-r1 to 1.22.3-r0. Database engines, application code, runtime
configuration, access rules, data mounts, ports and resource limits are unchanged.

Package URLs, SHA-256, aports revisions, licenses and compiler identity are in
the manifest. Packages are authenticated with the base image's APK keyring
before networkless installation. No moving package resolution is used in replay.
The MIT [1.22.3 release notes](https://web.mit.edu/kerberos/krb5-1.22/krb5-1.22.3.html)
were checked on 11 November. The upstream packages supply the fixes; Utilibre
does not add a local vulnerability patch for either library.

Private evidence: `/var/lib/utilibre-maintenance/vendor-libs-20261111/`.
The preserved baseline and advisory snapshot are independent of subsequent
scanner database refreshes. Every candidate passes:

- Full image content, file type, ownership, mode and link comparison. Changes
  are limited to the selected signed package payloads and their APK records/world
  entries. Tar timestamps are not treated as functional changes.
- Exported-symbol and dynamic-dependency compatibility for the replaced shared
  libraries; unchanged musl, application files and runtime configuration.
- Normal native XSLT parsing, transformation, sorting, parameters, UTF-8 and
  serialization before/after. PostgreSQL candidates additionally pass 15 normal
  Kerberos/GSS API checks each, including in-memory credentials and encryption
  round trips. These are functional checks, not exploit reproductions.
- Existing bounded consumer fixtures: 27 Nginx images, two PostgreSQL images,
  one PHP image and one Kittygram image. Database checks include synthetic
  data, transaction rollback and native dump/restore. Kittygram uses an isolated
  cache and fictional inputs, without contacting Instagram.
- A same-database Trivy comparison, complete native package extraction, removal
  of the targeted findings and no new high/critical finding. Existing unrelated
  raw findings remain visible for separate evidence-based review.

This does not repeat every browser workflow or verify real third-party providers.
No user documents, accounts or production database contents are used in candidate
tests. No email, indexing submission or external-instance query is sent.

A fresh offline rebuild of the two native test executables matched both recorded
binary hashes. Already-correct fixture verification makes no changes. This is
evidence for those two fixtures only, not byte-for-byte reproducibility of the
complete application images. The vendor/batch policy has 24 passing tests;
50 superseded-release and 83 conditional-review policy tests also pass.

## Replay and activation

The finite adapters reuse the existing image exporter, consumer checks, scanner
and transactional release process. They do not introduce a maintenance scheduler
or require an LLM.

1. Acquire only the manifest's exact packages into the recorded private package
   directory; verify their hashes. Restore the recorded scan/database snapshot
   when reproducing this assessment. A current release needs fresh-enough
   advisory data and a separately reviewed comparison.
2. Run `python3 deployment/maintenance/releases-20261111/vendor-fixtures.py`.
   This builds the ordinary API fixtures offline from pinned authenticated
   headers, or verifies the already-correct fixture hashes without changing them.
3. Run `vendor-prepare.py KEY`, then `vendor-check.py consumer KEY` and
   `vendor-check.py scan KEY` from that same directory. Commands require keys
   in the finite manifest. Completed/failed evidence is retained, not silently
   overwritten; use a new reviewed batch for a different baseline.
4. Review the actual candidate evidence and its hashes. Scanner success alone
   does not grant release approval. The manifest records explicit approval
   independently of preparation.
5. The existing `security-20261028/release-brotli.mjs` accepts
   `--batch-20261111 --vendor-libs-20261111 prepare|apply RELEASE_GROUP`.
   It requires exact image/configuration, native, scope, scanner and freshness
   evidence; serializes changes; and reuses existing project supervisors and
   network-namespace checks. Repeat activation of a completed group verifies
   it without recreating it.

The reviewed release gate rejects unknown branches/packages, unsupported
versions, missing approval, changed images/checkers/evidence, incompatible ABI,
failed or incomplete checks, changed responses, stale advisory data and new
high/critical findings. The existing superseded-Go activation safeguards remain.

Rollback retains the predecessor image and exact prior image scalar in each
private release group receipt. Automatic rollback uses the existing scoped
Compose transaction and verifies image, health, namespaces and routes. For a
later manual rollback, first confirm current pins/configuration still match the
receipt, restore only the affected image scalar, and use that project's native
supervisor/Compose procedure. Preserve data. An image rollback does not undo
database or user-data changes; this batch performs no schema migration.

## Deployment and user workflows

All 75 release groups completed at 14:03 UTC on 11 November, with no rollback.
The deployed scope is 31 immutable candidate images across 81 container roles.
Each group passed exact artifact, configuration, health, network-namespace and
configured route checks. Existing native supervisors may also restart coupled
companions; 81 is the number of image-updated roles, not a claim that only 81
processes restarted. Host packages and services were not changed or restarted.

The 14:04 read-only verification matched all 81 running roles to the reviewed
image IDs. All 175 production containers were running; 90 configured health
checks were healthy, 85 containers had no container health check, and no systemd
unit was failed. Root filesystem space was about 28.7 GiB available, and RAM
about 22.0 GiB available. These are observations at that moment, not capacity or
uptime guarantees. Previous artifacts, backups and user data were preserved.

The repository's older PostgreSQL image scalar in
`deployment/utilibre/compose.yaml` was reconciled with the completed
`services-simplelogin-db` release. No other template value changed. Schema
validation with synthetic credentials/bind inputs passed. Trying to validate
without interpolation first rejected the required bind-IP placeholder; this
was a local validation issue, not a production configuration failure.

All eight existing bounded workflow checks passed at 14:05 UTC: EN/ES portal
and mobile layout, PDF merge/compression/Markdown and EN/ES OCR, chart export,
image export, ZIP round trip, QR export/offline/mobile, direct PairDrop transfer,
and poll creation/voting/export/deletion. The environment was Linux Chromium
with clean profiles and 390px mobile emulation, using synthetic data. This does
not establish physical-phone, all-browser, relay or every-tool coverage. The
separately reported earlier iPhone result was not repeated in this release.
Private receipts: `live-verification.json`, `release.json` and `journeys.json`
under this batch's evidence root.

The final Trivy 0.75.0 scan completed all 109 running images, 113 source inputs
and the host package inventory. It used the same 10 November 19:01 UTC advisory
snapshot as the baseline, with its database and Java-index hashes rechecked.
All images were scanned locally; no database refresh or registry fallback was
needed. It removed 62 libxslt and 32 krb5-libs high records. No target was left
incomplete or unrechecked.

The two replacement PostgreSQL image IDs required fresh exact-component review
of the existing gosu match. All 11 live helpers matched the recorded executable;
the pinned ELF inspector confirmed the affected crypto/x509 code was absent,
with its positive control and ordinary identity/exec tests retained. The two
time-limited attribution decisions were recorded against the new image IDs;
this is neither a library upgrade nor a waiver for unrelated Go applications.
Raw evidence remains: 26,177 package-target records, including 66 critical and
4,093 high matches. The reviewed pending count is a different measure and is
not a blanket security clearance. Historical source findings and their release
restrictions remain visible.

## ACL remains unresolved

A fresh read-only inventory verified all 30 ACL records at 36 host/container
locations, with no unverified locations and no closures. Existing exposure
reductions remain; they are not proof of a complete fix.

[Debian's current tracker](https://security-tracker.debian.org/tracker/CVE-2026-54369)
still marks stable Bookworm/Trixie packages affected. The
[upstream advisory](https://www.openwall.com/lists/oss-security/2026/06/29/1)
explains that existing pathname APIs retain their behavior and callers must adopt
the new APIs where appropriate. Debian's
[tar compatibility fix](https://bugs.debian.org/1141146) resolves a symbol-name
collision; it does not by itself establish safe caller migration. Sources were
checked on 11 November 2026.

The previous automatic approval review rejected the custom ACL caller-repair /
vulnerability-reproduction route. That route was not retried. A complete,
compatible upstream caller migration and appropriate host activation handling
remain necessary; installing ACL 2.4.0 alone is not reported as remediation.
