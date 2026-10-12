# Four compatible runtime leaves — 2026-10-11

This is a finite dependency repair, not an application or database upgrade.
Official MIT-licensed artifacts were checked against the npm registry metadata
on 2026-10-11; `package-lock.json` pins all dependency archives and integrity.

- MySQL2: https://github.com/sidorares/node-mysql2 and
  https://registry.npmjs.org/mysql2/3.23.1 — 3.15.3 → 3.23.1.
- ADM-ZIP: https://github.com/cthackers/adm-zip and
  https://registry.npmjs.org/adm-zip/0.6.1 — 0.6.0 → 0.6.1.

| Application | Candidate | Exact image SHA-256 |
| --- | --- | --- |
| Rallly 4.15.4 | `utilibre-rallly:4.15.4-mysql-security-20261011` | `81af1c55c521e38bc8bdeb5ceaf223c7c3aef8f2c5821754b089af06f9e3e702` |
| Spliit 1.29.0 | `utilibre-spliit:1.29.0-mysql-security-20261011` | `2241940862a6099577960cb14a0f5472b73873e844b02d1d4211755e97e952f2` |
| Wishlist 0.67.1 | `utilibre-wishlist:0.67.1-mysql-security-20261011` | `02d052af839b69b2b2d518eb324b47a8b54281ad94fe479908d625acb0341805` |
| RSSHub | `utilibre-rsshub:2026-10-11-zip-security-20261011` | `7fbae7dd2b7bb954b8f5cda4c7244e17e6fb6e016c5b425d215f3f04909f7382` |

## Reproduction and gates

Use the exact existing base images in `images.json`; the build rejects a
different base ID. Each candidate preserves image user, command, entrypoint,
environment, healthcheck, volumes and ports. Builds are serial and stop below
8 GiB free. Only small pure-JavaScript package trees are added; no runtime
download or new service is introduced.

```sh
node deployment/maintenance/language-final/app-leaves/build.mjs rallly
python3 deployment/maintenance/language-final/app-leaves/verify.py rallly
# Repeat those two commands for spliit, wishlist and rsshub.
node deployment/maintenance/language-final/app-leaves/check.mjs
node deployment/maintenance/check-rallly-libraries.mjs --app-leaves
node deployment/maintenance/check-wishlist-esbuild.mjs --app-leaves
node deployment/maintenance/language-final/app-leaves/check-spliit.mjs
node deployment/maintenance/language-final/app-leaves/build.mjs spliit --privacy-rollback
node deployment/maintenance/language-final/app-leaves/check-spliit.mjs --privacy-rollback
python3 deployment/maintenance/language-final/app-leaves/verify.py spliit --privacy-rollback
```

Passed checks use fictional data and fresh isolated databases:

- All three actual MySQL2 module paths: real MariaDB prepared/named queries,
  UTF-8 accents/emoji, decimal values, transaction rollback and JSON round-trip.
  These production applications use PostgreSQL or SQLite, not this test MySQL
  database; the test establishes driver compatibility, not a new data service.
- Rallly: native database migration, fictional invitation rendered, XML parser
  round-trip/error rejection, no outside browser origins. Organizer creation
  was not retested.
- Wishlist: native blank-database migration/seed, account/list/item creation,
  reload persistence and anonymous access denial; no outside browser origins.
- Spliit: native blank-database migration, group/expense creation, JSON and CSV
  export, reload, native expense deletion; no outside browser requests after
  the narrowly documented privacy fix below. Chromium desktop was tested;
  this is not real-phone coverage.
- RSSHub: ZIP creation, Unicode read/extraction and parent-path containment;
  actual application startup/health with networking disabled. No mass crawling
  or connector load test was performed.
- Streamed complete-image comparison allows only selected package trees,
  their locked dependencies, receipts and Spliit's three reviewed privacy
  chunks. Every other application file remains byte-identical.
- Actual-image Trivy inventory finds MySQL2 3.23.1 / ADM-ZIP 0.6.1 and no HIGH
  or CRITICAL findings for those packages. Other findings remain visible.

Rallly resolves `mysql2` from both `/app/package.json` and its deployed server
entrypoint to the replaced physical package. The six compiled SSR matches
inspected were OpenTelemetry instrumentation hooks, not a second bundled
MySQL2 driver. Instrumentation was not enabled. We do not claim that arbitrary
compiled dependencies are repaired by replacing a package directory.

Private receipts are under `/opt/utilibre/reports/app-leaves-*` and
`/var/lib/utilibre-maintenance/app-leaves-20261011/`. The last contains the
exact deployment status, timestamps, old/new image IDs and evidence paths.
The four-service production release passed at **23:15:03 UTC on 2026-10-11**;
all four exact image identities and native healthchecks passed. No rollback
was needed, and no user data or retention settings changed.

## Spliit's decorative flags

The full isolated test exposed an existing request to `flagcdn.com` from the
currency selector. Production CSP already blocked it; blocking is not the
same as eliminating an attempted request. `spliit-no-flags.patch` removes the
optional image from the pinned upstream source. `spliit-privacy.cjs` makes the
equivalent change to exactly two SSR chunks and one client chunk, requiring
their original SHA-256 values and exact expressions. Currency names and codes
remain. There is no image proxy, replacement CDN or relaxed CSP.

Apply the source patch after the existing Spliit build patch for a future full
source rebuild. The compiled patch deliberately fails if upstream bytes change;
review the newly built component instead of loosening the guard.

The existing client chunk URL is unchanged. New downloads receive the fixed
code; cached clients may retain the old flag attempt until asset invalidation
or reload. Existing CSP continues blocking that request. Do not claim every
previously open tab has already loaded the fixed chunk.
A bounded public HTTPS check after release returned 200 (`CF-Cache-Status:
MISS`) for `/_next/static/chunks/3m-0x3ae8tu5n.js`; its SHA-256 matched the
running fixed image and it contained no external flag hostname. This verifies
the current edge asset, not every visitor's pre-existing browser cache.

## Release and recovery

`release.mjs prepare` binds exact native/hash/scan receipts and current
Compose/runtime identities, requires healthy old containers, and rejects
unhandled shared-network namespace companions. Parent review/approval is
required before `apply`. Only the four exact service image scalars change;
RSSHub's checked-in source mirror is updated too. No schema, volume, account,
retention, secret, CSP or network rule changes are made.

```sh
node deployment/maintenance/language-final/app-leaves/release.mjs prepare
# Explicit reviewed release only:
node deployment/maintenance/language-final/app-leaves/release.mjs apply
```

The shared tested `releaseGroup` core saves the receipt before mutation,
stops on failure and verifies the rollback's exact image and native health.
Readiness uses native start-period/interval with a maximum of 180 seconds.
Other services keep their reviewed previous images. Spliit instead uses
`utilibre-spliit:1.29.0-privacy-rollback-20261011`, exact SHA-256
`26b2fad9daac7cdb988a1a78ed5cc614aadd4fcc6caf526a7159871dcf72de7f`:
the old application/libraries plus the identical no-flags fix. This fallback
passed the same workflow/privacy gate and full-image comparison. Its old
MySQL2 findings remain visible, not waived. Both fallback identity and source
configuration are checked before release and rollback. Recovery never replaces
live user work with test data or touches temporary-content retention.
