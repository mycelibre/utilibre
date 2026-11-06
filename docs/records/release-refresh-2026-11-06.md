# Release refresh, 6 November 2026

The 42 newer releases reported by the upstream review were fetched at recorded
Git revisions and assessed separately from production. **Nine were upgraded;
33 remain held.** The table below is the complete disposition, not a claim that
all available upgrades or all security work are finished.

The machine-readable companion is
[assessment.json](../../deployment/maintenance/release-refresh-20261106/assessment.json).
It records exact input revisions, source-scanner coverage, individual patch
compatibility, release evidence and database identities. Raw reports, synthetic
fixtures and recovery copies are private under
`/var/lib/utilibre-maintenance/releases-20261106`. No user content is published.

## Released and verified

| Application | Live version | Functional evidence |
| --- | --- | --- |
| GitHub CLI (maintenance host) | 2.103.3 | Official DEB digest; offline version/help/completion; Go binary rootfs assessment |
| Glyphr | 2.10.8-p1 | Create/edit font; native GS2/OTF export; GS2 import; no unrelated browser requests |
| FreshRSS | 1.30.4 | Native feed storage, Unicode/OPML, HTTP sign-in; synthetic account/article restored into isolated PostgreSQL and opened in Chromium |
| Radicale | 3.9.0 | CalDAV/CardDAV create/read/export/import/delete; anonymous and second-account denial |
| Calino | 0.42.0-p1 | Native connection to isolated new Radicale, event/contact, ICS/VCF export; no unrelated requests |
| Mapshaper | 0.7.101-p1 | Local GeoJSON, Shapefile ZIP and CSV import/export; simplification; expected synthetic attributes retained |
| One File Core | 4.2.0-p1 | Native download/edit/save/reopen, hostile end-tag text round-trip, IndexedDB recovery, clear, unchanged network/encryption restrictions |
| Link Cleaner | 1.3.2-p1 | Conservative cleaning, clipboard, redacted JSON, profile round-trip, fragment preservation, no application storage or outside requests |
| draw.io | 32.6.10-p1 | EN/ES sample diagrams edited, downloaded and reopened; local-only settings; loader fingerprint regression |

App URLs remain unchanged: `glyphr`, `rss`, `calendar`, `maps`, `draw` on
`utilibre.org`, plus `https://tools.utilibre.org/apps/one-file-core/` and
`https://tools.utilibre.org/apps/link-cleaner/`. No Caddy additions are required.
Account permissions, retention, donations, tracking policy and access routes
were not changed. Public HTTPS checks passed after each activation. Those
checks establish reachability; the stronger task checks above ran in isolated
candidates. Browser testing used Linux Chromium, with narrow-screen emulation
where recorded; no new physical-phone or Windows/Opera coverage is claimed.

Calino's upstream ICS suite passed 38 checks across its two timezone test files.
The draw.io wrapper suite passed three tests. Repeat release commands for Glyphr,
Link Cleaner and One File Core recognized the exact live artifact without a
restart. No mail, indexing submission or directory contact was sent.

## Preserved repairs and release decisions

New application files overlay the exact repaired runtime for Glyphr, FreshRSS,
Radicale and draw.io. Existing OS/library corrections are retained, rather than
replaced by stock upstream images. FreshRSS's in-app updater remains disabled;
its native PHP upload-progress privacy setting is retained. Radicale uses the
verified pure-Python wheel without resolving new dependencies or reinstalling
pip in its runtime. Its account rights and logging configuration are unchanged.

Calino's UTC export and browser-only settings were rebased onto the exact new
revision. One File Core now supplies its own safe script-text escaping, so that
old local implementation was not duplicated; unsupported encrypted-file creation
remains disabled. Link Cleaner's native redaction/summary fixes replace the old
copies. Its hosted build uses the upstream external modules, preserving the
existing strict CSP rather than allowing inline scripts. draw.io's configuration
fingerprint now includes loader bytes, so an upstream loader update receives a
new URL even when our settings are unchanged.

Trivy 0.75.0 used the same preserved advisory database for before/after image
comparisons. draw.io required a separately recorded Java package database;
its first scan correctly failed as incomplete until that database was available.
FreshRSS, Glyphr, Radicale and draw.io added **no new scanner findings** relative
to their predecessors. Existing findings remain: this is not a zero-findings
or fleet-wide security claim. GitHub CLI's correct rootfs scan extracted the Go
binary and left three UNKNOWN records, with no critical/high records; an earlier
filesystem scan extracted nothing and was not counted as clearance.

Source scans include build/mobile dependencies; their counts below do not prove
production exploitability. No rules, severities or files were suppressed to make
a candidate pass. Missing input extraction is explicitly reported. Candidate
source cleanliness alone did not authorize deployments. No automatic patch
conflict resolution was used.

## Complete 42-release disposition

| Application | Previous recorded version | Candidate | Outcome | Remaining condition |
| --- | --- | --- | --- | --- |
| actual | 26.10.0 · approved-account pilot | v26.11.0 | held | Candidate source contains 2 critical / 21 high lockfile matches; review build/runtime exposure and account/database migration and budget import/export. |
| addy | 1.7.3 | v1.7.4 | held | No critical/high extracted lock matches; mail-processing changes require patched PHP/vendor artifact comparison and an explicitly authorized controlled delivery/reply test. |
| authentik | 2026.8.3-python-security-20261011 | version/2026.8.5 | held | Candidate source contains 13 critical / 149 high lockfile matches; review build/runtime exposure and SSO/provider compatibility and isolated account/token tests. |
| bentopdf | 2.8.8-p4 · local PDF/OCR runtimes | v2.8.11 | held | Candidate source contains 0 critical / 6 high lockfile matches; review build/runtime exposure and existing dependency/OCR/local-assets repairs and real PDF outputs. |
| bytestash | 1.5.14-p1 | v1.6.1 | held | Existing privacy patch does not apply. Rebase then verify two-account private snippet/import/export behavior. |
| calino | 0.39.1-p1 | v0.42.0 | deployed-and-task-tested | Exact tested candidate deployed; see operator report for scope and retained findings. |
| candlr | 2.0.0-p1 | v2.4.0 | held | 6 critical and 29 high lockfile matches; shared planner/storage workflow and existing patches need a compatible candidate. |
| chartdb | 1.20.1-p1 | v1.21.0 | held | Candidate source contains 0 critical / 1 high lockfile matches; review build/runtime exposure and local repair compatibility and application-specific import/export/access tests. |
| chhoto | 7.8.3-p3 | 7.10.7 | held | Privacy and UI patches do not apply to new source. Rebase without restoring analytics; verify redirect/access/data behavior. |
| cryptpad | 2026.9.0 · Office 9.3.2+3 | 2026.10.0 | held | Candidate source contains 0 critical / 1 high lockfile matches; review build/runtime exposure and office/sandbox assets and two-client encrypted document compatibility. |
| degoog | 1.0.0 · four native SearXNG engines | 1.1.1 | held | Upstream changes PHP deployment to a Bun server. Requires an explicit runtime/network migration and frontend search/privacy tests. |
| donetick | 0.1.80-p3 · frontend1.2.55 | v0.1.86 | held | Candidate source contains 2 critical / 28 high lockfile matches; review build/runtime exposure and local repair compatibility and application-specific import/export/access tests. |
| drawdb | 1.8.2-p1 | v1.9.0 | held | Candidate source contains 0 critical / 1 high lockfile matches; review build/runtime exposure and local repair compatibility and application-specific import/export/access tests. |
| drawio | 32.0.2-p4 · local files | v32.6.10 | deployed-and-task-tested | Exact tested candidate deployed; see operator report for scope and retained findings. |
| freshrss | 1.30.1 | 1.30.4 | deployed-and-task-tested | Exact tested candidate deployed; see operator report for scope and retained findings. |
| github-cli-host | 2.102.0 | v2.103.3 | deployed-and-task-tested | Exact tested candidate deployed; see operator report for scope and retained findings. |
| glyphr | 2.10.6-p1 | v2.10.8 | deployed-and-task-tested | Exact tested candidate deployed; see operator report for scope and retained findings. |
| grid | 4.7.0-p1 | 4.7.3 | held | No supported locked dependency inventory extracted; native bundling/slicer and telemetry-removal checks still required. |
| grist | 1.7.21 | v1.7.22 | held | 24 high lockfile matches; preserve existing image-size/privacy repairs and verify document/access workflow before replacing runtime. |
| jupyterlite | 0.8.5-p5 · kernel 0.8.6 · local Pyodide 314.0.6 | v0.8.7 | held | Candidate source contains 3 critical / 65 high lockfile matches; review build/runtime exposure and kernel/Pyodide compatibility, local assets and notebook save/reopen. |
| link-cleaner | 1.1.0-p1 | v1.3.2 | deployed-and-task-tested | Exact tested candidate deployed; see operator report for scope and retained findings. |
| mapshaper | 0.7.80-p1 · local geographic files; no basemaps | v0.7.101 | deployed-and-task-tested | Exact tested candidate deployed; see operator report for scope and retained findings. |
| mumble | 1.5.915 · password-protected · TCP voice and UDP loopback verified | v1.5.939 | held | No supported locked dependency inventory extracted; must rebuild against repaired TLS/runtime libraries and verify native protected voice sessions. |
| newton | 5.4.0-p1 | v5.5.0 | held | No supported locked dependency inventory; tournament patch conflicts with new tournament/live-view UI. Rebase and test legitimate match/export flows. |
| ntfy | 2.28.0 | v2.37.2 | held | Go dependency repair conflicts; native publish/read authorization, cache expiry and UnifiedPush compatibility still need verification. |
| omnitools | 0.6.0-p7 · local runtimes; secure password generator | v0.7.0 | held | Candidate source contains 6 critical / 50 high lockfile matches; review build/runtime exposure and privacy, processing semantics and randomness fixes plus native tool outputs. |
| one-file-core | 4.1.5-p1 | V4.2.0 | deployed-and-task-tested | Exact tested candidate deployed; see operator report for scope and retained findings. |
| opengist | 1.15.2 | v1.15.3 | held | Candidate source contains 1 critical / 4 high lockfile matches; review build/runtime exposure and local repair compatibility and application-specific import/export/access tests. |
| penpot | 2.18.3 · approved-account pilot | 2.18.6 | held | Candidate source contains 1 critical / 29 high lockfile matches; review build/runtime exposure and coupled frontend/backend/exporter and retained JVM repairs. |
| radicale | 3.8.3 | v3.9.0 | deployed-and-task-tested | Exact tested candidate deployed; see operator report for scope and retained findings. |
| razzia | 3.1.0-p1 | 4.0.2 | held | Major 3→4 update; dependency patch conflicts. Native guest/join/host/WebSocket compatibility not verified. |
| reactive-resume | 6.0.0-p1 · visitor analytics disabled | v6.1.0 | held | Candidate source contains 0 critical / 1 high lockfile matches; review build/runtime exposure and local repair compatibility and application-specific import/export/access tests. |
| spliit | 1.29.0-p1 | 1.30.0 | held | Candidate source contains 2 critical / 9 high lockfile matches; review build/runtime exposure and local repair compatibility and application-specific import/export/access tests. |
| super-productivity | 19.1.0-p1 · local-data web application | v19.3.1 | held | Existing dependency/plugin repair sequence conflicts; local task persistence, backup/restore and privacy checks required. |
| texlyre | 0.13.0-p1 | v0.14.1 | held | Candidate source contains 0 critical / 1 high lockfile matches; review build/runtime exposure and local repair compatibility and application-specific import/export/access tests. |
| unfurl | 2026.10-p1 | v2026.11 | held | No supported locked dependency inventory; local source patch applies alone, but complete network-isolated SSRF/import/export test and runtime build were not completed. |
| uptime-kuma | 2.5.6 | 2.5.9 | held | Candidate source contains 2 critical / 35 high lockfile matches; review build/runtime exposure and retained OAuth client-binding repair and monitoring data compatibility. |
| vikunja | 2.7.0 | v2.8.0 | held | Go repair does not apply; native migration, task/export and two-account isolation checks not completed. |
| wakapi | 2.18.1 · local copy and empty-state fixes | 2.18.2 | held | Candidate source contains 0 critical / 4 high lockfile matches; review build/runtime exposure and both recorded patches apply individually, but full sequence/runtime/account verification remains. |
| wbo | 2.9.0-p3 · temporary shared whiteboard | v2.18.32 | held | New source adds OpenTelemetry packages and changes collaboration/history behavior. Verify telemetry remains off, two-client behavior and retention before approval. |
| wishlist | 0.67.1-p2 | v0.69.0 | held | Candidate source contains 0 critical / 30 high lockfile matches; review build/runtime exposure and local repair compatibility and application-specific import/export/access tests. |
| yopass | 14.10.0 | 16.0.1 | held | Candidate source contains 0 critical / 12 high lockfile matches; review build/runtime exposure and two major versions, first-retrieval/expiry/encryption semantics. |
## Recovery, source and continuing maintenance

The two release adapters in `deployment/maintenance/release-refresh-20261106`
reuse the existing Compose health/rollback implementation. They are finite,
operator-only adapters for this exact reviewed batch; they do not turn every
release alert into unattended deployment. SearXNG, Redlib and PrivateBin retain
their separately guarded update policies. The other applications retain daily
release/advisory detection and a visible review queue.

Image releases preserve previous image IDs and private configuration snapshots.
FreshRSS also has a database dump and saved-account files; Radicale has its
saved-account data/configuration copy. Never print those archives or publish them.
Image rollback does not undo persistent-data migrations. Review data compatibility
before restoring; do not overwrite newer user work. The FreshRSS synthetic restore
was tested; no whole-VM or real-user-data restore is claimed.

Static releases retain old folders. For Mapshaper or Calino, restore only the
previous mount path in the recorded Compose file, then recreate only `static`
or `calino` with `--no-deps --no-build --pull never` and verify health. Mapshaper
shares its static container with Numbat and Super Productivity, whose files and
configuration remain unchanged. For Link Cleaner/One File Core, atomically
restore the matching `*-previous-public-assets` folder; these are application
files, not users' browser data. The static release receipts contain exact hashes.
For host GitHub CLI, the verified previous DEB is retained privately.

Corresponding source offers include pinned upstream source, local changes,
licenses and build instructions; the integration archive is generated from the
committed release. Existing source URLs and upstream attribution remain usable.
Build/download staging consumed disk space; no production backup or general
Docker volume/image pruning was performed. Large build caches may be cleaned
only after preserving the exact source, lockfiles, release receipts and rollback
artifacts needed for the next replay.


## Final portal and advisory reconciliation

The clean committed portal build passed lint, typecheck, the FOSS/build gates
and 120 unit tests. Its source/software pages now use the catalogue's FreshRSS
and Redlib versions rather than obsolete duplicate strings. The exact portal
image `sha256:0243688ca5bc6f67632f74b66e0a0e877aebb02cd00940605a12d3beee75aeca`
was activated with unchanged runtime packages and zero added scanner findings;
EN/ES public software pages show all eight updated applications. Prior image:
`sha256:d53e7d50db9a679656e301fc5d24a3acc907bcfa58682b17a3211f24632052a3`.
Rollback changes only the recorded PORTAL_IMAGE line and recreates portal;
account applications and their data are independent.

FreshRSS's 36 applicable historical advisory reviews were reconciled against the
new exact image, upstream fixed-version declarations, changelog and live-source
parity. Native sanitizer checks preserve legitimate markup/data images while
rejecting data-URI navigation, scripts and event handlers; the NAT64 local-use
range check also passes. **One low advisory remains open:**
GHSA-5pmx-x7q6-hv7m describes both data and vbscript URI schemes. Upstream 1.30.4
implements the data-URI fix but does not explicitly list vbscript in its scheme
blocklist. This is documented defense in depth under upstream's CSP, not a claim
of current exploitation. The broader report remains a review queue; scanner
rules and severity thresholds were not changed to erase it.

The source publisher encountered Calino's upstream-tracked `.env` and stopped.
The exception now requires its exact public SHA256 and sole VITE_SITE_URL default;
local runtime secrets remain forbidden. Source offers include only tracked
upstream files and committed, allowlisted integration material. Public source
indexes retain the existing design and return link.
