# 9 November maintenance

This is a finite extension of the existing native-package build, isolated
application tests, Trivy assessment, Compose release and rollback procedures.
Private evidence is under `/var/lib/utilibre-maintenance/security-20261109`.
It does not authorize automatic updates of other services.

## Embedded Caddy follow-up

`xnet-caddy-inputs.json` captures Caddy 2.11.7 in Wishlist and the newsletter
web/SMTP/jobs roles. The prepared source retains the previous JOSE v3 backport,
JOSE v4.1.6 and compression v1.20.2 source. Six explicit Go module version
changes are recorded; x/net becomes 0.62.0. Go 1.26.10 compiles offline from the
complete checksum-pinned vendor archive. `xnet-locks/caddy` preserves the exact
resolved module graph; replay never resolves newer dependencies.

`xnet-caddy.py build|stage|native|scan` extends the existing compiler, full-image
comparator, native fixtures and Trivy scanner. The initial acquisition and source
comparison are retained privately; the complete prepared source and standalone
offline build recipe are in `security-xnet-caddy-20261109-source.tar.gz` at the
existing source-download route. Scope is only the binary and four build/module
notice files. Other application bytes, ownership, modes, packages and container
configuration remain unchanged. Commands fail rather than overwrite receipts.

The native checks cover proxying, gzip, live SSE, HTTP/2, Wishlist account/list/
item persistence and anonymous denial, and newsletter creation, synthetic
internal SMTP-to-Atom delivery and deletion. Browser fixtures reject external
origins. They do not send production email or claim external delivery coverage.
The same frozen advisory database compares old/new images. A retained UNKNOWN
OpenPGP module record requires proof that no OpenPGP package is linked; it is
not hidden from scan output. Previously reviewed raw findings also remain.

The separately reviewed `xnet-caddy-release-inputs.json` binds all evidence to
the three exact images. Use the existing `security-20261028/release-brotli.mjs
--batch-20261109 --xnet-caddy prepare KEY` and separately authorized `apply KEY`.
Three groups affect four application roles plus the existing newsletter gateway
namespace companion. The separate edge Caddy VM is outside this release.
Rollback uses the prior image/configuration pins in `xnet-caddy/release.json`
through the same scoped Compose procedure; no database format changes occur.

The source archive is 51,110,045 bytes, SHA-256
`1e7ae55f6bde26ade9bd0ab0dc441eafb701b7d7b9713fbfdf9a61f52c0e57d5`.
It contains source, licences and rebuild instructions, without runtime data or
credentials. Exact-input replay is supported; identical build bytes are not
claimed. Complete evidence is under the private `xnet-caddy/` directory.

## GLib: Addy and 4get

`glib-inputs.json` pins the two repaired predecessor images, signed Alpine APK,
original GLib source, compiler image, upstream patches and final library hash.
The vendor-only 2.86.5 APK still accepts invalid nested D-Bus nodes despite its
security metadata. The same issue is present in its authenticated source.
Do not use the scanner's fixed-version label as the behavioral acceptance test.

The correction is GNOME commit `c9da977c178fbfc0e4caf99f9fdf5dc433d6fcc2`,
with its prerequisite assertions from `656ad4582cb1d7a7fa8bafe3ce8aec6aa3c17da0`.
The test-registration paths were adapted to the stable branch's spelling;
the parser correction and five upstream test vectors are unchanged.
Both live predecessors reproduce the invalid-node acceptance. The replacement
passes five upstream introspection tests, a valid interface and seven invalid
documents, while preserving all exported symbols and NEEDED library entries.
The complete application trees and image configuration are unchanged.

Addy passes eight native address, message, encryption and login-form checks
on both versions, with the mail transport set to an in-memory fixture and
networking disabled. 4get passes its existing isolated Apache/PHP form and PNG
round-trip checks. These do not claim real email delivery or search-provider
availability. Both candidates add zero high/critical findings against the
same 9 November Trivy database; unrelated findings remain.

`Dockerfile.glib-builder` is an acquisition step. Record its immutable image
and package lock; later replay uses that retained image, not fresh resolution.
Run `build-glib.sh` in a disposable bounded container with network disabled,
the exact inputs mounted read-only at `/inputs`, and empty `/work` and `/output`.
The script checks source hashes and applies both patches without fuzzy repair.
`stage-glib.mjs` overlays the APK and tested GIO library onto the exact previous
applications. It intentionally rejects a different running predecessor.

`release-glib.mjs prepare` checks evidence/configuration without activation.
The separately authorized `apply` uses the existing transactional release and
scoped health checks. Addy must use `utilibre-addy-smtp.service` so its namespace
firewall is reinstated before SMTP starts. `verify` checks a completed release
without restarting services. No database migration or user-content change is
part of this repair. The receipt contains old/new pins and configuration hashes.

For rollback, first revalidate that only these pins changed, then restore the
receipt's old image for the affected service using its existing supervisor or
scoped Compose command. Keep Addy's SMTP supervisor boundary. Verify native
health and HTTPS afterward. Image rollback is not a data restore.

## Disk and assessment records

The already-enlarged main virtual disk had 25 GiB of unallocated tail space.
`growpart` and online `resize2fs` extended only its main partition/filesystem.
The partition start, boot partitions and separate temporary-data disk did not
change. No reboot was required. The before/after tables are retained privately.
There is no safe online shrink rollback.

Five initial critical records received exact, expiring evidence reviews:
three Debian zlib binaries omit the affected MiniZip code, and the two FreshRSS
libxml2 payloads retain their verified fixes. Raw scanner records remain.
These reviews do not waive other advisories or future images.

## musl: finite static-server batch

`musl-inputs.json` records 62 discovered predecessor images (120 containers),
including stateful and private services. This is an inventory, not approval to
upgrade all of them. The initial 20 `static-nginx` rows were followed by the 42 reviewed native consumers.
All 62 images / 112 groups are now passed in the private receipt; consult each
row's exact ABI, consumer, configuration and release evidence.

Eight checksum-pinned Alpine APKs were acquired from their original branch and
verified with `apk verify`. Candidates use the existing
`security-20261028/alpine.mjs --batch-20261109 --musl KEY` adapter. They retain
image configuration, application bytes and unrelated packages. The 16 native
checks exercise regex, UTF-8, allocation, local sockets, numeric addressing and
threads; they are compatibility checks, not an overflow exploit reproduction.
`check-musl-static.py KEY` verifies the previous and new libc export sets and
nine NGINX checks, including the unchanged application HTML, range responses,
gzip, conditional caching, routes, redirects and missing files. Everything runs
in disposable, resource-bounded containers with no external network or data
mounts. Browser application code is unchanged and is not represented as freshly
workflow-tested by these server checks.

The existing `scan-brotli.mjs --batch-20261109 --musl KEY` uses the same retained
Trivy database for both artifacts. The target finding must disappear and no new
high/critical finding may appear. The scan alone does not approve deployment.
The release adapter additionally requires explicit approval, exact candidate
identity, ABI/consumer proofs and the checked-in test's checksum. The later `musl-policy.mjs` extension checks native-consumer proof identities
and test hashes; it does not treat the original static-server fixture as proof
for databases, supervisors, media or messaging.

Use the existing `release-brotli.mjs --batch-20261109 --musl prepare GROUP`
then separately authorized `apply GROUP`; set `APP_BIND_IP` to the existing
private bind address. Group IDs come from `releaseGroups`, not from guesses.
Each group retains its previous pin and configuration hashes and is released
sequentially through the existing Compose/rollback helper. Public static homes
must return 200 before release and retain that response afterward. Whisper's
withdrawn entry remains withdrawn; no public route or model setting is enabled.
The complete release report now has `passed` status; all 112 groups passed.
Inspect exact group receipts rather than inferring successful user tasks from a
container being running.

Rollback restores only the exact previous scalar in the receipt's Compose
file, recreates only the affected static service with no build/pull/dependencies,
and checks health and the public route. No user storage is modified. Do not
blindly replay this overlay onto a newer base: review the new branch/package
inputs, retained application fixes and native tests first.

## ChartDB and portal

ChartDB 1.21.0 is pinned to `ee95448d154cfdcf65264c45745f440c0480ef84`.
`prepare-chartdb.mjs` requires that exact clean commit and applies the reviewed
`toolbox/chartdb-local-source.patch` with no conflict repair. A clean replay
matches the tested source exactly. The patch retains local fonts/workers,
scoped storage, disabled external integrations/telemetry, DOMPurify 3.4.17 and
Monaco 0.57.0. The new theme-validation behavior is preserved.

The isolated production build and all 842 upstream tests passed. Chromium
checked native SQL import/export, JSON export/import in a fresh context and
reload persistence; no external requests, uploads or browser errors were
observed in that synthetic workflow. Its corresponding source, lockfile,
licenses and build instructions are offered at the existing source-download
origin. `release-refresh-20261106/release-static.mjs chartdb --apply --nov9`
uses the existing atomic static-directory release; old assets are retained.

The portal's one catalogue record was built from clean `0baecdd` source with
unrelated dirty work excluded. Typecheck, lint/build/FOSS gates and 120 unit
tests passed on Node 24.21.0. The header-count test now accepts Node's native
empty 431 response as well as the application JSON rejection, while requiring
connection closure and successful requests below the limit. No server behavior
was relaxed. The earlier Node 24.22.1 run exposed this same test assumption.
The initial Alpine build could not use the host's glibc-only optional bundler;
the retained compatible Debian compiler was used without resolving dependencies.

`portal-inputs.json`, `check-portal.py` and the existing portal release's explicit
`--nov9` profile pin the exact old/new artifacts. EN/ES software pages show the
new version. Runtime packages are identical; one existing medium zlib finding
remains open. No new high/critical finding was introduced. Rollback restores
only the receipt's previous `PORTAL_IMAGE` and recreates `portal`; this does not
restore or alter account-application data.

## Subsequent November 9 releases

`vendor-debian-inputs.json` pins 28 authenticated APT/libapt/zlib image repairs.
`vendor-debian.mjs`, `vendor-debian-policy.mjs` and the distroless
`vendor-yopass.py` adapter retain the existing release lock, narrow package
allowlists, ABI checks and previous images. All 33 groups passed. The distroless
row has its own exact fixture hash; normal Debian fixtures retain their original
checksum. It receives no shell/package manager.

Chhoto 7.10.8-p2 retains its native migration, anonymous eight-character links,
custom aliases, administrator auth and no-hit-count setting. Use the existing
`deployment/chhoto` build and isolated native/browser checks; the source ledger
records all three ordered patches. Its schema upgrade has a synthetic recovery
test; do not assume changing an image undoes a database migration.

Yopass 16.1.0-p1 uses `yopass-inputs.json` and
[`community/yopass/README.md`](../../community/yopass/README.md). The native CLI
and two-client browser checks cover compatibility, expiry, limits and encryption.
`release-yopass.mjs` changes only the application, preserves its cache container,
and explicitly disables audit/metrics/receipts/secret requests. Roll back only
the app image and recorded flags; do not flush or restart the encrypted cache.
The optional unused CDK lock's twelve high findings remain open.

The `portal-shortener`, `portal-abuse` and `portal-pack` input manifests record
successive exact portal builds. The `--nov9 --pack` release updates only catalogue
versions and the verified retry-retention wording over the tested report routes.
All builds retain runtime package parity and the existing JavaScript budget.

Native notices use `deployment/abuse-reporting` exact hash-gated template/source
patches and native configuration. Read `docs/abuse-handling.md` for coverage,
mail handling and limitations. Restarts of tmpfs-backed tools may lose temporary
content; WBO's release records that fact. Rustpad is not restarted for an unreviewed
notice. The portal's 122 tests and EN/ES rendered routes pass.

`publish-application-sources.py chhoto|yopass` creates code-only source offers
from exact Git objects and reviewed patches, with local vendor assets/locks and
previous archive retention. It disables LFS smudge/network fallback; optional
documentation image pointers remain pointers. Source publication is an explicit
operator action, not a side effect of preparation or assessment.

The `portal-search` manifest and `--nov9 --search` profile extend the existing
scoped portal release with the DeGoog repair's accurate EN/ES metadata. Its base
is the exact preceding `portal-pack` image; the same package/scan parity and
public route gates apply. Read `docs/records/degoog-search-2026-11-09.md` for the
separate native application release and actual bounded public-search result.

## Same-branch zlib and combined x/net repairs

`zlib-inputs.json` pins 31 Alpine predecessors, signed zlib 1.4-r0 APKs for
Alpine 3.22/3.23/3.24, exact native fixtures, and explicit release holds.
`zlib-prepare.mjs KEY` prepares without activation. `zlib-check.py --runtime KEY`
and `zlib-native-checks.py KEY` reuse the existing isolated consumer checks.
`zlib-scan.py KEY` uses the retained database and baseline, with networking
unavailable to the scanner. It rejects incomplete APK inventory and new
HIGH/CRITICAL records. Full filesystem scope excludes changes outside the zlib
payload, its package record and exact package constraint; application bytes,
libc and container configuration remain unchanged. No byte-reproducible build
claim is made.

Preparation and deployment approval are separate fields. `zlib-policy.mjs`
requires exact approval, artifact, scope, fixture, consumer and scan evidence.
Use the existing `security-20261028/release-brotli.mjs --batch-20261109 --zlib
prepare GROUP` and `apply GROUP` commands. They retain the existing release
lock, rollback, configuration and network-namespace checks. Galene additionally
requires no established native signaling connections immediately before its
restart. WBO remains held because its RAM-only boards would be lost. Do not
clear that hold simply to finish a batch. `completed-release.json` records only
completed groups for later exact-artifact reviews; the complete profile report
continues to show omitted work.

Native adapters change only private evidence paths and the Galene fixture's
explicit lab allowlist/module path. Synthetic FMD configuration needs its
existing fixture's ordinary umask, while private reports stay under a 0700
parent. Tor's version banner includes the changed zlib version: both raw banners
are retained and only those two pinned strings are normalized for comparison.
Failed initial fixture runs are retained; they are not application regressions
or passing security evidence.

`xnet-inputs.json` captures exact existing Rimgo and AnonymousOverflow sources,
Go 1.26.10, x/net v0.62.0, explicit compatible module locks and the existing
build script. `xnet-build.mjs APP` and `xnet-check.py APP --with-zlib` preserve the
prior compression and request-safety fixes. The combined candidate includes the
zlib repair; never activate its earlier zlib-only or x/net-only intermediate.
The isolated HTML regression reproduces quadratic allocation before the repair
and preserves benign text afterward. Native application tests and routes pass.

`xnet-release-inputs.json` and `xnet-policy.mjs` bind exact candidates, source
publication, recorded scans, regression hashes and approval to the existing
`--xnet` release profile. `publish-xnet.mjs` updates the established complete
source archives atomically and retains their predecessors. AnonymousOverflow's
existing module-wide OpenPGP warning remains in the raw scan at the newer module
version. The exact native dependency graph contains no OpenPGP package; this is
not a claim that the deprecated package was repaired. Source-only and other
applications' x/net findings remain separate work in `xnet-coverage.json`.

Rollback uses the previous image/pin and existing scoped release procedure.
These overlays perform no database migration. A code rollback cannot recover
transient cache contents lost during an ordinary service restart.

## Native SQLite and rsync follow-ups

`sqlite-source.json` pins the already-repaired Bookworm 3.40.1 and Trixie
3.46.1 sources, compiler images, exact file preconditions and upstream-derived
session/FTS5 patches. The retained private diagnostic receipts record the
historical before/after checks on both branches. Those standalone diagnostic
inputs remain in the protected `retained-diagnostics/` directory and are not
part of the public recipe or corresponding-source archive. The public native
package build and upstream test suites are repeatable from the declared source.
Operator finalization additionally requires the original protected evidence;
missing evidence blocks it. No historical diagnostic was rerun in this follow-up.
Bookworm does not implement FTS5 secure-delete; do not imply that test ran there.
Native packaging preserves the earlier rowid, DISTINCT and corrupt-FTS repairs.
The upstream suites pass 314 tests on Bookworm and 11,356 on Trixie.

The existing `security-20261103/sqlite-source.mjs --batch-20261109 build|finalize
SUITE` and `sqlite.mjs --batch-20261109 KEY` implement preparation. They verify
source/package hashes, the allowed package scope, ABI, compile options,
unchanged application/configuration files and synthetic backup/restore. Native
builds and checks use bounded disposable containers with networking disabled.
`sqlite-followup-inputs.json` lists the finite image/role inventory. A prepared
candidate does not grant release approval.

Use the existing `security-20261028/scan-brotli.mjs --batch-20261109
--sqlite-followup KEY` offline assessment and `release-brotli.mjs
--batch-20261109 --sqlite-followup prepare|apply GROUP` release interface.
TURN releases additionally require no active relay allocations or established
control connections. The guard reads socket state and records counts only;
it does not collect peer identifiers. Service stability, namespace companions,
health, route and rollback checks remain required.

`rsync-source.json` pins authenticated Debian 3.5.2+ds1-2 source and its native
Bookworm compiler. `build-rsync.sh` produces 3.5.2+ds1-2~deb12u1+utilibre1 without
upstream code changes. Historical diagnostic receipts are retained privately,
including an initial noexec-fixture failure which is not accepted as evidence
of the defect. Standalone reproduction inputs are not distributed with the
public recipe. Its ordinary native packaging and upstream suite are retained;
the suite passes 286 tests with 90 environment/platform skips. New build
acceptance still requires the declared evidence; absence does not grant approval.

`closure-followup/rsync-stage.mjs --batch-20261109` and
`xml-final/check-gathio.mjs --rsync-20261109` verify the exact package, ordinary
transfers, permissions, PostgreSQL/DocumentDB behavior and synthetic restore.
The finite `rsync-followup-inputs.json` profile uses the same scanner/release
commands with `--rsync`. It changes no public rsync daemon or data format.

The preserved Debian scanner data still attributes the backported SQLite
packages and rsync 3.5.2 to some advisories. Raw findings remain recorded.
`security-20261103/review-sqlite.mjs --batch-20261109` and
`closure-followup/review-rsync.mjs --batch-20261109` require a fresh complete
scan, completed release lineage, exact live payloads and prior behavior proof.
They only prepare scoped review decisions, which expire after seven days.
They neither change scanner severities nor authorize deployment.

Complete corresponding source is published as
`security-sqlite-20261109-source.tar.gz` and
`security-rsync-20261109-source.tar.gz`, alongside the shared integration source.
Prior artifacts and source offers are retained. These are repeatable exact-input
recipes; byte-for-byte reproducible build output is not claimed. Rollback uses
the recorded preceding image and configuration through the existing scoped
release mechanism. No database migration or retention change is included.


## Bookworm zlib follow-up (completed 10 November)

`zlib-bookworm-source.json` records authenticated Debian 1.2.13 inputs, the
retained compiler, exact source preconditions and the upstream error-state
correction. The native package is `1:1.2.13.dfsg-1+utilibre1`. Its Debian source
package and build-dependency lock are included in
`security-zlib-bookworm-20261109-source.tar.gz`; use `dpkg-source -x` and the
native packaging instructions in that archive. The source receipt retains the
original isolated verification evidence; those diagnostic cases are not run
against production or repeated per application.

`zlib-bookworm.mjs KEY` prepares one of eight explicitly pinned predecessors.
It checks the package hash, unchanged application/configuration, seven ordinary
compression checks on each artifact, ABI and dependencies. The accompanying
scope checker reuses the existing unstarted-image exporter and compares every
file's content, type, permissions, owner and link. Only exact zlib payload and
package/loader bookkeeping paths may differ. Unrelated dpkg records must match.
Docker-generated hostname/hosts/resolver files and timestamps are not application
payload. The initial temporary-hostname mismatch is retained as a failed test,
not a claimed application regression.

Use the existing scanner and release commands with `--batch-20261109
--zlib-bookworm`. `zlib-bookworm-policy.mjs` binds the candidate to the recorded
source, preparation/checker hashes, full-image proof, explicit approval and
unchanged-database scan. Required checks reject unsupported inputs and changes;
there is no fuzzy patch repair or deployment based only on a version label.
The Gathio row also requires its isolated PostgreSQL/DocumentDB/XML/PostGIS and
synthetic restore check. Other rows preserve application bytes and use existing
post-release health/route checks; this is not a fresh test of every user workflow.

All eight image/role releases passed. No data migration, retention change,
account change or reboot occurred. Earlier artifacts and source offers remain
available. Rollback restores only the preceding image/pin recorded in each
release group, using the existing scoped Compose release and its configuration,
health, namespace and route checks. It does not restore or remove user data.

`review-zlib-bookworm.mjs` only prepares expiring exact-artifact decisions after
a complete current scan and successful source publication. It rechecks every
running library hash. The error-state fix is separate from the branch-absence
assessment for `gz_vacate`, which is not implemented by this source version.
Raw scanner attribution remains; neither an assessment nor a successful archived
replay is current security clearance. Gate tests cover unapproved candidates,
wrong identities, unexpected file/package changes and new or failed findings.


## SafeTwitch and Galene binary follow-up (10 November)

The existing source-pinned `go-final/build.sh` now also prepares the two
explicit inputs in `xnet-inputs.json` through `xnet-build.mjs`. It uses Go
1.26.10 and x/net 0.62.0 with checked-in module locks. Module acquisition is
separate from the offline build. Original application source, runtime assets,
configuration, users and entrypoints are preserved. The old/new complete-image
comparison permits exactly `/safetwitch` or `/app/galene` to change.

`xnet-followup.py KEY stage|native|scan` reuses the existing image exporter and
native application fixtures. Its adapters change only private evidence paths
and module resolution; their original and adapted hashes are recorded. The
native source tests pass. SafeTwitch's native response and disabled-chat behavior
match. Galene passes two independent Chromium sessions with synthetic audio/video,
screen sharing/stop and guest rejoin on an isolated same-host network. This is
not a real-device or fresh restrictive-network/relay claim.

Both scans use the same frozen advisory database. The targeted x/net findings
are absent and no new high/critical finding is introduced. The retained UNKNOWN
OpenPGP module-level attribution has a new version label; exact dependency
inventories confirm neither application imports that API. It remains in raw
scanner evidence. `xnet-followup-policy.mjs` requires the exact source, locks,
image scope, test and scan receipts, approved release rows and published source
hashes. Its 21 rejection/acceptance tests pass.

The existing `release-brotli.mjs --batch-20261109 --xnet` release path accepted
both groups. Galene's connection guard first held the restart while one
connection existed; activation succeeded only after the count reached zero.
Complete corresponding source is available in `safetwitch-backend-utilibre.tar.gz`
and `galene-utilibre.tar.gz`; public download hashes match the publication receipt.
Previous images, source archives and configuration receipts are retained. Scoped
rollback restores the recorded predecessor image without a data migration.

## Current assessment checkpoint

The 10 November 00:54 UTC scan completed for 109 runtime images, 175 containers
and 87 source inputs, using Trivy 0.75.0 and the unchanged 9 November database.
After exact-artifact review, 0 critical and 191 high package/target findings
remain pending. Of the high records, 148 concern runtime images, 22 tracked
build inputs, 18 host packages, two upstream release locks and one mounted
runtime lock. Raw observations remain; this is not full clearance.

The recorded CNA snapshot `f28c090f440f4708e405f235942a83ba4deb7ca4` was retrieved
deliberately for ten unresolved header advisories. Six identify kernel-internal
code and permitted 19 exact installed-header decisions. Four remain unresolved.
The narrowly pinned tracing record also names an upstream test file; the general
path policy remains strict. These decisions never exempt a running kernel.
Seven policy tests pass. The first retry correctly rejected a queue belonging
to the preceding scan; rebuilding the queue and rechecking succeeded.

The libmongocrypt, OAuthlib and util-linux component reviewers also verify
completed overlay ancestry and exact current library bytes. Historical native
proof is retained only when its version, source and artifact checks match.
No scanner severities, exclusions or thresholds were changed. Raw reports and
review receipts are private under `security-20261109/after-zlib-bookworm/` and
`security-20261109/after-xnet-followup/`. Host repairs requiring a maintenance
window, remaining x/net applications and unresolved ACL caller migration remain
open. Do not infer their completion from this batch.

The final 00:58 UTC scan also includes the four newly captured SafeTwitch/Galene
module files: 91 source inputs checked, with no unrechecked targets. The pending
high/critical counts remain 191/0. Two additional UNKNOWN module-level records
are retained. The final combined targeted policy run passes 75 tests; syntax
checks pass. Whitespace warnings are confined to exact upstream patch context,
which is preserved to keep the source/precondition hashes unchanged.


### GoHub continuation (10 November, UTC)

GoHub's x/net 0.62.0 update is deployed and passed exact-image, health, namespace
and public-route checks. Its running binary came from the newer 3 November
proxy-status repair, not the older codec build receipt. That mismatch correctly
blocked the first source selection. The preserved, checksum-verified public
source archive and matching executable supplied the correct inputs, retaining
all eight proxy-response cases and the existing destination-policy test.

The offline native suite and old/new page/asset parity pass. The complete image
comparison permits only `/app/gothub` to change. No new high/critical findings
appear; both targeted x/net findings disappear in the same-database comparison.
The source offer `gothub-utilibre.tar.gz` was publicly downloaded and matched
SHA-256 `e9c3abb9f18202877cee376d78f66a6a72f74e547748137dd66b2ed4f6abab95`.
No fresh third-party content search or real-device test is claimed.

An initial dependency download failed because its read-only GOPATH had no
checksum-cache directory. A prematurely started isolated build was cancelled;
no candidate was accepted from that attempt. The explicit disposable GOPATH
retry passed `go mod verify`; failure records remain private. Previous source,
image and configuration receipts remain available for scoped rollback.

The two earlier follow-up releases stay bound to the exact checker at commit
`c2fa64e01d5de17a9c719cf39975f157346da40e`. Their recorded hashes are verified
against that commit, rather than rewritten to match this later checker extension.
The historical-identity test rejects moving refs and cross-application reuse.
New GoHub acceptance requires the current checker and its exact evidence.

The completed 01:12 UTC scan includes GoHub and both new module files: 109
runtime images, 175 containers, 93 source inputs and no unrechecked targets.
The pending queue is now 0 critical / 190 high records. The x/net coverage
record separately preserves the original inventory and lists five completed
application releases, 12 remaining runtime targets and 22 older build inputs.
