# Adding a browser tool

Follow the bilingual voice and safety rules in `docs/copy-style.md`. Tool
descriptions are normally literal; humor belongs in page-level explanation,
not controls, repeated states, errors, warnings, recovery, or privacy claims.

Add a tool only when it solves a distinct, useful problem. A new card is not a
goal by itself. Milestone-1 tools are deliberately browser-side: after the
application and any self-hosted static assets load, selected files and entered
content must not leave the browser.

## 1. Define the behavior and data flow

Before coding, write down:

- the exact input, output, supported formats, size limitations, and failure
  modes;
- whether standard browser APIs are sufficient;
- every network request needed after the page loads;
- transient browser memory use and whether object URLs, workers, or WASM are
  involved;
- metadata, animation, color, quality, password, or format limitations users
  need to understand;
- the dependency's current maintenance status, exact version, license, source,
  and browser bundle cost, if a library is needed.

If the operation needs server processing, do not describe it as a local tool.
Review it as a service, assign `SERVER` and any `PROXY`/`EXTERNAL` labels, and
follow [adding-a-service.md](adding-a-service.md).

Do not add a CDN, remote font, analytics request, telemetry SDK, account, or
server upload merely for convenience. A dependency's JavaScript and WASM must
be pinned and self-hosted.

## 2. Add a stable catalog entry

Add one entry to `portal/src/catalog/catalog.ts`. A local tool normally uses
the `localTool()` helper and must have:

- a stable lowercase-hyphenated `id`;
- a useful category (`image`, `pdf`, `file`, or `utility`);
- natural English and neutral Spanish names and descriptions;
- both language-aware slugs;
- truthful `LOCAL` data flow, no upload, browser-only temporary storage,
  retention, and logging statements;
- dependency project name, license, source URL, installed version, and
  modification status when third-party code is involved. The visible source
  treatment must credit that project rather than implying Utilibre authorship.

The catalog drives cards, routes, transparency details, status/inventory
content, and software disclosures. Do not duplicate the same facts in an
unrelated component.

If a genuinely new category is necessary, extend `CatalogCategory`, add its
translation key, render it in `renderTools()`, and test the resulting layout.
Prefer an existing category when it describes the tool accurately.

## 3. Implement and dispatch the tool

Place focused code under `portal/src/tools/`. Use the helpers in
`portal/src/utilities/dom.ts` for labelled fields, buttons, live status regions,
downloads, and DOM creation. Keep user-visible text out of the module; request
it through the supplied `Translate` function.

Update the dispatch in `renderToolPage()` in `portal/src/pages/pages.ts` and,
where applicable, its tool-ID union. Existing families are lazily imported:

- `image-*` → `tools/image.ts`
- `pdf-*` → `tools/pdf.ts`
- `file-*` → `tools/files.ts`
- JSON/Base64/URL/UUID → `tools/text.ts`
- QR tools → `tools/qr.ts`

A separate module is appropriate when a tool has a distinct dependency or
enough logic to justify its own lazy chunk. Handle malformed, unsupported, and
oversized input without exposing raw library exceptions. Release resources:
close `ImageBitmap` objects, revoke object URLs when no longer useful, discard
large buffers, and restore disabled controls in `finally` blocks.

For static WASM or worker assets, copy the exact pinned file locally during
`prebuild`/`predev`; never retain a library's default CDN fallback. Update the
portal Content Security Policy only for a concrete local requirement, and keep
`connect-src` restricted.

## 4. Translate every public string

Add stable keys to both:

- `portal/src/i18n/en.ts`
- `portal/src/i18n/es.ts`

Translate the title, description, labels, help, placeholders, warnings,
buttons, validation, empty/loading/success/error states, accessibility names,
page metadata, and any format limitation. Spanish is an equal interface, not a
fallback copy. Do not use national flags for language selection.

Use `« »` for Spanish quotations and prefer “software libre” for libre-licensed
open-source software. Translate comic intent only when it remains natural;
otherwise omit the joke.

`es.ts` is typed against the English dictionary, and the unit suite requires
exact key parity. See [adding-a-language.md](adding-a-language.md) for broader
i18n architecture.

## 5. Test the privacy claim and behavior

Add unit tests for pure parsing/transformation rules under
`portal/tests/unit/`. Add a Playwright test under `portal/tests/e2e/` that:

1. opens the tool and waits for all code/WASM/worker assets;
2. selects or enters a small deterministic fixture;
3. attaches request monitoring only after assets are ready;
4. performs the operation and checks the actual output/status/download;
5. asserts there was no HTTP(S) request, fetch, XHR, beacon, WebSocket, or form
   submission during processing;
6. repeats relevant UI assertions at a mobile viewport and in Spanish.

Cover invalid and unusually large input without exhausting the test host. Test
keyboard order, visible focus, associated labels, semantic headings, live
status announcements, contrast, and reduced-motion behavior. Blob/object URLs
are local browser mechanisms and should not be mistaken for network uploads.

Run from `portal/`:

```sh
npm ci --ignore-scripts
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm audit
```

Playwright requires its supported Chromium browser to be installed once; see
the test section in the repository README.

## 6. Update disclosure and licenses

If a dependency changes, update together:

- exact versions in `package.json` and `package-lock.json`;
- the catalog license/source/version fields;
- the public Software inventory when it is a major component;
- `THIRD_PARTY_NOTICES.md` and `docs/licenses.md`;
- privacy and resource documentation if data flow, memory use, or static asset
  size changes.

Preserve license and attribution files. Re-run the no-upload tests after any
dependency, Vite, worker, WASM, or CSP change.

## Completion checklist

- The tool is useful and not a duplicate made to inflate the catalog.
- English and Spanish routes are directly linkable and switching language
  preserves the tool.
- The catalog describes real data flow and limitations.
- No selected content is transmitted after assets load.
- Output and invalid-input behavior are tested, including mobile and keyboard
  use.
- All dependencies are pinned, FOSS-compatible, self-hosted, and disclosed.
- Build, lint, type check, unit tests, browser tests, and dependency review pass.
