---
name: Utilibre
description: A Useful Field Ledger for free, independently run public web utilities.
colors:
  brand-coral: "#d85a30"
  paper: "#eee7d7"
  paper-pale: "#f5efe3"
  ink: "#2c2c2a"
  ink-soft: "#536057"
  rule: "#899183"
  lichen: "#536c46"
  rust: "#9b4328"
  blue: "#345d68"
  focus: "#d85a30"
  error: "#8e2d25"
  success: "#355f42"
  dark-paper: "#242522"
  dark-paper-pale: "#2d2f2a"
  dark-ink: "#f2ebdd"
  dark-ink-soft: "#b7c0b7"
  dark-rule: "#747b72"
  dark-lichen: "#a7bd8e"
  dark-rust: "#ee8a65"
  dark-blue: "#8db7c1"
  dark-focus: "#ef764d"
  dark-error: "#ff9b91"
  dark-success: "#a7d5b0"
typography:
  scale:
    micro: "0.75rem"
    label: "0.8125rem"
    small: "0.875rem"
    ui: "0.9375rem"
    body-compact: "1rem"
    body: "1.0625rem"
    intro-max: "1.25rem"
    title: "1.5rem"
    section: "1.7rem"
    finder-min: "2.25rem"
    display-min: "2.35rem"
    headline-max: "2.6rem"
    finder-max: "3.35rem"
    tool-max: "4rem"
    display-max: "4.8rem"
  display:
    fontFamily: "'Newsreader Variable', Georgia, serif"
    fontSize: "clamp(2.35rem, 5vw, 4.8rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "'Newsreader Variable', Georgia, serif"
    fontSize: "clamp(1.7rem, 3vw, 2.6rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  title:
    fontFamily: "'Newsreader Variable', Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  body:
    fontFamily: "'Atkinson Hyperlegible Next Variable', Arial, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "'Courier New', Courier, monospace"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.07em"
rounded:
  square: "0"
spacing:
  page-pad: "clamp(1rem, 3vw, 3.25rem)"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.square}"
    padding: "0.62rem 0.9rem"
  button-primary-hover:
    backgroundColor: "{colors.rust}"
    textColor: "{colors.paper}"
    rounded: "{rounded.square}"
    padding: "0.62rem 0.9rem"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "0.62rem 0.9rem"
  input-default:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "0.68rem 0.78rem"
  catalog-launch:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "0.65rem 0.45rem"
---

# Design System: Utilibre

## Overview

**Creative North Star: "The Useful Field Ledger"**

Utilibre is a cultivated working catalog: warm, bookish, public-service, plainspoken, technically competent, and quietly witty. Its visual world combines uncoated paper, official coral and charcoal, factual lichen/rust/blue accents, numbered task indexing, and ruled comparison records. It should feel authored by an independent operator rather than startup-polished.

The ledger is useful before it is expressive. Names, task descriptions, processing facts, and actions share one comparable reading structure; humor and personality live in careful language rather than decoration. Mycelial relationships may inform information adjacency, but the shipped interface uses no ornamental network motif.

**Key Characteristics:**

- Warm paper fields with official coral and charcoal.
- Newsreader names the work; Atkinson Hyperlegible Next explains and operates it; Courier New records metadata.
- A numbered task rail and one aligned launch edge organize the catalog.
- Single and double rules replace elevated card shells.
- Factual accents always accompany written processing labels.
- Square controls, generous focus, and bilingual wrapping keep the system direct and usable.

## Colors

The palette behaves like ink and annotations on paper: coral is official and rare, neutrals carry most of the page, and lichen, rust, and blue encode written facts rather than atmosphere.

### Primary

- **Utilibre Coral** (`colors.brand-coral`): the official lockup, text selection, native form accent, and rare identity emphasis.
- **Focus Coral** (`colors.focus`, `colors.dark-focus`): the keyboard outline; the dark override brightens it without changing its semantic role.

### Secondary

- **Field Lichen** (`colors.lichen`, `colors.dark-lichen`): browser-local processing when a label also states the meaning.
- **Ledger Rust** (`colors.rust`, `colors.dark-rust`): row coordinates, guidewords, server processing, link hover, and primary-control hover.

### Tertiary

- **Proxy Blue** (`colors.blue`, `colors.dark-blue`): proxy/intermediary processing labels only.
- **State Green and Error Red** (`colors.success`, `colors.dark-success`, `colors.error`, `colors.dark-error`): explicit status and validation feedback.

### Neutral

- **Uncoated Paper Family** (`colors.paper`, `colors.paper-pale`): the light canvas and restrained tonal panels.
- **Official Ink Family** (`colors.ink`, `colors.ink-soft`, `colors.rule`): primary text and controls, explanatory copy, and structural divisions.
- **Night Paper Family** (`colors.dark-paper`, `colors.dark-paper-pale`): dark-mode surfaces that preserve the paper hierarchy.
- **Night Ink Family** (`colors.dark-ink`, `colors.dark-ink-soft`, `colors.dark-rule`): dark-mode text and rules with the same semantic hierarchy as light mode.

**The Coral Ration Rule.** Coral marks identity, focus, and decisive state; it is not a body-text color or ambient decoration.

**The Factual Accent Rule.** Lichen, rust, blue, green, and red never carry meaning alone; a written label or state accompanies the color.

## Typography

**Display Font:** Newsreader Variable, with Georgia and serif fallbacks.

**Body Font:** Atkinson Hyperlegible Next Variable, with Arial and sans-serif fallbacks.

**Label/Mono Font:** Courier New, with Courier and monospace fallbacks.

**Character:** Newsreader gives names and headings cultivated editorial warmth. Atkinson Hyperlegible Next keeps instructions, navigation, controls, and long bilingual copy unusually clear. Courier New is factual rather than nostalgic: it is reserved for coordinates, processing labels, compact state, language codes, and system controls.

### Hierarchy

- **Display** (600, `clamp(2.35rem, 5vw, 4.8rem)`, 1.08): general page titles; the catalog finder uses `clamp(2.25rem, 3vw, 3.35rem)`, while operational tool titles cap at `4rem`.
- **Headline** (600, `clamp(1.7rem, 3vw, 2.6rem)`, 1.08): major sections and catalog groups.
- **Title** (600, `1.5rem`, 1.08): tool names and comparable record titles.
- **Body** (400, `1.0625rem`, 1.5): descriptions, instructions, navigation, and prose, normally held to a 75-character measure or less.
- **UI and Small Copy** (`0.9375rem` / `0.875rem`): compact controls, supporting explanations, processing notes, and secondary links.
- **Label and Micro** (700, `0.8125rem` / `0.75rem`, 1.2, `0.07em`): uppercase search labels and guidewords use the larger step; coordinates, result counts, and compact metadata use the 12px floor.

**The Three-Voice Rule.** Serif names the work, the hyperlegible sans explains and operates it, and monospace records facts; never swap those jobs for novelty.

## Copy Voice

Copy is clear before clever and sounds like a competent independent maintainer. Task information leads; dry humor arrives, when earned, as one short observation after the literal setup. A normal block gets at most one comic idea. Catalog lists keep at least one-third of descriptions completely literal, and the shipping catalog normally keeps nearly all tool descriptions literal.

Navigation, controls, loading, confirmations, validation, errors, recovery, privacy and security facts, legal terms, status, and donation conditions never carry jokes. Self-deprecation may concern maintenance, dependency churn, hosting costs, or operator workload, but never reliability, backups, security, competence, or visitor trust. Upstream applications and libraries are named explicitly; Utilibre describes itself as host or integrator, not author.

English and neutral Spanish receive equal editorial review. Spanish uses `« »`, prefers “software libre” for libre-licensed open-source software, and translates comic intent rather than syntax. A joke without a natural equivalent is omitted. The full editorial standard lives in `docs/copy-style.md`.

**The Literal Interface Rule.** The closer text sits to an action, risk, or repeated state, the less personality it carries; personality belongs in page-level explanation, never in uncertainty.

## Layout

The global shell is capped at 76rem with fluid page padding. The desktop masthead and homepage share a 17rem task rail; the ledger workspace occupies the remaining width. The finder pairs a flexible task statement with a 20–29.5rem search region. Catalog records use four comparable jobs: a 5rem coordinate, a flexible name/description column, a processing column, and an 8rem action edge.

At 78rem the task rail narrows to 13rem, ledger coordinates and gaps tighten, and launch actions remain edge-aligned. At 58rem the masthead becomes a menu shell, the task index becomes a horizontally scrolling text index with an explicit cue, support follows the catalog, and records reflow to coordinate/content/action with processing beneath the description. At 39rem search controls stack, each record becomes one readable vertical sequence, and the launch action takes the full available width. Long Spanish copy adds height; it is not truncated or answered with smaller type.

Featured and complete-catalog modes remain visible at every width. Supporting reference links may move to the footer on narrow screens, but the visitor must never lose the direct path to the full A–Z inventory. Trust metadata steps up from the 12px desktop floor to the 13px label step on narrow screens.

**The One Launch Edge Rule.** On wide layouts every primary catalog action meets the same right edge; on narrow layouts the edge becomes the full row width instead of disappearing.

## Elevation & Depth

The system is flat and structural. It uses no shadows. Depth and hierarchy come from paper-tone changes, 1px record rules, 2px anchor rules, 3px double group rules, and occasional tonal hover fill; ordinary content never floats above the page.

**The Flat Ledger Rule.** A tonal surface or border must identify a real interaction boundary, state, or working area; content grouping alone earns spacing and a rule.

## Shapes

The form language is square. Controls, fields, language states, search actions, tool panels, and catalog actions use zero radius. Processing and status labels are compact underlined text rather than pills. Containers are defined by rules or a single rectangular border, never by repeated rounded shells.

**The Square Means Operable Rule.** Rectangular enclosure is reserved for things a visitor can operate or for bounded tool work; catalog prose remains open on the paper.

## Components

### Masthead and Navigation

The masthead ends with a 2px ink rule. The official horizontal logo is 9.45rem wide on desktop and 8.5rem below 58rem; coral appears on light paper and the white lockup appears on dark paper. Active navigation uses a 2px underline. The active language is an inverse square; the system-theme and menu controls are outlined squares that invert on hover.

### Task Index

Five numbered task links form the desktop rail, separated by 1px rules. Rust coordinates and bold body labels provide scan anchors; the selected task is underlined rather than filled. Below 58rem the same source order becomes a horizontal text scroller with a small written scroll cue—never a row of pills.

### Search

The search label uses the metadata voice. On wider screens a transparent 2px ink field joins an inverse ink action at a shared edge, both at least 3.15rem high. The action shifts to rust on hover. Below 39rem the controls separate and stack, with the action spanning the row.

### Catalog Ledger

This is the signature component: numbered coordinates, serif tool names, plain descriptions, underlined processing labels, a concrete data-flow note, and one aligned launch edge. Every upstream-backed record places a labeled project-source link beneath its task description; the launch column is reserved for launching. This keeps credit readable in Spanish and prevents task-first labels from implying that Utilibre created the hosted interface. A 2px rule opens the list, 1px rules divide records, and a quiet paper-pale mix marks row hover. At 58rem the processing note moves below the description; at 39rem the launch action follows both as a full-width control.

### Buttons and Fields

Primary buttons are ink-on-paper inversions with a 2px border, at least 2.8rem high, and weight 750; hover changes both border and fill to rust. Secondary buttons keep the same geometry with a transparent fill. Disabled controls use 0.55 opacity. Standard fields are transparent, square, at least 3rem high, and use a 1px ink border; the search field intentionally strengthens that border to 2px.

### Processing Labels, Notices, and Tool Panels

Local, server, proxy, and external labels use the metadata voice, an underline, and their factual semantic color. Notices and status messages use horizontal rules instead of filled alerts. Tool work is bounded by one 1px ink rectangle on paper-pale with no shadow; success and error states change text and rule color together.

**The Focus Is Structural Rule.** Every keyboard-focusable element receives a 3px coral outline with a 4px offset; hover styling never substitutes for it.

### Reference Inventories and Recovery

Long disclosure inventories are grouped by operational role and begin with a plain-text jump index. Source destinations use descriptive labels rather than exposing raw URLs as the repeated visual endpoint. Unknown routes return a real localized 404 with accurate metadata and a direct route back to the catalog; predictable translated aliases redirect permanently to their canonical page.

Result-dependent actions remain disabled until valid output exists and return to disabled when that output is invalidated. A control must not appear ready when its only possible outcome is silence.

## Do's and Don'ts

### Do:

- Do use the supplied coral lockup on light paper and the supplied white lockup on dark paper without redrawing either asset.
- Do keep tool name, task description, processing labels, data-flow note, and launch action comparable at a glance.
- Do preserve the 3px focus outline, 4px offset, written states, and touch-friendly control heights.
- Do let English and Spanish wrap naturally through the same source order and hierarchy.
- Do keep support calm, factual, and subordinate to finding and opening a tool.
- Do name upstream software directly and describe Utilibre as its host or integrator.

### Don't:

- Don't introduce a SaaS hero, generic card wall, gradients, glass, glows, decorative grids, or a fake terminal.
- Don't turn processing states into excessive pills, generic privacy shields, or color-only claims.
- Don't use decorative mycelial gimmicks, ornamental animation, or rounded rectangles around every item.
- Don't add shadows to catalog records, navigation, buttons, fields, or ordinary content containers.
- Don't make support sticky, urgent, guilt-driven, or conditional on access.
- Don't put jokes in controls, repeated states, errors, privacy facts, warnings, legal text, or recovery instructions.
