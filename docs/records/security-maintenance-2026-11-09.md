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
A new complete scan was started after all these replacements; the older 420-high
checkpoint must not be presented as the current outcome before it completes.
The additional SQLite follow-up is isolated candidate work, not deployed.
