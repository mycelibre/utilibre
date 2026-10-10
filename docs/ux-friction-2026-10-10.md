# Catalogue friction follow-up — 10 October 2026

Scope: the owner's live review, preserving the existing Field Ledger design,
EN/ES voseo, tool URLs, permissions, local toolkit v1 format and upstream identity.
No new dependency, account system, tracking, service or Caddy route.

## Implementation and evidence

| Report | Implementation | Verification |
| --- | --- | --- |
| PDF search relevance | `catalog/discovery.ts`: localized exact/phrase/title-token matches outrank upstream names, task synonyms and descriptive mentions; locale-name tie break. Access/group filters remain independent. The picker reuses this function. | PDF/OCR first in EN/ES; “quitar fondo”, accents, punctuation-only/empty queries, all-term matching, filtered results and exact titles tested. |
| Text-heavy cards | `components/catalog-ledger.ts`: keep purpose, access, material limitation, processing and primary action visible. Move best-for, attribution and guide into Help & privacy. VERT no longer repeats its remote-video restriction in its summary. | Initial HTML retains details and attribution. Browser disclosure, direct links, mobile layouts and keyboard save tested. At 1440px, unchanged EN PDF search examples: Bookbinder 346→249px, local résumé 316→272px, trip 416→318px, QR 324→249px. PDF stays 272px while gaining two task shortcuts and Save. These are row heights, not speed/traffic measurements. |
| My Utilibre friction | Catalogue Save action pins to the current starting collection; fresh storage read, duplicate/limit/invalid-data handling, no overwrite on read failure. Searchable native picker. Manage/share/backup/import/reset are disclosures. `main.ts` respects already-handled link events. | Keyboard save stays on catalogue, emits no network request and appears in My Utilibre. Import/export, shared preview, ordering, blocked storage and scoped reset pass. No application documents are stored or cleared. |
| Operator-oriented status intro | Concise EN/ES intro; checked time and refresh precede results; native disclosure contains method and limitations. | Mocked status response tests preserve unknown states; method disclosure and DOM order checked. No status backend change included. |
| QR mixed languages | Existing offline adapter follows upstream `html[lang]` after asynchronous loading and language changes. Size/error-correction options use native `data-i18n` dictionaries; offline guide follows EN/ES. | QR p4: generation and decoded contents, PNG/SVG/PDF, synthetic camera, desktop/390px, EN/ES language switching, zero observed external requests. Offline p3→p4 update, interrupted install/retry, disconnected new tab, asset removal preserving storage pass. No physical-camera/device test claimed. |
| PDF second selection/incorrect guide | Native merge/compress/OCR shortcuts; general card selects scanned-document guide explicitly, not incidental Markdown guide. | Both localized destinations inspected; source routes exist. Guide links preserved in normal HTML inside disclosure. |
| Markdown PDF export | Bilingual guide clarifies native browser printing, Save as PDF, missing-dialog recovery and page-range checking. No replacement export engine. | `deployment/toolbox/check-markdown-print.mjs`: actual headed Linux Chromium `window.print()` with Save as PDF selected via kiosk printing, not a print stub or `page.pdf()`. English 10,867-byte and Spanish 10,622-byte PDFs reopen in PDF.js with expected fictional content. Both include one trailing blank text page: preview/page selection remains a native limitation. No external origins observed. Windows/Opera and OS destination selection by a human are not verified. |

## Navigation constraint

The owner's earlier restriction remains: return links only via supported native
configuration, not response rewriting or source forks. Existing supported links
are retained; see `instance-navigation.md`. QR's existing offline-guide link now
uses the right language and leads back through portal navigation.

The installed QR revision has no documented custom-navigation field. BentoPDF
2.8.8 has brand name/logo and **text** footer settings, not arbitrary navigation
URLs; its logo points to its own tool directory. No global Utilibre bar was
injected. A uniform catalogue/privacy/help menu in these two native interfaces
therefore remains unimplemented under that constraint. Portal launch links
continue to open a separate tab, retaining the catalogue.

Source evidence checked 10 October: QR commit
`0fde7004a08aac6a218e5d5e03c8a3c760eec1fa`, local `public/js/app.js`
(`updateUILanguage`) and [upstream repository](https://github.com/jmarc9901/qr-code-generator-pwa);
BentoPDF [v2.8.8 settings](https://github.com/alam00000/bentopdf/blob/v2.8.8/.env.example),
local `src/partials/navbar-simple.html`, `footer-simple.html`, and
`src/js/utils/markdown-editor.ts` (`exportPdf`).

## Release and rollback

Deployed images: `public-utility-portal:0.1.0-ux-20261010` and
`utilibre-qr-offline:0fde700-p4`. Both services are healthy. Public HTTPS checks
passed for EN/ES search ordering, direct card saves, collection search, the revised
PDF guide, six localized merge/compress/OCR routes, status and QR workflows.
Six public entry/guide routes also passed initial-HTML, canonical and indexing
directive checks. Both QR languages exported readable PNG/SVG/PDF and reopened
offline without observed external requests. No Caddy adjustment was required.

Checks: lint/typecheck pass; 103 current-worktree unit tests and 101 isolated-release
tests pass (the two pending status-concurrency tests are deliberately excluded).
68 Chromium desktop/mobile browser checks pass. Native print check passes in
both languages with the blank-page limitation above. The existing Vite warning
about the large shared content bundle remains; no payload/performance win claimed.
Only disposable synthetic browser profiles and loopback test containers were used.
The existing checked server/status-target code remains byte-identical in production.
The large pre-existing dirty worktree was not broadly committed or published.

Private release directory: `/opt/utilibre/portal-ux-3Q1wRz`. Its source starts
from the previous published portal, with only this task's files overlaid.
Unrelated pending status-concurrency code and other worktree changes are excluded.
`rollback-compose.yaml` is private resolved configuration; never publish it.

Portal rollback: restore `PORTAL_IMAGE=public-utility-portal:0.1.0-copy-moodist-20261010`
in the private `.env`, then `docker compose up -d --no-deps --no-build portal`.
QR rollback: set its image to retained `utilibre-qr-offline:0fde700-p3` in
`deployment/community/compose.qr-offline.yaml`, then run
`docker compose -f deployment/community/compose.qr-offline.yaml up -d --no-deps --no-build qr-offline`.
Reopen QR online and use its native update action; do not clear user preferences
to force an update. Previous source archives/index are retained in the release
directory. No application/user data migration occurs.

Reproduce QR: apply the existing `qr-offline-source.patch` to the pinned upstream
source, then use the current `Dockerfile.qr-offline`, packaging script and adapter
from the integration archive (they supersede the older recipe embedded in the
base patch). The p4 application archive includes those current deployment files:
`docker build --build-context integration=deployment -f Dockerfile.utilibre -t utilibre-qr-offline:0fde700-p4 .`.

Browser coverage is Chromium desktop and mobile viewport emulation, plus headed
Linux printing; it does not establish physical-phone or Safari/Firefox coverage.
Build/lint/typecheck and focused regression checks are required before promotion.
No search ranking, indexing, traffic or real-user performance outcome is claimed.

## Everyday collections and easier guide entry — October 10

The follow-up extends the same design, not the service inventory. GitHub's prior
publication checkpoint is `029cf50`. No application account, storage, privacy,
retention, donation privileges or instance-list submission changes in this release.

| Need | Implemented route / source | Evidence |
| --- | --- | --- |
| Documents and applications | `/es/colecciones/documentos-y-tramites`, `/en/collections/documents-and-applications` | PDF/OCR, miniPaint, image compression and PairDrop from canonical catalogue IDs; fictional 1200×800 image exercise; manual handoffs and hypothetical 600×400 / 200 KB target stated. |
| Organize a workshop | `/es/colecciones/organiza-un-taller`, `/en/collections/organize-a-workshop` | Pollaris, Excalidraw, draw.io and offline QR; existing bilingual native workshop files; participant/management links distinguished. |
| Study and presentations | `/es/colecciones/estudio-y-presentaciones`, `/en/collections/study-and-presentations` | Markmap, draw.io and RAWGraphs; existing bilingual survey CSV; 12/8/6 fictional responses, not visitor research. |
| Start or save without searching again | `scenario-collection-data.ts`, `scenario-collections.ts`, `pages.ts` | Compact homepage entry links; worked example before tools; save in header and ending; existing toolkit-v1 preview then explicit Save a copy. Does not overwrite preferences or store documents. Clipboard-denial fallback tested. |
| Guide discovery | `guide-discovery.ts`, `practical-guides.ts` | Six everyday starters; visible jump to full-index search; accent-insensitive EN/ES terms; counts/empty state/clear; no request or persistence while searching. All guide links remain in initial HTML. |
| Practice at the point of discovery | `catalog-ledger.ts` | Sample links on PDF, miniPaint, compression, draw.io, Excalidraw, Markmap, charts and transfer cards; six guide openings have result, action, file, three-step overview and device caveat. Existing detailed instructions remain. |
| Share an outcome | routes, SEO, sitemap, `build-collection-previews.mjs` | Six canonical localized pages, reciprocal language links, distinct descriptions and 1200×630 local PNG previews. Existing Playwright renders original HTML/fictional data, not invented app screenshots. All six provenance sidecars pass the asset scan. |
| Voluntary support | EN/ES support intro, `#funding`, `#maintenance` | Owner-approved emphasis: voluntary project, a small way to give back; donations appreciated, never required. No donation total, shortfall, counter or target. Approximate $300/month is explicitly the **whole shared setup**, behind a disclosure; Utilibre uses a VM/supporting services and its share is not calculated. Brief verified maintenance notes; existing nonfinancial contribution and Liberapay routes. |

### Bounded verification and remaining limits

- Lint, TypeScript and client/server build passed. Current working-tree unit
  suite: 114 passes; the release excludes two unrelated pending status-concurrency
  tests. Eight IndexNow selection tests and 74 Chromium desktop/mobile-emulation
  browser checks pass, including all six collection URLs, deliberate local save,
  import/export preservation, guide search, downloads, language switches, hidden
  clipboard fallback, voluntary support and prior catalogue regressions.
- Public HTTPS, October 10: existing `check-starting-projects.mjs` with
  `APP=whiteboard` and `APP=charts` passes EN/ES import/edit/export/reopen of the
  workshop board and CSV→SVG labels/12/8/6 checks. No outside hosts or uploads
  observed in these bounded synthetic journeys. No new proxy-content tests.
- `APP=paint node deployment/toolbox/check-practice-guides.mjs`: the collection's
  fictional image imports, resizes to 600×400 and exports as an 89,248-byte PNG
  that decodes successfully. No application uploads or outside hosts observed.
- PDF: Chromium Pixel 7 emulation, 390×844, 4× CPU slowdown, 150 ms latency and
  1.6 Mbps download. Select fictional scan, rotate 90°, download, independently
  parse with PDF.js and reopen in BentoPDF: pass. One-page 68,465-byte output;
  3,340,971 total encoded response bytes during the test; no outside origins or
  upload requests observed. This is not a speed benchmark or physical-phone test.
- Native phone file pickers, finding downloads in Android/iOS Files, OS sharing,
  interruptions, camera and lower-powered physical hardware remain untested.
  The UI does **not** advertise universal mobile compatibility. A larger screen
  is recommended for dense image/chart/diagram controls.
- Independent design reviewer: **ship**, scoped to eight supplied desktop/mobile
  captures, six share previews and sampled source. No material findings. Existing
  palette/type/ledger retained; semantic hidden states fixed. Not a backend,
  dark-mode or physical-device certification. Brief records the extension.
- Existing large-content-bundle warning remains: client entry about 1,009 KB
  minified / 326 KB gzip. No new dependency, analytics, model download or embedded
  application. Share previews are metadata assets, not homepage preloads.

### Small launch packet — drafts, not messages sent

Use an existing personal relationship or a channel that permits project sharing.
Disclose involvement, share one relevant page, and ask one practical question.
No bulk outreach, tracking parameters, recipient list or automatic messages.

**People preparing documents (teachers, students, office/community workers)**

ES: «Estoy armando Utilibre como proyecto voluntario. Este recorrido sirve para
preparar una imagen para una solicitud o trabajar con un escaneo, con un archivo
ficticio para probar sin subir documentos personales. ¿Se entiende cómo empezar
y dónde encontrar la descarga? https://utilibre.org/es/colecciones/documentos-y-tramites»

EN: “I’m building Utilibre as a voluntary project. This walkthrough brings
together tools for preparing an image for an application or working with a scan,
with a fictional practice file. Is it clear how to start and find your download?
https://utilibre.org/en/collections/documents-and-applications”

**A workshop organizer or community association**

ES: «Hago Utilibre para aportar algo útil. Acá reuní una encuesta de fechas, una
pizarra editable de práctica y herramientas para compartir la invitación. No hace
falta una cuenta para estos pasos. ¿Qué faltaría para organizar tu próxima actividad?
https://utilibre.org/es/colecciones/organiza-un-taller»

EN: “I run Utilibre as a small way to give back. This page combines a date poll,
an editable practice board and tools for sharing an invitation, without an account
for these steps. What would be missing for your next activity?
https://utilibre.org/en/collections/organize-a-workshop”

**A teacher or student group**

ES: «Estoy preparando recorridos de práctica en Utilibre. Este usa apuntes, mapas
mentales y una encuesta ficticia de tres filas para crear una gráfica. Podés
descargar y cambiar el ejemplo. ¿El resultado ayuda a explicar los datos?
https://utilibre.org/es/colecciones/estudio-y-presentaciones»

EN: “I’m making practice walkthroughs for Utilibre. This one uses notes, mind maps
and a three-row fictional survey to make a chart. The example is yours to download
and edit. Does the result help explain the data?
https://utilibre.org/en/collections/study-and-presentations”

Ask for voluntary written feedback via the existing private feedback form or
approved contact channel, without documents, management links or identifiers.
Useful outcomes are a readable download, reopened editable example or saved
tool selection—not a required return to the homepage. No visitor instrumentation
is added to count these. Publish a brief maintenance note when that feedback leads
to a verified improvement; do not manufacture a publishing schedule or popularity.

### Exact owner follow-up

1. Try one example on a real phone: select file, keep guide available, export,
   locate/reopen download, then use the OS share menu. Record only device/browser
   and synthetic task outcome, not visitor content. Do not assign a mobile badge
   from the emulation result.
2. Search Console access is unavailable here. In an existing verified property,
   check the new collection URLs with URL Inspection and the existing sitemap.
   If no property exists, use Domain property DNS verification; do not add an
   analytics script. Compare available page/query impressions and clicks with
   reporting limits, not site-level visitor tracking. Missing data is unavailable,
   not zero. No indexing, rankings or traffic improvement is asserted.
3. No financial breakdown is required for this release. If a future Utilibre-only
   cost is published, first agree an allocation method for the shared server and
   the period covered. Do not relabel the whole $300 as a Utilibre bill or target.

Primary guidance checked October 10: [Google helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
supports useful task pages for an intended audience;
[Search Console ownership verification](https://support.google.com/webmasters/answer/9008080?hl=en)
documents DNS verification without visitor analytics. These are discovery practices,
not evidence of search outcomes. Storage Box advice given during this work is a
separate research answer; this release does not move files or change backups.

### Collection release and rollback

Deployed `public-utility-portal:0.1.0-collections-20261010` on October 10.
Portal healthy. Isolated source/build at `/opt/utilibre/portal-collections-ijNh6z`;
112 release unit tests passed. Pending status-concurrency code/tests were excluded.
The only server change is social-image alternative text and card size metadata.
The public configuration is byte-identical to the previous release, including
application URLs and access settings. No Caddy change or user-data migration.

Live HTTPS: all six collection pages and preview images returned 200 with correct
canonical/reciprocal language metadata. Separate EN desktop and ES 390px Chromium
journeys passed homepage → collection → preview → explicit local save; guide
search → practice download → native OCR in a new tab with guide preserved; and
the voluntary support copy/collapsed cost disclosure. The full 168-page technical
SEO gate passed before the IndexNow API rejected the single 10-URL notification
with HTTP 403. The proof file returns 200 and the exact expected key here, but
engine-side key validation is unresolved. No successful notification is claimed.
See the dated follow-up in `seo-catalog-2026-10-09.md` for research and limitations.

Rollback: restore `PORTAL_IMAGE=public-utility-portal:0.1.0-ux-20261010` in private
`.env`, then `docker compose up -d --no-deps --no-build portal`. Retained previous
source archive/index are in the release directory. Restore those matching source
artifacts if rolling back. This preserves application data and local toolkit v1.
