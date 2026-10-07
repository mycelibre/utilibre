---
version: 1
slug: toolkits
name: My Utilibre toolkits
description: Browser-local collections within the existing Useful Field Ledger.
primary_target: portal/src/pages/my-utilibre.ts
related_targets: [portal/src/styles/main.css, portal/src/utilities/dom.ts, portal/src/utilities/toolkits.ts, portal/src/pages/next-feature-guides.ts]
---
# My Utilibre toolkits

Operate / Read extension of the existing portal. No new visual identity or
concept tournament: controls and source order are specified by the task.

## Direction contract

THESIS: A personal selection of existing tools, not another application registry.

OWN-WORLD: Existing paper/ink palette, Newsreader headings, hyperlegible controls,
square buttons, ruled records and structural focus.

STORY: Choose a collection, open a current tool, reorder or add one, then export
or share deliberately. Shared links preview without overwriting local work.

FIRST VIEWPORT: Existing masthead; title and local-storage explanation; collection
selector and chosen tools; add/reorder actions beside the records. Portability
and reset follow in distinct sections, not a competing primary toolbar.

FORM: Code-led narrow extension, inherited ledger seed 356eafe7; no new seed.

FINISH: ship. The finish review's focus-continuity and visible-new-tab-label
findings are resolved. This surface record captures the finished build; the
global DESIGN.md and PRODUCT.md remain the inherited authorities.

## Overview

**Creative North Star: "The Useful Field Ledger"**, inherited from
[DESIGN.md](../../DESIGN.md). This is a bounded collection-management surface
inside that world. It introduces no palette, font, radius, shadow, or global
component tokens. The existing design frontmatter remains their source of
truth; this record describes their application to toolkits.

The working sequence is collection selection, pinned tools, adding a tool,
collection management, sharing, portability, and reset. A shared-link preview,
when present, precedes the local workspace. Product accessibility and bilingual
requirements from [PRODUCT.md](../../PRODUCT.md) govern the whole sequence.

**Key Characteristics:**

- Ordered, ruled records retain the visitor's chosen tool order.
- Native fields and square controls share the portal's existing visual grammar.
- Written access, availability, storage, and navigation cues accompany actions.
- Management stays in a disclosure; sharing and portability retain named sections.

Evidence: `portal/src/pages/my-utilibre.ts`, `portal/src/styles/main.css`, and
`portal/src/utilities/dom.ts`; reviewed captures are
[desktop](../review/toolkits/desktop.png),
[Spanish mobile](../review/toolkits/mobile.png), and
[keyboard management](../review/toolkits/keyboard-management.png).
These are review captures, not shipping imagery; the surface adds no raster asset.

## Colors

The surface inherits `paper` for the canvas, `ink` for content and control
boundaries, `ink-soft` for the introduction, and `rule` for divisions. Primary
buttons invert ink and paper; hover uses `rust`. Focus uses `focus`; successful
and failed operations use `success` and `error` on both status text and rules.
All roles follow the existing dark-theme overrides.

**The Written State Rule.** Save, error, access, and availability information
must remain explicit text; color reinforces the message.

## Typography

Newsreader names the page and sections; Atkinson Hyperlegible Next carries
instructions, tool names, controls, and feedback. The page inherits
`--type-tool-display` for its title and `--type-headline` for section headings.
Body copy retains `--type-body` and its inherited line height (1.5); the
introduction uses `--type-intro`. Pinned tool names are bold body text (700),
not additional serif headings. The inherited masthead retains its metadata
voice; the toolkit does not add a new typographic role.

## Layout

The page uses the existing centered shell, capped by `--content-max` (76rem)
and inset by `--page-pad`. The title ends with the portal's double rule; the
storage status and local workspace follow. Ordered records use one rule per
row and keep their controls immediately below their name and access facts.
The workspace avoids an extra closing rule before its own section divisions.

Reorder and unpin controls wrap in source order. The add-tool label occupies
its own line; the select flexes beside the pin action when room permits and
wraps above it on narrow screens. Collection selectors stay within the page
width. Tool names allow long strings to wrap, and Spanish copy gains height.
There is no toolkit-specific breakpoint or reordered mobile composition.

## Elevation & Depth

The inherited flat ledger remains intact: no shadows or floating card shells.
Single rules separate tool records, feedback, management, sharing, and
portability; the title's double rule provides the stronger anchor.

## Shapes

Fields and buttons retain the global square radius. Selects and inputs use
the existing ink outline and minimum field height (3rem); primary and
secondary buttons retain their shared border and minimum height (2.8rem).
Native list numbers express order, and the native disclosure marker expresses
the management section's state.

## Components

### Collection selector and records

The labeled selector identifies the starting collection in its option text.
The current collection heading has a 1.5rem gap above it, separating the selector
from the tools it controls; this remains relative to text size in both languages.
Each ordered record presents a tool name, written access and operational
status, and named move/unpin actions. Available launches visibly append
“new tab” or “pestaña nueva” and use `noopener noreferrer`. Unavailable and
unknown tools remain readable without a false launch link. Move controls
include the tool name in their accessible label and disable impossible moves.

### Management and focus

“Manage collections” is a native disclosure containing the labeled name field
and rename, create, starting-collection, and delete actions. It preserves its
open state across workspace redraws. Creating or renaming opens the disclosure
and focuses the name field. Changing collections, setting the starting
collection, or deleting a collection focuses the collection selector.

**The Focus Continuity Rule.** A redraw must leave the keyboard user at a
meaningful control: reordering returns focus to the moved row's same move
action, or its first enabled action at an endpoint; pinning and unpinning focus
the add-tool selector. Closing a shared preview focuses the collection
selector. These controls inherit the global focus outline (3px) and offset
(4px).

### Sharing, portability, and recovery

A shared collection is a preview until the recipient explicitly saves a copy.
The share field is labeled and read-only; copying reports success, while a
blocked clipboard selects the field for manual copying. The optional QR
handoff uses the same visible new-tab wording and explicitly requires pasting
the link. The ordinary link remains available as an alternative.

Export precedes the labeled import field and replace action. Replacing an
existing collection set, deleting a collection, and resetting preferences
require the built-in confirmation explaining the operation's scope. Invalid
imports and storage failures produce explicit status messages. Status feedback
uses `role="status"` and a polite live region. Empty collections explain how
to start; the noninteractive page retains the introduction and a notice
pointing visitors to the catalog and guide.

## Do's and Don'ts

- Do retain visible new-tab wording on every toolkit launch and QR handoff.
- Do preserve the disclosure state and documented focus destinations after redraws.
- Do keep unavailable tools, storage failures, and import rejection understandable in text.
- Do let management actions and Spanish labels wrap without changing their source order.
- Don't promote this page's section sequence or local spacing into a new global system.
- Don't turn a shared preview into an implicit replacement of local collections.
- Don't replace native labeled controls with unlabeled icon actions or drag-only ordering.

Not canonized: toolkit-specific composition and local spacing are surface
decisions, not new global tokens. No craft-floor defect in this surface is
promoted into an inherited rule. No sidecar is generated because the global
design system and its token inventory are unchanged.
