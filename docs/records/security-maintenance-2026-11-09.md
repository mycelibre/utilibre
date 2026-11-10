# Maintenance checkpoint — 9 November 2026

This record covers the requested disk expansion, critical finding triage,
native library repairs, reviewed application upgrades and abuse-report notices. It is not a claim
that every pending advisory or newer application version is resolved.

## Completed release and remaining work

The earlier static-only checkpoint had **0 pending critical / 674 pending high
package-target records**. It is historical, not the final status after subsequent
image replacements. Raw findings and scoped reviews remain; reviewed backports
must be rebound to the exact new artifacts rather than inheriting a version waiver.
The current private `security-queue.json` is the authoritative dated queue.

The entire musl batch is now released: **62 images, 112 release groups and 120
containers**, including the original 20 static servers. The Debian vendor batch
also passed: **28 images and 33 release groups**. ChartDB, drawDB, Chhoto and
Yopass upgrades and the reporting notices are described below. The separate
42-application assessment now records **13 upgraded and 29 held**, with specific
reasons retained in `release-refresh-20261106/assessment.json`. These statuses do
not claim every upstream application is current or every security finding fixed.
Earlier ACL/GRUB repairs remain subject to their recorded automatic approval
review blocks; this release does not bypass them.

## Main disk

Proxmox had already enlarged the main virtual disk to 295 GiB. The guest's
partition and ext4 filesystem were extended into its unused 25 GiB tail.
The root filesystem is now approximately 291 GiB. The partition start and boot
partitions are unchanged. The separate 15 GiB temporary-data disk was untouched.
The operation completed online without reboot or service restart. Before/after
partition tables are retained in the private maintenance evidence directory.
An online shrink is not a rollback procedure.

## Critical records and GLib

The opening queue had seven critical and 735 high package/target records needing
review. These are scanner findings, not established exploitability.

Five critical records received narrowly scoped, expiring evidence reviews:
three Debian zlib packages do not include the affected MiniZip code, and the two
FreshRSS libxml2 payloads retain their verified fixes. Raw records remain.
FreshRSS's isolated library/application checks include native parsing, accounts,
feeds, Unicode, OPML and sanitizer behavior; no real user account was exercised.

Addy and 4get now use GLib 2.86.5 with the actual upstream D-Bus parser repair.
The signed vendor package alone still accepted the invalid node structure.
Both predecessors reproduce that behavior; the repaired library passes five
upstream tests plus a valid interface and seven malformed-document checks.
Existing symbols, dependencies, application bytes and configuration are retained.
Addy's eight native application checks and both applications' image processing
checks passed without sending mail or calling search providers. Their scoped
releases passed health and HTTPS checks; Addy's SMTP firewall boundary remains
active. Old images are retained in the release receipt.

The complete scan after these releases reported zero pending critical and
714 pending high records. This intermediate checkpoint predates the musl batch
below; retained backport reviews are not equivalent to removing raw records.

## musl and Debian vendor batches

The inventory records 62 affected image identities used by 120 containers.
The first twenty static-server candidates passed exact application/configuration parity,
16 native libc checks per artifact, preserved exported symbols and nine NGINX
checks per artifact. Tests cover normal HTML, UTF-8 content, byte ranges, gzip,
conditional caching, routes, redirects and missing files in network-isolated
containers. The tests do not claim to reproduce the oversized-regex exploit.

Each candidate removes CVE-2026-107891 against the same 9 November Trivy database
and introduces no new high/critical finding. Application bundles and browser
storage are unchanged. The remaining 42 images subsequently passed their scoped
consumer checks: native PHP/Node/Python/database/Redis functions, supervisors,
FMD synthetic account operations, ntfy delivery, Galene two-client media and
Tor configuration as applicable. A Tor configuration check is not circuit proof;
synthetic FMD tests send no commands to a person's device. These library checks
do not establish live upstream proxy availability or new browser-device coverage.
Whisper's withdrawn portal entry remains withdrawn.

All 20 selected static services completed their scoped live health, exact-image,
configuration and applicable HTTPS checks. No rollback was required.

The selected services are BentoPDF, Glyphr, miniPaint, hat.sh, JupyterLite, VERT,
OmniTools, Excalidraw, AudioMass, Image Scrubber, QR Tools, zip manager, CyberChef,
the primary QR creator, SVG-Edit, IT Tools, Markmap, draw.io, RAWGraphs and the
withdrawn Whisper runtime. Release completion is recorded per group in the
private receipt; all 112 groups are now passed. No stateful data migration is part
of this batch.

The Debian batch uses authenticated APT 3.0.4/libapt and zlib packages for Trixie,
and APT 2.6.2 for Bookworm. The distroless Yopass predecessor receives only the
verified zlib payload and native package metadata; it gains no shell or package
manager. All candidates retain unrelated filesystem/configuration bytes and pass
native package/ABI and application-specific checks against the same advisory
snapshot. The obsolete vendor-only Yopass artifact is superseded by 16.1.0 below.

## ChartDB 1.21.0

The upgraded application is live at
[ChartDB](https://tools.utilibre.org/apps/chartdb/), built from
`ee95448d154cfdcf65264c45745f440c0480ef84`. Local fonts/workers, scoped browser
storage and disabled telemetry/cloud integrations are retained. DOMPurify
3.4.17 and Monaco 0.57.0 remain pinned. Upstream theme validation is preserved.

The clean patch replay equals the tested source. Typecheck/lint/build and all
842 upstream tests passed. Chromium exercised SQL import/export, JSON backup
import in a fresh context and persistence after reload with fictional data.
No external requests, uploads or browser errors were observed in that workflow.
There is no new claim of real-phone verification.

The source/lockfile assessment has no high/critical findings; one medium and two
low findings remain. Static assets were replaced atomically and their previous
directory is retained. The EN/ES portal software pages now show 1.21.0-p1.
The portal passed build, lint, typecheck and 120 unit tests. A test was corrected
to accept Node's native empty 431 rejection while still requiring connection
closure and verifying legitimate requests below the header limit. Production
server behavior was not relaxed. Its runtime packages are unchanged; one
pre-existing medium zlib finding remains open.

The targeted upstream check confirms ChartDB matches its latest stable release.
The morning inventory contained 35 upgrade candidates; remaining candidates need
their compatibility/privacy/local-repair gates. The earlier
[release disposition](release-refresh-2026-11-06.md) remains applicable where
its candidate is unchanged. An available upstream release is not approval to
replace a repaired runtime.

## drawDB, Chhoto and Yopass

drawDB 1.9.0-p1 is live at `/apps/drawdb/` on the tools origin, from
`a249c7fb730c2de9b5c2ce6e863f2ea7344ac372`. SQL/JSON export/import, reload
persistence and Spanish controls passed in Chromium with fictional data and no
outside requests or browser errors. Source/lock assessment has no high/critical
matches in the recorded snapshot. Native local fonts/privacy adaptations remain.

Chhoto 7.10.8-p2 is live at `https://links.utilibre.org/`, from
`93881f699c1e2c900441b6bbb0aa0762b038f25e`. The operator selected eight-character
automatic codes with optional custom aliases. Anonymous creation remains open;
administration remains protected, click counting disabled and expiry capped at
30 days. The schema 4-to-5 upgrade preserves active mappings. Twenty-three
upstream and twelve isolated integration checks cover native expiry, redirects,
admin rejection, synthetic migration/backup/restore and browser copying.
The p2 footer adds reporting links without another schema change.

Yopass 16.1.0-p1 is live at `https://secret.utilibre.org/`, from
`c341c4a514cc0d5989418355e3d876c60c6910f9`. The complete native application is
rebuilt using pinned Go and Node builders. There are 1,213 passing Go checks
(51 skipped), 181 frontend checks and EN/ES browser encryption/decryption across
independent sessions. Native first-retrieval races, one-hour expiry, 10 KB limits
and old/new cross-version ciphertext compatibility pass. Source acquisition and
offline verification are separate; the exact patched source and four dependency
locks replay successfully. No new encryption implementation is introduced.

Only Yopass's application container changed: its RAM cache container was preserved.
Uploads, optional secret requests, read receipts, audit logging and metrics are
explicitly disabled. The native retry mechanism retains a random acknowledgement
for at most 60 seconds after retrieval; tests verify its contents and TTL. It
contains neither plaintext nor a visitor address. The deployed runtime has no
high/critical snapshot matches. Twelve high source matches remain in its unused
optional CDK workspace, explicitly retained for triage rather than called fixed.

## Reporting notices and privacy

The portal now provides `/en/abuse` and `/es/denunciar-abuso`, a global footer link,
and report actions in relevant shared-content service help. It uses the existing
`admin@utilibre.org` address and a subject-only mail link: no new form, report
database, automatic URL capture, tracking, external widget or CAPTCHA. Instructions
ask for an identifier and short explanation, not copies of suspect material or
secret-bearing fragments. Mail is not represented as anonymous. Mailbox filters,
auto-replies and outbound messages were not configured or sent.

Native reporting links are live in Chhoto, PrivateBin, Yopass, WBO, Pollaris,
CryptPad, Gathio, Rallly and LiberaForms; Opengist's existing native link now has a valid portal
destination. Details and remaining native-surface coverage are in
[`docs/abuse-handling.md`](../abuse-handling.md). The portal passes 122 unit tests,
typecheck, lint and production/SSR builds. EN/ES desktop and simulated mobile
checks verify navigation, visible notices and no unexpected requests; they do not
claim real-phone coverage. The initial JavaScript budget remains 215,000 gzip
bytes; the final metadata build measures 198,085 bytes.

PrivateBin's notice is also in its canonical updater template patch, replayed
against exact upstream 2.1.1 source. Its approved updater runtime pin now matches
the exact deployed musl-repaired notice image; the twelve updater policy tests
pass. Future candidates must still pass all unchanged source/configuration,
native upgrade and security gates. No service restart or paste operation was
needed for this policy correction. Native overlays validate exact before/after
hashes, reject unfamiliar inputs and preserve all unrelated image bytes. CryptPad
uses its native home/About surfaces; Gathio and Rallly use native settings.
Rallly retains its five-link limit and authentication policy. Pollaris's native
compiled-template cache was regenerated after release; no poll migration occurred. LiberaForms changes only its two native footer
templates; database and web-proxy containers remain unchanged, and its public
source offer includes the maintained builder modification.

WBO stores temporary boards in its existing tmpfs. Its container replacement
resets that temporary store; this batch does **not** claim those boards survived.
No user boards were inspected or copied for testing. Persistent account stores
were not migrated by these notice changes. Rustpad's similar active-pad concern
must be considered before activating any prepared footer replacement.

## Evidence and rollback

Private evidence: `/var/lib/utilibre-maintenance/security-20261109/`.
Important records are `glib-release.json`, `musl/*/{build,consumer,scan-gate}.json`,
`musl/release.json`, `chartdb-replay.json`, `chartdb-checks/result.json`,
`chartdb-static-release.json`, `portal-release.json` and the bounded test logs.
The scanner is Trivy 0.75.0, using the unchanged database
`3f021611ab6c0b94ca9f4fb630fb583c200663e8cae430446f89ded1b99fdb29`
retrieved/updated on 9 November. Archived replay is not future security clearance.

[Pinned inputs, operating commands and rollback](../../deployment/maintenance/security-20261109/README.md)
extend the existing release mechanism. Rollback restores the recorded image
pin or previous static directory and verifies the affected service. Preserve
Addy's native SMTP supervisor. Portal rollback changes only `PORTAL_IMAGE`.
Image rollback does not restore persistent or tmpfs data. No VM restart, backup
pruning, secret rotation or notification was performed. The WBO restart limitation
is recorded above. Chhoto's earlier schema migration has its own tested recovery
receipt; restoring an old image alone is not a general database rollback.

Corresponding sources:
[GLib repair](https://tools.utilibre.org/utilibre-source/security-glib-20261109-source.tar.gz)
and [ChartDB 1.21.0](https://tools.utilibre.org/utilibre-source/chartdb-1.21.0-utilibre-source.tar.gz).
Their respective SHA-256 values are
`314dbab9dd598a56e683d18b6e6efd228e4531b2dd7d5230e550047ee36c8093` and
`5e7b0f7e15450183f048502adcf44cca73c282bd1589eb132cb5708d33d10563`.

Primary fix evidence: [GNOME parser correction](https://github.com/GNOME/glib/commit/c9da977c178fbfc0e4caf99f9fdf5dc433d6fcc2),
[musl advisory](https://www.openwall.com/lists/musl/2026/10/21/1),
[Debian MiniZip scope](https://security-tracker.debian.org/tracker/CVE-2023-45853).
The exact fixes were checked against retained source/packages, not inferred
only from a scanner's fixed-version label.

## Final November 9 snapshot and review coverage

The 18:08 UTC scan completed against all 109 running image identities, 175
containers and 83 recorded source inputs using the same Trivy database.
No image/source extraction failed. This records package/source coverage, not
proof of absence of vulnerabilities, uptime history or working external providers.
Completed notice/image overlays required exact backport reviews to be rebound
to their new identities. The preserved package payloads were checked again;
raw findings were not suppressed or removed. The earlier zero-critical checkpoint
was not carried forward merely because a previous image had passed.

The corrected receipt reader recognizes the existing November 6 scoped
completion records and the single-group Forms receipt. Thirteen focused lineage
tests pass, including rejection of failed/incomplete and malformed receipts.
Two additional Linux advisories are reviewed only for verified headers-only
`linux-libc-dev` payloads, never for the VM or Proxmox running kernel:
[IPv4 RCU lifetime](https://security-tracker.debian.org/tracker/CVE-2026-98432) and
[ksmbd Kerberos bounds](https://security-tracker.debian.org/tracker/CVE-2026-99083).
Native vendor payload, Hono/Next scope, Grist sandbox permissions, SQLite and
Expat proofs retain seven-day review expiry and exact artifact/advisory scope.
Fresh Debian primary evidence is stored separately from the frozen scanner
database; its previous snapshot remains archived.

Private `final-assessment/` contains the scan output, preserved previous queue,
review decisions, failures/skips and read-only health observations. The stale
Expat 2.9 payload recipe correctly rejects 25 newer-package findings; those
receipts are retained. The dedicated 2.10 adapter verifies its own exact payload
and regressions instead. Remaining high findings and 29 held app upgrades still
need their recorded review/repair work; this release is not blanket clearance.

After these exact reviews: **0 pending critical / 1192 pending high package-target records**. This is the recorded
November 9 snapshot; future artifacts or advisory data require another assessment.
All 175 running application containers were running at the bounded health check,
none reported unhealthy, and no systemd unit was failed. Seven older exited
initialization/evaluation/fixture containers were left untouched.

A later exact-artifact review at the same frozen scan checkpoint reduced pending
high records from 1,192 to **420**, with critical still zero. The first batch
contains 748 HIGH decisions: compiled-kernel-only header attribution, native
util-linux/mount/blkid repairs, curl and ncurses payload checks. Thirty-five
header records lacking complete attribution remain open. The next 44 decisions
cover gzip and HEIF, of which 24 are HIGH. These are reverified existing repairs
or component-scope decisions, not 792 newly fixed vulnerabilities; raw reports
remain unchanged. A synthetic mount fixture passed 18 checks without real mounts.

The HEIF review now follows completed, chronological, unambiguous release
receipts from the original tested image to the current image, then checks the
actual library bytes and installed package again. Missing, wrong-service,
ambiguous and after-scan ancestry is rejected; all 17 focused policy tests pass.
No version-only waiver or new advisory exemption was introduced. Eleven review
writer/batch tests pass without modifying the live ledger during those tests.
These figures precede the DeGoog and portal image replacements; the next complete
scan must assess their exact new identities and any subsequent library releases.

### Later signed zlib and x/net rollout

Completed 44 scoped deployment groups using 30 distinct replacement images.
This is not a count of 44 independent applications. Twenty-eight images received
signed, same-Alpine-branch zlib 1.4-r0. Rimgo and AnonymousOverflow received a
combined zlib and x/net v0.62.0 repair, preserving the previously repaired
compression dependency and request controls. DeGoog keeps its working Brave and
Mwmbl integration, provider notices and new cache version. No provider queries
were needed to verify its library-only overlay.

Each zlib candidate passed seven native checks before and after, full unrelated
filesystem/configuration parity, ABI checks, its existing runtime or native
application fixture, and an offline scan against the same preserved database.
PostgreSQL fixtures included native dump/restore. FMD used two synthetic accounts
without a real phone. Galene used two Linux Chromium clients with fake media,
screen sharing and reconnection; its deployment waited for the aggregate
connection gate. Tor never joined its network during isolated checks. These
checks are bounded compatibility evidence, not universal device coverage.

The x/net regression used 8,192 repeated malformed closing tags in an isolated
fixture. Baseline allocations were approximately 35.8–36.8 MB; candidate
allocations were 0.11–1.03 MB across three parsing modes, with text preserved.
The upstream HTML tests and both applications' existing tests passed. Forty-three
release-policy/rollback tests passed, including wrong artifacts, missing or
modified evidence, new high findings and held releases. Matching complete source
archives at Rimgo and AnonymousOverflow were replaced atomically, old archives
retained, and public downloads matched their recorded hashes using curl.

WBO is deliberately still on its previous image: restarting it can discard
RAM-only boards. Its zlib candidate is tested but not activated. Other x/net
applications and older source-input findings are not cleared by these two builds.
AnonymousOverflow's pre-existing module-level OpenPGP warning remains recorded;
its exact native dependency list contains none of the affected OpenPGP packages.
No suppression was added.

Private evidence: `security-20261109/zlib/`, `security-20261109/xnet/` and
`security-20261109/after-library-rollout/` under the existing maintenance root.
The complete frozen-database scan finished at 21:07 UTC: 109 running images,
175 containers and 87 source inputs; coverage passed. Pending findings are now
**0 critical / 388 high** (previously 420 high). This is an exact checkpoint,
not full security clearance. The additional SQLite follow-up remains isolated
candidate work until its package, compatibility and release gates pass.

## SQLite and rsync follow-up release

The subsequent exact-file reviews at the same 21:07 scan checkpoint reduced
pending HIGH records from 388 to 351. Those were verified prior repairs or
component-attribution decisions, not 37 new software patches. That checkpoint
predates the releases below and must not be presented as their final scan.

The SQLite follow-up is now deployed: 24 distinct images across 29 release
groups and 30 running containers. It uses native Bookworm
`3.40.1-2+deb12u2+utilibre4` and Trixie `3.46.1-7+deb13u2+utilibre2` packages.
Upstream's [session changeset repair](https://github.com/sqlite/sqlite/commit/64459c87cc702d600704fb77ee40ca1782398a52)
and [FTS5 secure-delete repair](https://github.com/sqlite/sqlite/commit/d9de6eedbe918c074c7556400fa21df5960704d9)
are backported with exact source preconditions. Bookworm does not implement
the affected FTS5 secure-delete feature. Earlier rowid, DISTINCT and corrupt
FTS corrections remain included.

Both session baselines reproduce the heap overflow under AddressSanitizer;
the corrected builds pass the same fixtures and legitimate changesets.
Trixie's secure-delete baseline reproduces signed overflow under UBSan and
passes after repair. Native upstream suites pass 314 tests on Bookworm and
11,356 on Trixie. Per-image checks preserve application/configuration bytes,
unrelated packages, ABI and compile options, and exercise synthetic restore.
TURN deployment additionally verifies idle allocations/control connections;
only aggregate counts are recorded. It does not change relay limits or logging.

Gathio's database image additionally receives native rsync
`3.5.2+ds1-2~deb12u1+utilibre1`. Two upstream collision regressions fail on
3.5.1 for their intended reasons and pass on 3.5.2; 286 upstream tests pass,
with 90 environment/platform skips. Ordinary incremental transfers, safe
links, a read-only isolated daemon, PostgreSQL/DocumentDB, GDAL/PostGIS and
synthetic dump/restore checks pass. No production rsync daemon is enabled.
An initial fixture failed because its temporary directory was noexec; that
failure remains recorded and is not counted as reproduction of the defect.

All releases retain health, exact artifact, namespace-companion, configuration
and rollback checks. The stability gate correctly delayed a second change to
Unfurl. RSSHub/FreshRSS repository mirrors were reconciled to their already
completed vendor releases before the SQLite pin updates; the failed preflights
changed no running service. No data migration or retention change is included.

Fifty focused policy/release tests pass. Complete source offers are available:

- [SQLite source and recipes](https://tools.utilibre.org/utilibre-source/security-sqlite-20261109-source.tar.gz),
  SHA-256 `3186e2eabe137fdae01705eaa3c399b5c225f597469065ea1ba9a5dc43d537f7`.
- [rsync source and recipes](https://tools.utilibre.org/utilibre-source/security-rsync-20261109-source.tar.gz),
  SHA-256 `6aadf7b1f4621f16a778d50ccb837cfcfd027611b7e12fd4bf37e5118205a058`.

Both archives were downloaded and their hashes verified through the public
URL with curl. Python urllib's default request received 403; this does not
establish universal crawler access. The bilingual source-index additions were
visually checked at 1280×900 and 390×844, with no horizontal overflow.

The frozen Debian scanner data still attributes some repaired package versions
to advisories. Raw findings remain present; narrowly scoped reviews require
fresh full scans, completed release lineage and matching live payload hashes.
An rsync scan's initial console message incorrectly said the target was removed;
its machine-readable report correctly says `targetedFindingRemoved: false`.
The console wording is corrected and the earlier discrepancy retained privately.
No whole-service security clearance or reproducible build-byte claim is made.

Evidence: `security-20261109/sqlite-followup/`, `security-20261109/rsync/` and
`security-20261109/after-sqlite-rsync/` in the private maintenance directory.
Prior images and configuration receipts remain available for scoped rollback.

### Post-release scan reconciliation (10 November, UTC)

The 9 November 21:50 UTC scan completed with coverage intact: 109 runtime
images, 175 containers and 87 source inputs. Exact image/file and completed
release-history checks reduced the current pending review queue to 0 critical
and 308 high package/target records. Raw scan findings remain unchanged; this
is not a claim of zero vulnerabilities or full clearance.

Two overlapping util-linux reviews were reconciled using the narrower installed
binary-component proof: packages containing none of the affected component are
not affected by that specific advisory. The separate source-family patch proof
is retained. The libmongocrypt reviewer now follows completed image overlays
and still checks both actual running library files; a newer image alone cannot
inherit a decision. Grist’s current isolated runtime permission checks passed
and refreshed its exact Deno source-lock boundary review.

Evidence: private `security-20261109/after-sqlite-rsync/`, including the original
review failures, reconciliation record and raw scanner output. Bookworm zlib
preparation is separate and is not counted as a deployment in this checkpoint.

### Bookworm zlib deployment (10 November, UTC)

The eight scoped releases passed: Rallly, RSS-Bridge, Uptime Kuma, Actual
Budget, Reactive Resume, Gathio's database, CryptPad and Wishlist. They use
`zlib1g 1:1.2.13.dfsg-1+utilibre1`, preserving their application/configuration
and unrelated packages. Each old/new artifact passed seven ordinary compression
checks, unchanged ABI/dependencies and a complete image-file comparison.
Gathio additionally passed a synthetic database import/restore and native
XML/PostGIS/DocumentDB compatibility check. All candidate scans used the same
retained database and introduced no new high/critical record. The 67 targeted
release-policy tests and 13 lineage-policy tests passed.

Complete source (1,279,511 bytes) is published at
`https://tools.utilibre.org/utilibre-source/security-zlib-bookworm-20261109-source.tar.gz`,
SHA256 `0e92459b36ef55f08eb5ec19cbaee259d59e416118ccc64e1c8cbb8510cbafed`.
The 1.2.13 source, original notices, native packaging, upstream correction and
build-dependency lock are included. No source-code or user-content telemetry was
added. This does not claim byte-identical reproducible builds.

Release receipts and exact previous image/configuration pins are retained in
private `security-20261109/zlib-bookworm/release.json`. Rollback uses those scoped
pins and the existing health checks; no persistent-data migration was performed.
The post-release fleet scan is tracked separately below; the earlier 308-high
checkpoint must not be interpreted as the new deployed-image result.


### SafeTwitch/Galene release and assessment (10 November, UTC)

SafeTwitch backend and Galene now use x/net 0.62.0 with the existing Go 1.26.10
compiler. Their original application source and all image files except the
single service binary are unchanged. Upstream native tests pass. SafeTwitch's
ordinary responses and disabled-chat status match its predecessor. Galene's
isolated two-client synthetic-media, screen-share/stop and guest-rejoin checks
pass. These Linux/Chromium same-host checks do not establish real-phone or
public-relay coverage. A detected Galene connection initially held deployment;
the release succeeded after it ended. Both scoped release groups passed.

Public corresponding-source downloads were checked against these SHA-256 values:

- SafeTwitch: `f4480d545e5c927183caa6bf1d77f6c3727db3ec65f0140f542f2f51f8f98917`.
- Galene: `e080d671ea595c1c419661b62251bd61d6ac7e6a5ebc46f05ad6463761a69d6c`.

The 00:54 UTC fleet scan completed: 109 images, 175 containers and 87 source
inputs, with the same retained Trivy database. The pending high count is 191;
pending critical remains zero. This follows actual library/binary updates plus
exact-artifact review, not deletion of raw findings. The remaining high records
span 148 runtime-image, 22 tracked-input, 18 host, two upstream-lock and one
mounted-runtime-lock records. Some other severity records also remain pending.

Nineteen installed-header findings were attributed to absent kernel-internal
components using a deliberately selected, preserved primary CNA snapshot:
[CVEProject revision f28c090](https://github.com/CVEProject/cvelistV5/tree/f28c090f440f4708e405f235942a83ba4deb7ca4).
Four header advisories remain unresolved. This does not assess the running VM
or Proxmox kernel. The general component policy was not loosened; one exact
tracing record is checksum-pinned because it also names an upstream test file.

Review decisions retain their raw observations and seven-day expiry. Tests
include 74 focused follow-up policy checks, six native-package policy checks
and seven header-policy checks. The source and native package recipes are
published; historical standalone diagnostic inputs remain protected operator
evidence and are not distributed in newly prepared source offers. Rebuilding
ordinary packages is distinct from replaying those retained diagnostic proofs.
No byte-identical reproducibility or whole-service security clearance is claimed.

Evidence: private `security-20261109/after-xnet-followup/`,
`security-20261109/xnet/release.json` and the source-publication receipts. Scoped
rollback uses each preceding image and configuration pin; no persistent-data
migration, retention change, account change or host reboot was performed.

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
