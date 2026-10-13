# Creative and personal-record tools — 11 October 2026

Release scope: eleven usable applications; two explicit holds. This extends the existing portal, identity service, status monitoring and encrypted Storage Box backups. No new analytics, shared public account, server video renderer or public website-upload backend was introduced. Existing SearXNG/Redlib URLs and submissions are unchanged.

## Inventory and acceptance

Exact source revisions and licence evidence are the canonical `portal/src/catalog/creative-providers.ts` records. Runtime images are pinned in the two Compose files. Versions below include Utilibre's small privacy patches where indicated.

| Application / hostname | Port | Version / licence | Actual check / access |
| --- | ---: | --- | --- |
| Grist / grist.utilibre.org | 3227 | 1.7.21 / Apache-2.0 | Approved Authentik account; private document, formula 7 × 3 = 21, second-user denial, native SQLite export and isolated restore |
| Candlr / candlr.utilibre.org | 3228 | 2.0.0-p1 / GPLv3, version scope not confirmed | Approved Authentik account; fictional person/date, second-user denial, JSON export and isolated SQLite restore; reminder delivery not tested |
| Bookplate / bookplate.utilibre.org | 3229 | 1.1.0-p1 / Apache-2.0 | Closed native accounts; saved book, private library, ZIP export, isolated PostgreSQL restore and note-image owner/other-user/guest isolation |
| OpenReel / openreel.utilibre.org | 3230 | 0.1.2-p1 / MIT | Anonymous browser processing; fictional still image → five-second 1920 × 1080 MP4, downloaded/reopened, nonempty decoded frame |
| OpenPlan3D / floorplan.utilibre.org | 3231 | 0.9.0-p1 / MIT | Anonymous browser processing; three walls, 3D canvas, JSON export and import |
| Blockbench / blockbench.utilibre.org | 3232 | 5.2.2-p1 / GPL-3.0-or-later | Anonymous browser processing; cube model, native BBMODEL save and import |
| Glyphr Studio / glyphr.utilibre.org | 3233 | 2.10.6-p1 / GPL-3.0-or-later | Anonymous browser processing; GS2 save/import, OpenType export checked for OTTO signature |
| Graphite / graphite.utilibre.org | 3234 | 7477cd2 alpha / MIT OR Apache-2.0 code | **Unavailable:** nonfree branding assets prohibit use in our modified build |
| JSCAD / jscad.utilibre.org | 3235 | Web 2.6.13 / MIT | Anonymous browser processing; native folder import with package.json, 20 × 15 × 10 cube → 12-triangle STL |
| GridSpace / grid.utilibre.org/kiri/ | 3236 | 4.7.0-p1 / MIT | Anonymous browser processing; STL → slice/preview → downloaded G-code with movement commands; no physical print certification |
| FossFLOW / fossflow.utilibre.org | 3237 | 1.4.0 / MIT | Anonymous browser processing; native diagram JSON export/import/re-export |
| VvvebJs / vvveb.utilibre.org | 3238 | 1acbab7-p1 / Apache-2.0 | Anonymous browser processing; edit heading in native iframe → ZIP containing HTML and local CSS; no server save/upload |
| microStudio / microstudio.utilibre.org | 3239 | b59d904 / MIT | **Unavailable:** authentication/dependency review failed; only an intentional HTTP 503 notice is served |

Checks used synthetic data in Linux headless Chromium against the public HTTPS applications. Reports are private under `/opt/utilibre/reports/creative-batch-20261011/` and `/opt/utilibre/reports/records-20261011/`. Native OS file-picker tests used the application's supported HTML input fallback. No real phone, physical print, long-video render, every import format, email-reminder delivery or concurrency ceiling is claimed. GridSpace's Mesh:Tool is bundled but its editing/export journey was not checked.

## Privacy and custom-glue inventory

- `deployment/creative-batch/*-prepare.mjs`: pinned source edits removing telemetry, optional remote models, cloud integrations, plugin downloads or remote fonts; no replacement editor, codec or synchronization implementation. OpenReel uses its native processing code, local FFmpeg core 0.12.6 and bundled Mediabunny.
- `vvveb-prepare.mjs`: static upstream builder, bundled Bootstrap CSS, fictional starting page and native ZIP download. PHP save/upload, AI, remote fonts, media search and embeds are absent. A small ImageInput initializer/context correction allows the native property editor to work without its optional server media plugin. Upload is explicitly refused locally.
- `grid-prepare.mjs` / `grid-publish.mjs`: native browser bundles, no usage counters or server printer connectors. COOP/COEP enables its native shared-memory workers. Printer/cloud panels requiring omitted backends are hidden.
- `floorplan-prepare.mjs`: upstream static SvelteKit frontend only; no MCP/AI backend or remote assistant handoff.
- `glyphr-prepare.mjs`, `blockbench-prepare.mjs`: remove automatic upstream telemetry/update/plugin calls, retain local fonts, notices and native export mechanisms.
- `deployment/candlr/prepare.mjs`: disable unsolicited version checks, remote photos, CardDAV and unsupported non-email notification providers. Native OIDC remains; no new account system.
- `deployment/bookplate/prepare.mjs`: disable browser error reporting, public showcases and unrelated integrations. Native authenticated note-image endpoints remain. Guest image access returned 401, another account returned 404, owner returned JPEG; deletion removed the image. `/uploads/` is denied at the gateway.
- `deployment/grist/custom.css`: supported static custom-CSS hook hides the upstream MCP promotion while that integration is disabled. No UI redesign or upstream source fork.
- `deployment/records`: native databases, OAuth2 Proxy and existing Authentik policy configuration; gateway and outbound allowlist; native dump/snapshot/restore checks. No portal collection of document content or activity.
- `portal/src/catalog/creative-additions.ts`, `creative-providers.ts`, `pages/creative-guides.ts`: existing catalogue/help/guide formats only. No competing service registry, database or analytics events.

Checked static tasks made no external HTTP requests, content POSTs or page errors. Grist/Candlr authentication contacts the existing Utilibre identity origin. Bookplate's requested lookup can contact the documented book/cover/dictionary providers through a narrow server egress allowlist; a real OpenLibrary request succeeded while internal metadata and an unrelated public host were denied. This does not mean its operator cannot read stored account content. All three account services store readable functional data server-side, not end-to-end encrypted data. Browser tools retain their native local data/export behavior; browser storage is not a backup. Optional unsupported remote functionality is removed or denied rather than advertised as working.

Runtime containers have bounded CPU/RAM/tmpfs, dropped capabilities, no-new-privileges, read-only application filesystems and disabled Docker request logs. Static and account networks reject new outbound/internal-host connections except the declared functional paths. These checks do not independently establish external Caddy/Cloudflare provider retention; existing provider audit limitations still apply.

## Guides and practice files

Eleven complete guides in both languages (22 routes), linked from their task cards and the generated guide index/sitemap:

| English guide under /en/guides/ | Spanish guide under /es/guias/ |
| --- | --- |
| structured-table | tabla-estructurada |
| important-dates | fechas-importantes |
| reading-journal | diario-lectura |
| short-video | video-corto |
| floor-plan | plano |
| low-poly-model | modelo-pocos-poligonos |
| font-project | proyecto-tipografia |
| code-to-3d | codigo-a-3d |
| slice-model | preparar-modelo-3d |
| isometric-diagram | diagrama-isometrico |
| html-page | pagina-html |

Fictional examples: `records-practice.csv`, `floorplan-practice.json`, `blockbench-practice.bbmodel`, `glyphr-practice.gs2`, `fossflow-practice.json`, `jscad/` (code plus required package.json), `practice-cube.stl`, and the existing `fictional-image.jpg`. Format/provenance notices are in `portal/public/examples/LICENSE.txt`. Native imports were exercised before publication. The Vvveb starter is built into its own origin; its ZIP is the user's copy. Account examples contain no real user records. No untested microStudio or Graphite walkthrough is published.

## Capacity, backups and retention

Observed VM: 16 virtual CPUs, about 34 GiB RAM; root filesystem about 148 GiB. After this batch and removal of its disposable Graphite Rust build cache, about 11 GiB was free. Build caches were the major new disk burden, not idle static serving. No concurrent-user claim follows from these observations.

Idle snapshots around 09:35 UTC: shared static gateway 2.8 MiB, Glyphr 2.2 MiB, Grist 202 MiB, Candlr 204 MiB, Bookplate 81 MiB, PostgreSQL 42 MiB. These are observations, not reserved memory or peaks. Limits: static 1 CPU/128 MiB, Glyphr 0.5 CPU/96 MiB, Grist 2 CPUs/8 GiB, Candlr 1 CPU/512 MiB, Bookplate 1 CPU/768 MiB, PostgreSQL 0.5 CPU/256 MiB. OpenReel's static directory is about 93 MiB including optional processing assets; it is not all downloaded at page load. Browser video, geometry and font work can be demanding on visitors' devices.

Grist limits: 10 MiB imports, 5 MiB attachments, five parallel requests/document; not a total account storage quota. Bookplate native limits: 1,000 books, 5,000 words, 100 MiB/account, 5 MiB/file and 25 MiB/import. Candlr has no newly invented per-account quota; approved enrollment controls exposure.

Saved account work is backed up daily at 01:25 by `utilibre-records-backup.timer`. Native snapshots briefly stop the three apps for consistency, preserve their databases/uploads/configuration, then restart only previously running apps. The backup refuses to proceed below 5 GiB free. Local generation expiry is not yet configured: do not claim immediate deletion from backups. Existing Storage Box native backups now include this group, under the existing seven-daily/four-weekly policy. Upload on 11 October succeeded (snapshot `44e172d5c31bff6bf45ed811d96b885144bdc3204e9313fd9b129d40bb3d83cf`); policy rotation removed one superseded snapshot while retaining current data. An isolated local restore of synthetic Grist/Candlr/Bookplate state passed; a separate restore of this new off-host generation was not run. Temporary sharing content remains excluded.

## Why two applications are withheld

Graphite's required branding archive at `Keavon/graphite-branded-assets`, revision `ca7dd793caba8999ec33fde99bb721a69c3d221f`, contains a proprietary licence allowing unmodified official builds, not our privacy-modified build. Archive SHA256: `77e8a6b68d67a8d5fcfd6268a6b7938ac9322d877378c6563e933a57df6da821`. Rust/WASM compiled, but these assets were not published. A compatible FOSS asset path or an appropriately licensed upstream build is needed; no assumption of permission, remote font fallback or large bespoke rebranding fork.

microStudio's reviewed complete server uses legacy password hashing (salt plus a single SHA-256) and its production dependency inventory reports 35 advisories: four critical, eleven high, eighteen moderate and two low. Some affect optional paths such as ACME, so that count is not a claim every issue is remotely reachable. Public multi-user release needs supported dependency/authentication repairs, separate editor/game-execution origins, and verified storage/retention isolation. Single-user standalone mode is not a substitute for public account isolation. No microStudio account service or datastore was started. Its reserved port serves an honest 503 notice.

## Build, release and rollback

Use the exact revisions in `creative-providers.ts`, not moving branches. Read each prepare script before running; it verifies its selected checkout under `/opt/utilibre/evaluation-src/*-20261011` (some also accept an explicit source path). Native lockfiles are retained. JSCAD uses the packaged web demo; Vvveb compiles its bundled Bootstrap SCSS with Sass 1.99.0 (`UTILIBRE_SASS_JS` can select its installed sass.js); other apps use their native production builds. `publish-static.mjs`/`grid-publish.mjs` install only browser output. `publish-sources.mjs` publishes pinned original code, exact source patch, lockfile and build material at each application's `/utilibre-source/`. Account source offers are generated by `deployment/records/publish-sources.mjs`.

Runtime definitions: `deployment/creative-batch/compose.yaml`, `deployment/records/compose.yaml`; corresponding enabled systemd units and firewall scripts live beside them. Caddy blocks: `deployment/creative-batch/Caddyfile`. Grist, Candlr and Bookplate data and secrets remain under root-controlled `/opt/utilibre/records`; never commit private files or browser-state captures.

Portal validation: `cd portal && npm run typecheck && npm run build && npm run lint && npx vitest run`; then `npm run test:seo` against the built server. Deploy only the portal service with the established root Compose workflow. Capture the old image and .env privately before updating. Reconcile the eleven new Kuma monitors with `node deployment/community/update-kuma-monitors.mjs --creative-batch`; these measure reachability, not completion or usage.

Rollback portal by restoring its previous image/environment and recreating only `portal`. Static rollback restores the corresponding prior output directory/image and recreates the static gateway; do not delete native user browser data. For account services, stop the relevant unit, preserve current data, and restore a validated native snapshot only after confirming source/image/schema compatibility. Do not apply an older database over live account work. A public hostname can remain on the intentional unavailable response while a rollback is investigated. Separate edge Caddy edits require the operator's established process.

### Production receipt, 09:46 UTC

Portal image `public-utility-portal:0.1.0-creative-20261011`, image config SHA256 `ac8d292e42d6c038f1834e9b48b7dade465cdd4d269c2dee18d36b3b640f1189`, is deployed. Eleven application probes returned operational; eleven Kuma monitors were added through its authenticated interface without replacing existing history. The two held applications are not enabled and cannot acquire a launch action merely by configuring a URL (regression tested).

Typecheck, build, lint, FOSS policy, 120 unit tests and the existing SearXNG pagination/log-redaction checks pass. The public SEO audit passed all 196 canonical pages, including the 22 new guide pages: metadata, unique titles/descriptions, H1, alt attributes, canonical/language links, sitemap and response behavior. This is not evidence of indexing or traffic. Initial portal JavaScript is 210,328 gzip bytes under the existing 215,000-byte build guard. Public EN/ES checks passed the Use now, Accounts, unavailable and Vvveb guide journeys at 1366px and 390px; no page errors, third-party requests or horizontal overflow were observed. Guide screenshots were inspected. The homepage still intentionally starts with eight selected everyday tasks; new tools belong in Use now or Accounts, not automatically in Start here.

Two synthetic Bookplate accounts were deleted through the native password-confirmed account-deletion flow; their former sessions then returned 401. Three synthetic Authentik identities were disabled and their sessions, tokens and MFA revoked. Real users and the administrator account were untouched. Synthetic account content remains only where native recovery snapshots or retained disabled-account records intentionally preserve it; this is not a claim of immediate backup erasure.

Rollback: previous image is `public-utility-portal:rollback-creative-20261011`; previous private environment is `/opt/utilibre/releases/creative-20261011/previous.env`. Restore these only for the portal, keeping the newly saved account data intact. Source offers are independently updateable. A mistargeted root-directory Vitest invocation was not used as release evidence; the supported portal-local pinned runner is the release gate.
