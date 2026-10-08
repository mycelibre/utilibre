# Service-pack implementation — 7–8 October 2026

This is the active implementation record, not a launch announcement. Privacy and
zero visitor tracking are release gates. Existing documents, routes, access rules
and account retention remain unchanged unless a change is explicitly recorded.

## Production release — 8 October 2026

Implementation commit `1ba100e` was pushed to the existing GitHub repository and
the portal deployed using its normal Compose project. The backend pack, eleven
bilingual guides, editable examples, source downloads and catalogue entries are
live. A final guide-only follow-up removes repeated privacy/source entries for
two tasks from the same application. No Search/Redlib restart or listing submission.

Observed after deployment: all 70 public canonical pages passed the live SEO
check (HTML, unique metadata, reciprocal languages, sitemap, CSP and no cookies).
Real EN/ES public/account/pilot views showed the intended new tools and preserved
Collab in Use now. Both missing-page probes returned 404; guide journeys had no
outside browser requests or page errors. Desktop/narrow screenshots were inspected.
All eight new/updated source archives returned 200 with nonempty files. Local
typecheck/lint/build, 84 unit tests, six desktop/mobile guide tests and seven
IndexNow-selection tests passed; no IndexNow submission was sent.

Rollback image: `public-utility-portal:pre-service-pack-20261008`.
Private environment backup: `/opt/utilibre/pack-secrets/portal-pre-service-pack.env`.
Restore those together and recreate **only** portal; preserve all application
state. Five unused intermediate PDF/Omni/Python images and the loopback test proxy
were removed, not user data or rollback images; build recipes recreate them.
Disk recovered to about 12 GiB free. This release is not a claim that the blocked
services, provider controls or external media paths below are complete.

## Baseline and boundaries

- Portal release `dc8a0e8` moves Collab/WBO from Pilots to Use now, preserving its
  temporary, server-readable room warnings. All 84 unit and six browser tests,
  typecheck/lint/build and configuration validation passed. Public EN/ES routes
  show one matching public card and zero pilot cards. WBO was not restarted.
- Existing personal collections, local link conversion, image handoffs, QR
  offline support, native examples and bilingual guides are preserved. Public
  PairDrop remains direct WebRTC without WebSocket fallback; TURN has only been
  tested in a private lab. Public relay network/certificate prerequisites remain.
- Measured app VM: 8 logical CPUs, 15 GiB reported RAM, 8.3 GiB available;
  4 GiB swap (2.3 GiB allocated); root 128 GiB, 34 GiB free, load about 0.5.
  These are a point-in-time inventory, not capacity or concurrency guarantees.
- Existing scheduled backups are local to this VM; community snapshots occupy
  622 MiB, expanded snapshots 1.6 MiB, identity snapshots 17 MiB. Off-host disaster
  recovery is not established. New stateful services need their own tested
  native snapshots and restore rehearsal before being described as recoverable.
- Separate Caddy edge/DNS/provider settings are not writable through the access
  discovered here. New backend deployment is authorized; public TLS/routing and
  provider-level tracking settings require operator verification. No directory
  submissions, paid resources or tracking systems are part of this release.

## Coverage and release gates

| Capability | Baseline / mechanism | Required verification | Current state |
| --- | --- | --- | --- |
| CryptPad suite | 2026.9.0, cryptpad-server 1.0.1, Office 9.3.2+3; two public origins | Two-session Markdown and spreadsheet edits/Undo, native document/office/calendar exports, isolated browser restore pass; remaining detailed gates below | Backend live; portal release pending |
| LiberaForms + feedback | 4.11.1-p5, Python 3.13, PostgreSQL 17.11; native required encryption | Guest encryption, creator decryption/key restore/JSON export, second-account denial, database restore, SMTP, public branding pass | Backend live; source notice added; portal release pending |
| Mapshaper | 0.7.80-p1 complete static GUI | Public GeoJSON/zipped Shapefile/CSV import, simplify/export pass, no external browser origins | Backend live; portal release pending |
| Numbat | 1.24.0-p1 complete WASM GUI | Variables, units/errors and explicit nonexecuting fragment links pass | Backend live; portal release pending |
| FreshRSS packs + read later | Existing 1.29.1; four OPML packs/seven verified feeds; native favourites | Authenticated import, refresh, text-first reading and favourites pass; native export is ZIP containing OPML XML and starred JSON | Privacy configuration live; packs/guide not yet released |
| Super Productivity | 19.1.0-p1 full web-only production build; no SuperSync | Public task/focus/reload/export/fresh-profile import pass; warmed native service worker reloads offline | Backend live; portal release pending |
| wallabag | Official 2.6.14 image reviewed, not started | PHP 8.1.32/Alpine 3.19.8; 60 Composer advisories across 19 packages; required framework/Guzzle upgrades exceed a small configuration patch | Blocked; no listener at 3177 |
| Galene | Native 1.2.1 in isolated bridge, four-client moderator-led room | Native invitation/guest permissions, chat, actual audio bytes and 19 decoded video frames in two host-local Chromium sessions pass | Private pilot; external media/relay not ready |
| Whisper | Existing hidden deployment; reported poor Spanish transcription | Supported pinned dependencies, local model checksum/license, useful EN/ES transcripts | Unavailable pending credible passing test |
| Whole-pack privacy | Existing no-tracking policy, but configuration alone is not an audit | Asset/backend/job/log inventory; targeted clean-profile workflows; edge/provider confirmation | In progress |

## Release and rollback

### Current checkpoint — 8 October, 02:55 UTC

This section supersedes the older checkpoints below; the release status above
supersedes its earlier pending items. Tests used synthetic data on Linux
Chromium, normal public TLS except explicitly isolated restore/lab tests. No real
phone, Windows/Opera transcription or independent external meeting test is implied.

- Eleven complete EN/ES pack guides (22 pages), original CC0 editable fixtures,
  existing catalogue-derived access/privacy and contextual guide links are ready.
  Existing URLs and personal collections are preserved. An Impeccable distillation
  pass reduced the long repeated guide list to three related links and All guides.
- CryptPad checks completed: native Form guest response/owner access and owned-form
  destruction; Document DOCX, Spreadsheet XLSX, Presentation PPTX, Rich Text HTML,
  Kanban JSON, Calendar ICS and Markdown exports. Two-client Markdown/spreadsheet
  editing and synchronized Undo passed. Code rendered Mermaid, Markmap and mathjax.
  Calendar event editing, all read-only office permission combinations and every
  Spanish fixture import remain untested. A fresh-guest deletion check used a safe
  address-bar URL by mistake: it is not proof of post-deletion denial.
- Forms native create/publish/respond/decrypt/key-restore/JSON-export/delete passed.
  Deleted disposable form returned 404; feedback remained. Owner/second-account
  isolation and SMTP passed. `/feedback` asks only tool/task/stuck/optional contact.
  Creator accounts remain invitation-only, anonymous respondents need no account.
- Mapshaper also passed native attribute editing (`-each books=books+1`) and
  exported GeoJSON reimport. Numbat verified 375 g, 0.18 kWh, 5000 m, unit mismatch
  errors, unchanged normal URLs and explicit nonexecuting bounded fragment sharing.
- FreshRSS test account imported the packs, fetched 40 articles, starred one and
  exported the native ZIP containing OPML XML and starred JSON. Test account and
  its synthetic database were removed using native CLI; real accounts unchanged.
  Correct import/export URL is `/i/?c=importExport`. Read-later means native
  favourites, not a wallabag archive. Seven valid feeds in four optional packs;
  Guatemala's pack is public-interest journalism, not a government source.
- Super Productivity task/focus/reload/export/fresh-profile import and native
  offline reload passed. Initial native asset preparation took an eight-second
  warm-up in this test; a visit alone is not an offline-readiness guarantee.
- Galene's two host-local clients exchanged 2766 audio bytes, 25660 video bytes
  and 18 decoded frames in the final fixture. Fifth guest was rejected at four
  native clients; disconnecting the last moderator removed guests. These are
  small test observations, not capacity figures. Public UDP/TURN remains inactive.
- BentoPDF 2.8.8-p3 uses supported air-gap settings: PyMuPDF 0.11.16, Ghostscript
  0.1.1, CoherentPDF 2.5.5, Tesseract/core 7, EN/ES trained data and Noto fonts.
  Public readable two-page merge and useful EN/ES OCR passed with zero outside
  requests/content uploads/failed requests. English OCR needed an accent correction.
  Optional signature validation is disabled due to an unpatched verification
  dependency. Do not infer secure redaction or signature verification from OCR.
  Full runtime asset tree is about 358 MB on disk, fetched by task, not all on visit.
- OmniTools 0.6.0-p5: local FFmpeg 0.12.9, Monaco 0.52.2, compression 2.0.2,
  Tesseract/core 6 and EN/ES data; local IMG.LY 1.7.0 retained. Native Filerobot
  backend translations disabled. Six featured tasks (CSV→JSON, deduplication,
  compression, image editing/background removal, audio trim) produced outputs
  with zero external requests or application uploads. Other optional tools are
  not implied verified by this set. Runtime package hashes/licenses are pinned.
- JupyterLite 0.8.5-p5 / kernel 0.8.6 now uses native wheel/index configuration,
  checksum-pinned local Pyodide 314.0.6 and comm 0.2.3. Public Python calculation,
  pandas CSV and matplotlib image output passed with zero external requests or
  uploads. The full compressed Pyodide archive is 350,203,134 bytes on the build
  server, not an initial browser download; packages load on demand. External
  package fallback is disabled. Two migration defects (missing comm wheel and
  its file permissions) were resolved before the passing notebook test.
- New services disable Docker/access/error logs and optional usage telemetry.
  Selected existing Penpot frontend/admin, Wakapi, RSSHub and PrivateBin log sinks
  were disabled without deleting application data or changing account policies.
  Wakapi remains explicit user-owned coding records, no public leaderboard or
  automatic visitor enrollment, unchanged three-month retention.
- Snapshot 02:08 repeated isolated native PostgreSQL restore/login/encrypted-answer
  AND CryptPad browser document decryption successfully. Both snapshots remain
  encrypted; keys and snapshots are on this VM, not off-host disaster recovery.
  Installed timers: backup 05:15 UTC and native Forms expiry/purge 07:15 UTC,
  each with up to 120 seconds jitter. Existing monitor checks job result only.
  No automatic snapshot pruning: deleted content may remain until an approved
  backup retention policy exists. The backup disk floor is 5 GiB.
- Resource sample 02:51: eight logical CPUs, 15 GiB reported RAM, 4 GiB swap;
  root 128 GiB with 12 GiB free after builds. CryptPad 231 MiB, Forms 123 MiB,
  Galene 20 MiB. Build/source caches consumed space since the 34 GiB-free baseline.
  These are point samples, not sustained capacity or a 1000-user guarantee.
- Privacy limits remain explicit: no access to edge/provider analytics/log controls;
  remaining legacy services have not all had authenticated/error-path network
  inspections. Whole-pack zero-tracking certification is **not established**.
  No certification badge or invented provider assurance was added. Known optional
  unsafe applications remain unavailable; no alternate tracking system introduced.

Exact dependencies: Caddy HSTS header for CryptPad; inspect alias routes on edge;
provider analytics/log-retention controls; off-host backup destination/key separation
and retention policy; independent public Galene/TURN network test. Prepared relay
requires DNS-only hostname/certificate and routing for 3478 UDP/TCP, 5349 TCP and
49160–49191 UDP, with existing eight allocations, 250 kB/s per allocation and
1 MB/s aggregate. Credentials delivered to guests are not per-user authorization.
PairDrop WebSocket fallback stays disabled. wallabag needs supported secure upstream
packaging; Whisper needs credible maintained build and useful EN/ES results.

### Reproducible build / update notes

Use exact Git commits in `publish-source.mjs`; never switch to moving latest tags.
Sources are under `/opt/utilibre/src`. Build one heavy app at a time, outside requests.

- Mapshaper: copy reviewed pack `mapshaper.package*.json` to pinned source, run
  `npm ci --ignore-scripts` and native `npm run build`; then run
  `node deployment/pack/prepare-static.mjs mapshaper` from this repository.
- Numbat: build `deployment/pack/Dockerfile.numbat` with its source context and
  `--output /opt/utilibre/build/numbat`; then `prepare-static.mjs numbat`.
- Super Productivity: apply `super-productivity.dependencies.patch` and the small
  `super-productivity.plugin-lock.patch` to clean pinned source;
  `npm ci --ignore-scripts`, `HUSKY=0 npm run prepare`, then
  `NODE_OPTIONS=--max-old-space-size=3072 NG_BUILD_MAX_WORKERS=2 npm run buildFrontend:prodWeb`.
  Run `prepare-static.mjs plan`; do not start upstream test databases/SuperSync.
- CryptPad: native dependency install and current `npm run install:components`,
  official Office/x2t 9.3.2+3 installer with upstream SHA512 verification, then
  `node deployment/pack/prepare-cryptpad.mjs`. Retain all component licenses.
- Forms: `docker build --build-context pack=deployment/pack -f deployment/pack/Dockerfile.liberaforms
  -t utilibre-liberaforms:4.11.1-p5 /opt/utilibre/src/liberaforms`.
  Bootstrap/state/key scripts are initial setup only, not credential resets.
- Galene: `Dockerfile.galene` with pinned native source; prepare native group
  configuration privately. Do not expose credentials or enable UDP by inference.
- BentoPDF: apply `bentopdf.dependencies.patch`, native `npm ci --ignore-scripts`,
  `build-bentopdf.mjs`, `prepare-bentopdf-airgap.mjs`; build `Dockerfile.bentopdf`
  from its versioned assets. OmniTools uses `Dockerfile.omnitools` and its pinned
  upstream image; runtime installers verify hashes, not unpinned visitor downloads.
- Apply pack firewall and only relevant Compose services. FreshRSS updates retain
  its privacy overlay. Keep existing data, source archives and previous images.

Stage reviewed files before `publish-source.mjs APP` and
`scripts/publish-integration-source.mjs`; publishers archive Git-indexed integration
files and pinned upstream source, not runtime secrets. Update the source index.
Root portal-only build/up follows checks; do not restart Search/Redlib for this.
Preserve live portal image/private .env for rollback; stateful volumes stay intact.
Never `down -v`, restore over production, globally prune, or restore external tracking
to make a failing task look healthy. Reverted deployments need matching source.

### Historical checkpoint — 8 October, 02:00 UTC

This section supersedes older "pending" test notes below; it is not a full-pack
completion claim. Portal release is still pending.

- Added 11 complete bilingual pack guides (22 localized pages), preserving the
  earlier guides. New editable CC0 fixtures include XLSX, DOCX, Kanban JSON, ICS,
  Markdown slides/diagrams and text questions, alongside maps/OPML/calculations.
  The guide renderer uses the existing catalogue for access links and privacy.
  No new framework, accounts, analytics or workflow engine was introduced.
- CryptPad native XLSX import/export, two-client cell edits, formula totals and
  synchronized Undo passed. Rich Text HTML, Document DOCX (exported XML contains
  the original fictional text), Kanban JSON, Calendar ICS, Markdown Slides and
  Markdown export passed. Markmap, Mermaid and mathjax each rendered an SVG.
  Presentation exported a real PPTX containing the entered fictional title.
  Some guides also describe supported native controls whose full interaction
  still needs the final targeted pass (calendar event editing, form creation,
  permission/deletion, reimport and Spanish fixture variants); do not treat
  those as a completed end-to-end audit yet.
- Native CryptPad documentation retrieved today describes older office Undo
  limitations; deployed 9.3.2+3 was tested directly and does synchronize the
  tested Undo operation. The guide identifies the two toolbars and mode caveat.
- `check-restored-pad.mjs` passed against the 00:45 encrypted snapshot: decrypt
  to a private temporary directory, start an isolated native CryptPad and
  loopback TLS proxy, load the recovered owner state, decrypt the original
  collaborative test document. Both test containers and the temporary restored
  copy were removed afterward; live state was never overwritten. Together with
  `verify-backup.mjs`, this establishes a synthetic on-host restore, not off-host
  recovery or a guarantee for every office attachment.
- The LiberaForms resolved requirements audit reported zero known advisories
  after compatible updates and removal of the unused test SMTP dependency.
  p5 adds only required source links to the native footers; p4 privacy patches
  already disabled optional form-action logs, last-login activity statistics
  and statistics routes. Native permissions, keys and answers are retained.
  `maintain-forms.mjs` invokes upstream expiry/purge functions; its first run
  completed. Scheduling and documented backup retention are still pending.
- Public feedback is `https://forms.utilibre.org/feedback`. Its four visible
  fields are tool, task, where stuck and optional contact. EN/ES introduction
  explains that authorized operators can decrypt it. No attached diagnostics,
  hidden identifiers, uploads or response-content emails are requested.
- Cloudflare was injecting same-origin JavaScript challenge detection into
  ordinary application HTML; counting only outside origins missed it. This
  broke Super Productivity's native index integrity/offline preparation too.
  Added documented `Cache-Control: no-transform` via local servers and supplied
  the edge line. Public responses now show that header and no injection on pad,
  sandbox-pad, forms, meet, plan, tools, pdf and drop. Existing shared static
  nginx configs and WBO were validated/reloaded without restarting applications.
  This does NOT verify Cloudflare account-level analytics/log-retention settings.
- Measured resources near 01:30: 8 logical CPUs, 15 GiB RAM (8.4 GiB available),
  4 GiB swap (2.6 used), root 128 GiB (22 free). CryptPad about 286 MiB, Forms
  126 MiB, Galene 11.5 MiB in that sample. No capacity extrapolation. Recheck free
  space before builds; the backup script refuses below 5 GiB free.
- Whisper remains hidden. Pinned upstream `81869ed62970ff4373509b6004a6c9a3f0c5b64d`
  dates to June 2024. Runtime npm audit is zero; complete build-tool audit found
  22 advisories (13 high, 8 moderate, 1 low), including a major Tailwind change
  among proposed fixes. This is not 22 proven runtime exploits. More importantly,
  prior Spanish quality complaints on Windows/Opera are not resolved by a single
  server-browser fixture. No new transcript-quality or Windows/Opera claim is made.
- At 01:43, user-reported `monitor`, `send`, `feeds` hosts returned 502. Canonical
  `status` (3125), `drop` (3124), `bridge` (3120) and `rss` (3106) all returned 200,
  as did their private backends. Those aliases are absent from repository Caddy
  files. Active edge configuration remains unavailable; do not infer stopped
  containers or expose localhost-only Kuma administration port 3135.

### Historical release queue (superseded by current checkpoint above)

1. Complete the targeted native form, permissions/deletion and example reimport
   checks; inspect representative bilingual portal desktop/mobile pages.
2. Finish source bundles/notices, exact build/update instructions, current
   dependency locks, native maintenance timers and final snapshot verification.
3. Audit remaining existing-service telemetry, external runtime assets and log
   sinks; an environment-flag inventory found 101 containers, only 30 with Docker
   log driver `none`. That is an audit queue, not proof the other logs track users.
4. Galene cannot be presented as a public meeting service until a bounded public
   media/TURN path is configured and tested from an independent external network.
   No external-network success follows from host-local browser traffic.
5. Build, source publication, portal release and public-route/SEO verification.
   No instance-directory submissions or IndexNow notifications were sent.

### Source and custom-glue inventory

- Existing portal catalogue/config/guidance and guide data: links, access facts,
  text, examples and privacy answers only; no replacement application logic.
- `prepare-static.mjs`: complete upstream static assets, disable basemaps/fonts/
  exchange-rate fallback; Numbat has explicit bounded fragment sharing instead
  of automatic calculation URLs. Super Productivity uses upstream native PWA.
- `prepare-cryptpad.mjs` and native `customize/` files: telemetry off, policy links,
  CKEditor version-ping off and advisory-triggering modes disabled.
- `liberaforms-privacy.py`: small fail-closed build changes for optional activity
  records, statistics UI and required source notice. Native cryptography unchanged.
- `prepare-galene.mjs`: native PBKDF2/group/permission settings, no room platform.
- `prepare-examples.mjs`: original small fixture files, not document conversion.
- `backup.mjs`, restore checks, `maintain-forms.mjs`: wrappers around native
  pg_dump, tar, OpenSSL and upstream lifecycle functions; no backup database.
- `publish-source.mjs`: pinned Git-indexed upstream source and local recipes,
  excluding secrets/runtime data, with previous public archives preserved.

Reversible release: preserve the prior portal image and source archive; rebuild
only the portal for catalogue changes. For a Forms rollback use the retained p4
image with the same database/volume; p5 makes no schema migration. For static
tools restore their previous versioned asset mount. Never use `down -v`, prune
data, or overwrite a live database with a test restore. A rollback must retain
the no-tracking controls and appropriate corresponding source.

### Public forms branding repair (8 October)

The public homepage returned 404 for `/logo.png` (and the favicon), although the
native files existed in the persistent brand directory. LiberaForms expects its
web server to serve these paths; they are not Flask application routes. Added
`deployment/pack/nginx-forms.conf` following the selected release's
`docs/nginx.example`, with exact aliases for these two public files only. The
uploads directory and database are not exposed. The existing app and database
versions, account policy, forms and answers are unchanged.

The pinned, unprivileged nginx frontend is read-only, capped at 64 MiB / 0.25 CPU,
has no access/error log sink, and can connect only to the existing app on its
private bridge. External port **3176 is unchanged**; no edge Caddy change is
needed. Deploy with `docker compose -f deployment/pack/compose.forms.yaml up -d
--no-deps app web` after applying the pack firewall. Configuration syntax passed.

`node deployment/pack/check-forms-branding.mjs` passed against real public HTTPS
without certificate overrides: logo and favicon returned image responses with
200 status; Chromium decoded every homepage image at 1280px and 390px widths;
neither viewport had horizontal overflow; sign-in still displayed its username
field; no HTTP errors occurred. The actual desktop screenshot was also inspected.
This is a branding/sign-in regression check, **not** proof of the remaining
encrypted-response, backup or whole-service privacy gates.

Rollback, if necessary: stop only the `web` service, remove its port mapping and
restore `10.10.1.43:3176:5000` to `app`, then recreate only `app`. Do not remove
volumes or reset branding; the former direct-WSGI path will retain the original
image defect. Neither deployment nor rollback requires database changes.

### Working checkpoint (updated 8 October)

- Mapshaper 0.7.80-p1: hardened dependency lock (npm audit reported zero), complete
  static GUI installed on private port 3170. Chromium imported/exported fictional
  GeoJSON, zipped Shapefile and CSV, including simplification; no external browser
  requests in these journeys. Public `maps.utilibre.org` now returns 200 with
  valid TLS; the same import/export checks passed through the public hostname.
- Numbat 1.24.0-p1: complete Rust/WASM build on 3171. Variables, units, incompatible
  units and explicit nonexecuting fragment sharing passed. Public
  `calc.utilibre.org` returned the patched build and 120 min for `2 h -> min`;
  simulated 390px viewport had no horizontal overflow. Normal calculations do not
  alter URLs. Remote currency requests and Google Fonts removed. No field/device
  coverage or whole-provider privacy claim follows from these tests.
- Both tools have canonical catalogue/config entries and complete EN/ES guides
  in `service-pack-guides.ts`, plus original fictional examples. Portal typecheck
  and the FOSS gate passed for 61 cards. These portal changes are **not released**.
- Super Productivity 19.1.0 (`42ded9f`) built successfully with compatible
  dependency updates and is staged on 3172. Task creation/reload and initial
  network check passed. Native focus/export/import/offline checks are ongoing.
  Native task/focus, reload, JSON export and fresh-browser import also passed.
  A self-only CSP blocks cloud integrations; no SuperSync/database was installed.
- CryptPad 2026.9.0 / cryptpad-server 1.0.1 and official Office v9.3.2+3/x2t assets
  installed on 3173. Official installer checked asset SHA512; office assets are
  about 1.2 GiB unpacked. Main/sandbox origins use separate names. Native owner
  creation succeeded; checkup 51/55 (policy links, support key and test HSTS not
  configured). Drive loading was a private-test CA/SharedWorker issue, not an
  application failure. Public main/sandbox TLS now works. Two independent public
  Chromium sessions edited a Markdown document and owner reload retained it;
  no external browser requests were observed. Office/permissions/restore checks
  remain; this does not establish the whole suite is ready.
  No server file logs/container logs; diagnostic stdout, when explicitly enabled
  in the private synthetic test, is reduced to event types and then disabled.
- LiberaForms 4.11.1 (`4d59674`) complete Python app and isolated PostgreSQL 17.11
  running on 3176, publicly routed at forms.utilibre.org. Native owner login,
  personal-key generation/backup, encrypted feedback submission and operator
  browser decryption passed. The submitted synthetic answer was absent in
  plaintext from its request; the private key did not leave the browser in that
  test. Native Restore reads the clipboard when permission is granted; the
  optional paste field is a fallback. Encryption REQUIRED, uploads/metrics/RSS disabled;
  creator invitations retained. Logging sink disabled, static CSS builds disabled
  in request handling through supported Flask-Assets options. Encryption-key,
  response, export and isolation checks still pending. Initial requirements scan
  produced 233 advisory records (including duplicate aliases), not 233 proven
  exploitable application flaws; final resolved-environment review remains.
- Galene 1.2.1 (`6d9338e`) built from native upstream source; group/token/ICE tests
  passed. No public meeting or TURN service enabled by this build alone.
- wallabag 2.6.14 official image inspected, not launched: PHP 8.1.32 / Alpine 3.19.8
  and Composer reported 60 advisories across 19 packages. Do not publish this
  image. Check supported rebuild/patch bounds; no weakening of the privacy gate.
- FreshRSS text-first CSP and logging controls are deployed on the existing
  1.29.1 image. No existing subscriptions, accounts, retention or article data
  have been changed. Feed-pack and authenticated-browser checks remain.

The forms proxy uses **same-origin** Referrer-Policy, not no-referrer: Flask-WTF
requires the same-origin Referer for its HTTPS CSRF check. Public login and
decryption passed after this correction. Cross-origin referrers remain blocked;
CSRF protection remains enabled.

`backup.mjs` created a 252 KiB local encrypted snapshot at 00:45 UTC using native
pg_dump/tar and OpenSSL CMS AES-256-GCM. `verify-backup.mjs` authenticated all four
archives, restored PostgreSQL into a temporary separate database and verified
native login, authorized form access and the synthetic encrypted answer. It also
extracted CryptPad files into a private temporary directory; browser recovery of
that copy remains untested. The temporary database/files were removed, not live
data. The private decryption key is outside the snapshot, on the same VM; this is
not off-host disaster recovery. No automatic backup deletion is enabled yet.

New static and CryptPad outbound connections are denied by the pack firewall;
LiberaForms permits only its private database and existing SMTP relay. IPv6 is not
enabled on these new Docker bridges. Runtime request logs are disabled for new
services. The test-only Caddy container binds loopback 8443, uses a private CA and
does not represent a successful public TLS test. Remove it after verification.
Owner/bootstrap files stay in `/opt/utilibre/pack-secrets` (0700; credential files
0600), never in source or output. Do not publish browser storage-state files.

Build static assets outside request handling, one heavy build at a time. Keep
services independently bounded and private until their functional/privacy gates
pass. Preserve previous images and state; never use volume deletion or global
prune. Portal release follows `docs/deployment.md` and source publication.
Collab-only rollback image is `public-utility-portal:pre-collab-use-now-20261007`;
the WBO service itself must not be restarted for a catalogue rollback.

## Source log

Retrieved 2026-10-07; pinned source/configuration decides deployed claims.

Additional primary checks, 2026-10-08:

- https://developers.cloudflare.com/cloudflare-challenges/challenge-types/javascript-detections/
  (`Cache-Control: no-transform` prevents HTML script injection).
- https://docs.cryptpad.org/en/user_guide/apps/sheets.html (older documented Undo
  modes compared with direct installed-version tests, not blindly copied).
- https://docs.liberaforms.org/user-guide/e2ee/ (keys, browser storage and sharing;
  current local templates and observed UI decide the walkthrough).
- https://symfony.com/blog/cve-2025-64500-incorrect-parsing-of-path-info-can-lead-to-limited-authorization-bypass
- https://github.com/guzzle/guzzle/security/advisories/GHSA-w248-ffj2-4v5q
- https://github.com/guzzle/guzzle/security/advisories/GHSA-f2wf-25xc-69c9

- https://docs.cryptpad.org/en/admin_guide/installation.html (documentation's
  example tag predates current release; inspect selected release scripts).
- https://github.com/cryptpad/cryptpad/releases/tag/2026.9.0
- https://docs.liberaforms.org/sysadmin/install/
- https://codeberg.org/LiberaForms/server
- https://github.com/mbloch/mapshaper/releases/tag/v0.7.80
- https://numbat.dev/docs/web/usage/
- https://github.com/sharkdp/numbat/releases/tag/v1.24.0
- https://github.com/super-productivity/super-productivity/wiki/2.13-Run-with-Docker
- https://jupyterlite.readthedocs.io/en/stable/howto/pyodide/wheels.html
- https://github.com/cryptpad/onlyoffice-editor/releases/tag/v9.3.2+3
- https://github.com/cryptpad/onlyoffice-x2t-wasm/releases/tag/v9.3.2+3
