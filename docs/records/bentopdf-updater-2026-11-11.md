# BentoPDF and updater maintenance — 11 November 2026

Status at preparation: BentoPDF 2.8.11-p1 is built and undergoing isolated
workflow checks; it has not yet replaced the public instance. No ACL change
is included. Deployment evidence will be recorded below after the release gate.

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
