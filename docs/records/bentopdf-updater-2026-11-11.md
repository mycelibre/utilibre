# BentoPDF and updater maintenance — 11 November 2026

Deployed on 11 November 2026: [BentoPDF](https://pdf.utilibre.org/) now runs
2.8.11-p1, with matching English/Spanish catalogue records and accurate local-modification
attribution. Only BentoPDF and
the portal were recreated. The release was prepared in commit `24fa2ed` and
verified against exact image IDs. No ACL change is included.

The [operator recipe](../../deployment/maintenance/releases-20261111/README.md)
pins upstream source, dependency changes, build tooling and the previous repaired
web-server runtime. PDF/OCR algorithms remain upstream. Local OCR English and
Spanish assets, fonts and PDF engines are retained. Signature validation stays
disabled. The upstream `ALLOW_INDEXING=true` option preserves the previous
indexable public tool pages; no accounts, documents or generated results are
added to the sitemap.

The Redlib updater's exact APT-overlay receipt now uses its recorded builder
revision rather than requiring the shared build script to remain unchanged
forever. The normal check passes as up to date. Unknown runtimes still fail
closed. SearXNG's current image guard also passes. Nineteen SearXNG tests and
37 Redlib/shared-policy tests pass without searches, email or restarts.

BentoPDF's application and documentation builds pass in separate disposable
workspaces. A reused checkout containing prior generated output became
resource-heavy; a clean checkout restored normal build completion. The build
adapter now rejects existing application/documentation output directories.
The initial documentation run exceeded its default heap; the isolated check
passes with a 4 GiB heap and a 6 GiB container limit. These are build-time
figures, not additional production allocations.

The candidate source scan includes development dependencies and preserves raw
findings: zero critical, zero high, three medium and one low. This is a bounded
source assessment, not a whole-fleet clearance. Its Trivy database snapshot was
updated on 10 November; archived replay does not establish future freshness.

Primary sources inspected on 11 November:

- [BentoPDF 2.8.11](https://github.com/alam00000/bentopdf/releases/tag/v2.8.11),
  commit `f638f8e4db66cb69dec35ca061ad89034dd62445`.
- [Hyper Compress source](https://github.com/alam00000/bentopdf-hyper-compress/tree/148f20f3f4cd11035fdd53dd1c20fb5a5d21cf3b),
  AGPL-3.0-only; matching 1.0.3 source retained for publication.
- [node-forge 1.4.1 registry metadata](https://registry.npmjs.org/node-forge/1.4.1),
  exact integrity retained with the patched lockfile. Native fictional
  certificate/PKCS12 and RSA signing/verification checks pass.

Private evidence: `/var/lib/utilibre-maintenance/releases-20261111/`.
No visitor documents, production keys or user activity are included in tests.

## Observed release checks

- Native application and documentation builds pass. The portal passes lint,
  typecheck, FOSS policy, static/server builds and 122 unit tests in 16 files.
- The exact BentoPDF candidate and public instance both pass merge (two readable
  pages), compression, Markdown with a table/Mermaid diagram, English/Spanish
  OCR and searchable-PDF downloads. The 68,472-byte fictional scan compresses
  to 37,189 bytes. English OCR needed an accent correction; OCR still needs
  human review. This example is not a compression or accuracy guarantee.
- Native Markdown printing and Chromium-generated PDF output pass; an actual
  operating-system Save as PDF dialog is not automated. No claim covers every
  PDF tool, document type or real phone. The complete portal Playwright suite
  was not rerun for this metadata-only change.
- No outside asset origin or application upload request was observed in either
  PDF workflow run. Public workers match the candidate's new asset URLs and
  retain their existing cross-origin isolation headers. This is bounded
  workflow evidence, not an assertion about untested functions.
- All 2,127 non-application image paths and the image configuration match the
  previous hardened runtime. Both image scans have the same 74 package records
  and two medium findings: zlib CVE-2026-4738 and libxpm CVE-2026-94287. The
  portal retains its one medium zlib finding. No scanner suppression was added.
- A repeated release invocation verifies the active artifacts without another
  restart. The final scope check found only the two intended container IDs
  changed: 175 containers running, 90 configured health checks healthy and 85
  without container health checks. No failed systemd units were present.
- Public English desktop and Spanish 390-pixel viewport checks pass; the
  metadata is readable without horizontal overflow. The source page retains
  both language return links and a working same-origin Utilibre favicon.
  Public OCR pages retain indexable metadata; no indexing outcome is claimed.
- The source offer includes the pinned patched application, build/runtime
  recipes and matching Hyper Compress source. Previous images, source archives
  and configuration are retained. Rollback needs no data migration.

The prior fleet checkpoint remains 0 pending critical / 30 high ACL records;
this batch does not close those records or claim a new full-fleet scan. The
recorded scan database is not future security clearance. No notification,
indexing submission, production user document or broad upstream search was
used for this release.

Machine-readable public summary:
[status.json](../../deployment/maintenance/releases-20261111/status.json).
Detailed reports and screenshots remain in the private evidence directory.
