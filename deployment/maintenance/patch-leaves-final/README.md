# Bounded patch leaves — 12 October 2026

This batch changes dependency payloads, not the applications, authentication,
privacy settings or saved data. Build inputs are exact predecessor image IDs and
registry SHA512-pinned package archives in `specs.mjs`. No package-manager solver
or install scripts run. Downloads/extraction use a disposable RAM directory;
Docker layers are built serially with an 8 GiB free-disk stop condition.

| Application | Patch | Native gate |
|---|---|---|
| Penpot admin console 2.18.3 | js-yaml 4.3.1 → 4.3.2; source-map-js 1.2.1 → 1.2.2 | Fresh disposable PostgreSQL migrations and login routing match the predecessor; YAML round-trip and empty-merge budget regression; source-map round-trip and bounded huge section offset |
| DeGoog 1.0.0 | source-map-js 1.2.1 → 1.2.2 | Native Bun startup/readiness, search form, genuine missing-page response and no-referrer header, with networking disabled |
| Candlr 2.0.0 | source-map-js 1.2.1 → 1.2.2; sharp and matching installed `@img/sharp-*` 0.35.4 → 0.35.5; bundled libvips packages 1.3.3 → 1.3.4 | Native SQLite migrations/login; two synthetic accounts, record creation, other-user and signed-out denial, JSON export and deletion. Sharp PNG/JPEG/WebP resize/reopen, SVG raster, alpha, orientation, malformed input; librsvg 2.63.2 observed |

The upstream application tree, compiled frontend assets, configuration, entrypoint,
command and user are preserved outside the exact dependency paths. Native fixtures
use the same existing Compose command overrides, not the image's unused default
entrypoint. The admin's old pnpm **directory labels** remain for symlink stability;
the package manifests and executable source inside contain the real new versions.

Candlr's Astro server dynamically imports `sharp`; the relevant parser is not an
unmodified embedded copy in the UI bundle. Sharp's fixed native library is updated
along with its wrapper. Six exact old versioned native files are removed from the
candidate filesystem, with their replacements included; none are user files.
All installed matching glibc, musl and WASM package variants are updated, though
only this deployment's glibc variant was executed. No dependency inventory is
edited to pretend that retained vulnerable code was fixed.

## Evidence and reproduction

Private receipts: `/var/lib/utilibre-maintenance/patch-leaves-final-20261012/`.
Each of `admin`, `degoog`, `candlr` contains `build.json`, `libraries.json` and
`native.json`, bound to an exact candidate image. `changed-files.json` records the
allowed dependency-only changes. All three gates passed on 12 October 2026.

```sh
node deployment/maintenance/patch-leaves-final/build.mjs admin
node deployment/maintenance/patch-leaves-final/check-libraries.mjs admin
node deployment/maintenance/patch-leaves-final/check-app.mjs admin
```

Repeat with `degoog` or `candlr`. The builder deliberately refuses if the running
predecessor differs from its frozen base: do not use it to overwrite a newer
release. Review and repin the next maintenance batch separately. The build checks
every application file outside the allowed package directories, and tests run
under CPU/memory limits with no external network and disposable synthetic data.
All fixtures and RAM extraction directories are removed afterward.

Native tests do not query real search providers, inspect real records, send mail,
exercise a production operator account or claim a full browser/device audit.
Candlr uses temporary local accounts only inside an isolated namespace; its
production OIDC settings stay unchanged. Related medium/other-version findings
are not waived by these checks.

## Existing admin OpenSSL payload / stale scanner inventory

The admin already contains the genuine coupled DHI `libssl3t64` and
`openssl-provider-legacy` **3.5.7-1~deb13u3+dhi0** payloads; an older residual
`status.d` record is also found by the scanner. `review-admin-dhi.mjs` authenticates
the retained vendor APT archive SHA256s, freshly extracts both packages in RAM,
and compares **all 14 regular files** with the actual running distroless container
using native Node. This includes writable/mounted overlays; a fresh image check
alone is insufficient. Raw metadata is not rewritten.

```sh
node deployment/maintenance/patch-leaves-final/review-admin-dhi.mjs --proof-only
# Only after the matching fresh fleet scan:
node deployment/maintenance/patch-leaves-final/review-admin-dhi.mjs
```

The second command prepares, but never applies, seven-day exact
image/package/CVE decisions for the 13 reviewed OpenSSL CVEs per package. It
requires a fresh scan, exact live image, genuine payload equality and Debian's
primary fixed-version record for every decision. Other packages/findings remain
visible. Review artifacts are `admin/dhi-proof.json` and `admin/dhi-review.json`.

## Release and rollback

**Deployed on 12 October, finishing at 00:39:58 UTC.** This release coordinator
also handles the separately verified Projects and Bookplate follow-ups.
The five exact image IDs, preserved non-image configuration hashes, readiness,
before/after response codes and timestamps are in the private `release.json`.
All five groups are `passed`. Projects retains its host firewall DROP rules and
anonymous API denial; Bookplate retains denied public uploads/sharing/telemetry
routes. New namespace dependents block the rollout. Three focused coordinator
tests passed, alongside the existing image-pin/rollback tests.

The final live admin DHI proof was reconciled with the 00:42 scan; root applied
its 26 exact, expiring decisions after validation. Other findings remain open.

The parent maintainer owns `release.mjs` and the existing guarded Compose release
process. Staging is not deployment: consult its exact runtime release receipt.
Update only the reviewed image scalar after verifying all three receipts for the
same ID, then check the appropriate private/unauthenticated service boundary.
On failure restore the previous image scalar and recreate only that service;
no database migration or user-data rollback is introduced by these leaf updates.
Keep predecessor runtime images until the normal recovery retention permits
cleanup. No whole-Docker restart is needed.

## Additive public source offer

`publish-source.mjs --publish` checks all three exact live image IDs and matching
native receipts before publishing one small, new archive. It includes the overlay
recipes, archive integrity pins, source/provenance manifest, native checks, and
upstream package notices copied from the verified candidate payloads. It does not
replace the existing upstream application/privacy source archives or package
their user data. Native Sharp/libvips packages remain unmodified upstream builds;
the manifest links their corresponding upstream build sources.

- <https://degoog.utilibre.org/utilibre-source/runtime-patch-leaves-20261012-source.tar.gz>
- <https://candlr.utilibre.org/utilibre-source/runtime-patch-leaves-20261012-source.tar.gz>
- Repository recipes: <https://github.com/mycelibre/utilibre/tree/main/deployment/maintenance/patch-leaves-final>

For future canonical rebuilds, retain the existing application/privacy recipe
first, then apply these exact dependency pins (including Sharp's native assets),
run the same native gates and update source offers together with the release.
Do not rebuild the old application lockfile alone and silently lose the security
overlay. A subsequent upstream release may replace this overlay only after it
contains the equivalent fixes and passes the same application/privacy checks.

## Primary sources checked 12 October 2026

- js-yaml fix and bounded empty-merge regression:
  <https://github.com/nodeca/js-yaml/security/advisories/GHSA-2883-xcg3-v3hh>
- source-map-js offset-loop issue:
  <https://github.com/7rulnik/source-map-js/issues/76>
  and fixed package 1.2.2 at <https://registry.npmjs.org/source-map-js/1.2.2>.
- Sharp's required native librsvg fix:
  <https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w>
  and <https://github.com/lovell/sharp/releases/tag/v0.35.5>.
- Exact npm archive provenance/versions/integrity values: `specs.mjs` and each
  `build.json`; package license notices remain in the package payloads.
- OpenSSL vendor fixed-version evidence:
  <https://security-tracker.debian.org/tracker/source-package/openssl>.

No new service, telemetry, tracking, account policy, public egress destination or
feature is added by this maintenance batch.
