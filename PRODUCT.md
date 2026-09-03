# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Utilibre serves ordinary English- and Spanish-speaking visitors who need to finish a practical web task quickly: search, transform a file, share information, use a temporary utility, or reach public content through an alternative frontend. They should not need an account, payment, specialist knowledge, or a lesson about the project before they can act.

The primary job is to find the right tool within seconds, understand what it does and what happens to their data, decide whether to trust it, and open it with minimal friction.

## Product Purpose

Utilibre is a bilingual public portal for free, privacy-respecting, self-hosted open-source web tools. It combines browser-local utilities with separately hosted services where server processing provides real value.

It is a small independent digital public utility and a contribution to the digital commons—not a startup, SaaS platform, lead-generation site, commercial app store, enterprise dashboard, or generic privacy brand. Services are free to use. Voluntary donations may help cover infrastructure, but must never unlock features, remove limits, or interrupt the primary task.

## Positioning

The public interface should feel like a living catalog of useful digital utilities: cultivated, precise, approachable, and visibly independent. Its identity may draw on a restrained mycelial-network metaphor—separate tools connected into a useful ecosystem—but the metaphor must organize information rather than decorate it.

The experience should sit between a contemporary field guide, a well-designed public-service catalog, and an idiosyncratic independent publication. It must not resemble a startup landing page, software marketplace, dashboard, fantasy forest, generic eco-brand, or novelty mushroom theme.

Privacy is communicated through specific data-flow and retention facts, not slogans, fear, shield imagery, or impossible guarantees. Utilibre does not claim anonymity, untraceability, universal uptime, or complete security.

## Operating Context

The portal currently exposes 33 bilingual portal-native tool routes and 12 separately hosted public services. The runtime catalog in `portal/src/catalog/catalog.ts` is the product inventory source of truth, including structured upstream-project credit. Public URLs and enabled service IDs come from `/_portal/config`; current service health comes from `/_portal/status`. A point-in-time health response is not an uptime claim.

Browser-local tools handle selected content in browser memory unless the visitor explicitly downloads a result. Server-backed services have distinct, operation-specific boundaries. BentoPDF, VERT, and OmniTools are umbrella services; the portal does not maintain a verified inventory of every utility they contain.

The Developer category preserves those distinctions instead of presenting every tool as “local.” JWT decode/generate, HMAC verification, bounded OpenAPI JSON/YAML inspection, HTTP↔cURL conversion, bounded regex and UTC cron workers, timestamp conversion, text hashing, and UUID generation/inspection are local. The HTTP tester, CORS-visible response-header viewer, WebSocket tester, and server-sent events viewer connect from the browser directly to the destination selected by the visitor. The temporary webhook inbox is a bounded, memory-only server operation, and DNS lookup is a bounded server intermediary operation. There is no generic server-side HTTP proxy. The webhook and DNS server surfaces have independent operator kill switches.

Invidious, rimgo, and Crab Fit are not public services. Empty source, support, contact, YouTube, or Imgur configuration must remain absent from the interface rather than being replaced with invented destinations.

The bilingual support routes, `/en/support` and `/es/apoyar`, are stable even when the optional external `SUPPORT_URL` is unset. The redesign should reserve a calm, deliberate place for voluntary support and explain that donations do not change access, limits, priority, or treatment. It must present the honest unconfigured state instead of inventing a payment destination.

The deployment runs on modest operator-controlled infrastructure behind Cloudflare and a separate Caddy edge. The Vite/TypeScript frontend is served by the existing Node server. Backend APIs, direct tool URLs, CSP, container topology, edge rules, private targets, deployment behavior, and reverse-proxy assumptions are product constraints, not redesign material.

## Capabilities and Constraints

- Help visitors discover tools by real tasks and meaningful categories, then launch them directly.
- Preserve every existing English and Spanish information route and portal-native tool route.
- Keep the catalog consolidated rather than duplicating service facts across components.
- Show only metadata supported by the runtime catalog or configuration. The present schema has no universal structured account-requirement or language-availability field; do not infer one silently.
- Preserve `GET /healthz`, config/status endpoints and their legacy aliases, and the constrained media POST API with its current request schema and bilingual error keys.
- Preserve the bounded `/_portal/developer` webhook-inbox and DNS endpoints, including their independent kill switches, same-origin inbox-creation/DNS checks, token-protected inbox management, rate/capacity limits, and no-store responses. Do not broaden them into a generic fetch, forwarding, replay, or network-scanning API.
- Preserve localized initial metadata, hreflang output, robots/noindex rules, missing-asset 404 behavior, lazy-chunk recovery, and the QR WASM build step.
- Return genuine localized 404 responses for unknown application routes, preserve useful recovery links, and redirect documented cross-language aliases to their canonical route.
- Never expose internal service targets, container names, credentials, API keys, or private infrastructure details to the browser.
- Add no advertising, analytics, tracking scripts, remote fonts, unnecessary CDNs, premium tier, donor-only behavior, fake urgency, social proof, testimonials, usage statistics, endorsements, or project affiliations.
- Give voluntary support a visible but subordinate place in the site architecture; never use a modal, sticky plea, countdown, guilt language, or interruption before a visitor reaches a tool.
- Keep assets self-hosted where practical and visual dependencies modest. Prefer semantic HTML and CSS over large effect packages.
- Remain fast and coherent on modest devices and connections, from narrow mobile screens to large displays and at enlarged text sizes.
- Remain useful without JavaScript wherever practical; JavaScript-dependent browser tools must fail honestly and accessibly.

## Brand Commitments

The public name is Utilibre. The voice is clear before clever: intelligent without showing off, technically informed but understandable to nontechnical people, quietly funny through understatement and precise observation, and confident only where the implementation supports the claim. Utilibre sounds like a competent independent maintainer, not a comedian dressed as one.

Useful information comes first. A normal content block may carry one comic idea; repeated interface text, errors, recovery, warnings, privacy and security facts, legal terms, service state, and donation conditions remain literal. Self-deprecation may address maintenance, dependency churn, server costs, or the operator's workload, but never security, reliability, backups, competence, or visitor trust. The visitor is never the subject of the joke.

Copy must not sound corporate, grandiose, juvenile, desperate for donations, falsely rebellious, alarmist, smug, meme-driven, or theatrically anti-corporate. It avoids startup slogans, forced hacker jargon, cute names for serious functions, excessive exclamation marks, and claims that the service survives by luck, duct tape, or prayer. Fungal language is permitted only once or twice across the shipping site as a subtle metaphor, never as a mascot voice.

Hosted interfaces and libraries retain clear upstream-project credit. Utilibre states that it hosts or integrates the work and documents local modifications; it never implies authorship of an upstream interface.

English and neutral Spanish are equal product languages. Spanish is authored naturally rather than translated mechanically, uses `« »` for quotations, and prefers “software libre” for libre-licensed open-source software. Comic intent is translated only when it remains natural; otherwise the joke is dropped. Neither language is presented with a national flag, and language choice should persist with the corresponding route and relevant interface state.

## Visual Commitments

- Use one coherent identity built around an indexed, connected public-utility catalog.
- Favor warm paper, mineral, ink, lichen, moss, rust, and spore-like accents over generic technology blue or purple gradients.
- Pair a characterful open-licensed display face with an exceptionally legible text face; reserve monospace for technical metadata, URLs, state, or shortcuts.
- Use abstract local marks, branching rules, indexing, rhythm, or sparse texture only when they clarify relationships.
- Avoid generic card walls, bento grids, glassmorphism, neon glow, giant gradient headlines, nested rounded containers, excessive pills, decorative blobs, stock art, emoji icon systems, fake terminals, meaningless particles, and ornamental animation.
- Motion may reveal hierarchy, confirm actions, or communicate a real state. It must never delay access, carry essential information alone, or ignore reduced-motion preferences.

## Evidence on Hand

- `portal/src/catalog/catalog.ts` defines the runtime tool and service inventory, bilingual descriptions and slugs, privacy disclosures, project attribution, license/version facts, and baseline status.
- `portal/src/routes.ts` defines the stable bilingual information and tool routes.
- `portal/src/config.ts` and `portal/server/server.mjs` define sanitized public configuration, health, metadata, API, and security boundaries.
- `portal/src/i18n/en.ts` and `portal/src/i18n/es.ts` are equal interface dictionaries; automated tests require key parity.
- `docs/privacy.md`, `docs/copy-style.md`, deployment records, and service-specific documentation provide claims, data-flow, resource, and launch/defer evidence.
- Unit, server, bilingual/mobile, native-tool, deployment-integration, and add-on browser suites cover the present behavior. Historical passing results are not evidence that a redesigned build passes.
- No testimonials, usage metrics, public uptime history, donation destination, or universal account metadata are presently configured. Source and public issue-tracker destinations are configured; the donation destination remains honestly absent until GitHub Sponsors is ready.

## Product Principles

1. Put the task before the project story.
2. Make the catalog faster to scan than a wall of interchangeable cards.
3. State concrete data handling and operational limits instead of promising privacy by adjective.
4. Treat English and Spanish as equal products in copy, metadata, errors, navigation, accessibility, and responsive behavior.
5. Preserve the working backend and deployment; redesign the public experience around it.
6. Keep access genuinely public: no ads, tracking, registration gate, paid advantage, or donor privilege.
7. Prefer sustainable restraint: bounded dependencies, modest motion, honest states, and no feature or service invented to fill a layout.

## Accessibility & Inclusion

Use semantic landmarks and native controls, a logical heading hierarchy, complete keyboard navigation, highly visible focus, touch-friendly targets, accessible names, associated validation and errors, useful live regions, sufficient contrast, and a sensible source order. No information may depend on motion, hover, color, or JavaScript alone when a practical static alternative exists.

Long Spanish copy, long tool names, missing metadata, errors, loading, empty and unavailable states must wrap and remain operable. Important text must not be truncated. The design should support text enlargement and 200% zoom without fixed text containers or overlapping controls.
