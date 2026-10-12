# Operator work queue — reconciled 12 October 2026

## Current boundary — 12 October, 01:55 UTC

The root disk is expanded: **170 GiB device / about 168 GiB usable**, with
approximately **24 GiB free** after the builds. The separate 15 GiB temporary
disk, PrivateBin allocation and backup exclusion are unchanged. No reboot,
user-data deletion or rollback-image removal was needed.

Ten further application groups / **13 roles** are deployed and healthy:
Wishlist, Spliit, Rallly, Kuma, Grist, RSSHub, restricted SimpleLogin, FerretDB,
Anubis and both Authentik roles. The host OpenSSH client lifetime backport is
installed with its two coupled packages; existing keys/configuration are
unchanged. Wallabag's existing OTPHP backport was independently reverified.
[Exact versions, native checks, limitations and recovery](../deployment/maintenance/closure-review/README.md).

The complete **01:49:19 UTC** scan covers 109 images / 175 containers,
510 host packages and 55 source manifests. Raw: 42 critical / 2,777 high
package-target occurrences. After exact, expiring payload/component reviews:
**3 critical / 1,627 high remain pending**, all without a scanner-reported
fixed version. **Zero pending critical/high records have a reported fixed
version.** This closes the earlier 48-record known-fix batch; it does not mean
zero vulnerabilities or verified non-exploitability. Version-unchanged signed
backports are verified against real payloads, not ignored by package name.

Remaining boundaries:

1. **Vendor-unfixed/exposure review:** the three host LMDB critical records
   remain visible. Dependency high records, compiled Deno/WASM inventory limits
   and separate Proxmox/edge coverage remain. The running kernel's unused ksmbd
   defect is separately documented; reviewing `linux-libc-dev` headers does not
   patch the kernel. Keep the mitigation and wait for a compatible kernel update.
   SimpleLogin's legacy-framework restriction remains; no public activation.
2. **Independent schedule:** GitHub still showed no genuine scheduled run newer
   than `38174272872` (11 October, 20:56 UTC) at 01:46 UTC. Workflow is active;
   cron refresh and one disable/re-enable did not establish autonomous delivery.
   Do not clear this alert using a manual run or same-VM monitoring. No provider
   root cause is established. Review GitHub's next real `schedule` completion.

The source addendum is published and its public HTTPS SHA-256 matches. Existing
application source offers are retained. No Caddy change is required.

01:55 checks: all **112 upstream provider lookups** completed with no reopened
published application-advisory disposition; this is separate from dependency
scanning. All **59 status monitors / 105 catalogue endpoint probes** and eight
public entry points passed. All 175 production containers remain running.
EN desktop/ES mobile-emulated guide and catalogue journeys passed without
outside browser requests. The final read-only alert check reports only the
dependency queue and the two independent-monitor freshness conditions above.

**02:00 publication check:** release `07f5388` is pushed. The integration source
was published from a clean detached copy of that commit; both public archive
checksums match local artifacts. External GitHub run
[`38194093893`](https://github.com/mycelibre/utilibre/actions/runs/38194093893)
passed on that commit. It is **workflow_dispatch**, not `schedule`: it resolves
the recent-manual-run freshness condition, not the autonomous scheduling gap.

## Previous boundary — 12 October, 01:03 UTC

The tested native/vendor/installer batch, all twelve final Go repairs and five
patch-level follow-ups are deployed. Bookplate, Candlr, DeGoog, Projects and the
Penpot admin component passed their native and exact-image rollout checks.
Matching source offers are published and their HTTPS hashes verified.
[Final release and validation](updates.md#maintenance-release--12-october-2026).
The previous checkpoints below are history, not pending redeployments.

The owner subsequently authorized the held Rustpad/Docker restart. Rustpad's
auditable build and Docker 29.9.0/containerd 2.4.1 are deployed. All 175 running
containers were restored, 11 stopped containers left stopped, and native
collaboration/relay/firewall checks passed. The 01:00:15 scan completed normally;
Rustpad now exposes 191 compiled Rust packages to the scanner. The incomplete
image/failed-scanner warning is closed, not suppressed.
[Release and recovery](../deployment/maintenance/host-final/README.md#docker-and-rustpad-release--12-october-2026).

The remaining work is specific:

1. **Dependency follow-through:** final scan covers 109 images, 175 containers,
   510 host packages and 55 source manifests at 01:00 UTC. Pending: 5 critical /
   1,675 high package-target records, not proven exploits. 1,632 have no
   scanner-reported fixed version; 48 still need compatible dependency updates or specific
   exposure/payload review. Keep vendor-unfixed and compiled Rust/WASM coverage
   limitations visible. Application-advisory review itself is current: 112
   providers, no reopened advisory or unavailable lookup.
2. **Independent schedule:** one cron-offset refresh is pushed (`0496567`);
   require a genuine GitHub `schedule` completion before clearing the overdue
   warning. Manual success is not sufficient.
3. **Build reserve:** root has about 8.2 GiB free; do not cross the 8 GiB floor
   or remove rollback images/user data to manufacture a clean warning state.

Wakapi's exposed OIDC client secret was rotated and verified rejected afterward;
only its app restarted, on the same image. Keep the replacement credential on
code rollback. Private incident recovery copies are not public source material.
No Caddy change is required for this maintenance release.

No VM/kernel reboot was performed. The restart exposed and fixed a PairDrop
firewall boot dependency on interactive Node; the policy itself is unchanged.
All endpoint probes passed again after startup. Older Rustpad-hold notes below
are historical checkpoints, superseded by the release above.

The follow-up removed eleven pending fixed-version high records through actual
patches or exact reviewed applicability. The remaining boundaries are itemized
in [the dependency classification](../deployment/maintenance/remaining-fixed-boundaries-20261012.md).
That table preserves its original 59-record checkpoint; completed rows have
subsequent release notes. This is not a claim that all security work is complete.

PrivateBin directory follow-up, 21:51 UTC: the official directory now shows
**file upload ✔** for `https://paste.utilibre.org/`. The script-filename repair
restored native version detection. Public encrypted 25 MB upload/download/hash
checks pass; one-week maximum and sanitizer retained. This listing item is
closed, not waiting for another configuration change.
[Evidence and rollback](../deployment/utilibre/privatebin-security/README.md).

## Active security/quality follow-through — 11 October

Latest release, **23:22 UTC**: the native XML/SQLite/Penpot repairs, supported
Grist Deno/Pyodide sandbox, host JWT/XML packages, both relay client libraries,
27 installer-only images and four remaining app-library layers are deployed.
Native task, access-isolation, backup/restore and image-identity gates passed.
All release-only Grist QA accounts were retired. [Current release and exact
boundaries](updates.md#native-maintenance-checkpoint--11-october-2026).

At 23:41 UTC the four remaining npm 10 installer images (Projects, Kuma, Grist
and Gathio) also passed native checks and were deployed. The 13-image / 17-role
signed PCRE/OpenSSL batch followed at 23:54 UTC, and Rimgo, Galene, SafeTwitch,
GotHub and AnonymousOverflow's five compatible Go rebuilds at 23:57 UTC.
The final seven Go targets are still being built/verified; the 23:22 scan below
is a checkpoint, not the final result for that later work.

Current scan: 109 images / 175 containers, 510 host packages and 31 source
manifests; raw **42 critical / 2,979 high occurrences**, not proven exploits.
The private queue separately records exact patched-payload and binary-component
reviews with seven-day expiry; no broad suppression or clean-security claim.
Rustpad's owner has not yet confirmed their pad is saved: keep Rustpad, Docker
restart and reboot work on hold. Remaining vendor/major-library findings and
compiled Rust/WASM inventory gaps remain explicit. PrivateBin uploads/listing
are already closed; do not reopen that work.

The 112-provider application-advisory review passed with no reopened advisory.
Tool endpoint checks pass. A fresh external manual check passed, but GitHub's
automatic availability schedule is overdue despite being enabled; its separate
warning remains. Re-downloadable test/build caches restored the disk warning
margin without deleting images, user data or recovery copies.

Earlier checkpoints below preserve the sequence, not current deployment status:

Current continuation: PrivateBin PHP, six Valkey caches, ntfy/Kittygram/DeGoog
vendor libraries, Linkding Python libraries, 11 PostgreSQL privilege-dropping
helpers, Addy/MariaDB, Gathio/DocumentDB, Penpot runtime inventory and hardening,
PairDrop HTTP/WebSocket libraries, Chhoto's auditable binary, FMD/Yopass Go
runtimes, and compatible Kuma/Actual dependency repairs are deployed. Actual's
tested emergency rollback preserves its new privacy fixes as well.
Wishlist and Newsletters also run the tested same-version Caddy compiler/x/net
repair, preserving their native applications and guarded SMTP ingress.
Native fixtures and scoped restored-account-data checks passed. Rustpad's
auditable candidate passed two-client tests but its live process currently has
an in-memory document; do not destroy it just to clear the inventory warning.
Final scan at 22:19:04 UTC covers 109 images / 175 containers, 510 host packages
and 29 source manifests: 55 critical / 3,276 high raw occurrences, not proven
exploits. Only Rustpad lacks live inventory; all source scans completed.
After exact expiring review/deduplication, 40 critical / 3,257 high findings
remain pending. The 112-provider application-advisory review is current with
no pending published application advisory; it does not clear dependencies.
Root has about 12 GiB free after reproducible build-cache cleanup.
See [final evidence and rollback](updates.md#security-continuation--11-october-2026);
older counts below are historical checkpoints, not current fleet totals.

Earlier parallel release: Penpot **2.18.3**, Kuma **2.5.6**, 67 shared gateway/static
wrappers, all 11 PostgreSQL vendor layers, Authentik/Opengist/LiberaForms and
private SimpleLogin have deployed patch receipts and bounded native checks.
EN/ES software disclosures are live. The stricter scanner correctly leaves
Penpot backend OS inventory incomplete at that checkpoint. The later tested
public Debian runtime restores genuine OS inventory without pretending to be
the inaccessible DHI base. Legacy framework, old Grist sandbox/toolchain and
other dependency findings remain open. See [current release and limits](updates.md#parallel-security-release--11-october-2026).
Earlier checkpoint counts below are historical, not post-release totals.
The independent availability workflow now has a confirmed successful **scheduled**
run, `38174272872` (20:56:11 UTC); the earlier unobserved-cron blocker below is
closed. Full upstream review at 21:17 checks 112 providers and 342 published
GitHub advisories with no pending application-advisory dispositions. Ten
non-GitHub providers retain manual-primary-source coverage, not automated
advisory clearance. Dependency findings remain a separate open queue.
Final 21:18:50 scan: 109 images/175 containers, 510 host packages, 20 source
manifests; 61 critical/3,406 high raw occurrences, not exploitability counts.
Penpot OS and Chhoto/Rustpad binary inventory are incomplete. The conservative
queue also retains older not-rechecked artifacts; do not compare its combined
total with complete-scan totals. All deployed patches are documented, not all
dependency findings resolved. Root has approximately 14 GiB free after build
cache cleanup; no image/data/backup deletion.

Daily runtime image/OS/lockfile scanning, eight synthetic task workflows, weekly
representative restore, operator digest and off-host availability/relay checks
are implemented and have run. The four new host timers are enabled. Scanner
execution failures and omitted targets were repaired; the later stricter gate
correctly reports Penpot's missing OS inventory as incomplete. Historical
Penpot/Yopass advisory alerts have exact version-bound dispositions.
[Latest release, coverage limitation and rollback](updates.md#parallel-security-release--11-october-2026).

First remediation batch: 41 shared gateways plus 18 static runtimes updated to
nginx 1.30.5; application-file hashes preserved. Kuma's same-version official slim
image removes unused Chromium/MariaDB after isolated native restore/login tests.
RSS-Bridge's unchanged application now uses 60 updated Debian security packages;
staged/live feed output and egress restrictions passed. Its scan changed from
57 critical/216 high to 3 critical/74 high. The 32-bit-only OpenSSL issue has
exact-image ELF64 evidence and expiring reviews. The 19:47 UTC checkpoint covers
109 images/175 containers, 510 host packages and 13 source manifests;
**67 critical/3,682 high package-target findings remain pending**, not proven exploits.
The additional deployed batch covers both coturn relays, internal RSSHub, Gathio's
DocumentDB runtime, PrivateBin's sanitizer, Bookplate, PairDrop, Wishlist, Kuma,
six Debian runtimes, Authentik/Linkding Python libraries and Actual/Grist/Kuma's
proxy-address library plus Grist's Handlebars/Piscina/shell-quote patches.
[Exact scope, tests and rollback](updates.md#security-follow-up--11-october-1947-utc).
Daily upstream coverage now includes Authentik and three other companions, 112
providers total; published application-advisory reviews are separate from the
still-open dependency queue. No alert is waived merely to reduce its count.

**Still open:** Rustpad's tested auditable image must wait for safe handling of
its live memory-only document. The private vulnerability queue needs staged package/application
remediation; a working scanner is not a clean security report. Prioritize shared
remaining app libraries and establish reachability: Grist/runsc, precompiled
SSR/browser bundles, the private SimpleLogin pilot, FerretDB's disabled MCP
module, and vendor-unfixed OS libraries. The additional Rallly XML, installed
Resume/Penpot Seroval, Penpot backend, Kuma and FerretDB runtime patches are
deployed with bounded native tests; [latest evidence and limits](updates.md#library-patch-continuation--11-october-2026).
Host-level updates require their own rollout gate.
Latest checkpoint, 20:45:52 UTC: **51 critical / 3,525 high** remain pending
across 109 running images/175 containers, 510 host packages and 19 source
manifests. Rallly/Kuma/Resume/Penpot/FerretDB plus Wishlist/JupyterLite patches
are deployed. Independent GitHub scheduling still has no observed scheduled
run; a manual availability check does not establish automatic execution.
Do not bulk-update stateful
apps or remove alerts without evidence. Non-GitHub advisories, physical-device
checks and rotating restores for other account services remain operator work.
External notification inbox receipt and the next actual scheduled GitHub run
are not inferred from manual runs. No further public apps were added.

## Maintenance-only closeout — 11 October

Owner request: finish the latest queue's **1, 4–6**; no further installations.
Earlier identically numbered historical queues below are not this scope.

| Item | Completed work | Boundary |
| --- | --- | --- |
| 1 — Root-disk cleanup | Removed eight reviewed disposable build-dependency directories, npm download cache and old unused Docker build cache. Root went from 93%/11 GiB free to 88%/18 GiB free; stayed at 88% after release builds. | No images, rollback copies, live assets, source, account data, backups or temporary-disk content removed. Dependencies can be rebuilt from retained pins. |
| 4 — Maintenance | Daily bounded upstream release/published-advisory review covers 108 catalogue providers, including all eleven ready additions; existing alerts cover stale/failed reviews and new high/critical advisories. FreshRSS updated to 1.30.1 after staged restore, login and article export/import checks. | No automatic bulk upgrades or security certification. Non-GitHub advisory and dependency/image checks remain part of manual release review. SearXNG's existing guarded updater is unchanged. |
| 5 — Usability | Visible example/guide links on supported cards, eight concrete launch labels, explicit Grist/Candlr/Bookplate/FreshRSS login guidance, and direct guide return/practice/steps navigation in EN/ES. | Existing access rules unchanged. Native SearXNG/Redlib return links verified; no injected cross-app overlay or upstream fork. Chromium desktop/mobile emulation is not physical-device certification. |
| 6 — Visibility | Checked five pending GitHub and three Codeberg requests; Kittygram has an approving review but remains unmerged. All 196 canonical pages passed public SEO checks; IndexNow accepted 26 changed/new URLs with HTTP 200. | PrivateBin directory's upload marker still needs the upstream rescan; no duplicate submission. Bing still shows the older successful 168-URL fetch. Google sitemap acceptance is owner-confirmed, indexing/performance not measured here. |

Release: `public-utility-portal:0.1.0-maintenance-20261011`, image config
`sha256:f0643df2848af0c0a91e52f50bc841304f99b33c5296aab0de70cc5052fa065c`.
Portal is healthy. Only portal and the explicitly reviewed FreshRSS security
update were redeployed; no new application, account enrollment or edge change.
The runtime maintenance timer is an operator check, not a new visitor service.

Checks: production build, typecheck/lint, 120 existing unit tests, four new
maintenance tests, SearXNG pagination/redaction checks; two public EN/ES journey
runs covering account disclosures with keyboard, nine example/guide links,
actual practice download, preserved anchors/new-tab tools, direct return and
200% text reflow. Tested at 1366px desktop and 390px mobile emulation; screenshots
inspected. No external browser requests or page errors in those journeys.
The Impeccable polish guidance kept existing typography, palette and controls;
no design-system exception or unrelated sidecar edit was made.

Evidence: `/opt/utilibre/reports/maintenance-20261011/`; maintenance report
`/var/lib/utilibre-maintenance/latest.json`. FreshRSS staged restore and native
export/import evidence, exact image pin and rollback are in [updates](updates.md).
Existing five-minute monitor read-only check reports all 59 observed monitors
and resource thresholds healthy. This is a fresh check, not uptime history.

Portal rollback: set **only** `PORTAL_IMAGE` in the root `.env` back to
`public-utility-portal:0.1.0-creative-20261011`, then from this repository run
`docker compose up -d --no-deps --pull never portal`. The old image and private
environment copy are retained in `/opt/utilibre/releases/maintenance-20261011/`
and Docker (`public-utility-portal:rollback-maintenance-20261011`). Do not restore
the whole environment over unrelated changes. No portal data migration occurred.

Unselected work remains separate: recovery-generation housekeeping and real-
device compatibility checks. Graphite/microStudio stay withheld and expansion
is paused; neither becomes an install task without a new owner request.

## Creative and personal-record applications — 11 October

Eleven additions are deployed with 22 EN/ES guides, fictional editable examples,
source offers, catalogue/privacy records, status probes and scoped Kuma monitors:
Grist, Candlr, Bookplate, OpenReel, OpenPlan3D, Blockbench, Glyphr Studio, JSCAD,
Kiri:Moto/GridSpace, FossFLOW and VvvebJs. The first three require approved/existing
accounts; the others process the documented workflow in the browser. Native
account-data backup/isolated restore and an encrypted Storage Box generation pass.

Graphite is withheld because the required branded assets forbid our modified
build without permission; microStudio is withheld for legacy authentication and
dependency issues. Their reserved gateways return 503, not working applications.
No upstream message or listing submission was sent. Candlr email delivery, real
mobile hardware, long-video and physical-printer tests remain unverified, not
promised. See [release, exact pins, privacy patches, tests and rollback](creative-batch-2026-10-11.md).

## LibreSpeed and LaTeX/chat review — 11 October

LibreSpeed Go 1.1.6-p1 is installed at `https://speed.utilibre.org/` (Spanish
`/es.html`, private port 3225), with bilingual catalogue/help/guides and a native
health probe. No telemetry, IP/ISP lookup, results database or visitor identifiers.
The initially restrictive speed/request throttles were removed after the owner
reported inaccurate measurements; native measurements remain subject to shared
server capacity and a six-request concurrency ceiling. No outside-line speed
accuracy claim follows from the passing LAN/HTTPS-edge functional tests.

TeXlyre 0.13.0-p1 is now installed at `https://latex.utilibre.org/`, with native
browser compilation, PDF download and editable ZIP export/import verified.
The first Recommended compilation needs approximately 227 MiB of compiler and
package assets plus the editor; the owner chose to retain browser compilation.
No remote collaboration, server account, server document storage or cloud backup.
[Deployment, bilingual guides and checks](texlyre-2026-10-11.md).

LibreSpeed's native timing now uses a full 15-second window rather than the
shortened adaptive run. Controlled 150 ms/300 Mbps emulation did not reproduce
the owner's low throughput. Their final result was 69.45 Mbps down / 28.58 up,
150 ms ping, 12.8 ms jitter after a temporary Caddy send-buffer increase. Revert
that inconclusive experiment to `4096 16384 4194304`; owner confirmation remains
outstanding. No claim that the external-path performance issue is fixed.

**07:17 UTC follow-up:** actual packet-delay testing identified a reproducible
transport constraint: at about 151 ms, HTTP/1.1 reached 618 Mbps down / 586 up,
versus HTTP/2's 224 / 59. HTTP/3 download was 213. These are controlled LAN tests,
not promised outside results. The speed-only Caddy ALPN/Alt-Svc fix is now active:
an HTTP/2-capable curl negotiated HTTP/1.1 with `Alt-Svc: clear` on the actual
edge at 07:27 UTC, with normal TLS validation. The owner's latest result is
150.86 Mbps down / 41.94 up, 158.10 ms ping and 0.12 ms jitter. Remaining outside
throughput is unresolved. They use Ethernet, Firefox and Chromium with Tailscale
connected for management. Exit node is `None`; Windows resolves `49.12.84.228`
and selects `Ethernet` for that destination. A fresh automatic-protocol Chromium
run at 07:38 UTC, through the real edge with 150 ms isolated client packet delay,
reached 799.56 Mbps down / 596.32 up using HTTP/1.1. All 61 backend responses were
200; backend/gateway CPU quotas did not throttle. This is controlled LAN evidence,
not the owner's WAN path. The owner subsequently reported HTTP/1.1 in their
browser. No new production tuning; path congestion/loss remain unmeasured.
Do not disconnect Tailscale.

**07:51 UTC independent Internet check: complete.** The owner authorized one
manual GitHub-hosted test from Azure `eastus2`. Public DNS/HTTPS reached the real
public edge, without a LAN override or artificial delay: **859.14 Mbps down,
318.52 Mbps up, 93.40 ms ping, 0.10 ms jitter**. HTTP/1.1; all 52 observed test
responses 200; no outside application requests, page errors or browser storage.
[Run evidence](https://github.com/mycelibre/utilibre/actions/runs/38122737099).
The reusable workflow is manual-only, time-bounded and stores only synthetic
results in its job log. No visitor instrumentation or production changes. The
owner's lower throughput is not explained by a universal 150 Mbps server cap;
its exact path/endpoint bottleneck is still unproven. No concurrency/ISP-capacity
promise follows from one external run.

Overleaf CE is not suitable for unrestricted untrusted users without additional
compile isolation. Public IRC/XMPP deferred: no defined community/account need,
and an extra gateway adds moderation/upstream-network responsibility. Umami was
not installed: visitor analytics, including self-hosted/cookieless analytics,
conflict with the owner's explicit no-tracking policy.

Exact decisions, sources, checks, limits and rollback:
[LibreSpeed/LaTeX/chat record](librespeed-latex-chat-2026-10-11.md).

## Temporary-disk expansion and allocation — 11 October

Owner enlarged VM144 `scsi2` to 15 GiB and requested 10 GiB for PrivateBin plus
5 GiB for other temporary services. The existing ext4 filesystem was expanded
without reformatting, and native project quotas enforce those two ceilings.
Chess, Anubis and SearXNG share the latter pool. Existing records, ownership,
expiry, 25 MB upload limit, missing-disk protection and saved-work backups remain
unchanged. `prjquota` is persisted in the host and recovery fstab definitions.
Physical filesystem overhead and PrivateBin's 1 GiB margin still reduce usable
upload space; no dedicated-block reservation or whole-VM reboot test is claimed.
See [allocation and recovery](../deployment/utilibre/docs/PRIVATEBIN-STORAGE.md#10--5-gib-allocation).

At 05:33 UTC, 20 focused tests and all four live checks passed: PrivateBin's
25 MB upload/download/hash/deletion; chess multiplayer and spectator permissions;
Anubis native challenge; and EN/ES SearXNG results over the private HTTPS edge.
No portal rebuild, new app release, account-data change or Caddy change was needed.

## Requested queue items 1 and 6 — temporary-storage / documentation closeout

**1 — Applied and verified:** Family Chess's expiring database, Anubis's challenge
store and SearXNG's cache now share the excluded disk with PrivateBin. Consistent
copies preserved bytes/ownership/modes; obsolete root-disk copies and the empty
old cache volume were removed after functional checks. Eighteen selected
temporary-data containers now have zero swap allowance; fifteen were updated
without restart, preserving RAM-only data. Saved account work and all 24 native
backup groups remain unchanged and validate. No retention or capacity increase.
Exact scope, tests, recovery, core-limit rollout caveat and remaining mixed-store
exception: [backup policy](backups.md#other-temporary-services--11-october-2026).

**Remaining classification dependency:** Newsletter messages and ongoing feed
settings share one database. Its existing mixed backups remain protected until
a settings-only recovery path is reviewed or the owner explicitly elects to lose
feed recovery. This is not silently marked as an all-services exclusion.

**6 — Documentation reconciled for publication:** the existing Codeberg PRs,
Google acceptance confirmation, Caddy runtime confirmation and owner-confirmed
historical cleanup are recorded. No new submission or maintainer message was
sent. Publish this change through the normal GitHub/source-offer release process;
the commit history is the publication record. Unrelated sidecar/TRIP/export work
is excluded from the release.

The following dated checkpoints remain historical evidence, not new blockers.

## Privacy evidence and navigation closeout — 11 October, 00:47 UTC

| Item | Current disposition |
| --- | --- |
| 1 — Caddy/privacy | Owner supplied post-change runtime output confirming `http.log.access` / `http.log.error` exclusions. Earlier output has access logging, trace and credential logging off. The exclusions cover the default logger across sites, not an automatic Utilibre hostname filter. Cloudflare's three Skip rules, Utilibre Web Analytics and NEL were independently rechecked off; Logpush remains owner-reported unused. This does not certify provider-internal retention. |
| 1 — Backup boundary | **PrivateBin migration completed, 11 October 01:35 UTC:** owner added a 10 GiB VM144 `scsi2` and confirmed exclusion from Proxmox backups. Guest disk identity/empty state verified before formatting; mounted by UUID at `/opt/utilibre/temporary`. Existing encrypted records copied and hash/ownership/mode verified while stopped; old root-disk copy removed after public 25 MB download/decryption check. Missing storage fails closed, headroom is now 1 GiB, container swap is disabled. Configuration-only recovery and expiry cleanup pass; saved-work backups/timers unchanged. Host exclusion is owner-confirmed, not independently queried. `backup=0` does not exclude ordinary VM/ZFS snapshots or erase old copies; other temporary services were not migrated. [Storage/recovery procedure](../deployment/utilibre/docs/PRIVATEBIN-STORAGE.md). |
| 1 — Temporary secret / historical retention cleanup | **Closed on owner confirmation, 11 October:** the owner says item 3 of the latest chat queue (temporary GitHub secret removal and older log/backup retention review) is already done. Earlier API 403s are historical, not a reason to keep asking for deletion. No independent post-deletion API proof or record-by-record erasure evidence was supplied; do not infer universal erasure or a change to saved-account backup policy. |
| 4 — Enlarged-text navigation | **Deployed and production-verified.** The header now follows document text size through container queries. Long guide words can wrap. EN/ES navigation, keyboard menu, languages and no-JavaScript fallback pass without horizontal overflow at the tested sizes. No framework, dependency, app setting, font or palette changes. |
| 5 — Blocked readers/SimpleLogin | No privacy-compatible upstream repair established. The existing bounded reader evidence remains: provider denials for Genius/Fandom/Imgur, and no verified public-use permission for LibreMDB's selected backend. SimpleLogin release/master were rechecked unchanged on 11 October; its legacy-framework gate remains. Working LRCLIB and Addy remain available. No challenge bypass or new provider. |
| 6 — Search/listings | Google sitemap acceptance is owner-confirmed. Bing API still shows verified ownership and successful older 168-URL sitemap fetch. Five pending GitHub requests remain open. **11 October Codeberg submissions completed:** GotHub PR222, Kittygram PR100 and TransLite PR31 are open after fresh native workflow checks. SafeTwitch's repository is archived; no submission there. Mezzo still needs separate Gitfield access. PrivateBin's upload marker matches its directory scanner, but the directory still shows the old setting; its check form cannot refresh existing rows. No duplicate submissions or unchanged IndexNow notifications. Exact request links and evidence are in the submission record. |

Release: `public-utility-portal:0.1.0-navigation-reflow-20261011`, only `portal`
recreated, healthy. Typecheck, lint, Docker production build, **118 unit tests**,
**22 configuration tests** and **three Playwright tests** pass. The latter
cover EN/ES at 1280/960/390/320px with root text at 200%, plus no-JavaScript
keyboard/navigation behavior, on candidate and live production. Additional live
EN/ES light/dark and ordinary/enlarged screenshots were inspected; canonical,
language, real 404, no observed external HTTP requests and no script errors pass.
This is Chromium desktop/mobile viewport emulation and text enlargement, not a
physical-phone or every-browser claim. Private evidence and build/test logs:
`/opt/utilibre/reports/queue-closeout-20261011-8qA6VI/`.

The Impeccable adaptation guidance kept the existing design and menu semantics;
no design-system exception was added. Unrelated sidecar/TRIP/export-script work
was preserved. The disposable review container is separate from production.
Rollback: set only `PORTAL_IMAGE` to
`public-utility-portal:0.1.0-pairdrop-relay-20261011`, then run
`docker compose up -d --no-deps --no-build portal`. The private pre-release
environment is `/opt/utilibre/navigation-release-VJ77Cp/previous.env`; do not
overwrite unrelated environment values or restore account databases for this
CSS-only rollback. Source publication uses committed files from a clean worktree.
Details: [privacy](privacy.md#separate-caddy-vm), [backups](backups.md),
[submissions and prepared entries](public-instance-submissions.md#prepared-submissions--not-sent).

## PairDrop relay activated — 11 October

The owner confirmed persistent Proxmox forwarding and the existing Hetzner IPv4
allow rule. The separate coturn service now listens on TCP/UDP 3479 and TLS TCP
5350, with UDP relay ports 49700–49731. PairDrop uses Utilibre-only STUN/TURN;
its server-readable WebSocket file fallback remains disabled. Galene's running
relay, ports and process were preserved. No new Caddy block is required.

Fixed the firewall hook's nonexistent service name, persisted the UID boundary
before Docker restart, and allowed only the port-bounded native self-relay path.
An initial failed external check was rolled back during diagnosis; final exact-byte
file tests passed externally over UDP, TCP and TLS, plus one relayed/direct pair
exercising the public UDP relay ports. Local direct transfer, private-peer denial,
TLS/authentication, eight-allocation/ninth-refused quota and independent UID
firewall checks passed. Certificate copying is idempotent. PairDrop and relay
container logging are disabled; separate edge/provider retention is not inferred.

Versions, fixed limits, public test-run links, effective startup dependencies and
data-preserving rollback: [relay deployment](../deployment/community/turn/README.md).
Real phones and two independently restrictive client networks remain untested;
configured bandwidth ceilings are not achieved throughput or a capacity promise.
The bilingual catalogue/help/transfer guide release is live, commit `4ca145c`,
image `public-utility-portal:0.1.0-pairdrop-relay-20261011`. Build, lint, typecheck,
118 unit tests and 22 configuration-validator tests passed. Live Chromium checks
passed for EN at 1280px and ES at 390px: card/help keyboard disclosure, correct
PairDrop actions, language/canonical, guide text, sample download (195 bytes),
normal-width overflow and no observed external HTTP requests/script errors.
Candidate and live screenshots were inspected. Physical-phone compatibility is
not implied. Evidence: `/opt/utilibre/reports/pairdrop-release-Hof7AS/live.json`.

Separate existing interface limitation: doubling only the root text size at
1280px overflows the unchanged desktop navigation; the guide text and 390px
mobile layout fit. No CSS or design-system changes were made for this relay
release. The text-resize observation is retained rather than claimed as a pass.

Portal rollback: select the retained image
`public-utility-portal:0.1.0-privatebin-uploads-20261010` in `PORTAL_IMAGE` and
recreate only `portal` with `docker compose up -d --no-deps --no-build portal`.
Preserve all other current environment values. Its old direct-only PairDrop copy
would need reconciliation if the relay stays enabled. Private pre-release
environment: `/opt/utilibre/pairdrop-portal-release-wxsRNP/previous.env`.
Relay rollback is independent and documented in the deployment README; no
user documents or transferred files need restoration.

The preceding checkpoint below is historical: item 2's forwarding and external
relay-test dependency is now closed. Items 4, 5 and 6 retain their stated external
dependencies; this activation did not broaden their scope.

## Previous checkpoint: requested items 2, 4, 5 and 6 — 10 October, 23:22 UTC

This was the disposition of those four items, not a claim that upstream
or external-access dependencies have disappeared.

| Requested item | Implemented / independently checked | Exact remaining dependency |
| --- | --- | --- |
| 2 — PairDrop TURN | Fixed the old Galene port collision and coturn implicit private-address exception. Prepared an independent capped relay, UID firewall, certificate copy/renewal hook, native RTC override and manual external test workflow. Local certificate/authentication/private-peer/quota tests pass; loopback forced relay and the live direct PairDrop file journey pass. | Router/NAT forwarding of 3479 TCP/UDP, 5350 TCP and 49700–49731 UDP to 10.10.1.43, then actual external UDP/TCP/TLS file tests. Public PairDrop is still direct-only; no relay-ready claim or catalogue change. |
| 4 — Blocked services | Original upstream revisions rechecked; one bounded failing-media/search request per known path. Working LRCLIB and Addy preserved. SimpleLogin's latest release/master still contain the legacy framework. | Genius IPv4/IPv6 403, BreezeWiki image 403, Rimgo media 429; LibreMDB needs permission for its selected data backend; SimpleLogin needs a maintained compatible framework repair. None is closed as fixed. |
| 5 — Search/listings | Sitemap/proof/robots HTTP 200; 170 live sitemap entries. Bing API says verified and successful older 168-URL fetch; no crawl-stat rows available. ntfy merged; BiblioReads accepted; DeGoog/BiblioReads present in LibRedirect generated data. Existing requests preserved. | Google Search Console authenticated status; Codeberg/Gitfield write access; PrivateBin directory refresh; upstream review of remaining submitted requests. No duplicate submission or unchanged IndexNow notification. |
| 6 — Privacy cleanup | Owner disabled logging on the new sitemap skip rule; independently confirmed all three Skip rules, Web Analytics and NEL off. Corrected checker catches policy violations, with nine passing tests. Caddy native logging snippet validated locally and supplied. | Running separate-Caddy configuration still inaccessible. Both GitHub Actions secret listing and the exact temporary-secret deletion return 403; MUMBLE_TEST_SERVER_PASSWORD removal awaits operator confirmation. Live Mumble password is not changed. |

Current relay configuration and rollback: [PairDrop relay](../deployment/community/turn/README.md).
Listing URLs/results: [submissions](public-instance-submissions.md).
Detailed blockers: [readers](frontend-reliability-2026-10-09.md) and
[SimpleLogin](../deployment/simplelogin/security/README.md).
Search evidence: [SEO follow-up](seo-catalog-2026-10-09.md).
Caddy filtered read-only verification: [privacy](privacy.md#separate-caddy-vm).
GitHub secret location: https://github.com/mycelibre/utilibre/settings/secrets/actions .

No portal build, user-data migration, registration change, public listing message,
new application dependency, third-party relay or Caddy remote deployment was
performed. The public application configuration is unchanged. Both separate
relay test containers were stopped after testing; only the disposable review
container auto-removed itself, with no user-data deletion. Production activation
remains explicit. Sanitized Cloudflare evidence is retained privately at
`/opt/utilibre/reports/cloudflare-privacy-20261010-final.json`.

## Disk expansion and PrivateBin uploads — 10 October, 22:22 UTC

Online root expansion completed using the existing 150 GiB virtual disk:
filesystem 128G → 148G, available 13G → 32G, usage 90% → 78%, no reboot or
data deletion. RAM was 12 GiB used / 34 GiB total / 21 GiB available; reclaimable
cache was not application usage. See [resource evidence](resource-usage.md).

PrivateBin now accepts 25 MB total attachments through native browser encryption,
with sufficient ciphertext/body headroom, a low-disk creation safeguard, bounded
PHP resources and native minute-by-minute expired-record cleanup. Maximum expiry
is one week; default remains one day. Saved account backups remain enabled;
new temporary-content backups remain excluded. Public 25 MB create/download/hash/
deletion, lifetime, EN/ES metadata and isolated server-size/purge/recovery checks
passed. Details and data-preserving rollback: [upload release](privatebin-uploads-2026-10-10.md).
The official directory's upload check still needs its own rescan. No duplicate
listing request, new account, tracker, Storage Box application mount, Caddy change
or upstream application image was introduced.

Portal EN/ES catalogue, privacy and guide copy are included in this release.
Build/lint/typecheck, 118 unit tests, 22 launch checks, seven upload admission
tests, two backup-policy tests and four focused catalogue browser checks passed.
Release `4bec1b8` is deployed as
`public-utility-portal:0.1.0-privatebin-uploads-20261010`; portal and PrivateBin
are healthy. Live EN/ES card/help/guide/action, keyboard disclosure, canonical,
language and overflow checks passed at 22:23 UTC with no observed external
requests or script errors. Desktop/mobile-emulation screenshots inspected;
evidence: `/opt/utilibre/reports/privatebin-portal-release-8nwkX9/result.json`.
Portal rollback: select `public-utility-portal:0.1.0-temporary-backup-policy-20261010`
and recreate only the portal, preserving other environment values and backend
data. The old portal wording would need reconciling with the live attachment
setting. Private environment copy is alongside the backend rollback evidence.
GitHub and the existing integration-source offer receive the committed source;
no real paste content or test sharing/deletion keys are published.

## Temporary-content backup policy completed — 10 October, 21:59 UTC

Owner confirmed that saved account work keeps recovery backups. New core
snapshots exclude PrivateBin payloads; guest chess snapshots keep settings only.
Existing live pastes/games, earlier backups, account data, upload limits and
expiry settings are unchanged. The off-host selector rejects old content-bearing
core/chess generations, preventing them from being copied again. All 24 groups
validate with the new selection; no new off-host upload or historical deletion
was forced during this change. The daily timer and its retention remain active.

Ten archive/selector/retention tests, native empty-store PrivateBin configuration
recovery and a fresh-schema chess multiplayer/cleanup fixture passed. Portal
lint/typecheck/build, 118 unit tests and 22 configuration tests passed. Live
EN/ES catalogue disclosures and guides passed keyboard/metadata/overflow checks
in Chromium at 1280px and 390px (emulation, not a physical phone); screenshots
were inspected. No external browser requests or script errors were observed.
Private evidence: `/opt/utilibre/reports/temporary-backup-copy-k7JbRW/result.json`.

Release commit `d744c50`, deployed image
`public-utility-portal:0.1.0-temporary-backup-policy-20261010`; only the portal
was recreated and is healthy. Private pre-release environment:
`/opt/utilibre/temporary-backup-policy-mO4J77/previous.env`. Previous portal image:
`public-utility-portal:0.1.0-wallabag-status-20261010`. To roll back a broken
portal, select only that previous image and run
`docker compose up -d --no-deps --no-build portal`; do not overwrite newer
environment settings or revert backend exclusions. Its old privacy copy must
be reconciled before treating the rollback as a finished release. Source
publication retains its preceding archive under `/opt/utilibre/source-update-*`.
No Caddy or upstream application image changes are needed.

**Separate remaining boundary:** externally managed whole-VM snapshots may
still include temporary files. Exclude them at that layer or separate temporary
storage onto an excluded disk before claiming a universal no-backup policy.
Existing mixed backups require their own exact-target retirement decision;
they were not erased here. See [backup policy and evidence](backups.md).

## Storage Box isolation completed — 10 October, 21:28 UTC

Owner-authorized API setup created one backup-only subaccount restricted to the
existing encrypted application repository. Dedicated SSH key; SMB/WebDAV and
access from outside Hetzner disabled for this account only. Four sibling-path
denials, own-directory write/read/delete, existing 94-file restore/hash checks
and an isolated Authentik restore passed before switching. The installed backup
job then passed using the restricted account, with the existing retention policy.
API/admin rollback credentials are masked from that job; no API credential is
needed for scheduled backups. Exact evidence and data-preserving connection
rollback are in [the Storage Box procedure](../deployment/storagebox/README.md).
No per-app storage mounts, hard quotas, PrivateBin uploads or box-wide setting
changes were introduced. Future app storage requires its own supported backend
and isolated credentials, not reuse of this encrypted backup repository.

## Items 1 and 2 completed — 10 October, 21:02 UTC

1. **Backup/monitoring publication and bounded status checks: complete.** GitHub
   commits `d01bec5` and `198cc65` publish the reviewed native backup setup,
   credential-free connection template, scoped retention and read-only alert
   check, then the portal release. Seven backup/retention tests and all 24 live
   group selectors pass; private connection/key files were preserved. The daily
   off-host timer remains enabled. Portal probes now run at most six at once.
   A deployment-time Docker inventory race was repaired with one bounded retry
   and output-redacted failures; nine collector tests and a real service run pass.
   This is operational monitoring, not visitor analytics.
2. **Wallabag public workflow and catalogue launch: complete.** Normal public
   HTTPS passed password/MFA login, article save/read/reload, JSON/TXT/PDF/EPUB
   export, deletion, separate-account isolation and logged-out denial. Public
   registration remains closed; the catalogue places it under approved accounts
   with the existing request route. EN/ES guides are live at
   `/en/guides/save-articles` and `/es/guias/guardar-articulos`. Text-only browser
   reading, server-readable libraries, retained backups and the locally patched
   2.7-dev package are explicitly qualified, not described as an upstream stable
   release or end-to-end encryption.

Production portal image `public-utility-portal:0.1.0-wallabag-status-20261010`
is healthy. Final public checks passed at 21:01 UTC: both languages, desktop and
390px mobile emulation, account-only placement, request links, no-JS guide,
metadata/sitemap, genuine 404, and 93 bounded status observations including
Wallabag. No outside browser requests or script errors appeared in this check.
The separate native reader check is documented in
[Wallabag deployment](../deployment/pack/wallabag/README.md). Portal unit tests
118/118 and launch-validator tests 22/22 passed. No Caddy change, registration
change or unrelated app restart was required. Exact release and rollback notes
are in the same deployment document. Physical mobile devices were not tested.

Next remain items **3 and 4** below: isolated clean-machine recovery and the
owner's physical-device checks. Those are not implied complete by this release.

## Storage and cleanup checkpoint — 10 October 2026

This checkpoint supersedes older storage-deferred and blanket image-retention
statements below. Encrypted off-host copies of 24 native backup groups now pass
download/hash verification and an isolated Authentik database restore. Daily
09:15–09:20 UTC scheduling is enabled with owner-approved **7 daily + 4 weekly**
retention only for the new application repository/group. Existing whole-VM and
local-backup retention remain unchanged; full-machine recovery is not proven.

The two cleanup passes removed six reproducible dependency folders (about
4.7 GiB) and 77 reviewed obsolete images (another 5.12 GiB). About **13.34 GiB**
was available at the cleanup checkpoint, before the later portal build.
Running/stopped containers, current and documented rollback
images, user data and source archives were preserved. Exact scope and recovery
qualifications: [resource usage](resource-usage.md); scheduling/restore evidence:
[backups](backups.md).

Queue retained for continuity; the completed checkpoint above supersedes items 1 and 2:

1. Completed: backup/monitoring publication and bounded portal status release.
2. Completed: Wallabag's public workflow, isolation checks and account catalogue.
3. Rehearse clean-machine recovery when an isolated replacement environment is
   available: code/images, private settings/keys, restored state and separate
   Caddy configuration. Record actual coverage and time; do not infer success
   from GitHub or a single database restore.
4. Close the physical-device checks with the owner: FMD location delivery on the
   authorized Android device and Whisper recording quality/noise in Windows
   Opera. FMD's ring/map are owner-reported successes, not proven GPS delivery;
   Whisper remains a direct-URL pilot with its catalogue entry hidden.

Known upstream-media restrictions (Dumb, BreezeWiki/Rimgo), excluded candidates,
external listing decisions and physical print/device checks remain separately
qualified. No new services, registrations or directory submissions are part of
this cleanup.

## Later repair checkpoint — 9 October, 19:34 UTC

The later explicit Wallabag/Whisper repair request supersedes the historical
Whisper-withdrawal instructions recorded below only for its direct-URL pilot.
Whisper p7 is reachable at `https://transcribe.utilibre.org`; EN/ES synthetic
transcription checks passed, but the owner's Windows/Opera accuracy remains
unverified and the catalogue entry remains hidden. The later silent-recording
report received a microphone selector, native input meter, capture-filter changes
and a tested stereo-cancellation fix; simulated capture-to-Spanish-transcript
passes. The owner confirms much better capture, but reported low volume. P6
restores native automatic gain control explicitly: p5's echo-off setting had
implicitly disabled it in Chromium. The quiet synthetic recording comparison
and actual native-settings checks pass. The owner confirms louder capture but
reports humming. P7 adds optional browser-native noise reduction, initially off
to preserve the current capture mode, with a bilingual quiet/choppy-speech warning.
The synthetic comparison reduced hum and retained the sentence in both modes;
both misheard its greeting, so perfect recognition is not claimed. Windows/Opera
hum reduction with this optional switch remains for the owner to confirm.

Wallabag's pinned newer upstream source plus a two-file OTPHP security backport
is now packaged and deployed at `10.10.1.43:3177`, with native MFA/CSRF, account
isolation, actual article saving, exports, bounded egress and encrypted native
restore checks passed. Registration stays closed. The separate edge still
returns Cloudflare **525** for `wallabag.utilibre.org`: install the prepared block
in `deployment/pack/Caddyfile.pack`, verify real HTTPS login/assets, then publish
the account-service entry. Do not confuse a healthy backend with a public launch.
See `deployment/pack/wallabag/README.md` and the current `docs/service-pack.md`
checkpoint for exact versions, evidence, limitations and data-preserving rollback.

## Earlier consolidated queue

Consolidated from the operator's requests, including the English and Spanish
drafts. Draft assertions are requirements to verify, not evidence. Spanish copy
uses voseo. The 9 October instruction authorizes every eligible suggested app,
with concrete requirements-based exceptions. Finish installations and independent
verification first, then the catalog/SEO pass, then full copywriting. Reuse existing
apps where the requested capability is already delivered. Do not reopen completed
work without a new failure or changed scope.

| Work | State and next step |
| --- | --- |
| Additional requested batch, 9 October | Installed and publicly verified. Reuse installed Super Productivity, Moodist, Spliit and KitchenOwl. Rustpad, downloadable The One File Core, single-file TiddlyWiki and the tracking-free Moocup build are installed at the existing tools host; public native checks and source downloads passed. Their EN/ES catalog entries and guides are live in the additions1 release. TRIP1.50.1-p2 now passes public desktop/mobile native access and rendering, including a bounded real map check; matching source and public catalog entries are released. Bounded storage, approved-user access, provider notes and previously tested exports/recovery are retained. External maps are not described as local processing. Addy forwarding and PMG signing now pass the owner-confirmed inbox check; reply delivery is also owner-confirmed; Projects public access now passes. Those additions have EN/ES guides, evidence and catalog/SEO integration in the recorded releases. |
| Further explicit installation batch, 9 October | Installed and publicly verified. AutoRedact, Knit, NewTon and Gravity are installed with public native checks and source offers; their EN/ES catalog entries and guides are live. Family Chess is installed with resource/cleanup/backup controls; native two-player, spectator, live-update and mobile checks passed through the public Caddy edge. Beaver and Donetick native account, isolation, deletion and networkless restore checks passed; their public HTTPS account/workflow/desktop/mobile checks now pass; Kokoro is publicly installed; EN/ES speech generation, downloads, profile deletion and mobile checks passed with traceable rebuilt eSpeak source. Its catalog entry and EN/ES guide are live in additions2. Original scope: AutoRedact (browser OCR/local assets), Beaver Habit Tracker (normal accounts, no trusted-email bypass or analytics), Donetick (separate circles, no reset-link logs), Knit, NewTon (FOSS core only, no sharing API/proprietary directory), Gravity (local assets), Family Chess (session isolation, cleanup, bounded creation), and Kokoro Web (static browser inference, local licensed models/voices, no tracking/version/badge requests). Install each eligible application; earlier suggested priority/pilot order is not an exclusion. Every deployment needs pinned evidence, native checks, EN/ES voseo catalog/guide and source/recovery records. Do not activate Whisper or alter existing backup retention. |
| Galene repair, TURN and heavy workload test | Complete. See `capacity-2026-10-08.md`: four participants per group, four concurrent groups recommended initially; eight synthetic groups passed bounded UDP and TLS tests. Earlier signaling disconnects remain unexplained. Only the community group is provisioned. |
| Rallly critical RCE | Upgraded from 4.15.3 to digest-pinned 4.15.4. Running Next.js 16.3.8 verified, database schema unchanged, public login and benign preview passed. See `security.md`. |
| LibRedirect submission, after Galene | Seven additional GitHub instance requests submitted; DeGoog and RSS-Bridge were accepted. Redlib/SearXNG and five other requests remain under upstream review. LibRedirect has not refreshed these into its generated list. Codeberg/Gitfield authentication remains separate. See `public-instance-submissions.md`. |
| Straightforward account and invitation access | Delivered using native app access and the portal; see `account-access.md`. Preserve distinct FMD/LiberaForms/Galene accounts and existing FreshRSS closure. |
| Small, reproducible, removable source patches | Inventory and apply/reverse audit delivered; see `source-patches.md` and `deployment/source-patches.json`. Review again when updating affected upstreams. |
| Precise translation, notification, challenge and shared-link privacy | Reviewed against deployment and native flows; see `privacy.md`. Do not erase qualifications about edge retention, browser-delivered code or recipient copies. |
| Capacity and recovery | Measurements and isolated restore checks documented in `capacity-2026-10-08.md` and `backups.md`. Latest portal test: 2,000 requests, zero errors, visit p95 1,121 ms, above the 1-second soft target; this is not a fleet-wide capacity guarantee. Offsite backup remains operator-deferred; full-host recovery time is unmeasured. On 9 October the operator chose to keep all backup schedules/retention unchanged while arranging storage; about 14 GiB free was observed then; roughly 6 GiB remains during the current builds. Only disposable build files, inactive task-specific images and package-download caches have been removed; approximately 7 GiB remains after that cleanup. No backup deletion/expiry change is authorized by this review. |
| PairDrop repeated retention answer | Complete. Shared answer builder removes identical repeated paragraphs in both languages. |
| Best for / Limitation | Complete. Optional localized fields, separate Best for / Ideal para labels and verified constraints; no description/help fallback. Reviewed QR formats, Pollaris management access, draw.io export and Excalidraw collaboration. |
| No-JS and slow-JS navigation | Complete and live. Essential mobile navigation remains available before hydration, including status/tool shells; unavailable controls are hidden. Production EN/ES keyboard, no-JS and delayed-JS checks passed. |
| Precise SPDX identifiers | Complete where evidence supports precision. Ambiguous grants use explicit human descriptions, not guessed SPDX suffixes. Remaining upstream grant questions are listed in license-review.md. |
| Direct-instance navigation | Native More tools links; preserve each app identity, no tracking or forced redirects. See `instance-navigation.md`. |
| Awesome Selfhosted | Not eligible yet: no published Utilibre release; upstream requires the first release to be more than four months old. Contributions must be human-authored/submitted. No PR sent; see public-instance-submissions.md. |
| Empty taglines / positioning | Complete and live. Localized meaningful defaults and a measured data-transparency section below the task finder; no unsupported comparison with competitors. |
| Frontend reliability and rights posture | Complete and live. Bilingual interruption and substantiated-complaint wording; actual bounded caches documented rather than removed. |
| Frontend noindex | Complete on intended active frontend gateways, including LRCLIB. Public responses and crawler directives checked; Binternet verified through the edge because VM public hairpin fails. Catalog and guides remain indexable; noindex is not access control. |
| Private security disclosure | Root security.txt, EN/ES policy, expiry build check and contacts live. GitHub private reporting enabled; mail recipient route verified without sending. The earlier 55 HTTPS subdomain redirects were verified, including operator-applied imports. Public redirects from the five new stateful hosts were verified9 October against the root security contact. See security-discovery.md. |
| Anonymous-tool abuse and retention | Complete. Accurate native storage/deletion limits and private manual intake, acknowledgment/decision templates in abuse-handling.md. Inbox receipt/monitoring owner-confirmed; no explicit mail/backup expiry configured. Provider defaults and delegated access remain unverified. |
| Hosting jurisdiction and consolidated retention | Complete and live. Application and edge VMs share the same physical Hetzner host in Germany, owner-confirmed. Provider/edge retention remains explicitly unverified. Consolidated table uses catalog notes; no operator establishment inferred. |
| Leaving / shutdown / exports | Complete and live for ten stateful applications, including Reactive Resume and Penpot. Exact native scopes and performed/unperformed checks in your-data guides and data-verification.md. Planned closure is conditional; local browser storage/download persistence corrected. |
| Warranty / acceptable use | Complete and live. Bilingual plain service expectations and mandatory-rights caveat; unresolved operator identity/legal drafting remains unpublished. |
| Resource limits | The 8 October baseline covered 101 running containers. New service projects have explicit CPU/RAM/process/storage bounds in their dated deployment records. That historical count is not a claim about the expanded current fleet. No current heavy-capacity guarantee follows from idle limits. |
| Rate limits and abuse controls | Existing native SearXNG limiter, Redlib Anubis and per-tool gateway ceilings retained and documented. Normal workflows and bounded native rejection checks recorded in security/capacity notes. No indiscriminate new challenges. |
| Performance and observability | Complete. Existing caching and CPU worker fixes retained; operational logs bounded by size or discarded, aggregate resource monitoring uses no visitor analytics. Exact external retention remains unverified. |
| Email aliasing / temporary email | Newsletter ingestion is public and tested with the owner’s routed message. Addy native forwarding reached the owner’s Gmail inbox on 9 October, with SPF, DKIM and DMARC all passing; PMG signs using selector `pmg`. Its native reply-authentication repair is deployed and seven isolated Postfix/Rspamd cases pass, including forged headers and temporary DNS/scanner failure. The native reply was authenticated, returned through PMG and received in the monitored admin inbox, owner-confirmed. The local queue is empty. Public registration is closed and the verified owner alias is preserved. SMTP2526/2527 accept only10.10.1.20; all backup retention is unchanged. SimpleLogin p6 remains private because obsolete-framework findings require a maintained update. See the dated mail records. |
| Link tools | Complete and public/catalogued: browser-only URL Parameter Cleaner, Chhoto URL 7.8.3-p3 shortener with no click writes, and Unfurl 2026.10-p1 redirect/URL inspection with bounded outbound controls. Native tests, public flows and applicable isolated restore checks are recorded separately. Existing private opener/Outlook decoder retained for their different functions. See the dated deployment records. |
| Password / passphrase generator | Complete and live. Two insecure native token generators fixed with WebCrypto, sources published; seven-guide batch includes verified local password and BIP39 phrase routes. Reload old tabs and replace passwords made by affected old generators. |
| Markdown export / syntax paste | Complete and live using native HTML conversion, browser Print → Save as PDF, and PrivateBin syntax display. Fictional code paste created/read/deleted; no duplicate paste service. |
| EXIF inspection | Complete and live. Native Image Scrubber metadata viewer verified with fictional metadata. CyberChef Extract EXIF remains blocked by strict CSP and is not recommended. |
| File inspection / hash verification | Complete and live. Native CyberChef file-type/SHA-256 guide checked with exact fictional bytes; limitations of hashes stated. |
| 13ft | Complete and public/catalogued at read.utilibre.org, 0.5.0-public1. Public fictional native POST/EN/ES browser checks, restricted outbound proxy/namespace/DNS/private-address controls and bounded HTML rendering passed. No redirect/login/JavaScript/archive fallback or persistent article cache. The 8 October fixture-only pilot is historical; see 13ft-deployment-2026-10-09.md. |
| Open with Utilibre example | Complete and live: r/selfhosted in both English and Spanish, verified on public guide pages. |
| Status coverage | Additions2 public check on9 October returned 86 observations, covering all 86 enabled entries, including the five newly public browser tools. Kokoro's missing exact-target allowance was corrected;10 targeted status tests passed. The public-pilots release enables Family Chess, Donetick, Beaver, Projects and TRIP, for91 enabled entries. Beaver’s native root307 points to /login; the bounded public probe now checks that exact200 login page instead of misreporting the normal redirect. Known unavailable/degraded catalog qualifications remain separate from HTTP/TCP observations. These checks do not establish complete workflows or voice quality. |
| Reactive Resume visitor counters | Corrected live in 6.0.0-p1. Identifier/deduplication and new view/download statistics disabled; native sharing/export and scoped restore passed. Historical real records preserved; portal disclosure and source link live. See reactive-resume-privacy-2026-10-08.md. |
| Install every eligible suggestion — 9 October override | The preceding batch delivered 23 public additions, including Razzia/Chhoto/Unfurl/13ft and the newsletter receiver, with bilingual guides and recorded native checks/restore scope. The newly requested batch above is installed and publicly checked; access restrictions remain documented. Addy forwarding/signing now pass; the native reply also reached the monitored inbox, and SimpleLogin p6 retains a framework-security blocker; PLANKA and ZipCaptions have evidenced requirements exclusions. The maintained FOSS Projects alternative passed public native account, isolation, file-sharing and desktop/mobile checks. Current checklist: service-candidates-2026-10-08.md. |
| PrivateBin Google description and favicon | Fixed and publicly verified9 October. Exact empty homepage has EN/ES title, description, visible introduction, canonical and Utilibre icons; paste/query/error URLs retain noindex and crawler exclusions. Native fictional encryption/decryption/deletion and desktop/mobile checks passed. Container image, encryption, storage, expiry and backup retention are unchanged. Small native-template patch applies/reverses; see `privatebin-discovery-2026-10-09.md`. Google recrawling/display is external and has not been claimed complete. |
| TRIP rendering check, requested after current work | Fixed after completing PrivateBin and the Caddy handoff. Native Angular inlineCritical=false keeps the stylesheet working under the existing strict CSP. Public native MFA/account, desktop/mobile map/settings/reload and service-worker update checks passed; saved preferences were preserved. Source and portal release integration are complete. |
| Caddy blocks for recent installations | Complete handoff: 24 unique service-host blocks in `deployment/utilibre/edge/Caddyfile.recent-services`, plus the existing five-host pending fragment. Core syntax passed in a stock-Caddy harness. Standalone public downloads were withdrawn after the owner questioned their exposure; hand off in chat/from the repository. After the handoff, all five public routes began responding: chess3214, chores3215, habits3216, projects3217 and trip3224. The 11:41 check returned native pages or the normal habits redirect; earlier525 responses are historical. All five public workflow checks have passed; portal launch links are live. Browser tools use the existing tools3103 route. |
| Final catalog and SEO update | The additions3 release is live with 102 catalog records, 65 bilingual practical guides and 160 canonical pages. Kokoro, Family Chess, Donetick, Beaver, Projects and TRIP are enabled with launch controls after public workflow checks. The public-pilots release retains102 records,65 bilingual guides and160 canonical pages. All 160 public SEO checks, 97 unit tests and six guide/browser cases passed. Newly requested account services are integrated only after their native checks. Live full metadata/canonical/hreflang/structured-data/initial-guide-link audit passes; every enabled tool has a public catalog launch and software-inventory mention. Stale audit path list/size ceiling corrected using the existing registry, with 21 relevant tests passing. All 22 addition entry pages pass noindex; three gateway robots corrections are deployed. The operator purged only the bookmarks robots URL; its canonical response and protected API were verified at 03:02 UTC on 9 October. See seo-catalog-2026-10-09.md. No analytics, external submission or ranking promise. |
| Sitewide voice/copy implementation | Complete for accessible canonical sources and deployed in copy1 on 9 October. Reviewed all 87 catalog records (29 updated), all 50 guides (32 updated), 324 EN/ES dictionary keys and supported native notices. Voseo, factual boundaries, literal controls and sensitive commitments retained; optional personality added on Home/About/Support. Build/lint/typecheck and 95 unit tests pass; all 74 browser cases pass across the full run and six corrected-label rechecks. Public 130-page SEO audit and EN/ES no-JS navigation pass. The native2 follow-up deployed the your-data intro layout fix without changing reviewed wording, and Authentik EN/ES email templates, PairDrop’s bilingual return label, and LRCLIB/TransLite/Chhoto/newsletter notes. Vikunja Settings and Rallly footers now have native EN/ES catalog links; Donetick wording and scoped account-session deletion are repaired. WBO p3 landing punctuation is live after verified temporary-state preservation; unsupported native navigation/languages and provider facts remain documented in copy-coverage-2026-10-09.md. No tracking, dependency or custom writing backend added. |
| Copywriting style supplement | Part of the later voice task, not a new priority. Apply the 9 October supplement to all new copy: plain concrete verbs and nouns; varied sentence/paragraph/section rhythm where useful; no em dashes, empty announcements, generic authority claims, canned reassurance, repeated abstract contrasts or self-congratulatory closers. Read the assembled page once for repeated patterns. Apply selectively rather than enforcing sentence lengths, rare words, asides or emotion quotas. Preserve meaning, factual qualifications, consistent technical terminology, literal UI/actions and approved policy text; do not invent experiences, evidence, uncertainty or mistakes to simulate a human author. Spanish remains voseo under the owner's explicit standing instruction. |

Do not reactivate the withdrawn Whisper tool or submit known-broken frontends. A 9 October reconciliation found its old direct host still serving the app; the origin was replaced with a 410 withdrawal notice and old app assets were blocked. Historical source remains available.
Public listing acceptance, physical Android tests, remote-edge changes and
offsite disaster recovery must remain explicitly distinguished from local work.

The correction addendum overrides earlier queued drafts; the operator’s later
Spanish instruction overrides its tú wording: always use voseo. Unknown facts
leave only dependent claims pending, never the whole implementation.

## Public rendering follow-up, 9 October

Links: Chhoto7.8.3-p3 is deployed. Both CSS files had loaded, but the bilingual instance notes inherited absolute toolbar positioning and overlapped the form. The small separate layout patch places them below the form with responsive spacing and a versioned CSS URL. Actual public Chromium checks passed at1280,390 and320px, light/dark themes, native login dialog, fictional Shorten/clipboard/307 redirect and exact native deletion404. No outside assets or browser errors. The prior image, database backup and source archive are retained; expiry and backup retention are unchanged. Evidence: `chhoto-deployment-2026-10-09.md` and `/opt/utilibre/reports/chhoto-rendering-20261009`.

Public-pilots verification: portal build,97 unit tests, all six desktop/mobile guide cases and160 public canonical-page checks passed. A focused12-test status suite also covers Beaver’s exact login probe and rejects arbitrary substituted paths. The public EN desktop/ES mobile catalog has all five new launch links, with no overflow or page errors. Security-contact redirects pass on all five hosts. A test-run development watcher exhausted inotify and a simultaneous Docker build interrupted browser connections; the completed guide run used polling and two browser workers after the image build. These test-harness incidents required no production setting change. Matching rollback environment/compose and the old portal image are preserved. Remaining owner-controlled mail/signing, off-host storage and provider-retention checks are unchanged.

Final public release check: all91 enabled entries have status observations, and each of the five newly activated services reports operational. This is a readiness observation; separate native workflow evidence is linked above. The release image is `public-utility-portal:0.1.0-public-pilots-r2-20261009`; its reviewed integration source uses revision `20261009-public-pilots-final`.

## Completion follow-up, 9 October

- **PrivateBin:** operator-applied deferred HSTS/nosniff headers now pass publicly. Observatory scan126795844 returned A+,150/100, all12 checks passed. Native fictional create/decrypt/unkeyed/deletion flow passed after the change; file uploads remain disabled. See `privatebin-discovery-2026-10-09.md`.
- **DeGoog:** Settings404 and sparse web search are repaired. Four native engines now separate Web, Books and IT; public desktop/mobile, Spanish results, no-JavaScript form, proxied thumbnails and saved preferences passed. Google CSE involvement and bounded cache durations are disclosed in both languages. See `degoog-search-2026-10-09.md`.
- **Native navigation and wording:** Vikunja Settings and Rallly footers now offer both catalog links through supported controls. Donetick p3 fixes the empty-state copy and native account-session deletion. Eight other apps have verified native customization limits; they are not waiting for an unperformed settings check.
- **FreshRSS recovery:** a retained database/files snapshot restored in isolation, with native browser login and the fictional feed/article listing visible in6.1s. This is an operator restore check, not a full-host recovery or article-export migration claim.
- **Mumble:** external run37933469692 passed a pinned/authenticated encrypted UDP silence loopback without TCP fallback. The operator-added temporary Actions secret can now be removed; current API permission does not allow secret management. See `mumble-udp-verification-2026-10-09.md`.
- **BreezeWiki:** native tabs are repaired. Image requests still receive upstream403. Rimgo's checked video receives429; neither is a stale cached failure. LibreMDB private search/images pass, but permission covering the selected data endpoint's public use is unverified. See `frontend-reliability-2026-10-09.md`.
- **SimpleLogin:** p7 retains the p6 fixes and adds 33 hash-pinned runtime package updates; native token/PGP, CORS, auth/CSV/SMTP/restore/delete checks pass. The remaining legacy-framework findings keep it private.
- **Shortener assessment:** Kutt's native account-link creation queues visitor analytics without a global disable in the reviewed source. It does not meet the current rule. Chhoto remains publicly functional; no duplicate service or link migration was performed. See `chhoto-kutt-review-2026-10-09.md`.
- **WBO:** completed in p3. The scoped memory-based update preserved the existing board exactly; public EN/ES, two-session drawing/reconnect/export and fixture-cleanup checks passed. The matching source is public. See `wbo-ram-update-2026-10-09.md`.
- **Scheduled backups:** the actual Donetick unit completed with integrity/foreign-key checks after its earlier p3 fix. Spliit's unit pointed to a nonexistent Node path; the scoped correction passed a scheduled run and disconnected PostgreSQL restore. No failed systemd units remained after those runs. Both schedules and every retained backup are unchanged.
- **Public native checks:** Spliit and linkding now pass their full fictional create/export/delete workflows through the public edge; linkding also passed native import and exact checked-field recovery. Fixtures were removed and linkding's test identity retired. Spliit's outside flag-image attempts are blocked by CSP, not hidden from the evidence.
- **Reactive Resume account export:** the installed p1 image passed native account ZIP download and extracted-resume JSON import into an independent fictional account, content/design comparison, private sharing after import, edit/reload, access denial and native account deletion. Both isolated accounts/containers and the temporary network/relay were removed. Whole-account migration, letters, nonempty job applications and image bytes remain outside this bounded check. See `reactive-resume-account-export-2026-10-09.md`.
- **Penpot export/import:** the exact installed images passed a basic editable design archive round trip into an independent fictional account, browser edit/save/reload, account-access denial and native deletion. The temporary stack was removed. Team/library/image/font/history migration is not claimed. See `penpot-roundtrip-2026-10-09.md`.
- **FMD export:** native browser decryption, ZIP locations/image/metadata and scoped deletion now pass with fictional encrypted data. The four-expression p2 CSV fix preserves legitimate zero values; nonzero and absent-field checks also pass. Native EN/ES privacy wording is corrected, the matching source is public, and rollback data/assets are retained. No Android/push/account-ZIP-import claim is made. See `fmd-export-verification-2026-10-09.md`.
- **Source and portal:** the earlier native-fixes r3 release passed all160 public SEO checks. The subsequent queue-verified release includes the FMD p2 description, Penpot/FMD export results and36 additional dated task checks in both languages. Build, typecheck, lint,98 unit tests and the69-patch apply/reverse audit pass. Public desktop/mobile checks with and without JavaScript verify all38 changed task notes and both export sections, with no overflow, page errors or outside browser requests. No-JS search/keyboard navigation, delayed-JS hydration, policy pages and security.txt pass separately. That release used image `public-utility-portal:0.1.0-queue-verified-20261009` and integration source revision `20261009-queue-verified-final`; the later mail/provider release below supersedes it. Matching Spliit, FMD and Dumb public archives were hash-checked. The old image, environment, Compose file and source archives are retained for rollback. Evidence: `/opt/utilibre/reports/queue-completion-20261009/queue-public-rendered.json`, `queue-source-public.json` and `portal-queue-release.json`. A12:55 running-container check found CPU/RAM/process ceilings on all162 containers observed, including temporary verification containers; this is configuration evidence, not measured fleet capacity.

## Mail/provider release, 9 October

The `public-utility-portal:0.1.0-mail-provider-20261009` release adds the verified Addy service and bilingual native guide, precise translation/DNS/provider disclosures and pinned licence evidence. It also records Reactive Resume’s scoped account ZIP/import check. It serves92 enabled services and162 canonical pages. Build, typecheck, lint,99 unit tests, public EN/ES desktop/mobile notes, all162 SEO pages,92 readiness observations and no-JS/security checks pass. Addy’s native authentication-only configuration passed seven isolated cases and live loopback/SMTP-guard checks; the owner confirms both ends of the mail round trip. TransLitep3 bilingual provider notes are live. Public Addy, TransLite and integration source downloads match local hashes; Addy’s896 manifest files also match. Source revision: `20261009-mail-provider-final`. Evidence: `/opt/utilibre/reports/addy-forward-20261009/portal-release.json`, `completed-roundtrip.json` and `public-source-verification.json`. Existing images/configuration and backups are retained for recovery.

## Remaining dependencies and work in progress

- **Dumb repair:** the private f558107-p1 candidate fixes false-success/error caching, bounds the native cache to32MiB, and includes two upstream rendering corrections. Native offline regressions and loopback tests pass. The owner-supplied IPv6 address now has verified external connectivity; its Netplan configuration and tested VM-level firewall are installed persistently, with IPv4 unchanged. Genius search and lyrics still return403 anti-bot challenges over IPv6, as over the checked IPv4 path. A usable authorized Genius retrieval path or compatible upstream correction remains required before public activation. This does not prove an IP-only cause or universal failure. See `dumb-ipv6-readiness-2026-10-09.md`. The same upstream revision works on a checked public instance. Public LRCLIB remains available; the loopback-only native PROXY recipe is in `dumb-repair-2026-10-09.md`.
- **Alias mail:** native forwarding and the received message’s SPF/DKIM/DMARC passed the authorized test. Reply authentication is deployed with isolated positive/negative tests and live guard checks. The owner’s reply was authenticated and returned through PMG to the monitored admin inbox; receipt is confirmed and the local queue is empty. No duplicate message was sent.
- **Storage/recovery:** the owner is arranging disk space. All backup schedules/retention remain unchanged. Off-host backup destination/access, full-host recovery timing, physical Android/FMD checks and a folded Bookbinder print still require their respective infrastructure or equipment.
- **Facts:** exact edge/provider and mailbox/delegated-access retention, unresolved licence grants and unpublished operator/legal identity remain narrow factual dependencies. They must not become invented public assurances.
- **Discovery:** the existing upstream requests are monitored; Codeberg/Gitfield need separate access. Awesome Selfhosted requires a qualifying release age and human contribution. PrivateBin search metadata/icons are fixed; Google controls its refresh. No duplicate requests were sent.

PLANKA and ZipCaptions remain evidenced requirements exclusions; Whisper is withdrawn. Unsupported native link settings, third-party review and physical tests are distinguished from deployment work that can be completed on this VM.

## Export and deletion follow-up, 9 October

The additional native checks are recorded in `freshrss-article-export-2026-10-09.md`,
`rallly-csv-export-2026-10-09.md`, `wishlist-image-claims-2026-10-09.md` and
`liberaforms-export-formats-2026-10-09.md`. FreshRSS JSON/ZIP preserves the checked
article content/state but the web feed selection stops at 50; a larger native
operator export was checked separately. Rallly's organizer CSV preserves the
checked participant/time/vote columns and is not a complete poll import archive.
Wishlist's direct item deletion removes its image, but group deletion can leave
that image accessible. A second fictional member's reserve/purchase/unclaim and
delete-denial checks pass. LiberaForms' native browser export component passes
CSV/JSON/PDF reopening with fictional post-decryption table data, separately from
its earlier encryption and restore checks; this instance disables attachments.

EN/ES guides preserve these limits, use voseo and make no complete-account
migration promise. All new checks use isolated fictional state; no production
records, mail recipients, service settings or backup retention were changed.

CryptPad's isolated native personal/team export check also passed. Keys JSON has
no document bodies; the personal ZIP contains the tested Markdown, Rich Text HTML
and uploaded text file but omits the team document. The separate owner team ZIP
contains that document. HTML reopening and Markdown import into a second account
with reload passed. No complete drive/account, history or permission migration is
claimed. See `cryptpad-drive-export-2026-10-09.md`.

The export-guide release uses `public-utility-portal:0.1.0-data-fidelity-20261009`
and corresponding integration revision `20261009-data-fidelity-final`.
Its production build, typecheck, lint and 99 unit tests pass. Deployment and
public EN/ES desktop/mobile acceptance results are recorded separately under
`/opt/utilibre/reports/data-fidelity-20261009/`; source hash verification belongs
with that release evidence. The previous image, environment, Compose file and
source archive are retained for rollback. Service settings and retention remain
unchanged.

## Upstream/security/provider follow-up, 9 October

The user requested another repair pass. SimpleLogin p7 is now deployed privately:
33 hash-pinned runtime package changes and nine dependency declarations reduce
the inventory from 129 advisory groups across 26 packages to 30 groups across
eight. Native cryptographic and authentication checks, CSV, SMTP handshake,
backup/restore and prior-image schema compatibility pass. Flask/Jinja/Werkzeug
and five development/build/interactive packages remain flagged; public activation
is still blocked. No schema, provider or retention change.

Fresh reader checks preserve the distinction between local defects and upstream
refusal: Rimgo media returns 429 and BreezeWiki media returns a 403 challenge.
Those selected hostnames have no AAAA record; the working VM IPv6 route cannot
change their destination. Dumb's tested IPv6 requests remain challenged. Their
current upstream revisions match the installed pins. LibreMDB still needs
verified permission for its selected public data use. Existing local repairs
remain deployed or ready in private candidates. See the respective reader
records; no rotating proxy, external-instance relay or new provider was added.

Provider/licence evidence and public source publication are reconciled in
`license-review.md`, `privacy.md` and the matching release receipt. Exact denied
Cloudflare configuration checks remain distinct from verified DNS settings.

Four declared package licences now use precise SPDX identifiers: AutoRedact
GPL-3.0-only; FreshRSS, La Suite Projects and internal RSSHub AGPL-3.0-only.
Original component notices are preserved. The five contradictory ISC/MIT fields
and the other non-SPDX/absent declaration cases remain explicitly documented.
Cloudflare's token is active, but settings/rules/logging/analytics checks return
403; precise read permissions and a sanitized Caddy inspection command are in
`privacy.md`. Neither denied configuration access nor DNS-only evidence proves
provider log retention. The owner has been asked for the required read access.

The corresponding portal release is `public-utility-portal:0.1.0-upstream-facts-20261009`,
with integration revision `20261009-upstream-facts-final`. Build, typecheck, lint
and 99 unit tests pass; publication and public acceptance evidence belongs in
`/opt/utilibre/reports/upstream-facts-20261009/`. Previous images/configuration and
source archives are retained. No visitor tracking, new provider, external
message, real user-data deletion or backup-retention change was introduced.
