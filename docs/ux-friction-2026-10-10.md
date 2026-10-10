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
