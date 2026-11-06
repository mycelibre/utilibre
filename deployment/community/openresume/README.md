# OpenResume: Spanish and English builder

The existing origin and native browser storage key are unchanged. English remains
`/resume-builder`; Spanish is `/es/resume-builder`. The parser/importer remains
English. Do not represent PDF import as a lossless editable backup, and do not
translate a visitor's saved headings or content automatically.

Pinned upstream: `xitanggg/open-resume` at
`4f8255a2c763479837f69f1dccf2a3338730cd79` (AGPLv3, version scope unconfirmed).
`privacy-static.patch`, the original replacement icon, and
`spanish-workflow.patch` are ordered inputs. The latter translates shared form
presentation, adds native PDF loading/error feedback, preserves bullet input as
text, and makes navigation/controls fit smaller screens. It adds no dependency,
account, API, telemetry or new PDF engine. `package-lock.json` is unchanged.

## Rebuild and check

Use a clean disposable clone at the exact revision, owned by a non-root build
user. `python3 build-localized.py /path/to/clone --tag utilibre-openresume:cv-es-20261106`
verifies the lock and runtime identities, installs locked packages without lifecycle
scripts, builds both languages in containers with networking disabled, and overlays
static files on the existing repaired runtime. `build.py` delegates to this path.
Do not substitute an older nginx image: retained native fixes are deliberate.
The two named build/runtime images must already be present. Build uses at most
2 CPUs / 4 GiB; production retains 0.5 CPU / 96 MiB and no application database.

Run `check-workflow.mjs` against the loopback candidate first. `CV_TEST_ORIGIN`,
`CV_BUILD_SOURCE`, `CV_REPORT_DIR` and `CV_SAMPLE_DIR` select explicit inputs and
outputs; the only allowed hosts are loopback and the existing public instance.
It uses fictional examples and disposable browser contexts, checks extracted
PDF text, six single-page exports, Spanish accents, local requests, language
switching and draft retention. Phone coverage is Chromium touch emulation,
not a real-device certification. Never use visitors' documents as fixtures.

The script requires this repository's Playwright and the pinned source's PDF.js;
PDF text checking does not require native canvas. The original example text is
in `portal/src/pages/resume-examples.ts`. TXT and PDF downloads are writing aids,
not a JSON project-import feature. No existing draft is populated by a portal link.

## Release and rollback

Follow the existing scoped Compose release and health/rollback mechanism. Activate
only the exact tested artifact, update `compose.openresume.yaml`, and recreate
only its `web` service with `--no-deps --no-build --pull never`. Keep the previous
image. No Caddy change or new hostname is required. The editor keeps its existing
noindex policy; the bilingual portal guide is the indexable landing page.

Rollback restores the previous image pin and only recreates `web`. Browser drafts
and downloaded files remain on each visitor's device and are not migrated or
backed up by this release. A native image rollback does not undo browser edits.

`publish-localized-source.py SOURCE` prepares a source offer. `--publish` explicitly
replaces only the existing OpenResume archive and retains the previous copy.
It includes tracked modified source, licences, the patches and build/check inputs.
The integration source publication separately includes the portal guide/examples.

The frozen Trivy comparison covers native image packages; static browser bundles
are not automatically equivalent to extracted npm dependency coverage. Record
remaining findings and scanner limits in the release evidence. Do not call this
release a fleet-wide security clearance.
