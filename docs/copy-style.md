# Public copy style

Utilibre sounds like someone who enjoys useful software and wants to help you
finish a task. Write plainly, warmly, and with occasional dry humour. Explain
what a tool does before discussing how it is hosted.

## Voice and restraint

Give the visitor a useful fact or next step. Prefer concrete verbs, familiar
words, and specific limits. Let sentence and paragraph lengths follow the
thought; do not give every section the same rhythm or a compulsory aside.

The homepage and About page can admit our enthusiasm for collecting tools:
“We like useful software. Knowing when to stop is a separate skill.” A guide
usually needs a friendly introduction and precise steps. Most cards need no
joke at all. Read the whole page to catch repeated devices and accumulated
asides.

Humour may concern our enthusiasm, unnecessary technological ceremony, or
ordinary computing annoyances. Never joke about security, privacy, backups,
maintenance, uptime, capacity, data loss, competence, or the visitor. Donating
is voluntary; do not use guilt or imply that it buys privacy or priority.

Keep these surfaces literal:

- Navigation, buttons, form labels, permissions, authentication, validation,
  and destructive actions. “Delete file” should mean delete file.
- Errors, loading states and confirmations. Say what happened and what to try
  next; never invent progress or confirm an action that failed.
- Privacy, security, retention, abuse, incidents, legal commitments, resource
  limits and recovery instructions. Preserve reviewed substantive wording.
- Titles, metadata, accessible names and meaningful alternative text. Describe
  the page or action without requiring a joke to make sense.

## Editing a page

Lead with what someone can do. Keep qualifications beside the claim they limit,
including in short cards. Preserve exact menu names, steps, formats, commands,
URLs, anchors, export scope, deletion consequences and upstream attribution.

Use plain verbs instead of inflated wording or long noun chains. Cut empty
introductions, canned reassurance, vague appeals to experts, repeated abstract
contrasts, and endings that merely congratulate the prose. Do not use em
dashes in authored copy. Ordinary precise technical words and necessary
repetition are preferable to rotating synonyms.

Vary the writing where the subject calls for it. Do not impose sentence-length,
rare-word, humour or emotion quotas; add fake mistakes or personal experiences;
or distort certainty to imitate a human author. Keep uncertainty where the
evidence requires it.

Examples, to adapt rather than repeat across the site:

| Surface | English | Spanish |
| --- | --- | --- |
| Directory | Pick a tool and get on with your day. | Elegí una herramienta y seguí con tu día. |
| About aside | We like useful software. Knowing when to stop is a separate skill. | Nos gusta el software útil. Saber cuándo parar ya es otro asunto. |
| Empty collection | No tools pinned yet. Choose a tool below to start. | Todavía no fijaste herramientas. Elegí una abajo para empezar. |

## English and Spanish

Both languages are authored interfaces. **Spanish always uses voseo**:
`podés`, `elegí`, `guardá`, `revisá`. This standing owner instruction overrides
tú examples in imported briefs. Use broadly understandable vocabulary and
`« »` for quotations. Keep product names and installed-interface button labels
unchanged, even when an upstream interface has no Spanish translation.

Match practical meaning, factual qualifications and level of reassurance.
Adapt or omit an aside that does not translate naturally. Never leave newly
edited Spanish text using English fallback. English and Spanish are the only
portal locales currently supported.

“Software libre” is the usual translation of free/open-source software. Check
the licence before describing a project as libre. Never invent an SPDX suffix.

## Claims and sources

Preserve the distinction between browser processing and storage, downloaded
files, server processing, encrypted payloads, account records, connection
metadata, relays, external providers, active retention and backups. A local
task does not establish that the entire application makes no network requests.

Use installed configuration and dated verification records for factual edits.
An upstream default is not evidence of Utilibre's setting. Remove an unsupported
assurance rather than inventing a reassuring replacement, and record the narrow
unresolved fact internally. Do not change settings or delete data to make copy
true. No copy pass may introduce tracking, visitor analytics, external writing
services, runtime AI, new assets from third parties, or vendor voice patches.

## Where to edit and how to check

Use existing canonical sources: `portal/src/i18n/`, `portal/src/catalog/`,
`portal/src/pages/`, shared components and supported instance configuration.
Keep translation keys, placeholders, URLs and anchors stable. Runtime
`PROJECT_TAGLINE_EN` and `PROJECT_TAGLINE_ES` need the same bilingual review;
the default tagline follows the configured language.

The dated [coverage inventory](copy-coverage-2026-10-09.md) records the complete
9 October pass, including sources retained after review and upstream limits.
Do not treat unchanged wording as unreviewed or a homepage edit as a sitewide
pass. Review every guide as well as shared templates.

Run the applicable existing checks from `portal/`: `npm run lint`,
`npm run typecheck`, `npm test`, and `npm run test:e2e`. The test command also
builds the source. Inspect both languages in the rendered page, representative
mobile layouts, keyboard/no-JavaScript navigation, changed interaction states
and longer Spanish text. Report only checks actually performed.
