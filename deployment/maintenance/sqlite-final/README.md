# SQLite Bookworm security backport

Scope: CVE-2025-7458 in the OS `libsqlite3-0` package (Kuma, RSS-Bridge,
Gathio DocumentDB) and Kuma's `sqlite3` CLI. This is not a database-engine
upgrade or a replacement of Kuma's separately compiled Node SQLite module.
Python and Apprise remain installed.

Released 11 October 2026, 22:54 UTC: Kuma and RSS-Bridge. Their exact running
images, native health, local/public entry pages and access boundaries passed.
Kuma's public dashboard/setup/Socket.IO routes remain blocked. RSS-Bridge's
private-address/metadata/IPv6 probes remain blocked by its existing firewall.
Gathio's candidate passed native checks but is handed to the coordinating
maintainer for a separate compatible AOM-library layer before release.

Kuma also receives the official Debian `python3-jwt` **2.15.1-1** package
already authenticated through the signed isolated Debian indexes in
`../host-final/`. Its SHA-256 is pinned in `build.mjs`. This single pure-Python
package requires only `python3:any`; no distribution or Python upgrade is
performed. HMAC/RSA/PSS/ECDSA round trips, wrong-key/algorithm/expiry/empty-key
denials and the native Apprise parser passed without sending notifications.

## Evidence and rebuild

Reviewed 2026-10-11. Debian still marks Bookworm `3.40.1-2+deb12u2`
vulnerable, with no DSA planned. Its [tracker](https://security-tracker.debian.org/tracker/CVE-2025-7458)
links SQLite's [fix](https://sqlite.org/src/info/12ad822d9b827777).
The official [GitHub mirror commit](https://github.com/sqlite/sqlite/commit/b816ca9994e03a8bc829b49452b8158a731e81a9)
adds four lines to `src/where.c` and regression cases `distinct.test` 10.1–10.5.
Only these two files are taken from the pinned patch; Fossil manifest changes
are not copied into the older Debian release.

`prepare.sh` authenticates the exact Debian source through apt's signed
source index and verifies the signed `.dsc` using Debian's developer keyring.
The observed signer is `7D887DC8BA7BBBA7B835E3BADCE310E7864CC8BF`
(Laszlo Boszormenyi). `patch.mjs` checks the official patch's SHA-256, registers
it as a Debian quilt patch and records local version
`3.40.1-2+deb12u2+utilibre1`. `debian/rules`, architecture, hardening settings,
feature flags and library SONAME remain the existing Debian implementation.

Run `node deployment/maintenance/sqlite-final/build.mjs` as the existing
maintenance operator. It uses the already-present, digest-pinned Bookworm
builder with one CPU, 2 GiB RAM and memory-backed build files. It requires
8.6 GiB free initially, preserving an 8 GiB recovery floor. Build prerequisites
are installed only in a disposable builder, not on the host or in apps.
The complete Debian source archives, patch, source package, package hashes,
build info and exact builder package inventory are retained privately under
the existing maintenance artifact directory for source publication/rebuild.
No credentials or user data are inputs.

The original Debian binary package target is used without changing build
flags. SQLite's native `testfixture test/distinct.test` is run afterward,
including all five added regressions. This is a focused test, not the entire
upstream test suite. `check.mjs` then checks the actual installed dynamic
library independently, verifies matching compile options and unchanged app
bytes/configuration, and exercises synthetic native application flows.
Run it only after `build.json` exists. Production data is never mounted.

Observed gates: **87/87** native DISTINCT tests; all five exact regression SQL
statements on each installed shared library; unchanged SONAME and **1,389**
exported symbols; unchanged compile options and application bytes. Native
SQLite backup/restore/integrity passed, as did Kuma setup/login and Python
SQLite backup, RSS-Bridge PHP SQLite/homepage, and DocumentDB BSON storage,
restricted-role permissions and logical dump/restore. No blanket browser,
connector, notification-delivery or sustained-load coverage is claimed.

The test-runner-only `USE_AMALGAMATION=1` switch avoids this upstream release's
duplicate `fts3_term.c` symbols in the non-amalgamation test target. It does not
change Debian's production build. Installed `.deb` libraries are separately
tested with a dynamically linked native probe.

## Release and rollback boundary

`images.json` freezes the three reviewed parent images. A parent-image change
requires explicit review/rebasing, not tag mutation. The image wrapper installs
proper Debian packages and restores each original user. It does not alter
application code, database files, access settings or service networking.

Build/check scripts do not deploy. `release.mjs` was separately authorized for
Kuma/RSS-Bridge only, after the native gates, a fresh native Kuma recovery backup
where appropriate, and a verified image-only configuration diff. Recreate only
the affected app/database using its established service/guard process; check
exact image, health and the native/public entry point. Roll back to the frozen
old image through the same process if a gate fails. No SQL migration is needed.

Initial SQLite-only stage/release pins (historical; later layers below preserve
the exact patched SQLite payload):

- Kuma `utilibre-kuma:2.5.6-sqlite-security-20261011`, image
  `sha256:9d1c2c3e9cc58cdf6c130af004d54fd459ecee5ab834aca663dd1a886316419e`.
- RSS-Bridge `utilibre-rssbridge:2025-08-05-sqlite-security-20261011`, image
  `sha256:f96f0d1b24c93254f367dcc3dd96dd5f3b456668f9a65337eb1bb2e43eb08f46`.
- Initially staged Gathio `utilibre-gathio-documentdb:17.11-0.107.0-sqlite-security-20261011`,
  image `sha256:6d370f60be2c84f5ea6c44fb2e475da18f4f97af6bdc6c234aa2a0cdfd8b04ef`.

Final production state at 23:14 UTC:

- Kuma remains on the SQLite/PyJWT image above, healthy and native-gated.
- RSS-Bridge now uses `utilibre-rssbridge:2025-08-05-xml-security-20261011`,
  image `sha256:89dd1b4e0ffa64583a1429825f5e797d1cacf4ea79d2090da3a73edbc49907cd`.
- Gathio deployed the SQLite plus signed AOM layer, then the separately native
  tested XML layer: `utilibre-gathio-documentdb:17.11-0.107.0-xml-security-20261011`,
  image `sha256:95ee3337a58fff0a0430840754b91c547f57bfa806e71b8721d5815bf6985a3b`.

The exact native restore, library and release evidence is retained in
`/var/lib/utilibre-maintenance/aom-final-20261011/` and
`/var/lib/utilibre-maintenance/xml-final-20261011/`. See the adjacent
[XML repair notes](../xml-final/README.md) for final native gates and rollback.
The Gathio recovery tester explicitly accepts the exact final XML image ID;
no database-engine or schema change is involved.

Vendor scanners may continue to report this CVE because Debian has no fixed
Bookworm version and cannot know this local patch. Do not suppress the package
or vulnerability family. Any remediation attestation must bind only this CVE
to the final image ID, exact patched package/library hashes, signed source,
patch and successful native test receipt. Keep raw scan evidence visible.
The two HIGH SQLite findings `CVE-2026-11822` and `CVE-2026-11824`, and other
unrelated findings, are not fixed or excluded by this four-line backport.

Exact patched shared-library SHA-256:
`f4b32d83fadc4787cabff8a115e4aca3ac808efe9d9521b9630f1d8815f129b5`.
Library `.deb`: `b15fa9c056fbf9143c1500c44f9c9fd1548faa1b63bc3b786334bac45c7f820f`.
CLI `.deb`: `857f3ae8ab9b3fbe5871f87622c03d87a1ff54c30cd559520633aedda942f054`.
Applied quilt patch: `e1a48c50ad0129123a75d6a050561bd2a5c48c74c52aaa044eb3c7b15c229b87`.

Private build, native-check, raw-scan and release receipts are retained together
in `/var/lib/utilibre-maintenance/sqlite-final-20261011/`. The private native
backup path is in `release.json`, not in public documentation. The disposable
compiler and all synthetic test containers were removed. No user content was
deleted or migrated.
