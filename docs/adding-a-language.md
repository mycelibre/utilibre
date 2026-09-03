# Adding a language

English and Spanish are first-class in the current portal. Adding another
language means translating the complete public interface and routing model,
not only homepage card names. Internal operator documentation may remain in
English.

## Current architecture

- Dictionaries: `portal/src/i18n/en.ts` and `portal/src/i18n/es.ts`
- Language type, dictionary selection, first-visit detection, and local
  preference: `portal/src/i18n/index.ts`
- Localized route segments and language-preserving switching:
  `portal/src/routes.ts`
- Catalog names, descriptions, slugs, flows, retention, logging, and deferral
  text: `portal/src/catalog/catalog.ts`
- Visible language choices, `<html lang>`, metadata, and `hreflang`:
  `portal/src/main.ts`
- Route crawler policy: `portal/public/robots.txt` and edge documentation

The present first-visit rule is: a saved local preference first, then Spanish
if any browser preference starts with `es`, then the configured
`DEFAULT_LANGUAGE` (`en` or `es`, default `en`). The selection is kept only in
local storage. The server exposes only the validated language value through
`/_portal/config`; it does not receive the browser preference.

## 1. Choose the locale and URL policy

Choose a valid BCP 47 language tag and a short stable path prefix. Decide the
neutral written variety and record who reviews it. Use the language's own name
in the selector; do not use a flag.

Create natural phrasing for the target audience rather than a literal or
keyword-stuffed translation. Separate language URLs must describe the same
page/tool and must not become SEO duplicates with unequal content.

Follow `docs/copy-style.md` when translating voice. Preserve the intent and
timing of a dry line rather than its word order; omit humor that has no natural
equivalent. Keep repeated interface text, errors, warnings, privacy and legal
facts, recovery, status, and donation conditions literal.

## 2. Add a complete dictionary

Create `portal/src/i18n/LANGUAGE.ts` using the English key set as its type, as
Spanish does:

```ts
import type { en as EnglishDictionary } from './en';

export const language: Record<keyof typeof EnglishDictionary, string> = {
  // Every stable key, translated.
};
```

Translate every key, including navigation, page prose, tool names and help,
buttons, labels, placeholders, validation, errors, warnings, empty/loading/
success states, privacy labels, accessibility names, donation/transparency/
privacy/acceptable-use/software/status content, titles, descriptions, and Open
Graph text. Do not leave backend/library error text untranslated; map it to a
stable key.

## 3. Extend types, detection, and selection

In `portal/src/i18n/index.ts`:

- add the language to `Language` and `dictionaries`;
- accept its saved value in `preferredLanguage()`;
- detect its browser language in a documented priority order;
- continue storing only the chosen language locally.

Also extend the `defaultLanguage` union/default in `portal/src/config.ts`, the
strict environment-value allowlist in `portal/server/server.mjs`, the portal
environment in `compose.yaml`, and the documented `DEFAULT_LANGUAGE` choices
in `.env.example`. An invalid configured value must resolve to a known safe
fallback rather than becoming an arbitrary language or path.

In `portal/src/main.ts`:

- add one selector option labelled in the language itself;
- include it in the `hreflang` loop;
- keep current-page translation through `translatedPath()`;
- verify `<html lang>`, page titles, descriptions, and Open Graph strings.

Do not transmit preference data or add analytics/cookies for language choice.

## 4. Extend every localized route and catalog field

Add the language to every entry in `staticPaths` in `portal/src/routes.ts`.
Add a translated slug for every tool. The language switch must map a tool by
stable ID, never by guessing or machine-translating the current URL.

`LocalizedText` and every catalog record currently contain `en` and `es`.
Extend the type and translate all catalog fields:

- name and description;
- `dataFlow`, temporary storage, retention, and logging;
- deferral reasons and limitations;
- tool slugs.

Keep privacy labels technically equivalent across languages. Product names,
licenses, versions, hashes, and exact source URLs normally remain unchanged.

Update crawler exclusions for the new tool/status paths in
`portal/public/robots.txt` and any edge `X-Robots-Tag` matchers. Do not make API
or processing results indexable.

## 5. Review upstream-interface limitations

SearXNG, rimgo, and any future frontend manage their own localization. Enable
the language only through a clean, officially supported preference/default
mechanism. Do not fork an upstream application only to match the portal's
selector. Document an upstream interface that lacks the language, and keep
that limitation distinct from the fully translated portal.

## 6. Add tests

Generalize `portal/tests/unit/i18n.test.ts` so every dictionary has exactly the
English key set, no blank values, and every catalog entry has complete
localized fields/slugs. Extend route tests to cover:

- every static path;
- representative translated tool slugs;
- language switching that preserves the current page/tool;
- invalid/missing language prefixes.

Add Playwright coverage for first-visit browser detection, saved-choice
persistence, `<html lang>`, translated metadata, navigation through every
public page, validation/error/accessibility text, accented/non-ASCII
characters, and a 375-pixel mobile viewport with the longest labels. Check for
untranslated English leakage with human review; identical strings such as
product names or `UUID` are not automatically errors.

Run from `portal/`:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## Completion checklist

- A fluent reviewer has checked the complete public interface.
- First-visit detection and local preference behave as documented.
- Switching language preserves every static page and tool.
- `<html lang>`, `hreflang`, title, description, and Open Graph text are right.
- Public policy, privacy, status, software, donation, and error content are
  complete.
- Catalog privacy disclosures and translated slugs have no gaps.
- Mobile, keyboard, screen-reader naming, and longer-label layouts pass.
- No language preference leaves the browser or requires an account.
