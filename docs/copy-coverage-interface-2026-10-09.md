# Interface copy coverage — 9 October 2026

This pass covers the complete English and Spanish dictionaries and the Utilibre-owned shell, shared page renderer, browser entry and server-rendered shell. Spanish remains voseo. The catalog, application guides, export guide, My Utilibre, offline tools and URL-router implementation have separate owners in this review. No upstream application's translation bundle was rewritten.

## Reviewed sources and decisions

| Source / surface | Result |
| --- | --- |
| `portal/src/i18n/en.ts`, `es.ts`: all 323 keys in each language | Reviewed all key families, including metadata, accessibility, navigation, themes, discovery, empty states, errors, status, software inventory and policy. Matching keys and nonempty Spanish values pass the existing tests. Replaced 22 existing English values and 23 Spanish values; introduced 14 paired keys for previously inline text and clearer labels. |
| Homepage positioning and four explanation cards | Kept the existing positioning line, four-card structure, task-first order and verified independence statement. Made storage explanations and the scope/date of checks easier to read. Spanish now uses the project's intended “software libre” wording. No new privacy guarantee or quantitative claim. |
| Search, filters and account access | Search suggests concrete tasks. Empty results offer a shorter search, cleared filters or All tasks. Removed the incorrect A–Z promise, stale “small collection” language and the incomplete list of services using Utilibre login. Cards remain the authority for each service's access. Manual approval and donation conditions are preserved. |
| Header, footer and accessibility (`components/shell.ts`) | Kept short literal navigation, theme controls, language links, keyboard behavior and the existing no-JavaScript navigation behavior. The footer now has its own descriptive landmark name, rather than a second Main navigation landmark. Security has a short footer label. The export/deletion page link states its purpose. Header tagline fallback matches the configured positioning in both languages. |
| About and support | About explains the hosted-software role and credits the original maintainers without an unexplained FOSS acronym. Support retains “Free to use. Not free to run.” and its natural Spanish counterpart; donation conditions stay literal. Contribution instructions name useful bug-report details and exclude private data. Moved the existing support contribution section into the normal bilingual dictionary; link targets and form permissions did not change. |
| Status, unavailable and 404 states | The failed status request explains that it cannot determine an individual application's state and points to the existing Refresh status action. The 404 gives a recovery path. Loading, availability states and existing access limitations remain literal; no invented progress or reassurance. |
| Metadata (`pages/pages.ts`, `main.ts`) | The guide description reflects the expanded collection without counting tools. About metadata uses the revised introduction. Browser-updated social-image alternative text now reads “Logo de Utilibre” in Spanish, matching the separately owned server correction. SEO title/canonical/indexing logic was preserved. |
| Software/source presentation (`pages/pages.ts`) | Source links identify the upstream source and project. An empty external-contact list reads “None listed” / “Ninguno indicado”, rather than an unexplained dash. SearXNG's local log-redaction suffix is localized. Corrected the generic unmodified-app label: it no longer incorrectly assigns every such app Anubis's bot-policy description. Anubis retains its specific description; licence/version/modification data were not changed. |
| `server-render.ts` | Reviewed and retained. It uses the same translated shell/page strings and a literal JavaScript requirement for interactive status/tool screens. No separate divergent copy or new runtime behavior. |
| Security, abuse, acceptable use, privacy, providers, retention, closure and processing labels | Reviewed for placement and translation consistency; protected substantive dictionary values are byte-for-byte unchanged from the start of this pass. No humorous language, new legal assurances, altered retention or softened warnings were introduced. |

There are no em dashes in the six reviewed interface source files after this pass. Repeated controls remain literal. No jokes were added to security, capacity, errors, recovery or account access. Existing honest funding understatement remains confined to editorial support copy.

## Native applications and mail boundaries

[The dated instance audit](instance-indexing-2026-10-09.md) records all twenty-two new additions, their public indexing directives and their native return-navigation limitations. The initial entry-page check found thirteen portal anchors and nine absent links. The later native-source review resolved Vikunja through supported OIDC Settings links, verified after public MFA sign-in on desktop and mobile; eight applications still have no supported arbitrary catalog-link option. See the later evidence in [instance-navigation.md](instance-navigation.md). Opengist and Gathio provide supported custom navigation configuration. drawDB has a supported extension slot whose existing Utilibre label could be clearer. Linkding and Razzia have no inspected arbitrary-link setting. A missing link in a restricted logged-out shell does not establish what an authenticated menu can do. No new promotional source fork or proxy HTML injection was added.

Earlier native branding options, including authentik's existing tenant footer links, are recorded in [instance-navigation.md](instance-navigation.md). Account/invitation/password emails belong to each installed application's native templates and mail configuration; they are not generated by these six portal files. No mail was sent for an editorial check. This pass does not claim to have received or reviewed every authenticated invitation/reset email. The privately installed newsletter and alias services' remaining delivery conditions are in their deployment records, not hidden by a copy change. Further template edits must use an actual accessible native setting and an authorized operator-controlled test recipient; no new mail renderer or authentication system is warranted.

## Validation and release boundary

- TypeScript typecheck, scoped ESLint and 18 existing i18n/SEO unit tests passed.
- Verified that protected policy and processing-label key values match the saved pre-pass copies in both languages. Local private snapshots are under `/opt/utilibre/reports/copy-interface-20261009/before/`.
- Seven targeted existing browser checks passed: search, configured/absent support, localized 404s, mobile-width layout, keyboard accessibility and public page rendering. Two initially failed on renamed labels; the SearXNG card-title and support-link assertions were updated, then both checks passed. The corresponding negative support-link assertion was updated too; no functional expectation was weakened.
- Separate Spanish checks at 375px verified the homepage, About, Support and 404 without horizontal overflow at normal text size, their footer landmark and social-image alternative text, plus recovery wording for a fictional failed status request. At 200% root font size, the homepage, About and Support still fit. The 404 initially overflowed within its heading text. Parent inspection confirmed a 393px scroll width on a 375px viewport at 200% root text size. A narrow `overflow-wrap` rule on page headings now keeps the full page at 375px without changing its wording; before/after screenshots were reviewed. Evidence is in `layout-text-size.json` in the private report directory.
- An exploratory CSS `zoom:2` check is not treated as native browser-zoom evidence: CSS zoom does not update responsive viewport breakpoints, and at 375px it also creates an effective width below the existing 320px minimum. No style changes were based on that probe.
- The first browser attempt stopped before running tests because the host's file-watcher limit prevented Vite from starting. The retry uses polling only for the temporary development server; no kernel setting or production service changed.

The temporary development server is stopped. The parent completed combined checks and deployed copy1; final public results are recorded in the master inventory. This pass adds no dependency, service, tracking or runtime provider. No production copy has been redeployed by this worker.

## Parent editorial review

The assembled-page review adds one understated collection aside below the task
finder and the supplied enthusiasm aside on About, keeping metadata literal.
Support now uses a voluntary invitation in place of the repeated free-to-use /
not-free-to-run contrast. Its donation conditions are unchanged. The decorative
All tasks code reads ALL / TODO instead of implying an alphabetical A–Z order.
These parent additions bring the dictionaries to 324 keys per language; they are
covered by the final combined checks in the master inventory.

## Dated task-note reconciliation

A later focused pass found that 36 recently installed entries still displayed
the generic “complete task was not retested” fallback despite dated native
workflow evidence. `portal/src/catalog/guidance.ts` now supplies paired EN/ES
notes for those entries, with a source-record comment beside each pair. The
notes cover the newly public TRIP/Projects/Beaver/Family Chess workflows,
static/browser additions, calendars, sharing/link tools and the earlier account
applications. They distinguish public native checks from protected-gateway
checks (especially Spliit and linkding), isolated restores, and unperformed
phone, printing, format, image or provider tests. They do not turn health checks
into task verification or claim that a partial export is complete. Penpot's
note was left for its separately running native export/import check.

The same review corrected Beaver's concrete recovery mismatch: its invitation
card now describes its separate native email/password account, closed public
registration and disabled email recovery, rather than promising Utilibre OpenID
and MFA recovery. The recent approved-account entries were compared with their
installation records; the existing Calino/Radicale native-account exceptions
remain, and the others use their documented OIDC flow. No authentication,
registration or recovery behavior changed.

Validation: TypeScript and the focused ESLint check pass; 39 existing discovery,
FOSS-policy and translation tests pass. All 36 evidence references resolve and
all 72 localized notes are present. This is an evidence/copy reconciliation,
not a fresh 36-application browser or security audit. No service, container,
network, user record or footer setting changed. Parent integration owns the
portal build, public rollout and final public-output check.
