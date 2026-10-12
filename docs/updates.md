# Updates and rollback

Updates are deliberate, one service at a time. Production uses immutable
version/digest pins; Redlib is built from an exact source commit and pinned
base images. SearXNG has the guarded, daily updater below; other services
remain reviewed rollouts. Production never runs a floating `latest` tag.

## Maintenance release — 12 October 2026

The tested native-package, installer and Go-runtime batch below is deployed.
The final seven targets—OAuth2 Proxy, Mezzo, Anubis, OpenGist, ntfy, Vikunja and
Wakapi—finished at **00:19:56 UTC**, retaining their application versions and
access/retention rules. Embedded assets, native user tasks and exact live images
passed; matching source archives passed public HTTPS checksum checks.
[Seven-service results, source and rollback](../deployment/maintenance/go-leaf-final/README.md).
No Rustpad, Docker/containerd or host reboot was performed.

Final scan **00:22:04 UTC**: **109 images / 175 containers, 510 host packages,
55 source manifests**; 119 seconds. Every captured image still matched the
running deployment. All host/source scans completed; only Rustpad's live
image inventory remains incomplete. Grist's Deno Rust-crate and Pyodide/WASM
coverage limitations remain explicitly documented, not silently certified.
Raw findings were **42 critical / 2,834 high occurrences**. After exact,
expiring package/payload/component reviews, **5 critical / 1,686 high
package-target records remain pending**. Neither count measures exploits.

Of those 1,691 pending critical/high records, **1,632 have no fixed version in
the scanner's current advisory data**. The other 59 include major API/framework
changes, coupled cryptographic packages, bundled/build-only dependencies and
records needing further payload/exposure review. They are not represented as
patched. Host LMDB, OpenSSH-client and unused ksmbd findings remain visible;
[host constraints and primary sources](../deployment/maintenance/host-final/README.md).
The scanner service deliberately returns incomplete while Rustpad lacks
inventory; its warning was not disabled or reset.

This final reconciliation applied **606 additional exact seven-day reviews**,
preserving the raw scan byte-for-byte and the previous private decision ledger.
It includes 170 stale DHI inventory matches verified against authenticated
packages and the actual live regular files/symlinks. Seventeen binary-package
inventory groups could not support their narrower proof; they received no
decision from that helper. Other unverified findings remain open.

The **00:23:15 UTC** application-advisory review checked **112 providers**, with
no unavailable lookup or reopened application advisory. Separate dependency
findings above are not cleared by that result. **110 focused Node tests, nine
embedded-asset parser tests and 83 source-patch apply/reverse checks passed**.
Read-only availability checks found no failed tool endpoint across 59 status
monitors and 105 catalogue probes; this is a point-in-time check, not uptime.

Wakapi's OIDC client credential was separately rotated at **00:25:21 UTC**:
the new secret was accepted and the previous secret rejected. Only Wakapi
restarted, on the same image. Password-hashing settings, account data, provider
policies and access rules were preserved. Image rollback must keep the rotated
credential; never restore an old private configuration just to roll back code.

Independent GitHub scheduling remains a separate operational dependency.
The enabled 15-minute workflow had stopped producing scheduled runs despite
successful manual checks. Commit `0496567` refreshes the offset to minutes
11/26/41/56; this is a bounded retry, not proof of scheduler recovery. Only a
genuine scheduled completion clears its warning. GitHub documents that scheduled
events can be delayed or dropped: [schedule behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

Root storage has approximately **8.4 GiB free**, below the 10 GiB warning but
above the enforced 8 GiB release floor. Further build batches must account for
that reserve. No user data, backups or rollback images were deleted. The owner's
in-memory Rustpad must be saved before its image/Docker update can proceed.
The earlier entries below preserve individual release and rollback evidence;
they are not newer fleet counts.

## Native maintenance checkpoint — 11 October 2026

This is a deployment checkpoint; the remaining finite Go/vendor-package batch
is still being verified. Earlier entries below are historical.
No new public application, registration, retention policy, analytics or edge
Caddy change was introduced. Rustpad was **not restarted**: the owner identified
their memory-only pad, but has not yet confirmed it is saved for maintenance.
Docker/containerd updates and any host reboot are also held for that boundary.

| Released repair | Verification and reproducible evidence |
| --- | --- |
| Grist 1.7.21 | Replaced obsolete 2022 runsc with Grist's supported Pyodide 0.28.1/Deno 2.9.7 sandbox, retained restrictions, disabled Deno update requests and applied compatible app libraries. Native escape-regression, private two-account formula/export/import/restore gates passed; public HTTPS create/calculate/export/delete and unapproved identity denial passed. Three release-only QA identities retired, sessions/tokens/test MFA revoked. [Sandbox and rollback](../deployment/maintenance/sandbox-final/README.md), [library overlay](../deployment/maintenance/language-final/grist/README.md). |
| Penpot 2.18.3 | Actual ImageMagick 7.1.2-27 build without OpenEXR removes the unused vulnerable copies; genuine XML security packages replace both system and private XML copies. Native raster/font conversion, two-account editing, permission removal, export/import and isolated fresh backup restore passed. [Exact images, patches and tests](../deployment/maintenance/native-final/README.md). |
| XML libraries | Five applications/six roles (FreshRSS, KitchenOwl, Authentik, RSS-Bridge and Gathio) plus the host use genuine locally built Debian security backports. Upstream XML corpus/API tests and real app consumers passed; host BIND/LLVM/native XML checks passed without Docker/SSH restarts. Existing nine DHI patches and distro patches preserved where applicable. [Packages, ABI boundaries and rollback](../deployment/maintenance/xml-final/README.md). |
| SQLite / Gathio codec | Four-line upstream SQLite fix passed 87 DISTINCT tests and native backup/restore checks; Kuma, RSS-Bridge and Gathio use the rebuilt library. Gathio's required AOM codec is now signed Debian 3.14.1, tested through actual AVIF/HEIF/PostGIS consumers and complete restored event/ICS workflows. [SQLite](../deployment/maintenance/sqlite-final/README.md), [AOM](../deployment/maintenance/aom-final/README.md). |
| Python/npm installer layers | Removed unused pip from 13 runtime images; updated compatible npm 11 installer dependencies in 14 images. All 27 images/34 containers passed exact-image/configuration/app-byte checks and native consumers; namespace-dependent gateways and SMTP guards were verified. [Release and limitations](../deployment/maintenance/language-final/README.md). |
| Rallly, Spliit, Wishlist, RSSHub | MySQL2 3.23.1 and ADM-ZIP 0.6.1 repairs passed actual prepared queries, transactions, archive traversal checks and native workflows. Spliit's decorative external flag fetches were removed by a small hash-guarded patch; a privacy-preserving rollback was tested. [Evidence and source patch](../deployment/maintenance/language-final/app-leaves/README.md). |
| Relays and host JWT | Both Coturn 4.18.0 relays retain their exact binary, authentication, quotas and firewall with patched MariaDB client libraries. Native direct/relay protocol, denial and bounded live checks passed. Host and Kuma PyJWT 2.15.1 passed native signed-token/OAuth assertions. [Relay scope](../deployment/maintenance/mariadb-client-final/README.md), [host scope](../deployment/maintenance/host-final/README.md). |

All release receipts passed. Failed first checks on Grist/FreshRSS/Authentik
restored and verified the exact previous images; the causes were test CSRF or
historical-route assumptions, corrected before successful retries. No rollback
restored old user data over newer writes. Saved-work backups remain protected;
short-lived sharing content was not added to backups.

Checkpoint fleet scan **23:22:19 UTC**: 109 images / 175 containers, 510 host packages,
31 source manifests, 206 seconds; all captured live image IDs still matched.
Raw findings: **42 critical / 2,979 high occurrences**, not demonstrated exploits.
All source scans completed. Rustpad alone lacks live package inventory; the
scan correctly remains incomplete. Grist's official Deno binary additionally
has no recoverable Rust-crate inventory/release SBOM, and Pyodide has upstream
WASM inventory limits; these are now stated in every scanner report.

The exact local XML/SQLite backports have separately verified payload/source
hashes and seven-day finding-specific reviews; the raw scan is unchanged.
Binary-subpackage reviews check the actual installed files against the named
affected component, never exempt the entire service/source package, and leave
unverified inventories open. Their reproducible helpers are
`review-native-backports.mjs` and `review-binary-scope.mjs` under maintenance.
The timestamped private queue is authoritative for the remaining reviewed count.
The unused host SMB-server module is blacklisted but its kernel remains
vendor-unfixed; no claim of an absolute administrative load prohibition is made.

Final application-advisory review **23:19:55 UTC**: 112/112 providers checked,
zero unavailable lookups or reopened application advisories; 102 repository
endpoints and ten manual-primary-source providers. This does not clear the
separate dependency queue. The read-only availability check found no failing
tool endpoint across 59 status monitors and 105 catalogue probes.

Off-host manual availability run `38184002816` passed at **23:22:23 UTC**.
The enabled 15-minute GitHub schedule has no newer observed automatic run than
20:56 UTC, so its overdue warning remains. A manual success now explicitly
cannot conceal a stalled automatic schedule. Incomplete scanner coverage also
no longer conceals known pending package counts in alerts. No monitoring
notification state was reset to manufacture a healthy result.

Only re-downloadable caches were removed to restore the ten-GiB disk warning
margin: unused Cypress test-runner files and pip/npm/pnpm download/index caches.
No application assets, runtime images, rollback images, user data or backups
were deleted. Future builds may need to download those caches again.

Private receipts remain under `/var/lib/utilibre-maintenance/` in the linked
recipe-specific directories. Rollback uses each exact previous image/package
and unchanged data; do not bulk-redeploy old Compose files over unrelated work.
Source recipes, exact package/source hashes and native tests accompany the
release; corresponding source publication uses a clean committed worktree.

At **23:41 UTC**, Projects, Kuma, Grist and Gathio also received verified npm
11.21 installer-only layers. Every application file stayed unchanged; Kuma's
unused optional tunnel binary was removed only after proving it unconfigured.
Native fresh login, sandbox/formula/export/restore, public routes, private
administration boundaries and fictional event/ICS/delete gates passed.
[Scope and rollback](../deployment/maintenance/language-final/README.md#four-remaining-npm-10-installers--deployed-2341-utc).
The earlier raw scan above predates these four layers and the remaining Go/
vendor work; it is not a final post-batch count.

At **23:54 UTC**, genuine signed PCRE/OpenSSL updates were deployed to 13
images serving 17 roles, including FreshRSS, TRIP, the restricted outbound
proxies, Radicale, Priviblur, BreezeWiki, Chess, Mumble, Redlib and Penpot's
admin companion. Existing application bytes and access boundaries were retained.
Native restored/fictional workflows and exact live-image gates passed; Mumble's
aggregate connection check was empty before its restart. Penpot's already-fixed
DHI frontend/exporter payloads were verified against signed packages without
rewriting their stale scanner metadata. [Vendor evidence and rollback](../deployment/maintenance/vendor-leaves-final/README.md).

At **23:57 UTC**, Rimgo, Galene, SafeTwitch's backend, GotHub and AnonymousOverflow
were deployed with Go 1.26.9 and pinned compatible module repairs. Full-image
comparison found only the intended executable changed. Native route checks,
Galene's two-client media/reconnect fixture and four bounded public-content
requests passed. Each candidate scan found zero high/critical occurrences;
this is not a fleet-wide security clearance. Matching application source
archives were published and their public HTTPS hashes verified.
[Five-service release and limits](../deployment/maintenance/go-final/README.md).

A further **1.018 GB of unused build cache** and approximately **690 MiB of
re-downloadable test-browser/compiler/package caches** were removed after
checking for active executables and container mounts. No live application,
rollback image, source checkout, document or backup was removed. Disk figures
remain point-in-time observations while the final bounded builds continue.

## Security continuation — 11 October 2026

The PrivateBin listing issue is closed: the official
[directory](https://privatebin.info/directory/) now shows file upload **✔** for
`paste.utilibre.org` (checked 21:51 UTC). The deployed PHP 8.5.11 layer preserves
the sanitizer, 25 MB upload cap, one-week maximum expiry and backup-excluded
temporary storage. Public HTTPS encrypted upload/download of a full synthetic
25 MB file passed byte-for-byte; the fixture was deleted. This is a tested
upload path, not a claim that every browser or file type was exercised.

Additional runtime repairs are deployed, with application/access/retention
settings preserved:

| Component | Repair and observed gate |
| --- | --- |
| PrivateBin, ntfy, Kittygram, DeGoog | Exact signed Alpine library/PHP versions; unchanged application hashes. ntfy anonymous publish/read passed; DeGoog native EN/ES desktop/mobile search passed through its protected backend. The first public browser search passed but its later API request failed, so the entire public test is not recorded as passed. |
| Six Valkey caches | Signed OpenSSL/util-linux fixes, same 9.1.1 engine. Native SET/GET/expiry/Lua passed. Yopass writer was stopped and its cache verified empty before replacing that volatile cache; no live secret was copied or backed up. |
| Linkding | Django 6.0.9, PyJWT 2.15.1, urllib3 2.8.0, soupsieve 2.9. Isolated restored database passed native bookmark create/export/import, notes/tags and anonymous denial. Current native SQLite backups passed integrity checks. |
| PostgreSQL/MariaDB/Addy/DocumentDB | gosu 1.19 rebuilt with patched Go and reviewed compatible identity-parser dependencies. Same database engines/application files; all eleven real PostgreSQL database dumps restored in isolation, plus MariaDB and complete restored Gathio synthetic workflows. Addy's guarded SMTP supervisor, IPv4/IPv6 ingress boundary, native Postfix and login passed after deployment; this is not a new mail-delivery test. |
| Penpot 2.18.3 | Genuine 228-package Debian backend inventory, unused frontend gawk removed, unsupported EXR decoding denied. Native two-account editing, export/import, permission removal, raster output and thumbnail checks passed; public login reaches Authentik without unrelated requests. EXR denial does not patch libxml2/OpenEXR. |
| PairDrop 1.11.2 | Express 4.22.3, ws 8.21.0, body-parser 1.20.8, qs 6.16.0 and path-to-regexp 0.1.13. Two Chromium clients transferred exact bytes directly; parser/routing/frame-bound checks passed. Current candidate scan reports zero findings. Existing TURN configuration remains; forced-relay transfer was not repeated in this leaf-library test. |
| Chhoto 7.8.3 | Same-source auditable binary exposes 204 compiled Rust packages; 22 native tests and fictional SQLite create/redirect/denial/expiry/restore passed. No production temporary URL backup was added. |
| FMD 0.17.0 / Yopass 14.10.0 | Same native sources and modules rebuilt with Go 1.26.9 / 1.27.2; Yopass also has the signed Debian OpenSSL repair. FMD's isolated two-account opaque-record/denial/delete/control checks and Yopass encrypt/decrypt, concurrent one-time retrieval, actual one-hour TTL, shortened fixture expiry and upload denial passed. No real device command was sent. Both final images have zero high/critical findings in their candidate scans. |
| Kuma 2.5.6 | Compatible Axios/ws/SQL/template/parser/globbing leaf updates, with native restored login and status checks. Public status/API work and setup/dashboard/WebSocket administration stay denied. Remaining OS and major-version library findings remain open. |
| Actual 26.10.0 | Compatible dependency repairs plus four exact-hash privacy edits: no automatic GitHub release/news fetches, same-origin/identity connection policy and native Workbox cache revisions. A fictional budget passed ZIP export/import, reload and server sync with zero unrelated browser requests/errors. Public OpenID handoff also passed. Existing tabs need the native update/reload cycle; saved budgets are not cleared. |
| Wishlist / Newsletters | Bundled Caddy 2.11.7 rebuilt with Go 1.26.9 and x/net 0.60.0; application files and data formats unchanged. Native HTTP/2, streaming, Wishlist account/list/item and disposable newsletter/SMTP/Atom/deletion checks passed. This does not update the separate edge Caddy VM. |

Evidence and exact pins: [Alpine recipes](../deployment/maintenance/alpine-final/),
[gosu review](../deployment/maintenance/gosu-security/review.json),
[Penpot native/ABI boundaries](../deployment/maintenance/penpot-2.18.3/RUNTIME.md),
[PairDrop review](../deployment/community/pairdrop-security/review.json),
[Rust build evidence](../deployment/maintenance/rust-auditable/README.md).
[Go rebuilds](../deployment/maintenance/go-runtime-20261011/README.md) and
[Kuma/Actual patch details](../deployment/maintenance/npm-leaves/README.md)
record exact versions, privacy patches and remaining scope.
[Bundled Caddy review](../deployment/maintenance/caddy-security/review.json)
records pinned source/dependency evidence and the narrow OpenPGP advisory
import-closure observation; unrelated whole-image findings are not waived.
Private release receipts are under `/var/lib/utilibre-maintenance/` in
`alpine-final-20261011`, `linkding-python-20261011`,
`postgres-gosu-20261011` and `final-release-20261011`.
Bundled Caddy's live receipt is `caddy-security-20261011/net/release.json`:
Wishlist public/local login and Newsletters public/local page passed; all four
roles match their reviewed image IDs. Native SMTP and IPv4/IPv6 gateway-only
guards passed, web/gateway namespaces match, and the initializer stayed stopped.

Final fleet scan **22:19:04 UTC**: 109 live images / 175 containers, 510 host
packages, 29 source manifests, 110 seconds. Every captured live image still
matched afterward. Raw findings: **55 critical / 3,276 high occurrences**,
not exploitability counts. All source scans completed; Penpot OS and Chhoto Rust
inventories are now present. Rustpad is the only incomplete runtime inventory.
The queue therefore remains incomplete rather than falsely green. After
deduplication and exact expiring review, **40 critical / 3,257 high findings**
still need review; 15 critical / 1 high are recorded not affected. Raw data is
unchanged. Seventeen seven-day decisions use actual package/binary evidence for
nonexecutable container kernel headers, Debian's excluded minizip build and the
Go 1.17 binary's absent Go-1.18 net/netip package. They do not waive host kernels,
other sandbox vulnerabilities or entire dependency families.

Upstream application review at **22:18:56 UTC** checked 112 providers with no
unavailable provider or published application advisory awaiting disposition.
That is separate from the open dependency queue above. The final read-only
monitor found no tool availability failure across 59 status-page monitors and
105 configured catalogue probes. It did report the incomplete scan/queue and
the disk warning subsequently resolved by cache cleanup below. No notification
state was changed and no mail was sent by that check.

The same-source Rustpad candidate exposes 191 compiled Rust packages and passed
23 native tests plus two-browser editing/frame rejection. It is **not deployed**:
the live process reports a nonzero count of memory-only documents. No document
identifier or content was inspected. A restart would erase work. Wait for an
empty process under a guarded maintenance window, or arrange an announced
save-before-restart window; never misreport its live inventory as repaired.

The queue now retires an old-image finding during a partial scan only when
every affected container has a successfully scanned replacement. Unscanned
targets retain their findings. Exact-image decisions expire and raw findings
remain intact. Forty-three focused maintenance/rollback/upstream-review tests passed; the
incomplete-scan alert is deliberately not silenced by this repair.

Native saved-account backups were taken at 21:46–21:59 UTC: expanded tools,
Addy, Gathio, Linkding and community/FMD/Kuma. Restored native database/application
gates are identified above; a SQLite integrity check alone is not represented
as full account recovery. Temporary sharing data was not newly backed up.
Only reproducible build caches and reviewed never-deployed compiler/preview
images were removed to maintain the 8 GiB disk recovery floor. Retained old
runtime images and all user data/backups remain available.
Final bounded cleanup reclaimed another 2.076 GB of unused, reproducible build
cache (older than ten minutes, 2 GB reserved); root free space returned to about
12 GiB, above the monitor's 10 GiB warning threshold. No runtime or rollback
image was pruned by that cleanup; cache files can be regenerated from recipes.

Rollback for these same-version layers: restore only the reviewed rollback image
recorded in the private release receipt, with unchanged volumes/environment,
then verify native health. Addy's app must use
`systemctl restart utilibre-addy-smtp.service`, not plain Compose, to retain its
pre-listen firewall guard. No rollback requires restoring over newer user work.
Newsletters likewise requires `systemctl restart utilibre-newsletters-smtp.service`
for SMTP, and its gateway must be recreated when its shared web network
namespace changes. Preserve all existing mounts and access restrictions.
The release helper tests command/health/receipt failures and verifies the exact
rollback image after rollback; a failed rollback remains explicitly unverified.
Actual is the deliberate exception to using an untouched predecessor: its
`utilibre-actual:privacy-rollback-20261011` fallback retains the four privacy fixes
on the old dependency set, so emergency rollback cannot restore automatic
GitHub requests or the broad connection policy. That fallback passed native
budget/export/import/sync and unrelated-request checks; it retains older
security findings and is not a substitute for the repaired live image.

## Parallel security release — 11 October 2026

Continued the security work with separate build/test, advisory-review and release
review workstreams. These are deployed changes, not just candidate recipes:

| Scope | Live change | Verification |
| --- | --- | --- |
| Penpot | 2.18.3, preserving the reviewed Java/admin-library patches; exporter vendor fixes | Two-account editing/export/import, removed-member and orphan-role denial, native SVG sanitization, actual PNG export; saved-work backup restored in isolation; public login/OIDC handoff |
| Uptime Kuma | 2.5.6 with patched Node, healthcheck and compatible libraries | Isolated native SQLite restore/login/status, public badge authorization, loopback-only administration and public gateway denials |
| Shared static delivery | TIFF 4.7.2-r0 and zlib 1.3.2-r1 across 41 gateways and 26 application wrappers | Native server configurations and before/after endpoint status; complete application-file hashes unchanged for all wrappers |
| PostgreSQL | Same 17.11/16.15 engines, patched OpenSSL/libuuid across 11 databases | Engine-tree hashes unchanged; synthetic SQL/dump/reopen and each actual application database restored in an isolated fixture; all 11 live instances healthy |
| Addy database | Same MariaDB 12.2.2 engine, Ubuntu OpenSSL security backport | Engine hashes unchanged; authenticated TLS, SQL/permission tests and two-instance dump/restore; native production backup restored separately |
| Authentik | 2026.8.3 with PCRE2 vendor backport and app urllib3 2.8.0 | Native password/TOTP replay, RSA/ECDSA OAuth/JWKS denial checks; native backup/restore; live server/worker healthy and Penpot handoff reaches sign-in |
| Opengist | 1.15.2 vendor-library layer | Native account, private/public gist, edit/history, ZIP, Git discovery and anonymous denial checks; native pre-release backup |
| LiberaForms | 4.11.1 with CairoSVG 2.9.1 and PCRE2 security backport | Actual avatar/SVG/PNG/PDF output, two-account login, encrypted-form configuration and cross-account/anonymous denial; encrypted backup authentication and native restored login/answer check |
| SimpleLogin | Private p8 Ubuntu vendor layer | Application/interpreter bytes unchanged; native login, CSRF, crypto/token, SMTP EHLO/NOOP and isolated restore; remains private because the legacy web framework is unresolved |
| Portal | Current application-version/source disclosures in EN/ES | Typecheck/lint/build and 120 tests; current versions visible on both public software pages without browser errors |

No account enrollment, new public service, analytics, retention change or Caddy
change. Wallabag's complete public two-account/MFA/save/export/reopen/delete gate
also passed after the gateway refresh. TRIP/13ft/Unfurl retain their native
supervisors and passed their internal-network denial checks. Monitor checks are
point-in-time evidence, not uptime history.

### Coverage and remaining blockers

Historical 21:18 checkpoint, superseded where noted above:
the scanner explicitly counts OS packages separately from language packages.
Penpot's official backend deletes its OS package database; its 170 Java entries
must not conceal **zero inventoried OS packages**. The exact upstream SBOM is
also incomplete for OS coverage. This is an unresolved coverage alert, not a
scanner crash or permission to suppress findings. A faithful rebuild preserving
that inventory needs access to the pinned Docker Hardened Images base; the
registry returns 401 and no credential is configured. See the
[Penpot release evidence](../deployment/maintenance/penpot-2.18.3/README.md).

Authentik's upstream-held `+ak-fips` OpenSSL was deliberately preserved; an
ordinary Debian package is not a verified drop-in replacement. Grist's old
runsc fork depends on private old-Go ABI and cannot safely be fixed by merely
bumping its compiler. Its isolation was not weakened. Legacy SimpleLogin,
disabled FerretDB MCP, vendor-unfixed OS libraries and remaining bundled/runtime
dependencies still require separate work. No broad vulnerability waiver was
introduced. The earlier 20:45 scan below predates this release and is not its
final result; use the timestamped private `security.json` and queue for current
coverage and findings.

Post-release scan completed **21:18:50 UTC** in 92 seconds: 109 running images,
175 containers, 510 host packages and 20 source manifests. Every running image
still matched the scan's captured ID afterward. Observed raw findings are
**61 critical / 3,406 high**; these are package occurrences, not proven exploits.
Coverage remains **incomplete** for Penpot's missing OS inventory and two static
Rust images (Chhoto and Rustpad) with no packages detected by Trivy. The source
checks all completed, but a source lock is not proof of a compiled artifact's
contents. No empty inventory is passed as clean.

The conservative queue retains old observations during incomplete scans:
52 critical / 3,382 high currently need review, plus 17 critical / 938 high
marked **not rechecked** from older artifacts. These carried-forward records
must not be presented as current-image totals or evidence of a regression.
Exact expiring not-affected decisions remain separate. Queue generation now
runs in systemd `ExecStopPost`, so an intentionally nonzero incomplete scan
still updates the ledger; it does **not** clear the failure alert. The unit
validates and is loaded. A further scanner run is not needed merely to re-count
unchanged images.

The additional exact Chhoto lock was added to scheduled source coverage after
that fleet run. Its targeted 21:23:15 check inventoried 259 packages with zero
reported findings; this does not close either Rust binary-inventory gap.
[Exact scratch-image evidence and next-build constraints](../deployment/maintenance/rust-inventory-20261011.md).
Rustpad was not restarted: its live pads are in memory and require a separate
announced maintenance window with users able to save their work.

### Evidence and rollback

- [PostgreSQL exact IDs, restore boundaries and rollback](../deployment/maintenance/postgres-vendor-20261011.md).
- [Kuma release](../deployment/maintenance/kuma-256-20261011.md), [shared-runtime release](../deployment/maintenance/nginx-tiff-20261011.md), [vendor-layer tests](../deployment/maintenance/remaining-runtime-vendors-20261011.md), [final MariaDB/Forms layers](../deployment/maintenance/vendor-final-20261011.md).
- Machine-readable [release receipt](../deployment/maintenance/runtime-release-20261011.json); private reports retain exact pre-change image/configuration bindings without publishing credentials or saved work.
- Penpot backup: `/opt/utilibre/expanded-backups/2026-10-11T21-02-33-440Z`; native restore passed. Its upstream migration removes orphan permission relations: prefer forward repair. A downgrade requiring an old database must be a separately coordinated recovery, never an automatic overwrite of newer documents.
- Kuma backup: `/opt/utilibre/community-backups/2026-10-11T21-05-12-712Z`; native SQLite integrity passed. Review native schema compatibility before application downgrades.
- Authentik backup: `/opt/utilibre/identity-backups/2026-10-11T21-08-24-419Z`; isolated native restore passed. Opengist backup: `/opt/utilibre/community-backups/opengist-20261011T210154Z`. Forms backup: `/opt/utilibre/pack-backups/2026-10-11T21-02-10-890Z`.
- Dependency-only rollbacks select the exact previous service image and preserve current data/configuration. Use the recorded full Compose file list, including private bootstrap overrides, and `--no-deps --no-build --pull never`; check the exact restored image and health. Do not roll back a whole environment or database for a library-only change.
- Portal image: `public-utility-portal:0.1.0-security-versions-20261011`. Roll back **only** `PORTAL_IMAGE` to `public-utility-portal:0.1.0-security-20261011`, then `docker compose up -d --no-deps --no-build --pull never portal`. No data migration.

These are Chromium desktop, native API and isolated-container checks, not
physical-device certification or comprehensive penetration testing. The
independent GitHub availability job passed manually (run `38173920016`) and
the API now shows an actual successful **schedule-triggered** run
[`38174272872`](https://github.com/mycelibre/utilibre/actions/runs/38174272872),
created at 20:56:11 UTC. This closes the missing observed-cron-run dependency;
it is not a future uptime guarantee. The final temporary build-cache cleanup
reclaimed 8.234 GB reported by Docker (some layers shared); root free space
rose to about 14 GiB. Running/rollback images, backups and saved work remain.

## Library patch continuation — 11 October 2026

Deployed a further dependency-only batch, preserving application versions,
private data, invitation rules, privacy controls and the existing sandboxes:

| Service | Changed runtime/dependencies | Meaningful verification |
| --- | --- | --- |
| Rallly 4.15.4 | fast-xml-parser 5.11.2; npm's tar 7.5.21 | Isolated native migrations, fictional poll invitation, XML parse/build/validation; unchanged application-tree hash for the subsequent npm-only patch |
| Uptime Kuma 2.5.5 | Node 22.23.2, native Go healthcheck rebuilt with 1.26.9; protobufjs 7.6.6, tar 7.5.21, grpc-js 1.14.5 | Network-isolated native SQLite restore/login/status; protobuf round trip, native gRPC construction, archive extraction and native runtime health |
| Reactive Resume 6.0.0 | Installed Seroval 1.6.8; npm's tar 7.5.21 | Two fictional accounts: ZIP export, JSON import, edit/reload, cross-account denial and deletion; subsequent npm-only patch preserves the entire app tree |
| Penpot 2.18.2 | Backend Netty 4.2.17.Final, Jackson 2.22.3, lz4-java 1.11.4; installed admin-console Seroval 1.6.8 | Dependency-only native backend build; two isolated accounts, editable export/import/reload, denied cross-account access and deletion; public login and Authentik handoff |
| Gathio / FerretDB 2.7.0 | Native FerretDB rebuilt with Go 1.26.9 and compatible database/network libraries | Isolated native database restore plus fictional event create/edit/ICS import/export; live synthetic create/read/ICS/deletion |

These are **bounded patch/test results, not a clean bill of health**. In
particular, replacing an installed Seroval module does not rebuild a separate
precompiled SSR/browser bundle. Native application versions and privacy patches
remain unchanged; complete bundle reachability review remains separate. The
full FerretDB upstream test suite did not pass its original environment/compiler
assumptions; six focused native packages and the actual isolated Gathio workflow
did pass. Its old MCP SDK cannot be replaced with the current major API without
application changes. The MCP listener remains explicitly disabled and those
findings remain open; telemetry and trace export stay disabled.

The first packaging attempt used package-directory symlinks. The running app
resolved the new library, but image-layer analysis still retained old package
files. Final recipes replace directories directly, and the next scan confirms
the targeted old packages are absent without suppressing their advisories.
The first public smoke harness used a historical wrong status hostname and
checked Penpot before native dynamic initialization completed. Corrected it to
the configured `status.utilibre.org` and actual visible login/OIDC controls;
no access rule was relaxed to pass a test.

Full deployed-image scan completed **20:45:52 UTC**: all **109 images / 175
containers**, **510 host packages** and **19 source manifests** checked. Raw
results: **64 critical / 3,551 high occurrences**. After package-target
deduplication and exact, expiring reviews, **51 critical / 3,525 high remain
pending**, versus 67 / 3,682 at the earlier 19:47 checkpoint. These are not
confirmed exploits. The four newly revalidated zlib dispositions are limited
to the exact Debian binary packages that do not contain the affected minizip
code; raw findings remain available. The targeted old XML/Seroval/protobuf/tar
and rebuilt esbuild packages no longer have those high/critical matches.

The eight final services are running; Chromium public entry checks and Penpot's
actual OIDC handoff passed at 20:42:56. Public Python calculation/pandas/plot
also passed; retired CLI paths return real 404 responses. A read-only alert
check found all catalogue endpoints recovered. Independent GitHub availability
monitoring is enabled but had no recorded schedule-triggered runs; its manual
run was stale. A fresh manual dispatch verifies availability only, not cron
reliability. Do not clear that limitation on the strength of a manual run.

Saved-work backups were retained and the expanded native backup was restored
and verified in isolation. Temporary sharing content was not backed up. Unused
Docker build cache older than one hour was reclaimed (14.5 GB reported), leaving
about 18 GiB free on the root disk at 20:37 UTC. No application images, volumes,
user documents or backups were pruned. Host available memory was about 20 GiB of
34 GiB; this is an observation, not a concurrency guarantee.

[Exact pins, reproducible builds, evidence, remaining boundaries and scoped rollback](../deployment/maintenance/library-patches-20261011.md).
The follow-through also rebuilt Wishlist's **unchanged esbuild 0.19.12** with
Go 1.26.9 and removed four unused native/Node CLI launchers from browser-only
JupyterLite. Browser Python/WASM remains installed; its TIFF vendor update is
included. Native Wishlist setup/list/item/persistence/access checks and the
Spanish Python/pandas/matplotlib notebook passed against isolated candidates.
The final candidates scan at 1 critical/68 high (Wishlist; pending exact zlib
review) and 0 critical/0 high (JupyterLite); these are whole-image scanner
observations, not safety certifications. Wishlist's native pre-release SQLite
backup passed integrity/foreign-key restore checks. [Builds and scope](../deployment/maintenance/browser-binaries-20261011.md).
Native Chrome/Chromium desktop and disposable network tests do not establish
physical-mobile coverage or every production account workflow. No portal/UI
release, Caddy change, registration change or additional public service is part
of this batch.

## PrivateBin directory compatibility — 11 October, 19:58 UTC

Deployed `utilibre-privatebin:2.0.6-security-20261011-p2` and its matching native
template. The previous sanitizer backport renamed the main script; the public
directory requires the native filename to detect the version before updating
attachment support. Restored that filename with an explicit cache-busting query
and retained the sanitizer/SRI fix. Exact directory detection, encrypted 25 MB
upload/download/hash, oversize rejection and one-week expiry passed publicly;
the synthetic paste was deleted. EN/ES Chromium desktop/mobile emulation, not
physical devices. The upstream directory still needs its own successful rescan;
no duplicate submission or maintainer contact. No Caddy changes needed.

[Recipe, exact image, evidence and rollback](../deployment/utilibre/privatebin-security/README.md).
The broader dependency security backlog is unchanged by this compatibility fix.

## Operational maintenance rollout — 11 October 2026

Daily upstream review now has runtime vulnerability scanning, useful synthetic
tasks, off-host availability checks, a representative restore rehearsal and an
operator digest. **These checks do not close the security patch backlog.** Private
reports measure software/infrastructure, never visitors or their activity.

| Check | UTC schedule, plus host-timer jitter | Scope |
| --- | --- | --- |
| Existing guarded SearXNG updater | Daily 02:20 | Existing staged EN/ES search/privacy gate and rollback |
| Upstream releases/advisories | Daily 03:20 | 108 catalogue providers plus four reviewed companions: Authentik, coturn, internal RSSHub and host GitHub CLI; ten non-GitHub sources explicitly require manual primary-source review |
| Useful browser tasks | Daily 03:50 | Eight sequential workflows: portal EN/ES/mobile, PDF merge/OCR, chart export, image export, ZIP round trip, QR/offline, direct PairDrop, Pollaris create/vote/export/delete |
| Runtime/software scan | Daily 10:20 | Latest complete run: 109 unique running images / 175 containers, 510 installed host packages, 13 source manifests |
| Native alerts | Every five minutes | Existing 59 Kuma monitors, 105 portal endpoint probes, resources, enabled native backup jobs, stale/failed reports, security queue, external workflow freshness |
| External availability | GitHub cron :07/:22/:37/:52 | Eight fixed public HTTPS endpoints/content or exact same-origin identity redirect |
| External forced TURN transfer | Sunday 08:47 | Existing two-browser exact-byte test, forced TLS relay, four-minute cap |
| Representative recovery | Sunday 12:25 | Native FreshRSS synthetic account/article restore plus encrypted Storage Box fictional-file round trip |
| Operator digest | Monday 13:10 | Existing verified-STARTTLS relay to the fixed operator; no new notification service |

The four new host timers are enabled. Successful manual execution is distinct
from observing the next scheduled run. GitHub can delay/drop scheduled jobs and
disable public-repository schedules after 60 days without activity. The host
checks active workflow state and a completed non-drill run within 90 minutes.
The operator must enable GitHub failed-workflow notifications; a deliberate
failed drill is not proof of inbox receipt or a guaranteed independent pager.
[GitHub schedule limits](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

### Scanner, alerts and review queue

`deployment/maintenance/install-scanner.sh` installs official Apache-2.0 **Trivy
0.75.0**, archive SHA-256
`c6e65abddb348e25f10549df887045629cf28cc72453cd1c63acb717316b3f3f`.
Usage telemetry and version checks are disabled. Matching is local against
downloaded OS/library and Java databases. No cloud scan upload or secret scanner.
Container inspection is parsed in memory without persisting environment/mounts.
Host scanning copies only OS identification and dpkg status; source scanning
copies only listed lockfiles, never account documents or the live filesystem.
[Source/license](https://github.com/aquasecurity/trivy/tree/v0.75.0),
[telemetry controls](https://github.com/aquasecurity/trivy/blob/v0.75.0/docs/guide/advanced/telemetry.md).

Authentik 2026.8.3's local OCI export lacks a config blob. The narrow fallback
permits only its exact running digest from the official registry, with remote
SBOM lookup disabled. It downloads that public artifact, not private layers,
and never resolves a moving tag or replaces Authentik. New images require a
fresh review. Failed export diagnostics may remain after recovery; the dated
`security.json` is the current result. Initial Java DB/host-identification and
Authentik failures were repaired; all 109 images then completed successfully.

Private records in `/var/lib/utilibre-maintenance/`: `security.json` (raw results),
`security-queue.json` (deduplicated artifact/package/version/advisory findings,
first observation, owner and deadlines), `security-decisions.json` (exact,
evidence-backed decisions expiring within 30 days), `latest.json`, `journeys.json`,
`recovery.json` and `digest.json`. Incomplete scans cannot clear previous work.
Critical/High/Medium review targets are 24 hours/72 hours/seven days, **not repair
promises**. Rebuilt images reopen exact-artifact decisions without resetting the
deadline for unchanged findings in the same service; source reviews also bind
to the lockfile hash. A package finding does not establish reachable exploitation. Review
vendored patches, disabled modules, source-package mapping and build-only code;
do not globally suppress CVEs or hide findings lacking an available fix.

```sh
systemctl start utilibre-security-review.service
node deployment/maintenance/triage.mjs list
# One exact key/status/reason/expiresAt in a private file, never a public report:
node deployment/maintenance/triage.mjs record /absolute/private/review.json
node deployment/community/monitor-alerts.mjs --check-only
node deployment/maintenance/weekly-digest.mjs --preview
```

Limitations: not every minified browser bundle, container writable layer, user
volume, separate Caddy/Proxmox host, or exploit path is scanned. Source lockfiles
are build-input evidence, not exact deployed-browser inventories; development
dependencies may be omitted by scanner defaults. These limits stay in reports.
Scanner resource caps: 75% of one CPU, 2 GiB RAM, sequential image analysis.
Observed databases/cache ~2.9 GiB; complete cached run ~two minutes. Root free
space ~11 GiB after caches and the runtime rollouts versus ~18 GiB before;
old rollback images were retained. Final scan peak ~439 MiB; host available
memory ~21 GiB of 34 GiB. These are dated observations. Scan refuses to begin below
8 GiB; existing resource alert warns below 10 GiB. No capacity promise follows.

The edited upstream Penpot GHSA-wxgm-8qjw-x445 / GHSA-4f36-m4hj-cv86 and Yopass
GHSA-6r69-c6wg-7g8m records caused historical alerts. Installed Penpot **2.18.2**
and Yopass **14.10.0** are outside their affected ranges. Checked-in
`advisory-reviews.json` records exact image identities, advisory revision/range
and primary evidence. Changed images/ranges/advisories or unavailable runtime
evidence reopen the review. Penpot's inconsistent patched-version field is
explicitly documented. Separate dependency findings remain open.

### Verified tasks and operational repair

First security repair batch: **41 gateways** now use official unprivileged
nginx **1.30.5 / Alpine 3.24.2**, digest
`15c994d10d6d78658721c3bcafff14cb281fba2a4bdf9d5ba92c416a472516e3`.
All native configuration checks and before/after endpoint statuses passed.
The shared runtime scan fell from 3 critical/65 high to 0 critical/1 high
(TIFF remains flagged; no blanket exception). Native private-network rejection
tests passed again for TRIP, 13ft and Unfurl. TRIP initially returned 504 during
a standalone gateway recreate; its existing supervisor couples namespace rules
to the stack. The native service restart restored it and the scoped rollout now
uses those three supervisors. Keep their boundary scripts, not generic restart
instructions, in the release path.

**18 static application runtimes** were also rebased using the existing
`Dockerfile.artifact`; every application file was hashed before/after. The JS,
workers, WASM, source notices and local assets remain byte-identical. Glyphr's
native root is `/srv/app`, not the nginx default; an initial failed candidate
rolled back, its artifact copy was corrected, and its actual app hash/endpoint
then passed. New tags end in `-nginx1305`; original source Dockerfiles also have
the new base pin. Native app releases and catalogue version claims are unchanged.
Private stage/release/hash records: `/var/lib/utilibre-maintenance/nginx-20261011/`
and `/var/lib/utilibre-maintenance/static-runtime-20261011/`. These bounded manual
scripts are not new unattended auto-updaters.

Uptime Kuma remains **2.5.5**, switched to the official **2.5.5-slim** image,
digest `9c56a772a7df53f444a404c579e87a27bd0c201375d00d6745a75bf8138f4342`.
Its 59 HTTP/one TCP monitor definitions use SQLite; none need the full image's
Chromium or embedded MariaDB. The isolated native DB restore, status page and
operator login passed before rollout. Only the disposable copy's monitors were
paused, with networking disabled. Full-image findings were 202 critical/2,086
high; candidate findings 16 critical/257 high. Those remaining findings still
need review; this is not a vulnerability-free image. Native snapshot and results
are under `/var/lib/utilibre-maintenance/kuma-slim-20261011/`.
[Upstream supported slim image](https://github.com/louislam/uptime-kuma/wiki/Docker-Tags).
The native operator API set/read back `checkUpdate=false` and `checkBeta=false`,
preserving all other settings. This stops Kuma's separate upstream version
request; Utilibre's daily review supplies maintenance discovery. Reapply with
`node deployment/maintenance/configure-kuma-maintenance.mjs` after a fresh setup.

RSS-Bridge retains upstream **2025-08-05** (still the latest published release),
with **60 Debian 12 packages updated**, including PHP **8.2.34** and Debian's
backported nginx **1.22.1-9+deb12u10**. This does not substitute version-number
guessing for Debian's security backports. The complete `/app` file hash is
unchanged; live and staged GitHub Trending Atom feeds had eight valid entries.
Native nginx/FPM validation and private IPv4/metadata/IPv6 connection denials
passed. Request-bearing nginx/PHP errors no longer enter container logs.
Scan: 57 critical/216 high before, 3 critical/74 high after; unresolved vendor
findings remain. Build recipe `deployment/community/Dockerfile.rssbridge-security`,
private package inventory/test records `/var/lib/utilibre-maintenance/rssbridge-20261011/`.
Only its memory cache was recreated; no account data. [Upstream releases](https://github.com/RSS-Bridge/rss-bridge/releases).

Exact deployed artifacts, previous references and static-byte checksums are in
[`runtime-release-20261011.json`](../deployment/maintenance/runtime-release-20261011.json).
The RSS-Bridge recipe resolves signed Debian updates at build time; a future
rebuild is a new candidate requiring its own scan, functional gate and image ID.
No unattended package installation was added.

The first checkpoint scan at **17:55 UTC** covered **109/109 images, 175 containers,
510 host packages and ten source manifests**. The deduplicated, reviewed queue
then had **207 critical / 5,712 high package-target findings**. These are neither
207 confirmed exploits nor a clean result. The original 528/8,933 alert was a raw,
partly incomplete scan: do not advertise a percentage risk reduction by comparing
those different measures. That checkpoint prioritized Gathio's DocumentDB,
RSSHub, coturn and other libraries; the follow-up below supersedes that work list.
For example Debian currently has no stable fix for the client-side OpenSSH
rekey issue; the scanner also attributes its source-package finding to server
packages. No host SSH/Docker replacement or reboot was performed in this batch.
[Debian OpenSSH scope/status](https://security-tracker.debian.org/tracker/CVE-2026-60002).

The exact-image OpenSSL CVE-2026-31789 review checked actual library ELF headers:
58 findings were 64-bit libraries, outside the vendor's 32-bit-only issue. These
private decisions expire after 14 days and do not cover other advisories or
new images. Raw scan results remain unchanged. [Vendor conditions](https://openssl-library.org/news/secadv/20260407.txt).

Application rollback: retain old images (none pruned), restore only the affected
service's previous image pin from the private stage record, and use its existing
scoped Compose release command. For TRIP/13ft/Unfurl, use the native systemd
service restart to reapply namespace boundaries. Do not overwrite entire Compose
files or account databases. Static assets have not changed. Kuma's same-version
native snapshot is retained; preserve current state before any database restore.
The old runtimes have known findings, so avoid leaving a vulnerable rollback
public after an emergency recovery.

All eight browser journeys passed after the runtime changes at 17:48 UTC on Linux Chromium, with 1366px desktop/390px
mobile emulation, not physical phones. Direct PairDrop and external forced TLS
TURN exact-byte transfers passed. FreshRSS native synthetic restore and the
Storage Box round trip passed. Observed task runner ~633 MiB/~62 seconds;
restore wrapper ~289 MiB/~15 seconds (disposable database containers have their
own limits). Saved-account backup policy is unchanged. Extra successful rehearsal
artifacts are cleaned; failed recovery evidence is retained for inspection.
The QR test now waits for the upstream service worker's first-activation reload
before clicking controls; the old test raced that native reload. No application
workaround or weakened export/camera/offline assertion was introduced. AudioMass
also exported a valid one-second WAV from a three-second synthetic input, with
no external requests. Twenty-one maintenance/advisory tests and ten backup-policy/
retention tests passed. No failed native units remain. One transient Knit probe
recovered on the next probe; direct public HTTPS also returned 200.

External evidence: [availability](https://github.com/mycelibre/utilibre/actions/runs/38157718068),
[intentional alert drill](https://github.com/mycelibre/utilibre/actions/runs/38157812399),
[recovered check](https://github.com/mycelibre/utilibre/actions/runs/38158232707),
[TLS relay](https://github.com/mycelibre/utilibre/actions/runs/38157814232).
Updated digest accepted by verified SMTP relay at 17:57 UTC; inbox reading is
not established. The external workflows passed manual runs; their next actual
scheduled GitHub run had not yet been observed at handoff preparation.

The broader endpoint checks found Gathio's stale nginx backend resolution (502).
Native Docker DNS re-resolution, `nginx -t` and graceful reload restored
`https://events.utilibre.org/` to HTTP 200. Request-bearing error logging there
is disabled; historical logs were not erased. This is a gateway repair, not a
new end-to-end certification of event creation.

```sh
node --test deployment/maintenance/maintenance.test.mjs scripts/review-upstream-maintenance.test.mjs
node --test deployment/storagebox/retention.test.mjs deployment/storagebox/backup-native.test.mjs deployment/utilibre/tests/backup-policy.test.mjs
systemctl start utilibre-journeys.service
systemctl start utilibre-recovery-check.service
```

Monitoring rollback: disable the four new timers with
`systemctl disable --now utilibre-security-review.timer utilibre-journeys.timer utilibre-recovery-check.timer utilibre-maintenance-digest.timer`;
revert their alert integration together so intentionally removed checks aren't
reported as broken. Stop only a specific running check if necessary; do not
delete private diagnostic/recovery state blindly. Revert GitHub workflow changes
independently. No application schema, access/retention/donation policy or visitor
instrumentation changed.

## Security follow-up — 11 October, 19:47 UTC

The failed scanner and incomplete runtime/OS coverage alerts are resolved. The
latest complete run checked **109 images / 175 containers, 510 host packages and
13 source manifests**. Replacement npm/Python locks are scanned under their
recognized filenames, with their original path and hash retained in the ledger.
Raw counts are **86 critical / 3,786 high occurrences**; after package-target
deduplication and narrowly evidenced reviews, **67 critical / 3,682 high remain
pending**. Neither number is an exploit count. **The patch backlog is not closed.**

Published application advisories now cover the whole available history, not just
notices newer than a catalogue-review date. The 112-provider run completed with
no outstanding published-advisory dispositions; ten non-GitHub sources still
require manual primary-source review. This is separate from the dependency
queue above. Authentik was missing from that upstream inventory and is now
explicitly included alongside the three other operational companions.

| Deployed follow-up | Evidence and boundary |
| --- | --- |
| PrivateBin 2.0.6 security backport | Upstream Markdown sanitizer fix plus tested attribute restriction, cache-busted script/SRI and Spanish-loader compatibility. Public 25 MB encrypted upload/download checksum, oversize rejection, one-week expiry and synthetic deletion passed. [Patch and rollback](../deployment/utilibre/privatebin-security/README.md). |
| Bookplate 1.1.0, Next 16.3.6, Node 24.21 | Same application commit with an exact replacement lock. Isolated two-account private library/export/delete tests passed. Public login and anonymous API denials passed; previously retired test accounts were not reset. |
| PairDrop 1.11.2 security p2 | Updated Alpine/Node and proxy-addr 2.0.8; one upstream tab-storage cleanup race guard. Direct transfer and [external forced TLS relay](https://github.com/mycelibre/utilibre/actions/runs/38165903759) passed, exact bytes. No server-readable WebSocket fallback enabled. |
| Both coturn relays 4.18.0 | Pinned maintained runtime, vendor package updates, obsolete CLI/DTLS options removed. Existing credentials, listeners and budgets retained. Valid/invalid/expired credentials, private-address rejection and forced TLS transfer passed; quota exhaustion checked only in the isolated lab. |
| Internal RSSHub 2026.10.11-8411.a7d4000 | Official immutable image, Node 24.21/vm2 3.12.2. Native feed and FreshRSS's internal path passed; still not public. Exact registry fallback repairs incomplete local OCI export without scanning a substitute version. |
| Gathio DocumentDB 17.11 / 0.107.0 | Same PostgreSQL/extension versions; 84 vendor package updates. Native snapshot restore, event edit, image, ICS and deletion checks passed. FerretDB's separate Go dependencies remain open. |
| Wishlist 0.67.1; Kuma 2.5.5 | Vendor updates, Wishlist's bundled Caddy 2.11.7, Kuma's lean runtime. Wishlist permissions and Kuma's isolated SQLite restore/login passed. This does not change the separate edge Caddy VM. |
| Eight additional nginx runtimes; portal; JupyterLite | nginx 1.30.5 / Alpine 3.24.2, portal Node 24.21 without npm. Application files unchanged. Portal EN/ES desktop/mobile emulation, Python/pandas/chart output and AudioMass WAV export passed. Wallabag's native MFA/archive/export/delete workflow also passed. |
| Actual, Rallly, Resume, Linkding, KitchenOwl, CryptPad | Same application bytes, six Debian vendor-runtime updates. Native saved-work backups taken; Resume/ CryptPad isolated account/export checks passed. All public entry routes passed. KitchenOwl's authenticated workflow was not repeated with retired credentials; native backup integrity and unchanged app/runtime checks are recorded instead. |
| Actual, Grist and Kuma proxy-addr 2.0.8 | Hash-pinned upstream package, unchanged transitive dependencies. IPv4/mapped-IPv6 spoof regression and each native Express resolver passed. Isolated Actual opaque-file round trip, Grist sandboxed formula/account denial/native export, and Kuma restored login passed. Actual's production OIDC policy is unchanged. |
| Grist 1.7.21 library patches | Handlebars 4.7.10, Piscina 4.9.4 and shell-quote 1.11.0, hash-pinned official packages with existing dependency compatibility checked. Template escaping, shell-token round trip and real worker computation passed. Repeated isolated Grist account separation, Python formula and native export/delete passed; a fresh saved-work backup preceded deployment. The old runsc sandbox was not disabled or replaced. |
| Authentik 2026.8.3 and Linkding 1.47.0 | Hash-pinned PyJWT 2.14.0; Authentik also AnyIO 4.14.2. Restored identity clone passed synthetic password/TOTP replay rejection, RSA/ECDSA OAuth code exchange/JWKS and negative token tests. Linkding restored-copy bookmark/export/import/privacy checks passed. Full native identity backup was restored separately before closeout. No owner password, MFA or enrollment policy changed. |
| Host GitHub CLI 2.102.0; ksmbd autoload prevention | Official CLI package and API check. Unused ksmbd is not loaded; module autoload is blacklisted. This is not a kernel patch, does not prevent a privileged explicit load, and does not change the CIFS Storage Box client. |

Reproducible glue is restricted to pinned build recipes, replacement package
locks, the PrivateBin sanitizer/SRI backport and PairDrop's small storage guard.
No new public service, telemetry, access change or retention change. Same-version
runtime hashes distinguish untouched app code from the explicitly listed library
and JS changes. Exact images are in the expanded runtime release manifest.

Private receipts live under `/var/lib/utilibre-maintenance/` in the dated
`coturn`, `rsshub`, `gathio`, `bookplate`, `privatebin`, `extra-runtime`,
`debian-runtimes`, `proxyaddr`, `auth-python`, `linkding-python` and `final-runtimes`
directories suffixed `-20261011`. Public receipts contain no credentials, account
contents or test sharing keys. Clone fixtures are removed; native recovery
snapshots remain protected. Temporary sharing content is still excluded.

Two rollout errors were corrected, not hidden: Rallly's first vendor-runtime
recreate omitted its environment file; the helper now supplies the native file
and rejects `UNCONFIGURED` values. Wallabag's coupled gateway/egress stack needed
its native supervisor restart. Their public checks subsequently passed. A
PrivateBin test also caught the translated loader's old script selector before
the final Spanish/public acceptance pass. Repeated staging scripts must not
overwrite original rollback receipts after a candidate is already deployed.

Rollback only the changed image pin using its recorded previous reference;
preserve current data and use the same native environment files and supervisor.
For PrivateBin, restore its matching template with its image. For Authentik,
roll server and worker together, leaving PostgreSQL untouched. The dependency
patches do not migrate schemas. Do not restore a database merely to undo an
image patch. Old vulnerable images are for emergency recovery, not a permanent
public fix. Keep the full source offer and patch recipes with this release.

Additional source evidence: [proxy-addr](https://github.com/jshttp/proxy-addr/security/advisories/GHSA-jqcg-44mw-7w3h),
[PyJWT 2.14.0](https://pyjwt.readthedocs.io/en/2.14.0/changelog.html),
[AnyIO TLS fix](https://github.com/advisories/GHSA-82r6-8w77-94w6),
[Authentik 2026.8.3](https://github.com/goauthentik/authentik/releases/tag/version/2026.8.3),
[Debian's zlib/minizip distinction](https://security-tracker.debian.org/tracker/CVE-2023-45853),
[Go TLS advisory](https://pkg.go.dev/vuln/GO-2026-4337).
The latter two reviews bind exact packages/binaries and expire after seven days;
they are not universal CVE or Go-runtime exemptions.

Remaining priorities: Grist's old runsc build (keep its
sandbox), Penpot Netty/seroval, Resume seroval, Rallly XML parsing, Kuma's remaining
libraries, FerretDB, the private SimpleLogin pilot and vendor-unfixed OS libraries.
Host Docker/kernel updates need a separately staged host-maintenance operation;
no daemon restart or reboot was attempted. Do not mix upstream major versions
or replace bundled code without its native functional and recovery gates.
Separate Caddy/Proxmox package coverage, non-GitHub advisories and an observed
scheduled external check remain explicit coverage limits, not successful checks.

The final scan completed in about 46 seconds; the preceding full scan peaked at
547 MiB. All eight daily synthetic journeys passed at 19:38 UTC, including PDF
OCR, chart/image/ZIP/QR exports, PairDrop transfer and a poll answered/deleted.
These are Linux Chromium desktop and mobile-emulation checks, not real-phone tests.
All 41 focused maintenance, advisory, storage and backup-policy tests passed,
including a disposable native Restic retention/restore rehearsal.
Root free space was about 10 GiB after removing a further 324 MB of disposable
build cache and downloaded APT package cache; rollback images and user data were not pruned. Disk pressure still
needs attention before larger builds. These are dated measurements, not capacity
guarantees. External availability passed manual runs; no actual cron-triggered
GitHub run had appeared at this checkpoint, so its freshness alert remains live.
The repository is active, not a fork, on the correct default branch with Actions
enabled; the published workflow has the intended quarter-hour schedule. A manual
dispatch is not used to conceal missing scheduled executions.

Grist library sources: [Handlebars](https://github.com/handlebars-lang/handlebars.js/releases),
[Piscina 4.9.4](https://github.com/piscinajs/piscina/releases/tag/v4.9.4),
[shell-quote fix](https://github.com/advisories/GHSA-pqg4-j6r4-53mv).

## Maintenance coverage from 11 October 2026

Expansion is paused by the owner. `scripts/review-upstream-maintenance.mjs`
reads the existing catalogue, including all eleven ready creative additions,
instead of keeping a separate twelve-application list. The initial run checked
108 providers without lookup failures. This is catalogue coverage, not a count
of running or publicly usable services. Held builds remain held.

`utilibre-maintenance-review.timer` is enabled for 03:20 UTC daily plus up to
15 minutes' jitter. The read-only systemd run passed in production. It uses
Node 24, the existing authenticated GitHub CLI and Git, at most three concurrent
lookups, 25-second request deadlines, 256 MiB RAM and 25% of one CPU. It does
not install packages, pull images, execute upstream code or query visitor data.
The private report is `/var/lib/utilibre-maintenance/latest.json`; SearXNG's
installed reference is read from its guarded updater's deployment manifest.

```sh
node --test scripts/review-upstream-maintenance.test.mjs
systemctl start utilibre-maintenance-review.service
node scripts/review-upstream-maintenance.mjs --only=freshrss
node deployment/community/monitor-alerts.mjs --check-only
```

The existing five-minute monitor/SMTP workflow now flags reports older than
36 hours, missing upstream/advisory lookups, failed maintenance units and new
high/critical published advisories requiring review. It also covers the saved-
records backup unit. Alerts still require two observations and use the existing
12-hour repeat interval. A manual `--check-only` sends no mail and changes no
alert state. No new analytics or notification service was installed.

Review the report weekly and security alerts promptly. A changed default branch
is not a release recommendation. GitHub coverage is published repository
advisories, paginated up to 300 with partial results labelled; GitLab/Forgejo
advisories need primary-source review. This is not an SBOM/dependency scan or
proof that a project is secure. Keep lockfile/image security review in each
release gate. [GitHub advisory API](https://docs.github.com/en/rest/security-advisories/repository-advisories).

The new tools reuse `docs/creative-batch-2026-10-11.md` and their canonical
`reviewDocument`/exact-source fields. Rebuild only the changed application;
repeat its native synthetic import/edit/export check, browser-network review,
and source-offer check. For Grist, Candlr and Bookplate also repeat account
isolation and native restore tests in `deployment/records/`. HTTP readiness
alone does not approve a release. Preserve prior images and database-compatible
recovery snapshots before each change. No moving-tag automatic upgrade was added.

Pause this reviewer with `systemctl disable --now utilibre-maintenance-review.timer`;
it does not alter any application. The canonical check is also available through
`deployment/utilibre/scripts/update-check.sh` and `/opt/utilibre/scripts/update-check.sh`.

### FreshRSS security update

FreshRSS was updated from 1.29.1 to **1.30.1**, source
`4a810f1624b9d0b97b4400614cf9aacc8ada40e3`, official image index
`sha256:48b63b9bc3d042a1301c32971b01af8841c7f059b452589c5bf77f475ba44c61`.
The published [high-severity feed-fetch advisory](https://github.com/FreshRSS/FreshRSS/security/advisories/GHSA-fv9v-wcrw-mhg6)
affects the former version; [1.30.1](https://github.com/FreshRSS/FreshRSS/releases/tag/1.30.1)
also includes authentication/import hardening. Uptime Kuma's newly published
GHSA-wf2j-5mc7-5c4w is fixed in 2.5.4; installed 2.5.5 was retained. This review
does not dismiss Kuma's documented authenticated-monitor/network trust boundary.

The FreshRSS candidate passed an isolated native PostgreSQL/files restore,
login and fictional-article check before rollout. Native JSON/ZIP article export,
two independent account imports and reopening passed with 1.30.1. The fixture
was removed through native controls; no real account content was edited.
Evidence: `/opt/utilibre/reports/freshrss-browser-restore-m_085ovb/` and
`/opt/utilibre/reports/freshrss-articles-odriazkn/` (private recovery data).

Production retains closed registration (`max_registrations=1`), silent logging,
text-first CSP, no-referrer, and the existing refresh interval. The supported
`INTERNAL_HOST_ALLOWLIST=rsshub:1200` keeps the private integration without
allowing other internal destinations. Native resolver tests rejected loopback,
LAN, metadata IPv4, IPv6 loopback and NAT64 metadata addresses, and the wrong
RSSHub port. A native EFF Atom fetch succeeded. Login over verified private-edge
HTTPS loaded without external browser assets; this is not an independent public
network test. Authenticated export/import checks used isolated synthetic accounts.

For rollback, retain the former 1.29.1 image with digest
`ab6b363102ccdbc39f6a62db926f567c61a5289bf25ba460f1c34423d8cc1a4d`
and the pre-update native snapshot above. Do not downgrade a migrated database
blindly or overwrite newer account work. Preserve current data first, then use
the reviewed native restore workflow if schema compatibility requires it. Restore
only the FreshRSS pin and recreate only FreshRSS with its privacy overlay; never
replace the entire live Compose file. The old version has known security issues,
so prefer disabling access during repair over leaving a vulnerable rollback public.

### Reviewed disk cleanup

Root use fell from 93% (11 GiB available) to 88% (18 GiB available) after removing
eight explicitly reviewed build-dependency directories, npm's downloadable cache,
and 616 MB of unused Docker build cache older than 24 hours. Filesystem figures
are rounded observations, not sums of `du` values (dependencies share hardlinks).
`scripts/clean-reviewed-build-caches.mjs` defaults to dry-run and refuses symlink,
tracked-file and container-mount overlaps. No user data, source checkout, live
static output, image, rollback image, backup or temporary-data disk was removed.
Deleted caches must be regenerated from retained pinned manifests; they cannot
be instantly restored. The retained Graphite Sass dependency is still needed by
Vvveb's build and was deliberately left alone.

## Guarded SearXNG automation

`scripts/searxng-maintain.py` checks the official registry, resolves an immutable
image, checks source/license labels, and refuses unexpected image formats or
manual configuration/runtime drift. Run from the repository:

```sh
python3 scripts/test-searxng-maintain.py
python3 scripts/searxng-maintain.py --check
python3 scripts/searxng-maintain.py --stage --notify
python3 scripts/searxng-maintain.py --apply --notify
```

Check is the default. Stage runs a disposable loopback-only SearXNG and Valkey
project with a fresh secret/cache. It verifies actual English/Spanish browser
searches, not just `/healthz`. Apply first verifies the old deployment, tests
the candidate, saves a private configuration backup, then replaces **only**
the SearXNG container. Post-update searches use verified HTTPS through the
private Caddy edge; failure restores and re-tests the previous image.
Limiter/proxy-trust policies remain intact. No application gets Docker access.

The root `.env` gets only an immutable `SEARXNG_IMAGE` override after success.
State, configuration backups and interrupted-update journals live under
`/var/lib/utilibre-searx-updater` (private); the non-secret deployed-version
manifest is `/opt/utilibre/update-public/searxng.json`. Old images/backups are
retained. A failed rollback retains its journal; the next apply attempts safe
recovery and stops for review. Do not prune images needed for rollback.

The systemd units in `deployment/utilibre/systemd/` run daily at 02:20 UTC with
up to ten minutes' jitter. Enable only after a successful stage and notification
test. Pause with `systemctl disable --now utilibre-searx-update.timer` (this does
not interrupt an active run). Review `journalctl -u utilibre-searx-update` and
the private `last-run.json`. The verified STARTTLS relay sends updates/failures
to `admin@utilibre.org`. An outstanding update becomes urgent after five days
and overdue after seven; a newer daily release does not reset that clock.

This automation cannot guarantee the listing's uptime/freshness requirements:
registry failures, upstream regressions and failed notification delivery need
operator attention. Public-IP checks from this VM are not independent uptime
evidence; retain an external monitor. Automatic rollbacks cover this stateless
search service, **not** schema-migrating databases or other applications.

### Verified SearXNG update: 2026-10-07

The official registry's latest image at 22:16 UTC was
`docker.io/searxng/searxng:2026.10.7-6671d89be@sha256:cc026dbee25b864d7f9731957cd5ef36ba2e2d61abd2996d57f1b863483e7409`.
Its source revision is `6671d89bede8c9fc108b17bb98916170f5657650`, its image
creation time is 09:22:18 UTC, and its amd64 manifest digest is
`sha256:2a8660b510454a7f9f052e614b69c18b102a4c5c751f87076cc67cf5e14c6c44`.
The [official source comparison](https://github.com/searxng/searxng/compare/d48c4b555421e824342c51d68482dd0898e54d0f...6671d89bede8c9fc108b17bb98916170f5657650)
contains one Wikidata empty-description fix and its regression tests; it adds
no configuration migration. Source and AGPL-3.0-or-later image labels passed
the updater's checks.

`python3 scripts/searxng-maintain.py --apply` succeeded at 22:17 UTC, without
sending notifications. It checked the existing service, staged the candidate
with an isolated cache/secret, ran English and Spanish searches, verified the
configuration backup, recreated only production SearXNG, and repeated searches
through the real Caddy HTTPS route at its private address with certificate
verification. Each search contained at least three result links. The `.env`
pin and public deployment manifest were updated by the guarded workflow; the
Compose fallback and source/license records were also synchronized.

Additional checks passed: seven updater regression tests, engine/pagination
and query-redaction regressions, Compose validation, healthy container with
zero restarts, `/config` reporting the new version and 28 engines, and loaded
settings retaining native branding, HTML-only output, public limiter, and the
exact optional Reddit hostname mapping. The General preference is called
“Hostnames plugin” and starts disabled. Opting in persists in that browser's
preference cookie while a new browser remains opted out. Upstream uses a
reversed checkbox: a checked DOM input means the plugin is disabled.

Public IPv4 remains unreachable from this application VM, so these checks do
not establish independent public uptime. `/metrics` returns 404. The deployed
private edge currently serves `/stats` with HTTP 200 and an empty-data page,
despite the repository's direct-edge template denying that path. This edge
policy discrepancy predates the source change and remains for the separate
edge operator; neither limiter policy nor edge configuration was changed.

Rollback material is retained privately under
`/var/lib/utilibre-searx-updater/run-dl6sorj1/`: `rollback-config.tar.gz` and
`rollback.json`, both mode 0600. The old image remains locally available:

```text
Previous pin: docker.io/searxng/searxng:2026.10.4-d48c4b555@sha256:76b0bf285aca014c7191fc4d9234c4bfb358624ac33d8883833d496c059ec072
Previous local image ID: sha256:76b0bf285aca014c7191fc4d9234c4bfb358624ac33d8883833d496c059ec072
Previous amd64 manifest: sha256:b0497f6e93b5e98b1a15c66b333afed176266af34f479a46ed87514f4a441eda
```

If rollback is needed, restore only `SEARXNG_IMAGE` in the root `.env` to that
previous pin, then run `docker compose up -d --no-deps --pull never searxng`
and `node scripts/check-searxng-browser.mjs https://search.utilibre.org/ 10.10.1.3`.
Synchronize the Compose fallback and deployed-version/source records after a
verified rollback. Do not restore the complete `.env` archive over unrelated
changes or prune the retained image. No database migration occurred.

## Before every update

Markmap uses the pinned npm lock in `deployment/toolbox/markmap` (0.18.12-p1).
Review library/parser/sanitizer advisories, then build the static image with
`docker compose -f deployment/toolbox/compose.browser.yaml build markmap`.
Retain the old image before recreating only that service. Run
`node deployment/toolbox/check-markmap.mjs` privately, then with
`MARKMAP_TEST_URL=https://mindmap.utilibre.org` after rollout. This includes
hostile imports, export reopening and draft-removal/storage-failure regressions.
Never turn on imported scripts, frontmatter resource loading or remote images
merely to accommodate an upstream upgrade. Republish exact sources with
`node deployment/toolbox/publish-markmap-source.mjs`; no server-held user data
is involved. Detailed release/rollback evidence is in `docs/toolbox-review.md`.

1. Read official release notes, security advisories, license changes, and
   migration/rollback instructions.
2. Confirm the application still passes Utilibre's access-gap and operating
   policy; an update is also a chance to retire a service that no longer does.
3. Resolve the exact source/tag and immutable image digest.
4. Review new network calls, telemetry, account/registration defaults,
   storage, export/deletion behavior, and resource requirements.
5. Create and verify a current backup. Rehearse a restore for schema-affecting
   FreshRSS/PostgreSQL changes.
6. Record the old pin, image ID, configuration, and rollback command.
7. Test privately before changing the edge-visible deployment.

Never infer that a matching tag points to unchanged bytes. Never update a
database major version through an ordinary single-container image swap.

## Root project

The root helper accepts only retained root services:

```sh
sh scripts/update.sh portal
sh scripts/update.sh searxng
sh scripts/update.sh valkey
sh scripts/update.sh anubis
sh scripts/update.sh redlib
```

Update one service, wait for health, run bounded functional checks, inspect
logs/resource use, and only then continue. Redlib rebuilds locally; preserve
and republish the complete corresponding patched source and build material.

For SearXNG, re-review settings, engines, limiter trust, query-log redaction,
output formats, and image proxy behavior. For Anubis/Redlib, re-test challenge,
cookie, updater exceptions, redirects, media/Range behavior, and absence of a
direct Redlib port.

## Additional project

From `deployment/utilibre/`, use the read-only check first:

```sh
./scripts/update-check.sh
```

It reports upstream release information but does not pull or change anything.
After manual review, the apply helper accepts a complete official image
reference ending in `@sha256:<digest>` for supported single-service updates:

```sh
./scripts/update-apply.sh freshrss FULL_IMAGE_REFERENCE_WITH_SHA256
./scripts/update-apply.sh privatebin FULL_IMAGE_REFERENCE_WITH_SHA256
./scripts/update-apply.sh valkey FULL_IMAGE_REFERENCE_WITH_SHA256
```

RSSHub requires manual review of the internal FreshRSS integration. PostgreSQL
requires a separate database-major migration plan. Do not bypass those guards
with a search-and-replace on a live host.

## Validation after an update

At minimum:

```sh
docker compose config --quiet
sh scripts/check-health.sh
sh scripts/verify-network.sh
(cd deployment/utilibre && docker compose config --quiet && ./scripts/healthcheck.sh)
```

Then test the changed service through the real edge:

- portal: bilingual pages, config/status, 404 and method/body handling;
- SearXNG: English/Spanish search, limiter, diagnostic denials, and redaction;
- Anubis/Redlib: challenge, cookies, page/media/Range, and redirect hardening;
- FreshRSS: login, API if supported, feed refresh, internal curated feed, and
  registration remaining closed;
- PrivateBin: create, read, delete, expiry choices (maximum one week), the
  25 MB attachment limit, oversize rejection and low-space safeguard; or
- RSSHub: only approved internal routes, timeouts/cache, and no public port.

Inspect container restarts, CPU/RAM/PIDs, network I/O, database/directory size,
logs, and edge behavior. A health check alone is insufficient.

## Rollback

Rollback is service-specific:

- restore the old immutable image/source/configuration pin;
- recreate only the affected service with dependencies left intact where safe;
- restore data only when the update migrated or corrupted it; and
- validate through the same private and public checks.

The additional-stack update helper preserves a pre-update Compose copy and
runs a backup. `deployment/utilibre/scripts/rollback.sh` stops or removes
containers while deliberately preserving bind-mounted data. It is not a data
rollback.

Do not roll a PostgreSQL data directory backward by starting an older major
image against it. Use a reviewed logical backup/migration procedure. Do not
delete a failed migration's pre-update state until recovery and a new backup
are proven.

## Documentation and source obligations

In the same change, update the catalog version, privacy/security/resource
facts, exact source/digest manifest, notices, and public source offer. A stale
license notice or version card is a failed update even when the container is
healthy.
