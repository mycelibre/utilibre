# Public copy style

Utilibre sounds like a competent independent open-source maintainer with a dry
sense of humor, not like a comedian pretending to be a systems administrator.
It takes the visitor's task and dignity seriously, and itself only moderately
seriously.

## Voice

The voice is:

- clear before clever;
- intelligent without showing off;
- technically informed but understandable to nontechnical visitors;
- quietly funny through understatement, contrast, and precise observation;
- mildly self-deprecating about maintenance, dependency churn, server costs,
  and the ordinary absurdities of running software;
- confident about verified facts and candid about limitations; and
- approachable without becoming cute or excessively casual.

Humor normally lands as a short declarative after a longer, literal setup:
“Free to use. Not free to run.” State the useful information first.

## Editorial rules

1. Use no more than one comic idea in a normal content block. One idea may use
   more than one sentence; do not stack punchlines.
2. On pages listing several tools or items, keep at least one-third of the
   descriptions fully literal. The catalog should usually exceed that floor.
3. Anything read repeatedly—navigation, buttons, loading states, toasts,
   confirmations, validation, and status text—is literal.
4. Privacy facts, security warnings, legal notices, resource limits, recovery
   instructions, and donation conditions are literal and unambiguous.
5. Direct self-deprecation at the operator or the realities of hosting, never
   at security, reliability, competence, backups, or visitor trust.
6. Let humor emerge from truthful specifics. “A slightly unreasonable number
   of health checks” is stronger than a joke attached to generic copy.
7. Do not repeat the same comic device on one page.
8. Never mock visitors, including people who make mistakes or do not know the
   technical vocabulary.
9. Do not make absolute privacy, anonymity, security, reliability, uptime, or
   retention claims unless the implementation verifies the complete claim.
10. Credit upstream projects clearly. Utilibre hosts or integrates their
    software; it did not create their interfaces or inherit credit for them.
11. Use fungal or mycelial language at most once or twice across the shipping
    site, and only as a subtle structural metaphor. It is not a mascot voice.

## Writing by function

- Put the task or fact first. Add context only when it changes a decision.
- Buttons use a specific verb and object: “Merge and download,” not “Process.”
- Errors say what failed and how to recover without blaming the visitor.
- Loading and success messages name the real operation and never invent
  progress.
- Tool descriptions lead with the user's job, then name the upstream project
  and any limitation that matters before launch.
- A privacy label describes one processing boundary. Mixed labels must never
  let `LOCAL` imply that an entire operation is browser-only.
- Source links name the upstream project instead of presenting an anonymous
  “Source” label.

## English and Spanish

English and Spanish are equal authored interfaces, not a source language and
its shadow. Translate the intention and timing of a comic beat rather than its
word order. If no natural equivalent exists, omit the joke in that language.

Spanish must be neutral and avoid regionally marked vocabulary when an
unmarked alternative exists. Use `« »` for quotations. “Software libre” is the
deliberate default for “open-source”; use “código abierto” only for software
that is open-source but not libre-licensed. Proper project names, licenses,
versions, and URLs remain unchanged.

Runtime values in `PROJECT_TAGLINE_EN` and `PROJECT_TAGLINE_ES` require the same
review and content parity as dictionary copy. `PROJECT_TAGLINE` is only for a
genuinely language-neutral value; it must not become untranslated Spanish.

## Claims and attribution

Prefer an exact technical statement to a privacy slogan. Name the relevant
boundary: browser, edge, application server, upstream service, memory, log, or
cookie. Avoid “anonymous,” “untraceable,” “zero logs,” “fully secure,” and
equivalent absolutes unless a future implementation proves them completely.

The catalog records the upstream project name, source URL, license, installed
version, modification state, data flow, storage, retention, and logging. Keep
those facts consolidated in `portal/src/catalog/catalog.ts`. Do not imply that
Utilibre authored a hosted upstream interface.

## Avoid

- startup language such as “empower,” “revolutionize,” “seamless ecosystem,”
  “next-generation,” and “one-stop solution”;
- exaggerated anti-corporate rhetoric, fake rebellion, fearmongering, and
  forced hacker jargon;
- meme language, internet-casual filler, cute names for serious functions, and
  jokes that depend on context the visitor does not have;
- jokes in every heading, excessive exclamation marks, and “built with love”;
- claims that the service is held together by luck, duct tape, prayer, or an
  unreliable server; and
- jokes substituted for privacy facts, errors, legal obligations, warnings,
  donation conditions, or recovery instructions.

## Model

> Open-source software solves many ordinary problems. Utilibre hosts a useful
> selection so you can use it without accidentally becoming a systems
> administrator.

Not this:

> Welcome to our epic privacy playground, where our tiny mushroom army fights
> Big Tech one byte at a time!

## Adding or changing copy

Public interface text belongs in `portal/src/i18n/en.ts` and
`portal/src/i18n/es.ts`. Bilingual catalog names, descriptions, project credit,
and factual inventory belong in `portal/src/catalog/catalog.ts`. Keep complete
messages translatable; do not assemble sentences from fragments.

After editing, run from `portal/`:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Review the longest Spanish copy at narrow width and 200% zoom. Check metadata,
accessible names, screen-reader status output, empty/error states, and every
string that a test intentionally asserts.
