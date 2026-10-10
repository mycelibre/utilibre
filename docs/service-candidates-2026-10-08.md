# Suggested services and capabilities — reconciled 9 October 2026 UTC

This is the current execution checklist for the complete suggested-service queue. On 9 October the operator explicitly authorized installing **every suggested application unless it breaks Utilibre's requirements**. Earlier review-only, choose-one and arbitrary later/pilot recommendations are superseded. Privacy, zero visitor tracking, FOSS licensing, bounded resources, minimal reproducible patches and no Whisper activation still apply. Existing applications are reused instead of installing a second copy of the same application.

The authorized work order was installations and precise independent checks, followed by catalog/SEO and then the full voice/copywriting pass. Those phases have been delivered; the work queue records subsequent repairs and narrow unresolved dependencies. New queue messages do not silently cancel unfinished installation work. Spanish remains voseo.

## Public and catalogued

The preceding batch delivered twenty-three public additions, including Razzia, Chhoto URL, Unfurl, 13ft and the newsletter receiver, in the bilingual catalog, search and guides. The additional batches below are also public, with the explicit mail/security and requirements-based exceptions listed separately. A public health check is not substituted for a native workflow test: each dated record below states exactly which public/private workflows and restore scopes were performed.

## Additional batch requested on 9 October

| Application | Work and current boundary |
| --- | --- |
| Super Productivity, Moodist, Spliit, KitchenOwl | Already installed; reuse the existing instances. Moodist's reviewed sound/integration limits still apply. |
| Rustpad | Live at tools.utilibre.org/apps/rustpad/ with EN/ES guide and catalog. Native two-browser collaboration, Copy, editor workers and bounds checks passed. Server-readable transient text, 24–25h connection-based expiry and restart loss are disclosed. [Record](rustpad-deployment-2026-10-09.md). |
| The One File Core | Live downloadable Core edition with EN/ES entry pages, catalog and guide. Native plain save/reopen passed; executable imports run only in downloaded files. Faulty upstream encrypted export is disabled; whole-file encryption is available through hat.sh. [Record](one-file-core-deployment-2026-10-09.md). |
| TiddlyWiki | Live downloadable EN/ES single-file notebooks with tested native save/reopen and deletion. Catalog and guide are live; no server notebook database. [Record](tiddlywiki-deployment-2026-10-09.md). |
| Moocup | Live static build with analytics removed and local font/notices; native PNG/JPEG/WebP export passed. EN/ES catalog and guide are live. [Record](moocup-deployment-2026-10-09.md). |
| TRIP | Public at trip.utilibre.org on1.50.1-p2, with native approved/verified service membership, bounded durable storage and daily backups without pruning. Two-account native login/isolation/sharing, ZIP round trip, deletion and scheduled-backup restore passed. Actual public OIDC/desktop/mobile/map/reload checks passed after the stylesheet correction. Browser OSM/Fastly tiles, server Photon/FOSSGIS requests, optional Google Maps navigation and resolver metadata remain disclosed. EN/ES catalog and guide are live. [Record](trip-review-2026-10-09.md). |

## Further explicit installation batch

Added during the preceding batch. Complete that work first; do not replace it.

| Application | Required deployment boundary and next step |
| --- | --- |
| AutoRedact | Live browser-only OCR with local assets, tested opaque PNG redactions and PDF/ZIP outputs. EN/ES catalog and guide are live; users must visually review redacted output. No complete-anonymization promise. [Record](autoredact-deployment-2026-10-09.md). |
| Beaver Habit Tracker | Public at habits.utilibre.org on0.10.0-p7, using operator-provisioned native accounts; public registration and trusted-email bypass remain disabled. Native two-account isolation, JSON round trip, deletion/token revocation and disconnected recovery passed. Actual public desktop/mobile account and data flows passed. Source, EN/ES catalog and guide are live. [Record](beaverhabits-deployment-2026-10-09.md). |
| Donetick | Public at chores.utilibre.org on0.1.80-p3. Two native approved OIDC/MFA accounts, circle isolation/sharing, attachment controls, deletion and disconnected restore passed. Public desktop/mobile flows passed; p3 corrects the first-task wording and native refresh-session deletion. The scheduled backup service now completes successfully with integrity/FK/file verification. Source, EN/ES catalog and guide are live. [Record](donetick-deployment-2026-10-09.md). |
| Knit | Live native pattern/row workflow, with save/reopen through the complete URL fragment. EN/ES catalog and guide explain supported pattern families and what the URL omits. [Record](knit-deployment-2026-10-09.md). |
| NewTon | Live FOSS core, proprietary directory and server API omitted. Native bracket JSON round trip, reload/deletion and malformed-import rejection passed; EN/ES catalog and guide are live. [Record](newton-deployment-2026-10-09.md). |
| Gravity | Live static simulation with local assets, verified tour/exploration and explicit native-language limits. EN/ES portal catalog and guide are live. [Record](gravity-deployment-2026-10-09.md). |
| Family Chess | Public at chess.utilibre.org, f6e5093-p1, with native session isolation, cleanup, limits and consistent backup. Native two-player/spectator, live SSE and mobile checks passed through actual public HTTPS; isolated recovery also passed. Catalog and EN/ES guide are live. Game-code/seat access and seven-day retention remain explicit. [Record](family-chess-deployment-2026-10-09.md). |
| Kokoro Web | Live browser-only speech at tools.utilibre.org/apps/kokoro-web/. Local model/voices and rebuilt GPL engine; public EN/ES WAV, playback/profile deletion/mobile checks passed with no outside requests. EN/ES catalog and guide are live in additions2. [Record](kokoro-web-deployment-2026-10-09.md). |

| Application | Current route and verified boundary | Installation evidence |
| --- | --- | --- |
| Spliit | expenses.utilibre.org; shared expense links, manual exchange rates, native JSON/CSV export; no native import or whole-group deletion UI. Analytics/uploads/AI off. Actual public native create/share/JSON/CSV/delete and desktop/mobile views now pass; the scheduled backup/isolated restore path also passes after correcting its host Node path. | [Spliit](spliit-deployment-2026-10-09.md) |
| Wishlist | wishlist.utilibre.org; approved-account OIDC, separate groups/lists, manual items and local images. Product-page retrieval/external icons blocked; native deletion corrected. | [Wishlist](wishlist-deployment-2026-10-09.md) |
| Opengist | snippets.utilibre.org; approved-account OIDC, public/unlisted/private snippets, revision ZIP and HTTPS Git. SSH and Gravatar off. | [Opengist](opengist-deployment-2026-10-09.md) |
| linkding | bookmarks.utilibre.org; approved-account OIDC, native bookmark HTML export/import. Background favicons, archive submission and snapshots disabled; explicit metadata retrieval is a distinct destination request. | [linkding](linkding-deployment-2026-10-09.md) |
| Vikunja Community | tasks.utilibre.org; approved-account OIDC, tasks/projects, native ZIP export/import and restored attachment. No Pro telemetry or external avatar fetching; disabled email means operator-assisted account deletion. | [Vikunja](vikunja-deployment-2026-10-09.md) |
| drawDB | tools.utilibre.org/apps/drawdb/; static local schema editor, tested SQL/JSON round trips, no sharing backend. | [drawDB](drawdb-deployment-2026-10-09.md) |
| Bookbinder JS | tools.utilibre.org/apps/bookbinder/; local advanced PDF imposition, native PDF/ZIP and 61 upstream tests. Digital layouts tested; physical printing/folding untested. | [Bookbinder](bookbinder-deployment-2026-10-09.md) |
| SketchForge 3D | tools.utilibre.org/apps/sketchforge/; static browser modeler, native SKF export/import and STL verified, 282 native tests. No shared server library, update service or MCP bridge. | [SketchForge](sketchforge-deployment-2026-10-09.md) |
| Moodist | tools.utilibre.org/apps/moodist/; native noise/tone/timer/preset features with three generated CC0 noise loops. Unmapped recorded library and external radio/YouTube integrations excluded. | [Moodist](moodist-deployment-2026-10-09.md) |
| KitchenOwl | kitchen.utilibre.org; approved-account OIDC, household lists/recipes and native JSON scope. Scraping/AI/MCP/metrics disabled; documented household metadata visibility is not called private. | [KitchenOwl](kitchenowl-deployment-2026-10-09.md) |
| ByteStash | snippets-library.utilibre.org; approved-account OIDC, snippet library and native JSON import/export. Local editor assets; OIDC state/callback correction. Separate workflow from Git-backed Opengist. | [ByteStash](bytestash-deployment-2026-10-09.md) |
| ChartDB | tools.utilibre.org/apps/chartdb/; local diagram/metadata/DBML workflow, SQL/JSON round trips, analytics/cloud/AI off. It does not connect to production databases. | [ChartDB](chartdb-deployment-2026-10-09.md) |
| OpenResume | resume-builder.utilibre.org; local PDF resume builder/parser with no account. Analytics/count iframe removed, PDF parser mitigation and licence-safe icons. Distinct from account-based Reactive Resume. | [OpenResume](openresume-deployment-2026-10-09.md) |
| La Suite Projects (PLANKA alternative) | projects.utilibre.org,455aa274-p2; native approved OIDC, two-user project/card/attachment isolation, partial CSV, deletion/logout and consistent database/filesystem restore passed. Actual public HTTPS account, sharing/revocation and desktop/mobile checks passed; source, portal and EN/ES guide are live. CSV has no board importer; deletion retains archived records/identity fields. | [Projects](projects-deployment-2026-10-09.md) |
| Radicale | calendar.utilibre.org/dav/ and /dav/.web/; native invited calendar credentials, owner-only CalDAV/CardDAV collections, ICS/VCF and restore checks. | [Calendar deployment](calendar-deployment-2026-10-09.md) |
| Calino | calendar.utilibre.org; browser client for the installed Radicale backend. Local assets, AI hooks removed, browser exports verified. Saved credentials use reversible obfuscation, not strong encryption. | [Calendar deployment](calendar-deployment-2026-10-09.md) |
| Gathio | events.utilibre.org; native anonymous event/edit-link workflow, ICS round trip, image and full isolated restore. Federation/email disabled; seven-day post-event cleanup. FOSS FerretDB/DocumentDB/PostgreSQL backend. | [Gathio](gathio-deployment-2026-10-09.md) |
| Chitchatter | chat.utilibre.org; own peer discovery and STUN, direct encrypted WebRTC, public two-peer text/file/generated-microphone test. No TURN fallback or cross-network quality claim. | [Chitchatter](chitchatter-deployment-2026-10-09.md) |
| Tracking-parameter cleaner | tools.utilibre.org/apps/link-cleaner/; native browser-only preview/cleaning, conservative parameter preservation, no destination fetch. This fills the general cleaner gap separately from the existing Outlook decoder. | [Link cleaner](link-cleaner-deployment-2026-10-09.md) |
| Kill the Newsletter! | newsletters.utilibre.org, web2.1.3-p2 / SMTP/jobs p1. Native feed creation/deletion, Atom receipt and isolated SQLite/files restore passed; the owner confirmed a controlled routed receive and outside-browser access. Readable server storage, capability links, cleanup, logs and unchanged backup retention are disclosed in EN/ES. | [Deployment](newsletters-deployment-2026-10-09.md). Bilingual catalog, guide and status are live in native2; gateway-wide mail TLS/limits are not claimed tested. |

## Final public batch — catalog and guides deployed

| Suggestion | Current state and exact limits |
| --- | --- |
| Razzia | quiz.utilibre.org, 3.1.0-p1; native shared manager access, two simultaneous isolated rooms/scores, JSON quiz export/import, result view/deletion and isolated restore passed. Dependency fixes and current Node LTS deployed. Bilingual catalog/guide/search/status are live. Managers share the stored library; results have no automatic expiry or native export/import button. [Record](razzia-deployment-2026-10-09.md). |
| URL shortener | links.utilibre.org, Chhoto URL 7.8.3-p3; public native creation/clipboard, 30-day maximum expiry, anonymous listing/deletion denial, zero click writes, 22 native tests and isolated SQLite restore passed. Exact fixtures deleted. Bilingual catalog/guide/search/status are live. Anonymous early deletion remains operator-assisted. [Record](chhoto-deployment-2026-10-09.md). |
| Redirect-following unshortener / URL inspection | expand.utilibre.org, Unfurl 2026.10-p1; public native browser flow, 408 tests and enforced proxy/namespace/DNS/private-address checks passed. At most 10 distinct URL requests and 2 simultaneous jobs; destination requests may consume one-time links. No persistent application URL history. Bilingual catalog/guide/search/status are live. [Record](unfurl-deployment-2026-10-09.md). |
| 13ft | read.utilibre.org, 0.5.0-public1; public native POST and EN/ES form checks, restricted outbound proxy/namespace/DNS controls, sandbox rendering, 1 MiB decoded response and 2-job bounds passed. Direct HTML 200 only; no redirects/login/JavaScript/archive fallback or stored article archive. Bilingual catalog/guide/search/status are live. The 8 October restricted pilot is historical. [Record](13ft-deployment-2026-10-09.md). |

## Mail installations and exact remaining checks

| Application | Completed independent work | Exact remaining scope |
| --- | --- | --- |
| addy.io | 1.7.3 with native account/alias controls, CSV, recipient rejection, deletion/token revocation and MariaDB restore. PMG routing and public web access are present; SMTP2527 permits only10.10.1.20. | The authorized native forward reached Gmail with SPF, DKIM and DMARC passing, signed by PMG selector `pmg`. Its authenticated native reply reached the monitored admin inbox; both receipts are owner-confirmed. The local queue is empty. Native authentication positive/negative fixtures passed. Public EN/ES catalog and guide are live, with registration closed; CSV import and other senders/providers remain outside this bounded check. [Record](addy-deployment-2026-10-09.md). |
| SimpleLogin | 4.82.4-p7, private HTTP3212/SMTP2528. Transport repairs, eight compatible-library fixes and 33 runtime package updates are deployed. Native auth/CSRF/sudo, CSV import-function/export, SMTP EHLO/NOOP, fictional restore/deletion and old-image schema compatibility passed. Backups and private routing remain unchanged. | Remaining legacy framework findings:55 advisory rows /30 deduplicated groups across8 packages, not a count of exploitable flaws. Requires a maintained compatible framework update; current branches and bounded candidates were inspected. No broad framework fork or public activation. Authorized native mail/signing checks would remain separate. [Record](simplelogin-deployment-2026-10-09.md). |

The existing private SMTP relay on port26 accepted the explicitly authorized Addy account emails. The operator subsequently fixed PMG delivery and confirmed aligned SPF/DMARC on a separate delivered Gmail test. Newsletter routing was independently confirmed by the owner’s received test entry. Addy-to-gateway certificate-verified TLS and the separate Addy-specific forward/reply exchange now pass; the observed forwarded message also passed DKIM. These are actual installations, not unexplored recommendations. Public routes remain disabled where the documented condition is unmet. Newsletter-to-feed ingestion and forwarding aliases are distinct workflows. None is advertised as a working public temporary mailbox or complete mail archive.

## Requirements-based exclusions

| Suggestion | Evidence and exact reason |
| --- | --- |
| PLANKA | Current 2.2.1 carries the PLANKA Community License/Fair Use restrictions on third-party hosting/shared or commercial use, rather than a FOSS grant. An old unsupported AGPL release is not substituted. No runtime was installed. [Licence record](planka-license-exclusion-2026-10-09.md). |
| ZipCaptions | Reviewed 0.4.0 source `7e0f8a49c06e2bf83175e2a7724ec6dd8974ac72` uses Web Speech without enforced processLocally, or Azure. There is no verified functioning local-only native recognition path in the tested environment. No public app or microphone collection was enabled; Whisper remains withdrawn. This can be reconsidered when an upstream-supported FOSS/local path passes actual fictional-audio checks. [Review](zipcaptions-review-2026-10-09.md). |

A source licence or privacy incompatibility is an evidenced exception. It does not justify omitting other eligible suggestions or withholding independent repository work.

## Existing applications and delivered native capabilities

| Requested application/capability | Reconciled outcome |
| --- | --- |
| AudioMass | Already installed local editor with its native audio guide. No second instance or audio backend. |
| JupyterLite | Already installed local Python/runtime packages and bilingual examples; external package fallback disabled. No per-user server notebook kernel. |
| RAWGraphs | Already installed with visitor analytics/remote imports/custom executable plugins removed and fictional CSV workflow verified. |
| RSS-Bridge | Existing selected bridges and bounded feed cache retained. Additional arbitrary-URL bridges were not silently enabled. |
| CyberChef | Existing file-signature/SHA-256 tasks and guides verified; network operations remain disabled. EXIF parsing blocked by strict CSP is not advertised as working. |
| Reactive Resume | Existing 6.0.0-p1 correction disables visitor counts, deduplication/identifier derivation and browser analytics events. Native sharing/export/restore passed; historical real data was preserved. [Record](reactive-resume-privacy-2026-10-08.md). |
| FMD | Native public browser login, decrypted ZIP export/reopening and exact fictional location/image/metadata checks passed on 9 October. The p2 CSV correction preserves zero values, and native deletion/token rejection passed. Physical Android recovery, push delivery and account import from ZIP remain untested. [Export record](fmd-export-verification-2026-10-09.md). |
| Password/passphrase generation | Existing native generators corrected to use WebCrypto; local password and phrase guide published. No duplicate service. |
| Markdown → HTML/PDF | Delivered through native conversion and browser Print → Save as PDF, with a bilingual guide. |
| Plain code paste with syntax | Existing PrivateBin native syntax display verified. Persistent Opengist/ByteStash libraries are additional distinct applications, not duplicate PrivateBin copies. |
| EXIF viewer | Existing Image Scrubber native metadata display and fictional sample guide verified. |
| File contents / hash verification | Existing CyberChef signature inspection and exact SHA-256 workflow/guide delivered. |
| Basic PDF booklet | Existing BentoPDF 1×2, No rotation, A4/Letter digital order verified. Bookbinder now supplies the separately requested advanced layouts. Physical print/fold testing remains unperformed. |
| Private opener / encoded-link decoder | Existing portal opener and native Outlook wrapper decoder retained. They do not replace the new cleaner, actual shortener or redirect-following work. |

## Historical edge handoff, 9 October at 11:32 UTC

The installed recent additions have one consolidated, 24-host reference at
[`Caddyfile.recent-services`](../deployment/utilibre/edge/Caddyfile.recent-services).
The five hosts that were pending at that time also have a standalone fragment at
[`Caddyfile.october9-pilots`](../deployment/utilibre/edge/Caddyfile.october9-pilots).
Temporary standalone public downloads were withdrawn after the operator asked
whether deployment files should be directly available. Provide these fragments
in the operator conversation or from the repository. The existing public
integration source still contains deployment recipes; this change is not a
claim that internal addresses are confidential.
Use one version of each host block; do not load overlapping reference files.
The references reuse the edge's existing `utilibre_*` snippets and CrowdSec.

At11:32, the five pending origins responded on their configured ports (TRIP's local check
uses loopback because its private-interface listener accepts only the edge).
At that earlier check, their public hosts returned Cloudflare 525 and the separate edge
failed TLS negotiation for each name. They remained maintenance entries until
the edge routes and public native checks subsequently passed; the final status
is operational in the tables above. The backend ports are
chess 3214, chores 3215, habits 3216, projects 3217 and trip 3224.

A follow-up at 11:41 UTC found all five routes responding after edge activation:
chess, chores, projects and TRIP returned native HTML; habits returned its normal
307 redirect. The earlier 525 check above is historical. At11:41, public native workflow
checks still gated catalog activation; the later completed results follow. TRIP's rendering follow-up found a blocked
Angular stylesheet activation; its narrow build correction and visual checks
are tracked separately.

A stock Caddy validation passed with test definitions for the edge-owned snippets
and with the unavailable CrowdSec directive omitted only from the disposable
test harness. This establishes the fragments' core syntax, not the separate
edge's complete configuration, certificates or plugin setup. Validate the merged
configuration with that edge's installed Caddy binary before reloading it.
The temporary public fragment downloads matched repository bytes before withdrawal. Evidence is in
`/opt/utilibre/reports/privatebin-discovery-20261009/caddy-*.json`.

## Historical review scope

The 8 October shortlist was a consideration pass, with source/configuration questions and no installation authority for those candidates. Its choose-one and later-pilot recommendations no longer govern work. The operator's 9 October ALL instruction led to the installations and separate exclusions above. Earlier source leads (including Spliit main and Bookbinder main) are not current production pins; the dated deployment records contain the selected immutable versions, source offers and actual tests.

Unknown external mail settings, unperformed physical-device/printing checks and precise provider retention leave only their dependent claims pending. They do not stop independent deployments. Existing [work queue](work-queue.md) tracks completed operational/privacy and SEO/copy work plus later repairs without duplicating this checklist.

## Public edge activation and rendering, 9 October

All five newly routed apps now pass public native workflow checks: TRIP, Family Chess, Projects, Donetick and Beaver. Their approved-account requirements remain where applicable. TRIP1.50.1-p2 corrects its Angular stylesheet activation under the existing CSP; Chhoto7.8.3-p3 corrects overlapping instance notes. Beaver's gateway now marks the native session cookie Secure. Tests used disposable fictional content, and cleanup passed. Source packages and portal activation are live; see the dated deployment records and work queue for its final verification.

## Scheduled recovery-path follow-up, 9 October at13:24 UTC

A queue audit found two failed systemd backup units despite successful earlier
manual checks. Donetick's failed state predated its p3 deletion correction;
executing the existing scheduled unit produced a fresh verified snapshot and
exit0. Spliit's unit named a missing `/usr/bin/node`; it now names the existing
verified host Node runtime and completed the actual native dump, checksum and
network-disabled PostgreSQL restore path. Both timers remain enabled/active,
all backup generations are retained, and no service data or retention policy
changed. The dated Spliit and Donetick records contain the exact evidence.
