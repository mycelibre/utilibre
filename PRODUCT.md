# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Utilibre serves ordinary English- and Spanish-speaking visitors who need to finish a practical web task quickly: search, transform a file, share information, use a temporary utility, or reach public content through an alternative frontend. The portal itself should not demand an account, payment, specialist knowledge, or a lesson about the project before they can act. A few upstream applications require a provisioned account; those exceptions must be labeled before launch.

The primary job is to find the right tool within seconds, understand what it does and what happens to their data, decide whether to trust it, and open it with minimal friction.

## Product Purpose

Utilibre is a bilingual public portal for free, privacy-respecting, self-hosted FOSS applications. Every visitor-facing capability comes from an independently maintained upstream application; Utilibre provides only the catalog, hosting, configuration, routing, and narrow integration glue.

It is a small independent digital public utility and a contribution to the digital commons—not a startup, SaaS platform, lead-generation site, commercial app store, enterprise dashboard, or generic privacy brand. Services are free to use. Voluntary donations may help cover infrastructure, but must never unlock features, remove limits, or interrupt the primary task.

## Positioning

The public interface should feel like a living catalog of useful digital utilities: cultivated, precise, approachable, and visibly independent. Its identity may draw on a restrained mycelial-network metaphor—separate tools connected into a useful ecosystem—but the metaphor must organize information rather than decorate it.

The experience should sit between a contemporary field guide, a well-designed public-service catalog, and an idiosyncratic independent publication. It must not resemble a startup landing page, software marketplace, dashboard, fantasy forest, generic eco-brand, or novelty mushroom theme.

Privacy is communicated through specific data-flow and retention facts, not slogans, fear, shield imagery, or impossible guarantees. Utilibre does not claim anonymity, untraceability, universal uptime, or complete security.

## Operating Context

The portal currently exposes 13 configured upstream FOSS applications plus two bilingual portal integration surfaces: a constrained Cobalt adapter and a URL router that hands Reddit links to Redlib. In catalog semantics Cobalt remains a service because Cobalt implements the underlying task; its `portalSurface` is explicitly integration glue. The runtime catalog in `portal/src/catalog/catalog.ts` is the product inventory source of truth. The closed provider registry in `portal/src/catalog/upstreams.ts` records the independently maintained application, source, license and self-hosting evidence, reviewed artifact, and deployment state behind every entry. Public URLs and enabled service IDs come from `/_portal/config`; current service health comes from `/_portal/status`. A point-in-time health response is not an uptime claim.

Upstream applications have distinct, operation-specific boundaries. BentoPDF, VERT, OmniTools, and PrivateBin perform substantial work in the browser; other services process or relay requests on Utilibre infrastructure. The catalog describes each boundary. BentoPDF, VERT, and OmniTools are umbrella applications, so the portal does not claim a verified inventory of every utility they contain.

Utilibre does not implement an end-user utility merely because the browser or a FOSS library makes it convenient. The 31 former portal-native utility routes, including the custom webhook and DNS endpoints, were retired under the policy in `FOSS_POLICY.md`. A developer category may return only after complete upstream FOSS applications pass the ordinary service-admission review.

Invidious, rimgo, and Crab Fit are not public services. Empty source, support, contact, YouTube, or Imgur configuration must remain absent from the interface rather than being replaced with invented destinations.

The bilingual support routes, `/en/support` and `/es/apoyar`, are stable even when the optional external `SUPPORT_URL` is unset. The redesign should reserve a calm, deliberate place for voluntary support and explain that donations do not change access, limits, priority, or treatment. It must present the honest unconfigured state instead of inventing a payment destination.

The deployment runs on modest operator-controlled infrastructure behind Cloudflare and a separate Caddy edge. The Vite/TypeScript catalog is served by the existing Node server. Existing upstream application APIs, public service URLs, CSP, container topology, edge rules, private targets, deployment behavior, and reverse-proxy assumptions are product constraints, not redesign material.

## FOSS Capability Rule

The rule in `FOSS_POLICY.md` applies retroactively and going forward: every offered capability must be a complete, independently maintained, self-hostable FOSS application with verified license and source evidence. A browser API or reusable library does not qualify as the application. If no reviewed upstream exists, the capability is omitted. Original Utilibre code is limited to integration glue and may not become the implementation of the visitor's task.

## Capabilities and Constraints

- Help visitors discover tools by real tasks and meaningful categories, then launch them directly.
- Preserve every existing English and Spanish information route. Retired noncompliant tool routes must remain genuine localized 404s rather than silently returning as original Utilibre implementations.
- Keep the catalog consolidated rather than duplicating service facts across components.
- Show only metadata supported by the runtime catalog or configuration. Account access is structured where verified; language availability is not universal and must not be inferred silently.
- Preserve `GET /healthz`, config/status endpoints and their legacy aliases, and the constrained media POST API with its current request schema and bilingual error keys.
- Keep the retired `/_portal/developer/*` namespace unavailable. Do not replace it with original request, webhook, DNS, forwarding, replay, or network-scanning functionality.
- Preserve localized initial metadata, hreflang output, robots/noindex rules, missing-asset 404 behavior, and lazy-chunk recovery.
- Return genuine localized 404 responses for unknown application routes, preserve useful recovery links, and redirect documented cross-language aliases to their canonical route.
- Never expose internal service targets, container names, credentials, API keys, or private infrastructure details to the browser.
- Add no advertising, analytics, tracking scripts, remote fonts, unnecessary CDNs, premium tier, donor-only behavior, fake urgency, social proof, testimonials, usage statistics, endorsements, or project affiliations.
- Give voluntary support a visible but subordinate place in the site architecture; never use a modal, sticky plea, countdown, guilt language, or interruption before a visitor reaches a tool.
- Keep assets self-hosted where practical and visual dependencies modest. Prefer semantic HTML and CSS over large effect packages.
- Remain fast and coherent on modest devices and connections, from narrow mobile screens to large displays and at enlarged text sizes.
- Remain useful without JavaScript wherever practical; configuration-dependent catalog links must fail honestly and accessibly.

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

- `portal/src/catalog/catalog.ts` defines the runtime application inventory, bilingual descriptions and slugs, privacy disclosures, and baseline status; `portal/src/catalog/upstreams.ts` is the closed capability-provider registry.
- `portal/src/routes.ts` defines the stable bilingual information and tool routes.
- `portal/src/config.ts` and `portal/server/server.mjs` define sanitized public configuration, health, metadata, API, and security boundaries.
- `portal/src/i18n/en.ts` and `portal/src/i18n/es.ts` are equal interface dictionaries; automated tests require key parity.
- `docs/privacy.md`, `docs/copy-style.md`, deployment records, and service-specific documentation provide claims, data-flow, resource, and launch/defer evidence.
- Policy, unit, server, bilingual/mobile, deployment-integration, and upstream-application browser suites cover the present behavior. Historical passing results are not evidence that a later build passes.
- No testimonials, usage metrics, public uptime history, donation destination, or universal account metadata are presently configured. Source and public issue-tracker destinations are configured; the donation destination remains honestly absent until GitHub Sponsors is ready.

## Product Principles

1. Put the task before the project story.
2. Make the catalog faster to scan than a wall of interchangeable cards.
3. State concrete data handling and operational limits instead of promising privacy by adjective.
4. Treat English and Spanish as equal products in copy, metadata, errors, navigation, accessibility, and responsive behavior.
5. Preserve approved upstream service boundaries and deployment behavior; retired original endpoints are not compatibility requirements.
6. Keep the portal public: no ads, tracking, payment gate, paid advantage, or donor privilege. Label the few upstream applications that require provisioned accounts.
7. Prefer sustainable restraint: bounded dependencies, modest motion, honest states, and no feature or service invented to fill a layout.

## Accessibility & Inclusion

Use semantic landmarks and native controls, a logical heading hierarchy, complete keyboard navigation, highly visible focus, touch-friendly targets, accessible names, associated validation and errors, useful live regions, sufficient contrast, and a sensible source order. No information may depend on motion, hover, color, or JavaScript alone when a practical static alternative exists.

Long Spanish copy, long tool names, missing metadata, errors, loading, empty and unavailable states must wrap and remain operable. Important text must not be truncated. The design should support text enlargement and 200% zoom without fixed text containers or overlapping controls.
