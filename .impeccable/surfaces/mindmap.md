# Markmap local editor

Mode: Operate. Code-led, precisely scoped extension of the existing Useful Field
Ledger world, not a new visual identity. Inherit DESIGN.md. Success is an edited
outline and a reopened Markdown/SVG download; no accounts or server-held drafts.

Use a labeled outline editor alongside the upstream Markmap preview, stacked on
small screens. Primary action is Download SVG; the editable Markdown backup stays
adjacent. Privacy and format limitations are disclosed, saving is opt-in, status
and errors are text, and the outline remains the accessible text representation.
Preserve upstream attribution; use the documented fonts and palette locally.

Quality gates: keyboard and 390px viewport, EN/ES voseo, hostile Markdown and
frontmatter, no outgoing content/network requests, explicit local storage,
round-trip Markdown import/export, usable SVG export, no misleading cloud or
offline guarantees. Screenshot and independent finish review after implementation.

## Implementation evidence — 7 October 2026

Shipped at `https://mindmap.utilibre.org` using Markmap 0.18.12 and the thin
Utilibre editor in `deployment/toolbox/markmap/`. Existing visual authority is
preserved: supplied coral Utilibre logo, local Newsreader headings and Atkinson
Hyperlegible Next text, paper/ink palette, flat rules and square controls.
The outline/preview grid stacks below 720px; Download SVG is primary and the
editable Markdown download remains adjacent. Labels, visible focus, skip link,
text status/errors and the editable outline provide the nonvisual counterpart
to the map. No new global design tokens or product commitments are recorded.

The public Chromium/Linux suite passed at `2026-10-07T20:23:27.504Z` after the
initial HTTPS 525 was resolved. `deployment/toolbox/check-markmap.mjs` exercises
EN/ES, Markdown roundtrip, optional draft/reload/removal, SVG export/reopening,
hostile Markdown/frontmatter, oversized/invalid UTF-8 imports, 390px overflow,
already-loaded offline editing, CSP and 404/405 behavior. Storage failure
checks confirm removal even after rendering failure, departure protection on
failed saving, and no false claim of deletion when storage access is denied.
No external application requests or page errors occurred in the tested flow.
Screenshots: `.impeccable/captures/markmap/desktop-en.png`, `mobile-es.png` and
`svg-export.png`; the exported fixture is `export.svg` in that directory.

The independent finish review's draft-state and logo findings were fixed with
the scoped implementation: storage consent no longer depends on rendering,
successful storage is tracked, and the official logo replaces the improvised
wordmark. The source archive and license links return HTTP 200. Portal tests
passed 78 unit and 64 browser cases; the two starter guides and sample outlines
are deployed in portal release `d2ae9889c56e97a31c66826f4c01d23927ffbd48`.
The public Spanish guide-to-tool journey, practice download and keyboard skip
action also passed at 390 × 844 with simulated 150 ms latency and 150,000 B/s
download. This is not real-phone or field-performance evidence.

Limits remain explicit: SVG uses `foreignObject` text, Markdown is the editable
backup, and saving is optional browser storage rather than a cloud backup.
Raw HTML, remote images, clickable links and imported frontmatter resources
are disabled. No fresh-load offline/PWA claim, physical-phone certification,
or Firefox/Safari/Opera coverage is inferred from Chromium and 390px emulation.
Keyboard affordances are present in code; the automated suite is not a complete
manual keyboard or assistive-technology audit. These limits stay surface-specific
and are not promoted into new design-system rules.
