# Security follow-up — 22 October 2026

Scope: the completed 20:31 UTC assessment's 30 critical and 607 high
package/target records awaiting review. These are not 637 confirmed exploits.
Preserve the original raw scan and queue; do not erase findings or renew an
exception without checking its exact current payload and applicability.

Private evidence: `/var/lib/utilibre-maintenance/security-20261022/`.
The previous PHP release is complete and is not rolled back by this work.

## Released and verified

This is a completed repair batch, **not closure of the fleet security queue**.
[release-summary.json](release-summary.json) records exact final image identities,
receipt hashes, current running/health observations and separate raw/unresolved
counts. Generate it with `node deployment/maintenance/security-20261022/public-summary.mjs`;
this only reads receipts and container state. It deliberately omits environments,
private routes, logs, tokens and account data.

| Scope | Repair | Verification |
| --- | --- | --- |
| 41 shared gateways and 27 static-app containers | Signed Alpine NGINX 1.30.6, preserved application assets/configuration | Native config, headers/routes/assets; candidate scan; exact service-only release |
| Bookplate 1.1.0 | Next.js 16.4.1 | 82 upstream tests; two-account isolation, export/delete and browser checks |
| Gathio 1.6.7 | DOMPurify 3.4.17, TOML 5.0.1 | Old-fails/new-passes sanitizer regression; event editing, wrong-token rejection, image, ICS and isolated restore |
| BiblioReads 9508abc | Next.js 15.5.28, DOMPurify 3.4.17, Sharp 0.35.5 | Full build; desktop/mobile-emulated search/book/cover/library export/delete; SSRF rejection |
| Candlr 2.0.0 | DOMPurify 3.4.17 in compiled client and runtime | Full build; account/calendar/Sharp/source-map checks; unrelated runtime fixes preserved |
| Markmap 0.18.12 | DOMPurify 3.4.17, compiled editor | EN/ES editing, SVG export, hostile imports, storage failures, mobile emulation, local-only requests |
| Spliit 1.29.0 | Next.js 16.4.1; retained local flag presentation | Three participants, expense calculation, JSON/CSV export, reload/delete; native migration CLI preserved |
| DeGoog 1.0.0 | DOMPurify 3.4.17, compiled application | Form/ready/404/referrer/source-map checks; no live upstream search query used |
| Grist 1.7.21 | DOMPurify 3.4.17 (root and nested), follow-redirects 1.16.1 | Native sandbox denials, two-account access isolation, typed CSV, SQLite export/import, formula, reload/delete, synthetic restore |
| Rallly 4.15.4 | Next.js 16.4.1 | 753 tests in 58 files; accounts, organizer poll, guest vote, non-owner deletion rejection and owner deletion |
| TeXlyre 0.13.0 | DOMPurify 3.4.17, full static rebuild | Guest project, Spanish LaTeX/PDF accents/formula, ZIP export/import, reload, local account, mobile emulation; existing compiler assets unchanged |
| Actual Budget and Uptime Kuma | follow-redirects 1.16.1 | Loopback credential-leak regressions plus legitimate redirects; Actual budget/sync/export/import and anonymous denial; Kuma fresh setup/login without notifications |
| PrivateBin | Signed NGINX 1.30.6; PHP 8.5.12 retained | Native 25 MB encrypted upload/download hash, one-week limit, purge, low-space fail-closed controls and privacy checks; candidate has no critical/high records |

The Grist/Markmap containers occur in more than one release; the machine-readable
record deduplicates them. TeXlyre is static output, not a new container. Native
healthchecks and HTTP smoke checks are not interchangeable with task checks.
Mobile means browser emulation, not testing on a physical phone.

## Reproduction and side effects

These finite adapters extend the existing maintenance/release helpers. They do
not introduce a scheduler, automatic conflict resolution or a deployment-on-scan
rule. No maintenance email was sent by these manual checks.

- `nginx-packages.mjs` and `../Dockerfile.nginx-1306-security` pin signed packages.
  Existing `check-nginx-tiff-security.mjs` / `release-nginx-tiff-security.mjs`
  use the explicit `--nginx-1306` branch.
- Bookplate uses the existing `next-leaves-final` helpers with the reviewed
  October profile. `build-biblioreads`, `build-dom-client`, `build-next-app`,
  `build-degoog`, `build-grist` and `build-texlyre` rebuild their actual bundles.
  Build commands download pinned dependencies; verification uses synthetic
  data, disposable workspaces and no production database mounts.
- `gathio.mjs` and `redirects.mjs` reuse `js-closure/buildExactPackages` for exact
  unbundled leaf replacements. `dom-regression.cjs` and
  `redirect-regression.cjs` preserve a failing baseline and working controls.
- `privatebin-nginx.mjs` changes only the vendor NGINX package over the tested
  PHP image. Its build/network/test/scan steps are separate from activation.
- `capture-source.mjs` stores exact source revisions, frozen locks and narrowly
  scoped patches. Canonical captures are in `community/*-security.patch`,
  `grist/browser-security.patch`, `spliit/security-dependencies.patch` and the
  corresponding application lockfiles. Spliit's rebuild refuses an overlapping
  stale prepared checkout instead of silently retaining its old dependency lock.
- `patch-leaves-final/release.mjs --oct22`, `--redirects` and
  `--privatebin-nginx` are **production-mutating**, explicit operator modes.
  They require exact candidate/native/scan evidence and preserve all non-image
  effective configuration. Do not run them as an audit or replay them blindly.
- `release-texlyre.mjs` is a separately guarded **static production activation**.
  Browser projects are not replaced or reset.
- `publish-*` commands are **public source publication**, not audit commands.
  Updated source archives were published and their public hashes checked.
  The redirect source supplement is
  <https://tools.utilibre.org/utilibre-source/security-follow-redirects-20261022-source.tar.gz>;
  Grist's full corresponding-source archive also includes this dependency.
  `complete-grist-source.mjs` additionally preserves its earlier two-statement
  image-size API adapter and the three exact runtime leaf source archives. It
  checks the actual compiled adapter and a native PNG before publication; this
  source-offer correction does not rebuild or restart Grist. Source capture now
  includes that adapter, preventing the next capture from reverting it.

Private evidence directories are intentionally not overwritten by successful
preparation. Exact base-image/source assertions reject incompatible states.
Do not remove those checks to make an upgrade pass. Resolution (`--resolve`)
prepares a candidate lock for review; ordinary replay consumes the frozen lock,
not a newly resolved `latest`. Byte-identical rebuilds are not claimed.

The Markmap canonical Dockerfile additionally pins the official NGINX 1.30.6
base for a future clean build. This is not the deployed image: the live repair
used the tested immutable predecessor plus the verified vendor package overlay.

## Evidence, scans and limitations

The final fleet scan covers 109 images / 175 containers, 58 source targets and
the host. Raw findings are retained. Exact backport/component reviews recheck
installed files and successful release ancestry, expire after seven days and
do not waive other versions, CVEs or applications. Their application is an
explicit operator step. Candidate before/after comparisons use the same
advisory database snapshot; a refreshed full-fleet scan is not a controlled
before/after experiment.

Focused release/review tests cover stale/wrong evidence, changed artifacts,
missing payloads and rollback configuration. The PrivateBin release initially
stopped on duplicate active/mirror pin handling, restored the old healthy
service, and succeeded only after the independently validated mirror handling
and regression test were added. That failed attempt remains in private evidence.

Remaining high findings are **not cleared by this batch**. They include Go
toolchain/dependency rebuilds, Bookworm libblkid repairs, ACL caller migration,
DRF updates in Linkding/Authentik, selected Alpine libraries, build-time Vite
and Markdown dependencies, and other individual native/host reviews. ACL's
new API alone does not fix callers of the old unsafe interface. SSH/QGA/boot
changes require their own tested maintenance procedure; no reboot or SSH reload
was performed by this batch. No arbitrary severity exclusions were introduced.

## Rollback

Each private release receipt retains old/new immutable image IDs and refs,
service names, effective configuration hash and exact Compose file locations.
For an authorized rollback, check those files still match, restore only the
recorded image scalar(s), and use the existing service-scoped
`docker compose ... up -d --no-deps <service>` process. Recheck health, route,
privacy and the relevant task. Never use a whole-project recreate for this batch.
Keep the predecessor images until this rollback window is closed.

For PrivateBin, update both the active Compose pin and its checked-in mirror.
For TeXlyre, use the exact `rollbackDirectory` in its receipt: move the current
static tree aside and restore that retained predecessor. Do not touch browser
storage. Source-publication receipts retain previous source archives; restore
the source offer matching any rolled-back application. Image rollback does not
reverse database schema/data changes; this batch did not authorize a new data
migration or restore production data from its synthetic fixtures.
