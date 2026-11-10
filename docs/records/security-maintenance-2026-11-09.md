# Maintenance checkpoint — 9 November 2026

This record covers the requested disk expansion, critical finding triage,
native library repairs, reviewed application upgrades and abuse-report notices. It is not a claim
that every pending advisory or newer application version is resolved.

## Completed release and remaining work

At 11:40 UTC on 10 November, the separately approved GRUB update installed the
eight authenticated vendor packages and regenerated the boot menu. Native boot
hooks, exact EFI/module verification and package-scope checks passed. Shim,
firmware boot variables and all 175 running container IDs were unchanged.
Actual reboot/boot verification is still pending; no finding has been closed
in advance. [Installation and rollback evidence](../../deployment/maintenance/grub-assessment/README.md).

The scheduled 10:28 UTC advisory refresh predates that installation and now
reports **0 critical / 324 high records needing review**. The earlier 36 below
is historical. Four Kerberos advisories account for 284 additional package-target
occurrences; two Symfony occurrences and two kernel-header occurrences account
for the other four. These are new review records, not evidence that 288 prior
repairs regressed or that every match is exploitable. The scoped GRUB candidate
comparison against this same new database introduced no high/critical records.

The earlier static-only checkpoint had **0 pending critical / 674 pending high
package-target records**. It is historical, not the final status after subsequent
image replacements. Raw findings and scoped reviews remain; reviewed backports
must be rebound to the exact new artifacts rather than inheriting a version waiver.
The current private `security-queue.json` is the authoritative dated queue.

### 10 November: follow-up on the 60 remaining high records

The subsequent vendor investigation leaves the same **36 pending**. It does
not convert more findings into waivers. A pinned, unmodified Debian GRUB
2.14-5 candidate now passes eight-package dependency simulation and six
ordinary tool/configuration checks in a networkless unprivileged container.
Two altered-input checks fail before candidate execution. A repeated preflight
passes without changing host packages or boot files. Later ordinary boot tests
passed for both vendor and restored previous EFI loaders, using the running and
next-default Linux kernels in a synthetic RAM system under OVMF. The operator's
backup log confirms a successful root/EFI-state backup with temporary storage
excluded. A private boot-file backup round-tripped all 650 regular files.
This is candidate preparation and limited boot/recovery testing, not installation,
real Proxmox boot, whole-VM restoration or release approval. A fresh console and
coordinated reboot window remains required. Full procedure:
[vendor GRUB preflight](../../deployment/maintenance/grub-assessment/README.md).

The fresh ACL inventory covers 30 records in 36 host/container locations.
Authenticated vendor tar 1.35+dfsg-7 still imports the old pathname APIs. The
current Bookworm rsync 3.5.2 rebuild has the descriptor API disabled; the Sid
binary requires a newer libc. No incompatible cross-release packages were
installed. Python-Markdown's link-scanning issue remains open upstream;
closing its duplicate report did not fix the parser. These observations do
not establish exploitability or justify changing scanner severity.

The same completed scan now has **0 pending critical / 36 pending high records**.
This reduction is **24 scoped mitigations, not 24 newly patched vulnerabilities**:

- Two Grist/Hickory source-lock findings: fresh networkless native checks
  confirmed the running Deno sandbox boundary; ordinary Pyodide operation passed.
- Twenty-two historical Go-lock findings: all 14 successor applications already
  run the verified x/net 0.62.0 binaries. Four superseded release entry points
  now explicitly reject their old Go activations. Every queue rebuild verifies
  the exact guard, recipe, lock and running-binary evidence before retaining
  these seven-day reviews. Missing/changed evidence reopens the records.

All historical source locks and raw findings remain. No scanner exclusions,
severity changes, package removals, service restarts, emails or live exploit
checks were used. The fresh work consists of release/ledger safeguards and
evidence validation; no new application or host package was deployed here.
**168 focused tests passed**: 50 release/retired-command, 83 policy/condition and
35 queue regression checks. The per-application workflows were retained and
hash-verified, not newly rerun against production accounts.

The 36 unresolved records represent 30 ACL package/target occurrences, five
GRUB packages and one Kuma Python-Markdown package. ACL needs both library and
caller migration; GRUB needs a compatible boot-chain candidate and recovery
window; Python-Markdown has no verified compatible upstream fix. Removing its
Apprise dependency would disable notification functionality. No finding in
these three groups was accepted merely because it is difficult to repair.
Earlier automatic approval rejection of the custom ACL/GRUB path remains in
force. The later 40 GiB root expansion below resolves the build-space blocker.
The same-database GRUB candidate scan adds no high/critical records but retains
five Trixie matches with no fixed version in that advisory entry. Debian's
primary tracker and authenticated signed candidate establish the vendor fix;
raw scanner matches are retained, not suppressed. No installed finding was
closed in advance of deployment.

[Current inputs, verification and rollback](../../deployment/maintenance/security-20261109/README.md#remaining-high-follow-up--10-november).
Private receipts: `security-20261109/remaining-high/`. This checkpoint does not
claim current security clearance, byte-reproducible builds or new device coverage.

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

On 10 November, Proxmox exposed a further 40 GiB enlargement, from 295 to
335 GiB. The guest root partition and ext4 filesystem were extended online.
The filesystem is approximately 330 GiB, with 46 GiB available and 86% usage
at the verification time. Its start and both boot partitions remained unchanged.
The separate 15 GiB temporary-data disk was untouched. No reboot or service
restart was needed. Partition-table and filesystem evidence is retained under
`/var/lib/utilibre-maintenance/disk-expand-20261110/`.

Earlier, Proxmox had enlarged the main virtual disk to 295 GiB. The guest's
partition and ext4 filesystem were extended into its unused 25 GiB tail.
The root filesystem was then approximately 291 GiB. The partition start and boot
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

### Embedded Caddy continuation (10 November, 01:27 UTC)

Wishlist and the three newsletter roles now use the tested Caddy binary with
x/net 0.62.0. The separate edge proxy is unchanged. Three candidate images and
all three release groups passed; the newsletter web release also recreated its
existing namespace companion. Native proxy/gzip/SSE/HTTP2 behavior, Wishlist
account/list/item persistence and anonymous denial, and synthetic newsletter
SMTP-to-Atom creation/deletion all passed in isolated environments. No external
browser origins were requested. This does not claim live external mail delivery.

The source sequence was reconstructed from the pinned Caddy buildable archive
and earlier approved fixes. Native vendoring initially removed 416 unrelated
source/test files from the JOSE/compression trees; the strict scope check
rejected that result. Restoring those exact files from the verified baseline
made the final scope pass. Six explicit Go module version changes remain; the
earlier JOSE v3 source backport, JOSE v4 and compression fixes are intact.

Full image comparison permits only the binary and four build/module notices.
The three same-database comparisons remove CVE-2026-78661 and CVE-2026-97045,
with no new high/critical findings. The retained UNKNOWN OpenPGP attribution
changes its module version; the actual linked-package inventory excludes that
API. Other raw findings are retained for separate review, not silently waived.
Seventy-two targeted release/policy tests passed, including rejection of changed
inputs, incomplete behavior proofs and additional unreviewed findings.

The complete source offer was downloaded through the existing tools-origin
route and matched its recorded length and SHA-256. Python urllib received 403;
native Node HTTPS fetched the exact archive successfully. This establishes that
tested fetch, not universal crawler access.
[Source and offline rebuild instructions](https://tools.utilibre.org/utilibre-source/security-xnet-caddy-20261109-source.tar.gz):
51,110,045 bytes, SHA-256
`1e7ae55f6bde26ade9bd0ab0dc441eafb701b7d7b9713fbfdf9a61f52c0e57d5`.

Private evidence: `security-20261109/xnet-caddy/`; scoped previous pins and
configuration hashes: `xnet-caddy/release.json`. No account/data migration,
retention change, public-route activation, external email or host reboot.

The completed 01:29 UTC scan checks all 109 images, 175 containers and 95
source inputs. Forty-two exact, seven-day reviews revalidate retained patches
and component boundaries, including the new Caddy lock. Raw evidence remains.
The resulting pending queue is **0 critical / 183 high package-target records**.
There are nine remaining x/net runtime targets and 22 historical build inputs.
Forty-four review-policy tests pass (overlapping the release-policy suite); no
new exploit reproduction was run. Incomplete historical newsletter image ancestry
was not silently accepted: the new Caddy review uses its independently proven
source, original binary identity, complete native/build receipts and live hashes.

## Mezzo x/net follow-up — 10 November

Mezzo 1.4.0 at `tenor.utilibre.org` now uses x/net 0.62.0. Its exact original
Git archive, previous resolved locks and live binary were reconciled separately;
the earlier source inventory predates those resolved locks. Every application
source file is retained. Only `/ko-app/mezzo` changes in the full 1,345-entry
image comparison; configuration, frontend bytes and all other files match.

The existing offline Go 1.26.10 build passed cache, configuration, scraper and
server unit tests. Both old and new images passed native home/assets/version,
missing-file and unsupported-proxy checks on isolated loopback, without a Tenor
request. The frozen database comparison removes one high and one medium x/net
record, adds no finding and reports no remaining vulnerability in this image.
That result covers this scanner/artifact, not every security risk or live search.
The scoped release passed exact-image, health, namespace and public-home gates.
The updated complete source archive is published and its public bytes verified.

Replay uses `xnet-build.mjs mezzo`, `xnet-followup.py mezzo stage|native|scan`,
and the existing separately authorized `release-brotli.mjs --batch-20261109
--xnet prepare|apply mezzo` procedure. Private evidence is in
`security-20261109/xnet/mezzo`; rollback pins are in `xnet/release.json`.
No account data, persistent schema or privacy configuration changes. The fleet
count above remains the last completed fleet scan; refresh it after this batch.

## Anubis and refreshed fleet evidence — 10 November

Anubis 1.27.0 now uses x/net 0.62.0, compiled with Go 1.26.10. The live
predecessor exactly matched the retained November build; clean pinned source
and the existing frontend assets were used. The previous JOSE v3 patch remains
mandatory in the build and its suite passes. Existing native configuration,
challenge and web packages pass. The new Go development-tool telemetry module
is not linked into the runtime; compilation telemetry is disabled. Four linked
Go module changes are explicitly recorded; other linked modules are unchanged.

Only `/ko-app/anubis` changes in the image. Two independent Chromium sessions
per old/new artifact completed a native proof-of-work challenge, preserved the
authenticated reload and passed allow/deny behavior. The browser and synthetic
upstream ran inside the container's networkless namespace, with zero external
requests. The 65 web and six Xess assets, plus inline challenge assets, match
the previous bytes. This is Linux headless-browser coverage, not a real-device
or public-upstream test. The complete source offer retains licences and build
steps; two upstream Git-web integration-test key fixtures are explicitly omitted
from redistribution, while remaining in the private assessed source. They are
not required by this build or the tested workflows. No scan exclusions changed.

The candidate comparison removes one high and one medium x/net record and
adds none. Scoped deployment passed exact artifact, health, namespace and public
route checks. Privacy settings and production policies are unchanged. Current
code pins the historical checker for completed Mezzo/GoHub releases instead of
retroactively changing their evidence. All 24 focused follow-up policy tests
pass. The isolated mount failure is retained; it had no production effect.

The complete 01:59 UTC scan checked 109 images, 175 containers and 99 source
inputs. After one exact, expiring review of Anubis's retained JOSE backport, the
pending queue is **0 critical / 181 high package-target records**. Seven x/net
runtime targets and 22 older build inputs remain open. There are no unrechecked
targets. Medium, low, UNKNOWN and raw records remain; this is not full remediation.
Private evidence: `security-20261109/after-anubis` and `xnet/anubis`.

Replay uses the existing `xnet-build.mjs anubis`, `xnet-followup.py anubis
stage|native|scan`, and separately authorized `release-brotli.mjs --batch-20261109
--xnet prepare|apply anubis`. `review-go-v3.mjs --xnet-anubis` is a read-only,
exact-input proposal requiring a fresh scan and live artifact verification;
recording that decision is a separate operator action. Rollback uses the exact
previous image/configuration pins in `xnet/release.json`; no database migration
or persistent-data change is part of this release. The source archive's public
bytes were verified against its publication receipt.

## OAuth2 Proxy follow-up — 10 November, 02:23 UTC

OAuth2 Proxy 7.15.5 now uses x/net 0.62.0 at Grist's authentication gateway.
The exact previous source and compiled locks were reconciled against its live
binary. Go 1.26.10 compiled offline; existing package/provider tests passed.
The prior JOSE v3 source repair and JOSE v4.1.6 remain mandatory. Only
`/usr/bin/oauth2-proxy` changed in the image; settings and other bytes match.

Both old and new artifacts passed native OIDC discovery, authorization code
with PKCE, signed identity, cookies/headers, CSRF rejection, anonymous denial
and logout, using a synthetic issuer in a networkless container namespace.
The real production identity provider was not exercised by that test. The
scoped deployment passed exact image, health and public login-route checks.
No account data or schema changed; rollback uses the previous pin recorded in
`security-20261109/xnet/release.json`. All 36 selected release/JOSE policy tests
passed. Compilation is deterministic in its inputs; reproducible bytes are not
claimed.

The frozen-database comparison removed one high and one medium x/net record.
The pre-existing OpenPGP attribution changes its module version label; the API
is not imported, and the raw UNKNOWN record remains. JOSE v3 version metadata
still reports the already-backported issue. Exact source/runtime reviews are
bound to the verified patch, build, native checks and live binary, and expire
in seven days. Other medium and UNKNOWN findings remain open.

The complete 02:23 UTC scan checked all 109 images, 175 containers and 101
source inputs. The pending queue is **0 critical / 179 high package-target
records**, with six x/net runtime targets and 22 historical build inputs still
open. It is not full remediation. Private before/after scan evidence is in
`security-20261109/after-oauth2-proxy`; build, workflow and release evidence is
in `xnet/oauth2-proxy`.

The OAuth2 Proxy complete source offer is published and its public bytes match
the receipt. Its bundled JOSE source includes the Apache-2.0 licence and
modification notice. Anubis's earlier source offer omitted these two companion
files; the corrected archive adds only those files, preserves all previous
source bytes, and retains the previous archive/receipt in
`xnet/anubis-license-6wnw7qcy`. Its public bytes were also verified. No running
Anubis changes or additional restart were required for the source correction.

## Wakapi and retained-fix revalidation — 10 November

Wakapi 2.18.1 now uses x/net 0.62.0, retaining its exact Go 1.27.3 toolchain,
`jsonv2` build setting, prior JOSE v3 repair and JOSE v4.1.6. All 549 non-lock
source files match the prior manifest, including existing privacy edits. Its
previous compiled dependency locks were verified separately from the older
acquisition source. The first download attempt failed because the read-only
container lacked a writable Go checksum-state directory; the corrected bounded
acquisition used temporary state and verified all modules. No production
setting changed to resolve that preparation failure.

The offline utility, helper and configuration tests passed. Both old and new
images passed fresh temporary SQLite setup, account creation, login/logout,
authenticated heartbeat submission, anonymous denial and the native healthcheck.
These are fictional local-account workflows in networkless containers, not
production OIDC or user-activity tests. All 82 embedded static, UI/mail-template
and colour-data files remain byte-identical. The full-image comparison permits
only `/app/wakapi` to change. The same frozen scanner data removes one high and
one medium x/net record and adds no high or critical record. The unimported
OpenPGP attribution remains visible under the newer module version.

Scoped deployment passed artifact, configuration, health and public-home checks.
Existing saved records and access/privacy settings are unchanged. Rollback is
the prior exact image/configuration pin in `security-20261109/xnet/release.json`;
there is no production schema migration. The full source archive is published
and its public bytes verified. Replay uses the finite Wakapi adapter described
in the maintenance README. All 38 selected follow-up/JOSE policy tests pass.

Separately, the existing OpenLDAP reviewer revalidated four exact repaired
library findings using retained authenticated source, patches, package/build
and ABI evidence, release ancestry and current live library hashes. Penpot's
existing DHI reviewer revalidated 124 old-metadata attributions: 17 high,
75 medium and 32 low records. Every actual package file and symlink matched
the retained authenticated fixed vendor archive, and current primary Debian
tracker records established the relevant fixed versions. Those 124 records
cover PCRE2 and OpenSSL packages, not APT or unrelated Penpot findings. No
scanner metadata was edited, no finding was suppressed and no service restart
was needed for these reviews. Decisions are exact and expire after seven days.
Private evidence is in `security-20261109/openldap-revalidation` and
`security-20261109/dhi-revalidation`. Raw findings remain available.

The complete 02:35 UTC scan checks 109 images, 175 containers and 103 source
inputs, with no unrechecked targets. After exact retained-fix reviews, the
pending queue is **0 critical / 156 high package-target records**. Five x/net
runtime targets and 22 historical build inputs remain open. New and unresolved
medium, low and UNKNOWN records remain; this is not full remediation. Evidence:
`security-20261109/after-wakapi` and `xnet/wakapi`. OpenGist is being prepared;
it is not included in these completed releases.

## Retained component revalidation — 10 November, 03:02 UTC

The completed 02:35 UTC scan remains the assessment input. Read-only installed
payload and source checks resolve 25 further high package-target records:
five DHI systemd/Perl binary-component attributions; four retained host/exporter
Xvfb corrections; two npm records whose 2,198 installed files/links match the
signed fixed package; 13 exact GDAL/MariaDB/PostGIS component inventories; and
one already-deployed PostGIS native backport. These are scoped reviews, not
25 newly patched vulnerabilities. No raw findings or package metadata changed.

All decisions expire in seven days. Only the exact current Penpot descendant
images were added to existing policy allowlists; full signed-payload and
completed-release ancestry checks remain mandatory. The cleanup unit fixture
uses synthetic in-memory objects, with no live display or exploit probe.
PostGIS retains its recorded native ABI, application and synthetic restore
evidence and matches the tested package bytes. No running service was changed
by these reviews. The component report now avoids claiming that an independently
reviewed sibling package is necessarily still unresolved.

The current pending queue is **0 critical / 131 high records**. The machine
record's scope counts are now derived from that same queue; previously those
subtotals lagged its headline total. Medium/low/unknown findings remain. Private
evidence is in `security-20261109/{binary-scope-revalidation,
xvfb-passive-revalidation,npm-revalidation,component-revalidation,
geospatial-revalidation,after-component-reviews}`. OpenGist and ntfy are still
candidates at this checkpoint; their activation requires completed checks.

## OpenGist and ntfy — 10 November, 03:19 UTC

OpenGist 1.15.2 and ntfy 2.28.0 now use x/net 0.62.0 with their retained Go
1.27.3 compiler, exact prior source and approved dependency repairs. Full image
comparisons allow only each application's executable to change. Configuration,
permissions, limits, application data and frontend files are preserved.

OpenGist's native fixtures pass with two synthetic accounts: private access,
editing, revision ZIP export, Git clone/push, reopening and native deletion. Its
195 embedded assets are unchanged. Echo middleware tests and the retained
JOSE v3 test dependency pass. Earlier cache/temp-environment failures remain
in private evidence; the final complete build was rerun successfully.

ntfy's selected upstream tests and native fixtures pass: publish/poll, one-hour
expiry, no-cache behavior, disabled attachments/registration/metrics and clearing
the RAM cache on restart. All 295 embedded assets are unchanged. This release
does not establish a real-device UnifiedPush check. Its routine restart loses
temporary cached messages; no configuration or saved account data migrated.

Both exact artifacts passed live release health/route checks. Complete source
archives and bilingual index entries are provided; public downloads matched the
published hashes. OpenGist's first Python-client download received 403; curl
subsequently fetched the exact archive. No WAF or access policy was weakened.

The completed 03:18:43 UTC scan covers 109 images, 175 containers and 107 source
inputs. After one exact, seven-day review of OpenGist's retained JOSE source
repair, **0 critical / 129 high package-target records remain pending**. Raw
findings remain. Three x/net runtime targets and 22 historical build-input
records still need work; this is not full remediation.

Evidence: private `security-20261109/xnet/{opengist,ntfy}` and
`after-opengist-ntfy/`. Repeatable inputs, source offers, release proof hashes
and immutable images are recorded in `xnet-inputs.json` and
`xnet-release-inputs.json`. Rollback uses each group's preceding image in
`xnet/release.json` through the existing scoped Compose procedure. There is no
database-format change. A rollback does not restore ntfy's temporary RAM cache.

## Retained native reviews — 10 November, 03:38 UTC

On the completed 03:18 UTC scan, 20 further HIGH package/target records
received exact, seven-day reviews. Thirteen GnuPG records concern the absent
`tpm2daemon` component: eleven complete installed package payloads match their
authenticated archives, and executable/library paths contain no such daemon.
Wget (two), sudo (one), HDF5 (two) and CFITSIO (one) still match the previously
tested repairs and completed release chains. Their raw findings remain.
The separate CFITSIO variable-length string limitation remains unresolved.

The host Expat review now supports the same explicit amplification advisory
mode as the existing container reviewer. It checks the signed 2.10.0 source
release statement and retained upstream test log, the complete host package,
and observed resident-library mappings. All matched. No new exploit, service
restart or package installation was performed for these reviews.

The resulting queue is **0 pending CRITICAL / 109 pending HIGH**. This is a
review checkpoint, not completion or a fresh advisory-database assessment.
Evidence: `security-20261109/after-retained-native-reviews/` and the per-component
`*-revalidation/` directories in the private maintenance store.

## Donetick networking repair — 10 November

Donetick 0.1.80-p3 now uses the exact x/net 0.62.0 module graph and its
retained Go 1.27.3 compiler, JOSE 4.1.6 repair and original build flags. Only
`/donetick` changes across its ten-entry scratch image. All 254 frontend files
remain byte-identical. Storage/user/auth tests and the isolated two-account
create/read/delete and access-isolation workflow passed for old and new images.
The existing upstream lookup returns 500 for inaccessible/deleted objects;
content denial passed, but that error behavior is not claimed fixed.

The first compilation exhausted its 2 GiB temporary workspace, without filling
the VM disk or producing a candidate. The retry used the earlier successful
6 GiB memory/4 GiB workspace allowance and passed. Scanning both artifacts with
the same frozen database removes the targeted HIGH and MEDIUM findings, adds
no HIGH/CRITICAL findings, and retains an UNKNOWN OpenPGP module attribution
with no OpenPGP package linked. No byte-for-byte build claim is made.

The scoped application release passed exact image, unchanged configuration,
health and HTTPS gates. No database migration or account change occurred.
Rollback is the preceding image recorded in `xnet/release.json`; it does not
revert subsequent user edits. Complete source archive SHA-256:
`dc7b4dd797cdaf34782f327c492a5cdd38a7a9d25d92a89ca01bdd8e7a98d1a6`
(12,175,894 bytes), verified by downloading the public source route.

Vikunja and FerretDB inputs are captured in the same finite adapter; their
actual build/native/release receipts, not those manifests, establish completion.

## Vikunja networking repair — 10 November

Vikunja 2.7.0 now retains its Go 1.27.3/static build and existing JOSE/Echo
repairs while using the pinned x/net 0.62.0 module graph. Only the executable
changes in its complete fifteen-entry image; 361 frontend assets are identical.
Two synthetic accounts passed task/project and attachment isolation, password
protected native ZIP export/import, recipient ownership, SQLite recovery,
reload and deletion checks. Native configuration/utility and Echo middleware
tests passed. Production OIDC and real users were not exercised.

The same-database comparison removed the targeted advisory with no new HIGH
or CRITICAL finding. The scoped release passed exact-image, configuration,
health and HTTPS checks. Existing account settings and user data remain; no
migration ran. Rollback uses the recorded preceding image in `xnet/release.json`.
The complete source includes frontend source and compiled assets, exact locks
and rebuild instructions. Its public download matched SHA-256
`52a9fbe8ad9463ccd42377d312de93ecf01bd36b2cb032d87257a4719306aa5e`
(15,639,852 bytes).

## FerretDB networking repair — 10 November

FerretDB 2.7.0 retains Go 1.26.10, the existing MCP compatibility patch,
MCP 1.4.1 and compression 1.20.2, with the exact x/net 0.62.0 graph. Only
`/ferretdb` changes in the complete twelve-entry image. Native MCP/utility tests
and separate old/new Gathio fixtures passed event editing, invalid edit-token
denial, image upload, calendar import/export and stopped synthetic PostgreSQL
copy/restore. Production MCP remains disabled. No real event or database was
used in testing. The synthetic test directories were subsequently compressed;
all 4,236 files and their permissions were compared with the archive before
removing only the duplicate uncompressed fixture copies.

The frozen-database comparison removes the targeted finding with no new HIGH
or CRITICAL finding. The scoped release passed image/configuration/health and
public HTTPS gates, without a database migration or application configuration
change. Rollback uses the preceding FerretDB image in `xnet/release.json`; it
does not undo user changes. Complete source archive SHA-256 is
`6130a5ad3d5d5e8e5161af3e2f248592f10abd72126b4b49b83c6d12bc8eaa32`
(59,568,217 bytes), verified by public download.

Ten byte- and permission-identical generated build-context binaries were
deduplicated through hard links, retaining both paths and every source, proof
and rollback image. One copy with different permissions was left intact. This
recovered 505,084,096 bytes; synthetic-fixture compression recovered a further
238,495,960 bytes. This is scoped build-space cleanup, not backup pruning.


## APT repairs and retained-fix verification — 10 November

Six signed vendor-package overlays are deployed: Mumble, SimpleLogin, Addy's
MariaDB image, Redlib and Penpot's frontend/exporter (eight container roles).
Ubuntu Noble uses APT/libapt 2.8.4ubuntu0.1, Jammy 2.4.15ubuntu0.1, and DHI
Trixie 3.0.4+dhi0. Acquisition verifies pinned signing keys, repository indexes,
archive hashes and lengths. Cached replay without networking retains the
original acquisition receipt. Ordinary APT checks pass on both old/new artifacts;
ABI, dynamic dependencies, application/configuration and unrelated packages are
unchanged. The same frozen Trivy database reports no new high/critical findings.
Primary references, checked 10 November:
[Ubuntu](https://ubuntu.com/security/CVE-2026-109518) and
[Debian](https://security-tracker.debian.org/tracker/CVE-2026-109518).

Penpot retains four raw findings from old status.d metadata. Every regular file
and symlink from the signed fixed packages matches the candidate and live
containers; actual dpkg package versions are fixed. The old metadata was not
removed. Exact, expiring review records distinguish this attribution from an
unrepaired library. A new full two-browser Penpot workflow was not performed:
the application is unchanged and prior workflow evidence is retained.

SimpleLogin stays private, with its intentional public unavailable notice and
successful local login check. No mail was sent. Its previously tested Python
interpreter and full Flask/Werkzeug modules match all three running roles.
Mumble's restart occurred only after zero established connections. Addy's
existing mail boundary and public alias route passed. Redlib's first release
attempt stopped at its environment-variable pin before changing a container;
the corrected exact override and retry passed. Its deterministic daily checker
now recognizes the approved OS overlay without replacing it with an older image.
A new upstream revision still requires the ordinary review gates.

Several old reviewers assumed repair-family files were chronological. The
corrected shared check follows completed same-role image transitions and rejects
ambiguity, divergent roles, cycles and invalid chronology. Existing reviewers
then recheck their own source proofs and live hashes. This restored the evidence
for preserved XML, Xlib, TIFF, Xvfb, curl, ncurses, util-linux, Perl and application
source fixes without replaying malicious inputs or changing the applications.

The complete 04:19:58 UTC fleet scan covers 109 images, 175 containers and
107 source inputs. After review, **0 critical / 88 high records remain pending**.
Raw records remain **24,491 total, 65 critical / 3,050 high**. These are package/
target counts, not unique exploitable vulnerabilities or a security clearance.
Remaining records, expired reviews and known separate limitations stay open.
Evidence: private `security-20261109/apt-followup/`, `after-apt-reviews/`,
`vendor-debian/release.json`, and the existing per-component review receipts.

Rollback selects each exact previous image/configuration pin in the release
receipt and uses the existing scoped release checks. Redlib additionally restores
its protected environment image setting. No database migration, reboot, account
change or retention change occurred; image rollback does not undo user edits.

The final focused check passes 112 tests across release, rollback, source review,
artifact lineage, vendor payload and Redlib maintenance policies. JavaScript and
Python syntax checks and the scoped whitespace check pass.

## OAuthlib 4.0.1 — 10 November

The fixed upstream wheel/source is pinned by SHA256 and deployed in Authentik,
TRIP and the private SimpleLogin evaluation: three images, six container roles.
Only OAuthlib and its package metadata/bytecode change. Complete image comparisons
and dependency inventories confirm prior Python, CA, SQLite and application
repairs remain. All 12 ordinary OAuth checks pass before and after. The fixed
device-grant source matches the pinned upstream commit and source archive; no
new invalid-device or token-bypass reproduction was performed.

Native isolated checks cover Authentik account/TOTP and OAuth/OIDC operations;
TRIP's two-account trip lifecycle and native OIDC factory with a mock transport;
and SimpleLogin accounts, alias CSV import/export, native crypto, OAuth,
HTTP/SMTP greeting and synthetic database dump/restore. Fresh temporary databases
contain only fictional data. No email was sent. Mock identity transport is not
evidence that a real external identity provider works, and this run does not
claim fresh browser/MFA/device coverage.

Production health/routes passed. SimpleLogin's public 503 remains intentional;
its private login returns 200. No registration or public-access setting changed.
The first Authentik preparation attempts correctly waited for the five-minute
post-backup restart guard; no bypass was used. Repeating apply after deployment
preserved all container IDs and start times. There was no database migration.
Rollback uses each previous image/configuration pin in private
`security-20261109/oauth/release.json`; it does not undo subsequent user edits.

The upstream advisory identifies the device-server issue in versions >=3.3.0.
Debian's tracker nevertheless attributes it to its 3.2.2 packages. A separate
read-only review checks every installed dpkg Python file on the host and Kuma,
confirms absence of server device-grant/endpoints modules, and exercises ordinary
client request construction. Only those two exact records receive seven-day
component applicability decisions; their raw findings remain. The earlier
identity-binding backport is independently retained and verified.
Primary references checked 10 November:
[upstream advisory](https://github.com/oauthlib/oauthlib/security/advisories/GHSA-3jp2-3mrg-2vxc),
[fixed commit](https://github.com/oauthlib/oauthlib/commit/77a5f1c8ce00da2b0b8c5f6e9cc129920085f114),
and [Debian attribution](https://security-tracker.debian.org/tracker/CVE-2026-49272).

The same frozen Trivy database reports three fewer high findings and no new
high/critical findings in these images. The completed 04:52:36 UTC fleet scan
covers 109 images, 175 containers and 107 source inputs. After exact-image
revalidation and the narrow applicability reviews, **0 critical / 79 high
records remain pending**. Raw records remain **24,488 total, 65 critical /
3,047 high**. Pending high scopes: 42 runtime image, 22 tracked build inputs,
one mounted runtime lock, two upstream release locks and 12 host packages.
These are package/target records, not unique vulnerabilities or a clearance.
Evidence: private `security-20261109/oauth/` and `after-oauth-reviews/`.

Thirty dedicated release-policy tests and 22 existing ancestry/triage tests
pass. Exact input/fixture/source checks, approval, file scope, successful native
journeys and same-database scans are required by the reusable release mechanism.
Future builds retain the new wheel/version in both SimpleLogin requirement files.
A completed Yopass Go build cache was cleaned using Go's native cache command,
after confirming no active build or container depended on it. This recovered
449 MiB; sources, module caches, artifacts, rollback images and backups remain.

## Symfony and relay driver corrections — 10 November

Wallabag and Pollaris now use the exact compatible upstream ExpressionLanguage
parser from 5.4.54 and 7.4.21. Only that PHP file changed in each image. The
complete depth fix is included; earlier partial upstream corrections were not
selected. Eighteen ordinary expressions pass before/after. Wallabag passed two
isolated accounts, private article storage and JSON export; Pollaris passed two
independent Chromium sessions, poll creation/voting, CSV export, deletion and
worker startup. No excessive-depth crash reproduction was run. Pollaris's first
release preparation waited for its normal worker restart to satisfy the existing
five-minute stability gate. Production health/routes subsequently passed.

Both PairDrop and Galene relay containers now contain the native Mongo C driver
cursor correction. The exact two-patch sequence applies to retained authenticated
source and preserves prior OCSP/BSON corrections. All 1,710 exports and linked
features remain. The complete image comparison permits only libmongoc to change;
libbson, libmongocrypt, the relay executable and configuration remain unchanged.
Ordinary old-header client checks pass before/after. Isolated UDP/TCP/TLS transfer,
authentication, quotas and private-peer denial pass. Each release checked for
active allocations and control connections before restarting its own relay.
This does not establish actual MongoDB-server compatibility, external-NAT/device
coverage or throughput. No migration, account, access, quota or retention change.

The initial isolated compiler lacked development dependencies; after obtaining
exact APT packages, a build-directory RUNPATH was also rejected. Both issues were
corrected before staging/release. No production feature was disabled to force
compilation. Compilation ran with no network, bounded RAM/CPU and temporary RAM
storage. A BuildKit attempt interpreted the local image ID as a registry name;
that failed metadata lookup is recorded. The final build used the exact local
legacy builder without registry resolution.

The same frozen advisory database found no new high/critical records in these
candidates. Preserved version metadata means raw source-package attributions
remain; they require exact live-payload review rather than a fabricated version
bump. The source offers were downloaded through the public HTTPS route using
curl and matched their checksums. Python urllib received 403 on its attempt, so
this is not a claim that all automated clients are allowed by the edge.

- [Symfony source, 63,562 bytes](https://tools.utilibre.org/utilibre-source/security-symfony-20261109-source.tar.gz), SHA256 `a57098ea59f6549a08c536e5382f82be934369f47b29d1af2af3d08abefafe71`.
- [Mongo C driver source, 6,940,655 bytes](https://tools.utilibre.org/utilibre-source/security-mongoc-20261109-source.tar.gz), SHA256 `c3c974ba1cf1bdc4bfe460e9f6ffcb1df1f95080c4f7fa83019c80f727e48a72`.

Rollback uses the exact previous image/configuration pins in private
`security-20261109/symfony/release.json` and `mongoc/release.json`. It does not undo
subsequent user changes. Repeating apply is checked against container identities
and start times. Focused release/source/component policy tests: 72 passed.
Primary sources checked 10 November: [Symfony's complete-fix advisory](https://symfony.com/blog/cve-2026-109449-unbounded-nesting-in-the-expression-parser-lets-untrusted-expressions-crash-the-process),
[Mongo C driver correction](https://github.com/mongodb/mongo-c-driver/commit/4fdc5d553801fcde7bd5c86370917cc4ac704f54),
and [Debian attribution](https://security-tracker.debian.org/tracker/CVE-2026-120956).

The final scan completed at **05:34:58 UTC**, covering 109 images, 175 containers
and 107 source inputs, with no unrechecked targets. Exact current-image source,
package and component revalidation leaves **0 critical / 63 high records pending**.
Raw counts remain 24,488 total, 65 critical / 3,047 high. These are package-target
records; repeated raw attributions are not unique exploitable vulnerabilities.
The review set contains 86 exact, seven-day decisions; no raw record was removed.
Overlapping util-linux decisions use the narrower component-absence finding.
The shared completed-release traversal also replaces the remaining chronological
assumption in the MariaDB reviewer; its explicit subset avoids authentication
probe execution. Twenty-six additional vendor policy tests and 12 existing release-lineage tests
pass (110 focused tests total for this follow-up). Repeated apply preserves all five container
identities/start times. Evidence: private `after-followups-reviews/`,
`followup-idempotence.json`, and `followup-source-public.json`.

Remaining high records: 29 image ACL plus one host ACL; 22 historical x/net
build-input records; five host GRUB; two host SQLite; two Grist Deno/Hickory
source-lock records; one Kuma Markdown; and one WBO zlib. Historical locks are
not rewritten to manufacture scan results. WBO's candidate is held to preserve
RAM-only user boards. Host maintenance gates and the earlier ACL/GRUB review
restrictions remain. The separate application assessment still has 29 held
upgrades; this release does not claim those applications were upgraded.

The remaining Kuma Python-Markdown record was rechecked against the
[Debian tracker](https://security-tracker.debian.org/tracker/CVE-2019-25781)
on 10 November: Bookworm, Trixie and unstable remain listed as vulnerable, with
no fixed package recorded. No unreviewed parser rewrite or oversized-input
reproduction was substituted for an approved upstream repair.

## Whiteboard and host SQLite closure — 10 November, 05:54 UTC

WBO's zlib 1.4-r0 candidate is now deployed. The previously held board-loss
condition was resolved by verifying an empty temporary store and zero active
connections at preparation and immediately before replacement. No production
board content or peer identifiers were inspected or retained. The existing
RAM-history rehearsal was extended to the exact old/candidate image IDs and
passed drawing, reopening, further editing and rollback using fictional data.
Nine idle-gate checks and 13 zlib-policy checks pass. Native runtime checks,
full image scope, frozen-database candidate assessment and live release health
gates also passed. Repeating apply preserved container identity/start time.
The runtime-only retention model and abuse-report link remain unchanged.

The host now uses `libsqlite3-0 3.46.1-7+deb13u2+utilibre2`, the same exact native
archive already verified for the Trixie application images. No host process had
the library loaded at release gates. The existing host release adapter verifies
the previous rollback archive, complete installed package, all exports and
linked dependencies, and permits only that one package to change. Fifteen
ordinary queries/transactions/FTS/UTF-8 and synthetic backup/restore/deletion
checks pass before and after, without network access as an unprivileged user.
Services and unrelated packages remained unchanged. Repeated apply performs no
installation. The protected local-package update rule remains in place.
No new vulnerability reproduction or production user database was used.

- WBO release: `2026-11-10T05:47:00.469Z`, image `sha256:6bbc458f700d5ea70d731eecd05ddd100d2c54e104aed7b4ee046961c568f771`.
- SQLite library SHA256: `bf6c657d8c2201d1d62f2bcdb3cff071b08728117d8eaae9f91e2edefb620c47`.
- SQLite package SHA256: `fb3eede99d50e07a20fd97294fd4669ce1777748c9f92b5e7fc5de3c8e1d20ad`.

The post-release scan completed at **05:54:41 UTC**, covering 109 images,
175 containers, 107 source inputs and host packages. Three exact host SQLite
reviews preserve the prior rowid repair and verify the two new corrections.
The pending queue is **0 critical / 60 high**, comprising 30 runtime-image,
22 historical build-input, two upstream-lock and six host records. Raw findings
remain 24,486 total, 65 critical / 3,046 high; they are not unique exploitable
vulnerabilities. Nothing was suppressed, and the new reviews expire after seven
days. Lower-severity and unknown findings remain separately in the private queue.

Evidence: private `security-20261109/after-wbo-host-reviews/`,
`host-libraries/{prepared,release,review,reviewed-batch}.json`,
`zlib/collaboration-pilot-wbo/board-rehearsal.json`, `zlib/release.json`,
`wbo-idempotence.json` and `wbo-idle-tests.log`.
The host and WBO previous artifacts remain retained. A rollback must repeat
consumer/idle checks and does not recover content created after a release.
The rest of the maintenance queue is not claimed complete: ACL/GRUB restrictions,
historical x/net inputs, Grist's source locks, Kuma Markdown and 29 held application
upgrades remain as recorded. This follow-up did not reboot the VM, send email,
change access/retention rules or add public services.
