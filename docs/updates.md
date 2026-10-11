# Updates and rollback

Updates are deliberate, one service at a time. Production uses immutable
version/digest pins; Redlib is built from an exact source commit and pinned
base images. SearXNG has the guarded, daily updater below; other services
remain reviewed rollouts. Production never runs a floating `latest` tag.

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
