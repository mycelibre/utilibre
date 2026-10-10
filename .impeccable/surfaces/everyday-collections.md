---
version: 1
slug: everyday-collections
primary_target: portal/src/pages/scenario-collections.ts
related_targets: [portal/src/pages/scenario-collection-data.ts, portal/src/pages/guide-discovery.ts, portal/src/pages/practical-guides.ts, portal/src/pages/pages.ts, portal/src/components/catalog-ledger.ts, portal/src/styles/main.css]
---
# Everyday collections and guide entry

Read / Operate extension. Existing tools, fictional practice files and browser-local
toolkit v1 remain the sources of truth. No new service, tracking or identity.

## Direction contract

THESIS: Start from a document, a workshop or a study task, not another app directory.

OWN-WORLD: Inherit paper/ink, Newsreader headings, hyperlegible actions, square
controls and ruled lists from the Useful Field Ledger.

STORY: Choose a situation, try a small example, open its tools, and deliberately
save a copy of the selection in Mi Utilibre.

FIRST VIEWPORT: Compact homepage situation links; guide index starts with everyday
tasks and search; collection title, purpose and save action precede a worked example.

FORM: Code-led narrow extension of inherited seed 356eafe7. No concept tournament.

FINISH: SHIP for the reviewed local build, 2026-10-10. Source authoring, fresh
finish review, scoped design documentation and raster provenance are complete.
This is an inherited Field Ledger extension: root DESIGN.md and its sidecar remain
the visual authority and were preserved. This disposition does not claim a
production release or real-phone verification.

## Built surface

Three collections are available in English and Spanish: Documents and
applications (four existing tools), Organize a workshop (four), and Study and
presentations (three). They are curated views of existing catalog IDs; catalog
facts and runtime configuration still determine access and launch availability.
No service or dependency was added.

The collection header gives the purpose, current access note, example jump,
tool-list jump and save action. A fictional worked example, download, expected
result and verification steps precede the tools. Tool records retain access
labels, upstream credit, data limits and a guide link. Privacy and device notes
follow the list. Saving opens the existing Mi Utilibre preview and requires an
explicit save of a copy; it stores tool shortcuts, not documents. Sharing copies
the public collection URL and provides a selected manual-copy field if the
clipboard is unavailable.

The homepage adds three compact situation links within the ledger workspace.
The guide index leads with six existing practical workflows, then the collections
and full guide index. Its browser-local search has a visible label, clear action,
announced result count and useful empty state; the query is neither sent nor
saved. The complete guide list remains available in the static rendering.
Featured guides bring the target result, existing practice download, tool action
and short overview forward. Catalog practice links connect tools to those guides.

Configured support remains voluntary. Its expandable cost explanation identifies
the approximately $300 monthly figure as the operator's estimate for shared
infrastructure and says Utilibre's portion has not been calculated separately.
The site adds no donation totals or fundraising target, and configuration still
controls whether the support surface is available.

## Inherited visual truth

The implementation uses the existing paper, ink and rule tokens, Newsreader
headings, Atkinson Hyperlegible Next body copy, square controls and flat ruled
sections. No new palette, typeface, shadow, motion system or global design rule
was introduced. Example previews show fictional file contents with captions;
they are not presented as application screenshots or visitor documents.

Collection and featured-guide links use open text lists with rule separators and
responsive columns. Homepage collection links are compact and omit their longer
descriptions. Below the existing 39rem breakpoint those links and guide-search
controls become one column. Action rows wrap, button labels may wrap, images stay
within their container, and Spanish copy keeps the same readable source order.
Search filtering and clipboard recovery honor semantic `hidden` state through
the stylesheet override, while preserving `hidden="until-found"` behavior.

These are surface-specific compositions within the existing Useful Field Ledger,
not changes to the global design system. No drift repair was performed.

## Review and verification evidence

The fresh `collections_finish_review` reviewer returned **SHIP**, with no material
findings after opening all eight final captures and all six share previews.
Final captures are in `.impeccable/review/everyday-collections/`:

- `desktop.png` and `mobile.png`: full collection pages.
- `guides-desktop.png` and `guides-mobile.png`: guide discovery.
- `home-desktop.png` and `home-mobile.png`: homepage entry points.
- `guide-mobile.png` and `support-mobile.png`: practical guide and support.

The six English/Spanish collection PNGs in `portal/public/previews/` were rendered
locally from HTML by `portal/scripts/build-collection-previews.mjs`. Each has its
adjacent `.png.json` provenance record. The raster scan reported six assets and
zero missing provenance records. The documents preview reuses the existing
fictional practice image and its provenance; the previews use no visitor data.

At the documentation handoff, the main agent reported passing lint, typecheck,
build, 114 unit tests in the current worktree, eight IndexNow selection tests and
74 Chromium desktop/mobile browser tests. The worktree unit count includes two
unrelated status-concurrency tests; it is not a claim about the final release's
test count. Real phones were not tested. Device notes retain practical file,
download and screen-size limits without claiming universal compatibility.

Release, deployment and production verification remain separate from this local
design finish record.
