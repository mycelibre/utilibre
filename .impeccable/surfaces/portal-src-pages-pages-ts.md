---
version: 1
slug: "portal-src-pages-pages-ts"
primary_target: "portal/src/pages/pages.ts"
related_targets: ["portal/src/main.ts","portal/src/styles/main.css","portal/src/catalog/catalog.ts","portal/src/i18n/en.ts","portal/src/i18n/es.ts"]
---

# Utilibre public portal

## Scope

The bilingual homepage and shared public shell serve ordinary visitors arriving to use one of a deliberately small set of hosted FOSS services. Visitors must understand the premise, find a relevant service, inspect its data path, see any account limitation, and launch it without first reading project history.

The public catalog contains SearXNG, FreshRSS, Redlib, and PrivateBin. RSSHub is internal support for FreshRSS and is not a public product. The Redlib URL router is the only portal-authored utility surface; it is narrow integration glue, not an end-user service implemented by Utilibre.

## Direction contract

**THESIS:** A useful field ledger makes unlike hosted services directly comparable; it refuses the startup hero, card wall, and any homepage that opens with one category selected.

**OWN-WORLD:** Uncoated paper, official charcoal and coral, lichen facts, bookish names, plain operational copy, square controls, double group rules, and one aligned launch edge.

**STORY:** The visitor sees the complete small hosted set, understands what each service does and where data goes, opens one, then may learn why the project exists or support the work.

**FIRST VIEWPORT:** Official masthead; three-task index with no active category; compact task heading and labeled search; the first records of the four-service ledger. Support stays quiet in the rail and follows the catalog on mobile.

**FORM:** Code-led Useful Field Ledger, second finalist, seed `356eafe7`.

**FINISH:** Preserve the established system while removing retired-service residue. Release only after bilingual, responsive, keyboard, detector, audit, test, and production-build checks pass against the four-service catalog.

## Confirmed behavior

- The default view is a deliberate cross-task ordering, not a claimed donation, usage, popularity, or uptime ranking.
- Category controls change the visible catalog only after deliberate activation. Search works across the admitted inventory.
- `/en/support` and `/es/apoyar` always exist; an external donation action appears only when `SUPPORT_URL` is configured.
- The support surface distinguishes infrastructure support from upstream development and invites visitors, without pressure, to support the people who build the hosted applications.
- Every public service is supplied by an independently maintained, reviewed FOSS application. Portal code may provide discovery, configuration, status, and narrow integration glue only.
- FreshRSS truthfully shows that an account is required and public registration is closed; the site does not imply that the planned request workflow is already open.
- RSSHub, databases, caches, and anti-abuse infrastructure never receive public catalog records merely because they run in containers.
- Hosted service links open in a new tab and include a visible and accessible new-tab cue.
- Existing retained routes, runtime configuration, status behavior, localization, metadata, and deployment boundaries remain intact.
- Unknown application routes receive localized 404 metadata and a direct catalog recovery action; the common `/es/support` alias redirects to its canonical page.
- The Redlib URL router validates only supported Reddit destinations in the browser, then opens the fixed configured Redlib origin. It never becomes a generic redirector or proxy.

## Copy contract

- Lead with the task or verified fact. One normal block may carry one dry comic idea after the literal setup.
- Keep navigation, controls, repeated states, errors, recovery, warnings, privacy and security facts, legal text, status, and donation conditions literal.
- Catalog descriptions stay task-first and mostly literal. Every row names its upstream project beside the source link; Utilibre is the host or integrator, not the implied author.
- English and neutral Spanish are equal authored surfaces. Spanish uses `« »`, defaults to “software libre” for libre-licensed projects, and drops jokes that do not translate naturally.
- Fungal language is absent from this surface unless a single structural metaphor earns its place later.

## Implementation record

- Self-hosted Newsreader Variable provides the editorial voice; self-hosted Atkinson Hyperlegible Next provides the operating voice; Courier New is restricted to compact factual metadata.
- Responsive changes occur at 78rem, 58rem, and 39rem, with the full behavior and token system recorded in `DESIGN.md`.
- Portal HTML uses `Cache-Control: no-cache, no-transform` to preserve the strict CSP across the public intermediary; hashed assets remain immutable.
