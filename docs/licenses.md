# Licensing and source inventory

Review date: 2026-09-03

This is the operational license inventory for milestone 1. It is based on the
exact npm lockfile, immutable Compose image/build references, package license
files, and official upstream repositories. `THIRD_PARTY_NOTICES.md` preserves the
notices for software delivered to browsers. This document is not legal advice.

The separately managed public-service stack is inventoried in
[`deployment/utilibre/SOURCE_MANIFEST.md`](../deployment/utilibre/SOURCE_MANIFEST.md),
including exact container digests or local build revisions, upstream sources,
licenses, and local modification status. This document covers the portal and
the root Compose stack rather than duplicating that deployment manifest.

## Original work

Copyright © 2026 Mycelibre contributors.

Original portal, server, integration, configuration, scripts, tests, and
documentation in this repository are licensed under **AGPL-3.0-or-later**. The
complete version 3 text is in `LICENSE`.

The Utilibre identity assets under `portal/public/brand/` are excluded from
that software and documentation license. Their inclusion in this repository
does not grant a license to use the Utilibre name, logos, or marks outside this
project. See `THIRD_PARTY_NOTICES.md` for the exact boundary.

This original work includes `config/searxng/sitecustomize.py`, which Compose
loads into the SearXNG Python runtime to discard the untrusted rendered-record
tail after a recognized query marker. It is source-visible integration code,
not an undisclosed patch inside
the container image.

It also includes the Redlib redirect hardening under `config/redlib/`. That
change is combined with Redlib's AGPL-3.0-only source and must be distributed
under terms compatible with that upstream license; the project's
AGPL-3.0-or-later grant permits using version 3 for the local patch.

The AGPL applies to this project's original work, not as a relicensing of
separate upstream containers or permissively licensed libraries. The selected
runtime library licenses are compatible with distribution in the portal's
AGPL-covered aggregate/bundle. No noncommercial-only software dependency or
third-party interface asset is used; the separate Utilibre identity-asset
exception above does not alter the license of the code.

Before serving the portal publicly, `SOURCE_CODE_URL` must point to the exact
Corresponding Source for the deployed revision, including build and deployment
scripts. Leaving that value blank is acceptable only before launch; it is not
the intended public AGPL section 13 compliance posture.

## Deployed and optional container inventory

| Name and purpose | Exact version/image | License | Official source | Modified? | Obligations and attribution |
| --- | --- | --- | --- | --- | --- |
| Portal runtime (serves the original portal only) | `node:24.14.0-alpine3.23@sha256:7fddd9ddeae8196abf4a3ef2de34e11f7b1a722119f91f28ddf1e99dcafdf114` | Node.js MIT; Alpine components retain their own licenses | <https://github.com/nodejs/node/tree/v24.14.0>, <https://github.com/nodejs/docker-node> | The upstream base is unmodified; original portal files are added in a new image | Publish this project's Corresponding Source under AGPL-3.0-or-later; preserve Node/Alpine notices when redistributing the image |
| Cobalt API (media extraction/stream preparation) | `ghcr.io/imputnet/cobalt:11.7.1-a636575@sha256:63186dd68afd57ce3bb1f62cc4c139f5fa95b9c3e87a3cf5c6e4c7a570523f62`; source commit `a636575b09de1fc55d9b8cd98cac88f5f2f16b42` | AGPL-3.0-only, interpreted conservatively because upstream declares deprecated SPDX `AGPL-3.0` without an “or later” statement | <https://github.com/imputnet/cobalt/tree/a636575b09de1fc55d9b8cd98cac88f5f2f16b42> | No source change; environment/configuration only | Link exact upstream source and license. If patched, identify changes/dates and offer complete modified source to remote users. Do not copy Cobalt web UI, branding, or assets |
| FFmpeg binary inside the upstream Cobalt image | `ffmpeg-static` 5.3.0, whose official package identifies FFmpeg 6.1.1 static binaries | `ffmpeg-static`: GPL-3.0-or-later; the downloaded binary's exact configure flags and included codecs determine its license | <https://github.com/eugeneware/ffmpeg-static/tree/5.3.0>, <https://ffmpeg.org/download.html> | Not modified or repackaged by this repository | Operators who redistribute/mirror the Cobalt image must preserve the binary's license notice and corresponding-source offer. Do not claim this repository has independently built FFmpeg |
| SearXNG (metasearch) | `docker.io/searxng/searxng:2026.8.22-9fea41204@sha256:11a9b34cdc0b1ec2b991470a2762ecb5a1a531898289fb51dcd015260450729e`; source commit `9fea41204fdfa7a5cfa15b0ebd12904c520478ce`; local log-redaction hook | AGPL-3.0-or-later for both upstream and the local hook | <https://github.com/searxng/searxng/tree/9fea41204fdfa7a5cfa15b0ebd12904c520478ce>; [local hook](../config/searxng/sitecustomize.py) | Official image bytes unchanged; after recognizing a `q`/`query` marker or URL query, the locally authored hook discards the untrusted remainder of that rendered log record | `SOURCE_CODE_URL` must provide the exact project revision containing the hook, Compose mount/environment, and deployment scripts; also link the pinned upstream source and identify the runtime modification |
| Valkey (internal SearXNG limiter state) | `docker.io/valkey/valkey:9.1.1-alpine@sha256:de31910896150d5e754a07d57d227cfdde4e258ddd0d1aa4607f2d2f95843715` | BSD-3-Clause as the project license; individual bundled files keep their SPDX notices | <https://github.com/valkey-io/valkey/tree/9.1.1> | No source change; command-line configuration disables persistence and Compose provides tmpfs-only `/data` | Retain copyright/license/disclaimer text in source and binary redistributions; do not use contributor names for endorsement |
| Anubis (specialized Redlib gate) | `ghcr.io/techarohq/anubis:v1.27.0@sha256:8828275668b7bc675679f100970f9714f731388fbbf66ae94de8aca952e3fc4a`; source commit `d39e26cedcc96bea5e4915297c756e7eec74aaf7` | MIT | <https://github.com/TecharoHQ/anubis/tree/d39e26cedcc96bea5e4915297c756e7eec74aaf7> | No source change; policy/environment configuration only | Preserve Xe Iaso's copyright and the MIT permission/disclaimer when redistributing the image or substantial software portions; do not imply affiliation |
| Redlib (public Reddit frontend) | official source commit `a4d36e954cf1bd64f209cd8868c5a29edc81b374`; local image `public-utility-redlib:0.36.0-a4d36e9-p1`; source archive checksum and Rust `slim-bookworm`/Ubuntu `noble` build bases are pinned in `config/redlib/Dockerfile` | AGPL-3.0-only | <https://github.com/redlib-org/redlib/tree/a4d36e954cf1bd64f209cd8868c5a29edc81b374>; [local patch/build material](../config/redlib/) | **Yes.** Built from source with a local patch rejecting scheme-relative/backslash settings redirects; runtime configuration only for HSTS/indexing/RSS/preferences | Network users must receive the complete corresponding source: exact upstream tree and `Cargo.lock`, local patch, Docker build/context, Compose wiring, and installation scripts. Clearly mark the local change and preserve every upstream notice. Do not describe the binary as an official unmodified image |
| rimgo (optional Imgur frontend) | `codeberg.org/rimgo/rimgo:1.4.2@sha256:569800892522c7dd7d47290ce80d5c1fbb451609ce0d983c545a5d203ca93048`; commit `d2be8e221522dfe7a06452e2002dcf6dad569d1a` | AGPL-3.0-only | <https://codeberg.org/rimgo/rimgo/src/tag/v1.4.2> | No source change; optional profile passed a private compatibility test but public activation is blocked by its reviewed external-redirect flaw, plus abuse, bandwidth, and localization limitations | If a fixed release is later enabled, link its exact upstream source. Publish a modified fork if source changes are offered over the network |

Compose pulls most service images, including unmodified Anubis, from official
registries. Redlib is the
exception: BuildKit fetches the exact official source commit and compiles the
locally patched binary. Image/base digests and source checksums make inputs
repeatable, but each image contains its own language/runtime and OS dependency
closure. Official lockfiles, image license files, and OCI/SBOM metadata remain
authoritative for internal packages. Generate and archive an SBOM before
redistributing or mirroring any image. For Redlib, preserve its exact
`Cargo.lock` and all dependency licenses with the corresponding-source offer.

## Reviewed but deferred services

These projects are listed for transparency. Their code and assets are not
installed or delivered by milestone 1.

| Name | Reviewed version | License | Source | Modification status / obligation |
| --- | --- | --- | --- | --- |
| Invidious | 2.20260804.1, commit `48c6110a83fc788b4199daf737279b71950cc0db` | AGPL-3.0-only | <https://github.com/iv-org/invidious/tree/v2.20260804.1> | Not installed or modified; no code distributed |
| Invidious Companion | official build reviewed alongside the 2026-08 Invidious release | AGPL-3.0-only | <https://github.com/iv-org/invidious-companion> | Not installed or modified; would need the same source-offer discipline if deployed |

External search engines, media platforms, Reddit, YouTube, and Imgur are
network destinations, not software dependencies distributed by this project.
Their names are used only to explain data flows. Their service terms still
matter operationally and are separate from FOSS license compatibility.

## Direct portal dependencies

| Name | Version | Role | License | Source | Modified? | Distribution requirement |
| --- | --- | --- | --- | --- | --- | --- |
| `@cantoo/pdf-lib` | 2.9.1 | Browser-side PDF merge/extract/rotate/reorder | MIT | <https://github.com/cantoo-scribe/pdf-lib> | No; mechanically bundled/minified | Preserve copyright and MIT permission/disclaimer |
| `@noble/hashes` | 2.3.0 | Browser-side SHA-256/SHA-512 fallback when Web Crypto digest is unavailable on private HTTP | MIT | <https://github.com/paulmillr/noble-hashes> | No; mechanically bundled/minified | Preserve Paul Miller copyright and MIT permission/disclaimer |
| `zxing-wasm` | 3.1.3 | Browser-side QR generation and reading | MIT wrapper, Apache-2.0 ZXing-C++, BSD-3-Clause Zint/libzueci, public-domain-or-MIT stb | <https://github.com/Sec-ant/zxing-wasm/tree/v3.1.3> | No; JS is bundled and official WASM copied verbatim | Preserve all notices; Apache license copy; BSD binary notice; see `THIRD_PARTY_NOTICES.md` |
| `pako` override | 2.2.0 | Pins the PDF library's compression dependency | MIT AND Zlib | <https://github.com/nodeca/pako/tree/2.2.0> | No | Preserve MIT and Zlib notices and do not misrepresent ported Zlib code |

QR binary provenance verified from the installed package:

- `zxing-wasm`: 3.1.3
- ZXing-C++ commit: `a17fd9dc65d6aa0dd2f660fdfca7a6a6613d938f`
- bundled Zint submodule commit:
  `55541e139e62b9209b71cd9b0ba9010cec28b1d9`
- `zxing_full.wasm` SHA-256:
  `23f1b4a6b683742623b1e945993fdf8b49a1a3b5ae2719cc70389164d50f70d7`
- exact stb revision: not recorded by the tagged upstream CMake recipe, which
  performs an unpinned `FetchContent` clone. The applicable stb license is
  still permissive (public domain or MIT), and the MIT notice is preserved.

## Exact npm runtime closure

The following is the complete non-development package closure recorded in
`portal/package-lock.json`. All are used without source edits. The lockfile's
`resolved` field is the exact source package artifact URL for every entry.

- **MIT AND Zlib:** `pako@2.2.0`
- **MIT OR CC0-1.0 (MIT option selected):** `type-fest@5.8.0`
- **0BSD:** `tslib@2.8.1`
- **MIT:** `@cantoo/pdf-lib@2.9.1`, `@noble/hashes@2.3.0`, `@pdf-lib/standard-fonts@1.0.0`,
  `@pdf-lib/upng@1.0.1`, `@types/emscripten@1.41.5`,
  `color-convert@2.0.1`, `color-name@1.1.4`, `color-string@1.9.1`,
  `color@4.2.3`, `html-entities@2.6.0`, `is-arrayish@0.3.4`,
  `node-html-better-parser@1.5.9`, `simple-swizzle@0.2.4`,
  `tagged-tag@1.0.0`, and `zxing-wasm@3.1.3`.

The compiled `zxing-wasm` binary additionally contains the Apache-2.0,
BSD-3-Clause, and public-domain-or-MIT components itemized above; those native
subprojects do not appear as separate npm lockfile entries.

## Exact npm development closure

Development packages are used to build, lint, type-check, and test; they are
not intentionally copied into the production image. Every package below is
unmodified. Exact source artifact URLs and integrity hashes are in
`portal/package-lock.json`.

- **Apache-2.0:** `@eslint/config-array@0.23.5`,
  `@eslint/config-helpers@0.7.0`, `@eslint/core@1.2.1`,
  `@eslint/object-schema@3.0.5`, `@eslint/plugin-kit@0.7.2`,
  `@humanfs/core@0.19.2`, `@humanfs/node@0.16.8`,
  `@humanfs/types@0.15.0`, `@humanwhocodes/module-importer@1.0.1`,
  `@humanwhocodes/retry@0.4.3`, `@playwright/test@1.62.1`,
  `detect-libc@2.1.2`, `eslint-visitor-keys@3.4.3`,
  `eslint-visitor-keys@5.0.1`, `expect-type@1.4.0`,
  `playwright-core@1.62.1`, `playwright@1.62.1`, and
  `typescript@6.0.3`.
- **BlueOak-1.0.0:** `minimatch@10.2.6`.
- **BSD-2-Clause:** `eslint-scope@9.1.2`, `espree@11.2.0`,
  `esrecurse@4.3.0`, `estraverse@5.3.0`, `esutils@2.0.3`, and
  `uri-js@4.4.1`.
- **BSD-3-Clause:** `esquery@1.7.0` and `source-map-js@1.2.1`.
- **ISC:** `flatted@3.4.4`, `glob-parent@6.0.2`, `isexe@2.0.0`,
  `picocolors@1.1.1`, `semver@7.8.5`, `siginfo@2.0.0`, and
  `which@2.0.2`.
- **MPL-2.0:** `lightningcss@1.33.0` and its optional 1.33.0 platform
  bindings for Android arm64, Darwin arm64/x64, FreeBSD x64, Linux
  arm-gnueabihf/arm64-gnu/arm64-musl/x64-gnu/x64-musl, and Windows
  arm64-msvc/x64-msvc.
- **OFL-1.1:** `@fontsource-variable/atkinson-hyperlegible-next@5.3.0`
  and `@fontsource-variable/newsreader@5.3.0`. The packages are installed as
  development dependencies, but their CSS and WOFF2 font assets are copied
  into the browser build; their notices and OFL terms are preserved in
  `THIRD_PARTY_NOTICES.md`.
- **MIT:** `@eslint-community/eslint-utils@4.10.1`,
  `@eslint-community/regexpp@4.12.2`, `@eslint/js@10.0.1`,
  `@jridgewell/sourcemap-codec@1.6.0`, `@oxc-project/types@0.147.0`,
  `@rolldown/pluginutils@1.0.1`, `@standard-schema/spec@1.1.0`,
  `@types/chai@5.2.3`, `@types/deep-eql@4.0.2`,
  `@types/esrecurse@4.3.1`, `@types/estree@1.0.9`,
  `@types/json-schema@7.0.15`, `@types/node@26.4.0`,
  `@typescript-eslint/eslint-plugin@8.68.0`,
  `@typescript-eslint/parser@8.68.0`,
  `@typescript-eslint/project-service@8.68.0`,
  `@typescript-eslint/scope-manager@8.68.0`,
  `@typescript-eslint/tsconfig-utils@8.68.0`,
  `@typescript-eslint/type-utils@8.68.0`,
  `@typescript-eslint/types@8.68.0`,
  `@typescript-eslint/typescript-estree@8.68.0`,
  `@typescript-eslint/utils@8.68.0`,
  `@typescript-eslint/visitor-keys@8.68.0`, `@vitest/expect@4.1.11`,
  `@vitest/mocker@4.1.11`, `@vitest/pretty-format@4.1.11`,
  `@vitest/runner@4.1.11`, `@vitest/snapshot@4.1.11`,
  `@vitest/spy@4.1.11`, `@vitest/utils@4.1.11`, `acorn-jsx@5.3.2`,
  `acorn@8.18.0`, `ajv@6.15.0`, `assertion-error@2.0.1`,
  `balanced-match@4.0.4`, `brace-expansion@5.0.9`, `chai@6.2.2`,
  `convert-source-map@2.0.0`, `cross-spawn@7.0.6`, `debug@4.4.3`,
  `deep-is@0.1.4`, `es-module-lexer@2.3.2`,
  `escape-string-regexp@4.0.0`, `eslint@10.9.1`,
  `estree-walker@3.0.3`, `fast-deep-equal@3.1.3`,
  `fast-json-stable-stringify@2.1.0`, `fast-levenshtein@2.0.6`,
  `fdir@6.5.0`, `file-entry-cache@8.0.0`, `find-up@5.0.0`,
  `flat-cache@4.0.1`, `ignore@5.3.2`, `ignore@7.0.6`,
  `imurmurhash@0.1.4`, `is-extglob@2.1.1`, `is-glob@4.0.3`,
  `json-buffer@3.0.1`, `json-schema-traverse@0.4.1`,
  `json-stable-stringify-without-jsonify@1.0.1`, `keyv@4.5.4`,
  `levn@0.4.1`, `locate-path@6.0.0`, `magic-string@0.30.21`,
  `ms@2.1.3`, `nanoid@3.3.18`, `natural-compare@1.4.0`,
  `obug@2.1.4`, `optionator@0.9.4`, `p-limit@3.1.0`,
  `p-locate@5.0.0`, `path-exists@4.0.0`, `path-key@3.1.1`,
  `pathe@2.0.3`, `picomatch@4.0.7`, `postcss@8.5.26`,
  `prelude-ls@1.2.1`, `punycode@2.3.1`, `rolldown@1.2.6`,
  `shebang-command@2.0.0`, `shebang-regex@3.0.0`,
  `stackback@0.0.2`, `std-env@4.2.0`, `tinybench@2.9.0`,
  `tinyexec@1.3.0`, `tinyglobby@0.2.17`, `tinyrainbow@3.1.1`,
  `ts-api-utils@2.5.0`, `type-check@0.4.0`,
  `typescript-eslint@8.68.0`, `undici-types@8.3.0`, `vite@8.2.2`,
  `vitest@4.1.11`, `why-is-node-running@2.3.0`, `word-wrap@1.2.5`,
  and `yocto-queue@0.1.0`.
- **MIT, optional platform packages:** `fsevents@2.3.2`,
  `fsevents@2.3.3`, and all `@rolldown/binding-*@1.2.6` variants recorded
  by the lockfile: Android arm-eabi/arm64, Darwin arm64/x64, FreeBSD x64,
  Linux arm-gnueabihf/arm64-gnu/arm64-musl/ppc64-gnu/s390x-gnu/x64-gnu/
  x64-musl, OpenHarmony arm64, and Windows arm64-msvc/x64-msvc.

## Package-by-package npm lock inventory

This table expands the lockfile rather than treating transitive software as an unnamed group. Every row is unmodified; the source link is the integrity-pinned npm source artifact recorded by the lockfile. "Runtime" follows the lockfile metadata and can include type-only packages that bundling later eliminates.

| Package | Version | Scope | License | Exact source artifact | Disclosure / attribution |
| --- | --- | --- | --- | --- | --- |
| `@cantoo/pdf-lib` | 2.9.1 | runtime | `MIT` | [npm tarball](https://registry.npmjs.org/@cantoo/pdf-lib/-/pdf-lib-2.9.1.tgz) | MIT notice; no reciprocal source requirement |
| `@eslint-community/eslint-utils` | 4.10.1 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@eslint-community/eslint-utils/-/eslint-utils-4.10.1.tgz) | MIT notice; no reciprocal source requirement |
| `@eslint-community/regexpp` | 4.12.2 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@eslint-community/regexpp/-/regexpp-4.12.2.tgz) | MIT notice; no reciprocal source requirement |
| `@eslint/config-array` | 0.23.5 | development | `Apache-2.0` | [npm tarball](https://registry.npmjs.org/@eslint/config-array/-/config-array-0.23.5.tgz) | Apache license/NOTICE and change notices; no reciprocal source requirement |
| `@eslint/config-helpers` | 0.7.0 | development | `Apache-2.0` | [npm tarball](https://registry.npmjs.org/@eslint/config-helpers/-/config-helpers-0.7.0.tgz) | Apache license/NOTICE and change notices; no reciprocal source requirement |
| `@eslint/core` | 1.2.1 | development | `Apache-2.0` | [npm tarball](https://registry.npmjs.org/@eslint/core/-/core-1.2.1.tgz) | Apache license/NOTICE and change notices; no reciprocal source requirement |
| `@eslint/js` | 10.0.1 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@eslint/js/-/js-10.0.1.tgz) | MIT notice; no reciprocal source requirement |
| `@eslint/object-schema` | 3.0.5 | development | `Apache-2.0` | [npm tarball](https://registry.npmjs.org/@eslint/object-schema/-/object-schema-3.0.5.tgz) | Apache license/NOTICE and change notices; no reciprocal source requirement |
| `@eslint/plugin-kit` | 0.7.2 | development | `Apache-2.0` | [npm tarball](https://registry.npmjs.org/@eslint/plugin-kit/-/plugin-kit-0.7.2.tgz) | Apache license/NOTICE and change notices; no reciprocal source requirement |
| `@fontsource-variable/atkinson-hyperlegible-next` | 5.3.0 | development / browser asset | `OFL-1.1` | [npm tarball](https://registry.npmjs.org/@fontsource-variable/atkinson-hyperlegible-next/-/atkinson-hyperlegible-next-5.3.0.tgz) | Preserve the font copyright, OFL terms, and Reserved Font Name conditions |
| `@fontsource-variable/newsreader` | 5.3.0 | development / browser asset | `OFL-1.1` | [npm tarball](https://registry.npmjs.org/@fontsource-variable/newsreader/-/newsreader-5.3.0.tgz) | Preserve the font copyright, OFL terms, and Reserved Font Name conditions |
| `@humanfs/core` | 0.19.2 | development | `Apache-2.0` | [npm tarball](https://registry.npmjs.org/@humanfs/core/-/core-0.19.2.tgz) | Apache license/NOTICE and change notices; no reciprocal source requirement |
| `@humanfs/node` | 0.16.8 | development | `Apache-2.0` | [npm tarball](https://registry.npmjs.org/@humanfs/node/-/node-0.16.8.tgz) | Apache license/NOTICE and change notices; no reciprocal source requirement |
| `@humanfs/types` | 0.15.0 | development | `Apache-2.0` | [npm tarball](https://registry.npmjs.org/@humanfs/types/-/types-0.15.0.tgz) | Apache license/NOTICE and change notices; no reciprocal source requirement |
| `@humanwhocodes/module-importer` | 1.0.1 | development | `Apache-2.0` | [npm tarball](https://registry.npmjs.org/@humanwhocodes/module-importer/-/module-importer-1.0.1.tgz) | Apache license/NOTICE and change notices; no reciprocal source requirement |
| `@humanwhocodes/retry` | 0.4.3 | development | `Apache-2.0` | [npm tarball](https://registry.npmjs.org/@humanwhocodes/retry/-/retry-0.4.3.tgz) | Apache license/NOTICE and change notices; no reciprocal source requirement |
| `@jridgewell/sourcemap-codec` | 1.6.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@jridgewell/sourcemap-codec/-/sourcemap-codec-1.6.0.tgz) | MIT notice; no reciprocal source requirement |
| `@noble/hashes` | 2.3.0 | runtime | `MIT` | [npm tarball](https://registry.npmjs.org/@noble/hashes/-/hashes-2.3.0.tgz) | MIT notice; no reciprocal source requirement |
| `@oxc-project/types` | 0.147.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@oxc-project/types/-/types-0.147.0.tgz) | MIT notice; no reciprocal source requirement |
| `@pdf-lib/standard-fonts` | 1.0.0 | runtime | `MIT` | [npm tarball](https://registry.npmjs.org/@pdf-lib/standard-fonts/-/standard-fonts-1.0.0.tgz) | MIT notice; no reciprocal source requirement |
| `@pdf-lib/upng` | 1.0.1 | runtime | `MIT` | [npm tarball](https://registry.npmjs.org/@pdf-lib/upng/-/upng-1.0.1.tgz) | MIT notice; no reciprocal source requirement |
| `@playwright/test` | 1.62.1 | development | `Apache-2.0` | [npm tarball](https://registry.npmjs.org/@playwright/test/-/test-1.62.1.tgz) | Apache license/NOTICE and change notices; no reciprocal source requirement |
| `@rolldown/binding-android-arm-eabi` | 1.2.6 | development / optional | `MIT` | [npm tarball](https://registry.npmjs.org/@rolldown/binding-android-arm-eabi/-/binding-android-arm-eabi-1.2.6.tgz) | MIT notice; no reciprocal source requirement |
| `@rolldown/binding-android-arm64` | 1.2.6 | development / optional | `MIT` | [npm tarball](https://registry.npmjs.org/@rolldown/binding-android-arm64/-/binding-android-arm64-1.2.6.tgz) | MIT notice; no reciprocal source requirement |
| `@rolldown/binding-darwin-arm64` | 1.2.6 | development / optional | `MIT` | [npm tarball](https://registry.npmjs.org/@rolldown/binding-darwin-arm64/-/binding-darwin-arm64-1.2.6.tgz) | MIT notice; no reciprocal source requirement |
| `@rolldown/binding-darwin-x64` | 1.2.6 | development / optional | `MIT` | [npm tarball](https://registry.npmjs.org/@rolldown/binding-darwin-x64/-/binding-darwin-x64-1.2.6.tgz) | MIT notice; no reciprocal source requirement |
| `@rolldown/binding-freebsd-x64` | 1.2.6 | development / optional | `MIT` | [npm tarball](https://registry.npmjs.org/@rolldown/binding-freebsd-x64/-/binding-freebsd-x64-1.2.6.tgz) | MIT notice; no reciprocal source requirement |
| `@rolldown/binding-linux-arm-gnueabihf` | 1.2.6 | development / optional | `MIT` | [npm tarball](https://registry.npmjs.org/@rolldown/binding-linux-arm-gnueabihf/-/binding-linux-arm-gnueabihf-1.2.6.tgz) | MIT notice; no reciprocal source requirement |
| `@rolldown/binding-linux-arm64-gnu` | 1.2.6 | development / optional | `MIT` | [npm tarball](https://registry.npmjs.org/@rolldown/binding-linux-arm64-gnu/-/binding-linux-arm64-gnu-1.2.6.tgz) | MIT notice; no reciprocal source requirement |
| `@rolldown/binding-linux-arm64-musl` | 1.2.6 | development / optional | `MIT` | [npm tarball](https://registry.npmjs.org/@rolldown/binding-linux-arm64-musl/-/binding-linux-arm64-musl-1.2.6.tgz) | MIT notice; no reciprocal source requirement |
| `@rolldown/binding-linux-ppc64-gnu` | 1.2.6 | development / optional | `MIT` | [npm tarball](https://registry.npmjs.org/@rolldown/binding-linux-ppc64-gnu/-/binding-linux-ppc64-gnu-1.2.6.tgz) | MIT notice; no reciprocal source requirement |
| `@rolldown/binding-linux-s390x-gnu` | 1.2.6 | development / optional | `MIT` | [npm tarball](https://registry.npmjs.org/@rolldown/binding-linux-s390x-gnu/-/binding-linux-s390x-gnu-1.2.6.tgz) | MIT notice; no reciprocal source requirement |
| `@rolldown/binding-linux-x64-gnu` | 1.2.6 | development / optional | `MIT` | [npm tarball](https://registry.npmjs.org/@rolldown/binding-linux-x64-gnu/-/binding-linux-x64-gnu-1.2.6.tgz) | MIT notice; no reciprocal source requirement |
| `@rolldown/binding-linux-x64-musl` | 1.2.6 | development / optional | `MIT` | [npm tarball](https://registry.npmjs.org/@rolldown/binding-linux-x64-musl/-/binding-linux-x64-musl-1.2.6.tgz) | MIT notice; no reciprocal source requirement |
| `@rolldown/binding-openharmony-arm64` | 1.2.6 | development / optional | `MIT` | [npm tarball](https://registry.npmjs.org/@rolldown/binding-openharmony-arm64/-/binding-openharmony-arm64-1.2.6.tgz) | MIT notice; no reciprocal source requirement |
| `@rolldown/binding-win32-arm64-msvc` | 1.2.6 | development / optional | `MIT` | [npm tarball](https://registry.npmjs.org/@rolldown/binding-win32-arm64-msvc/-/binding-win32-arm64-msvc-1.2.6.tgz) | MIT notice; no reciprocal source requirement |
| `@rolldown/binding-win32-x64-msvc` | 1.2.6 | development / optional | `MIT` | [npm tarball](https://registry.npmjs.org/@rolldown/binding-win32-x64-msvc/-/binding-win32-x64-msvc-1.2.6.tgz) | MIT notice; no reciprocal source requirement |
| `@rolldown/pluginutils` | 1.0.1 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@rolldown/pluginutils/-/pluginutils-1.0.1.tgz) | MIT notice; no reciprocal source requirement |
| `@standard-schema/spec` | 1.1.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@standard-schema/spec/-/spec-1.1.0.tgz) | MIT notice; no reciprocal source requirement |
| `@types/chai` | 5.2.3 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@types/chai/-/chai-5.2.3.tgz) | MIT notice; no reciprocal source requirement |
| `@types/deep-eql` | 4.0.2 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@types/deep-eql/-/deep-eql-4.0.2.tgz) | MIT notice; no reciprocal source requirement |
| `@types/emscripten` | 1.41.5 | runtime | `MIT` | [npm tarball](https://registry.npmjs.org/@types/emscripten/-/emscripten-1.41.5.tgz) | MIT notice; no reciprocal source requirement |
| `@types/esrecurse` | 4.3.1 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@types/esrecurse/-/esrecurse-4.3.1.tgz) | MIT notice; no reciprocal source requirement |
| `@types/estree` | 1.0.9 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@types/estree/-/estree-1.0.9.tgz) | MIT notice; no reciprocal source requirement |
| `@types/json-schema` | 7.0.15 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@types/json-schema/-/json-schema-7.0.15.tgz) | MIT notice; no reciprocal source requirement |
| `@types/node` | 26.4.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@types/node/-/node-26.4.0.tgz) | MIT notice; no reciprocal source requirement |
| `@typescript-eslint/eslint-plugin` | 8.68.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@typescript-eslint/eslint-plugin/-/eslint-plugin-8.68.0.tgz) | MIT notice; no reciprocal source requirement |
| `@typescript-eslint/parser` | 8.68.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@typescript-eslint/parser/-/parser-8.68.0.tgz) | MIT notice; no reciprocal source requirement |
| `@typescript-eslint/project-service` | 8.68.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@typescript-eslint/project-service/-/project-service-8.68.0.tgz) | MIT notice; no reciprocal source requirement |
| `@typescript-eslint/scope-manager` | 8.68.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@typescript-eslint/scope-manager/-/scope-manager-8.68.0.tgz) | MIT notice; no reciprocal source requirement |
| `@typescript-eslint/tsconfig-utils` | 8.68.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@typescript-eslint/tsconfig-utils/-/tsconfig-utils-8.68.0.tgz) | MIT notice; no reciprocal source requirement |
| `@typescript-eslint/type-utils` | 8.68.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@typescript-eslint/type-utils/-/type-utils-8.68.0.tgz) | MIT notice; no reciprocal source requirement |
| `@typescript-eslint/types` | 8.68.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@typescript-eslint/types/-/types-8.68.0.tgz) | MIT notice; no reciprocal source requirement |
| `@typescript-eslint/typescript-estree` | 8.68.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@typescript-eslint/typescript-estree/-/typescript-estree-8.68.0.tgz) | MIT notice; no reciprocal source requirement |
| `@typescript-eslint/utils` | 8.68.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@typescript-eslint/utils/-/utils-8.68.0.tgz) | MIT notice; no reciprocal source requirement |
| `@typescript-eslint/visitor-keys` | 8.68.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@typescript-eslint/visitor-keys/-/visitor-keys-8.68.0.tgz) | MIT notice; no reciprocal source requirement |
| `@vitest/expect` | 4.1.11 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@vitest/expect/-/expect-4.1.11.tgz) | MIT notice; no reciprocal source requirement |
| `@vitest/mocker` | 4.1.11 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@vitest/mocker/-/mocker-4.1.11.tgz) | MIT notice; no reciprocal source requirement |
| `@vitest/pretty-format` | 4.1.11 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@vitest/pretty-format/-/pretty-format-4.1.11.tgz) | MIT notice; no reciprocal source requirement |
| `@vitest/runner` | 4.1.11 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@vitest/runner/-/runner-4.1.11.tgz) | MIT notice; no reciprocal source requirement |
| `@vitest/snapshot` | 4.1.11 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@vitest/snapshot/-/snapshot-4.1.11.tgz) | MIT notice; no reciprocal source requirement |
| `@vitest/spy` | 4.1.11 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@vitest/spy/-/spy-4.1.11.tgz) | MIT notice; no reciprocal source requirement |
| `@vitest/utils` | 4.1.11 | development | `MIT` | [npm tarball](https://registry.npmjs.org/@vitest/utils/-/utils-4.1.11.tgz) | MIT notice; no reciprocal source requirement |
| `acorn` | 8.18.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/acorn/-/acorn-8.18.0.tgz) | MIT notice; no reciprocal source requirement |
| `acorn-jsx` | 5.3.2 | development | `MIT` | [npm tarball](https://registry.npmjs.org/acorn-jsx/-/acorn-jsx-5.3.2.tgz) | MIT notice; no reciprocal source requirement |
| `ajv` | 6.15.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/ajv/-/ajv-6.15.0.tgz) | MIT notice; no reciprocal source requirement |
| `assertion-error` | 2.0.1 | development | `MIT` | [npm tarball](https://registry.npmjs.org/assertion-error/-/assertion-error-2.0.1.tgz) | MIT notice; no reciprocal source requirement |
| `balanced-match` | 4.0.4 | development | `MIT` | [npm tarball](https://registry.npmjs.org/balanced-match/-/balanced-match-4.0.4.tgz) | MIT notice; no reciprocal source requirement |
| `brace-expansion` | 5.0.9 | development | `MIT` | [npm tarball](https://registry.npmjs.org/brace-expansion/-/brace-expansion-5.0.9.tgz) | MIT notice; no reciprocal source requirement |
| `chai` | 6.2.2 | development | `MIT` | [npm tarball](https://registry.npmjs.org/chai/-/chai-6.2.2.tgz) | MIT notice; no reciprocal source requirement |
| `color` | 4.2.3 | runtime | `MIT` | [npm tarball](https://registry.npmjs.org/color/-/color-4.2.3.tgz) | MIT notice; no reciprocal source requirement |
| `color-convert` | 2.0.1 | runtime | `MIT` | [npm tarball](https://registry.npmjs.org/color-convert/-/color-convert-2.0.1.tgz) | MIT notice; no reciprocal source requirement |
| `color-name` | 1.1.4 | runtime | `MIT` | [npm tarball](https://registry.npmjs.org/color-name/-/color-name-1.1.4.tgz) | MIT notice; no reciprocal source requirement |
| `color-string` | 1.9.1 | runtime | `MIT` | [npm tarball](https://registry.npmjs.org/color-string/-/color-string-1.9.1.tgz) | MIT notice; no reciprocal source requirement |
| `convert-source-map` | 2.0.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/convert-source-map/-/convert-source-map-2.0.0.tgz) | MIT notice; no reciprocal source requirement |
| `cross-spawn` | 7.0.6 | development | `MIT` | [npm tarball](https://registry.npmjs.org/cross-spawn/-/cross-spawn-7.0.6.tgz) | MIT notice; no reciprocal source requirement |
| `debug` | 4.4.3 | development | `MIT` | [npm tarball](https://registry.npmjs.org/debug/-/debug-4.4.3.tgz) | MIT notice; no reciprocal source requirement |
| `deep-is` | 0.1.4 | development | `MIT` | [npm tarball](https://registry.npmjs.org/deep-is/-/deep-is-0.1.4.tgz) | MIT notice; no reciprocal source requirement |
| `detect-libc` | 2.1.2 | development | `Apache-2.0` | [npm tarball](https://registry.npmjs.org/detect-libc/-/detect-libc-2.1.2.tgz) | Apache license/NOTICE and change notices; no reciprocal source requirement |
| `es-module-lexer` | 2.3.2 | development | `MIT` | [npm tarball](https://registry.npmjs.org/es-module-lexer/-/es-module-lexer-2.3.2.tgz) | MIT notice; no reciprocal source requirement |
| `escape-string-regexp` | 4.0.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/escape-string-regexp/-/escape-string-regexp-4.0.0.tgz) | MIT notice; no reciprocal source requirement |
| `eslint` | 10.9.1 | development | `MIT` | [npm tarball](https://registry.npmjs.org/eslint/-/eslint-10.9.1.tgz) | MIT notice; no reciprocal source requirement |
| `eslint-scope` | 9.1.2 | development | `BSD-2-Clause` | [npm tarball](https://registry.npmjs.org/eslint-scope/-/eslint-scope-9.1.2.tgz) | BSD notice/disclaimer; no reciprocal source requirement |
| `eslint-visitor-keys` | 3.4.3 | development | `Apache-2.0` | [npm tarball](https://registry.npmjs.org/eslint-visitor-keys/-/eslint-visitor-keys-3.4.3.tgz) | Apache license/NOTICE and change notices; no reciprocal source requirement |
| `eslint-visitor-keys` | 5.0.1 | development | `Apache-2.0` | [npm tarball](https://registry.npmjs.org/eslint-visitor-keys/-/eslint-visitor-keys-5.0.1.tgz) | Apache license/NOTICE and change notices; no reciprocal source requirement |
| `espree` | 11.2.0 | development | `BSD-2-Clause` | [npm tarball](https://registry.npmjs.org/espree/-/espree-11.2.0.tgz) | BSD notice/disclaimer; no reciprocal source requirement |
| `esquery` | 1.7.0 | development | `BSD-3-Clause` | [npm tarball](https://registry.npmjs.org/esquery/-/esquery-1.7.0.tgz) | BSD notice/disclaimer and no endorsement; no reciprocal source requirement |
| `esrecurse` | 4.3.0 | development | `BSD-2-Clause` | [npm tarball](https://registry.npmjs.org/esrecurse/-/esrecurse-4.3.0.tgz) | BSD notice/disclaimer; no reciprocal source requirement |
| `estraverse` | 5.3.0 | development | `BSD-2-Clause` | [npm tarball](https://registry.npmjs.org/estraverse/-/estraverse-5.3.0.tgz) | BSD notice/disclaimer; no reciprocal source requirement |
| `estree-walker` | 3.0.3 | development | `MIT` | [npm tarball](https://registry.npmjs.org/estree-walker/-/estree-walker-3.0.3.tgz) | MIT notice; no reciprocal source requirement |
| `esutils` | 2.0.3 | development | `BSD-2-Clause` | [npm tarball](https://registry.npmjs.org/esutils/-/esutils-2.0.3.tgz) | BSD notice/disclaimer; no reciprocal source requirement |
| `expect-type` | 1.4.0 | development | `Apache-2.0` | [npm tarball](https://registry.npmjs.org/expect-type/-/expect-type-1.4.0.tgz) | Apache license/NOTICE and change notices; no reciprocal source requirement |
| `fast-deep-equal` | 3.1.3 | development | `MIT` | [npm tarball](https://registry.npmjs.org/fast-deep-equal/-/fast-deep-equal-3.1.3.tgz) | MIT notice; no reciprocal source requirement |
| `fast-json-stable-stringify` | 2.1.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/fast-json-stable-stringify/-/fast-json-stable-stringify-2.1.0.tgz) | MIT notice; no reciprocal source requirement |
| `fast-levenshtein` | 2.0.6 | development | `MIT` | [npm tarball](https://registry.npmjs.org/fast-levenshtein/-/fast-levenshtein-2.0.6.tgz) | MIT notice; no reciprocal source requirement |
| `fdir` | 6.5.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/fdir/-/fdir-6.5.0.tgz) | MIT notice; no reciprocal source requirement |
| `file-entry-cache` | 8.0.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/file-entry-cache/-/file-entry-cache-8.0.0.tgz) | MIT notice; no reciprocal source requirement |
| `find-up` | 5.0.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/find-up/-/find-up-5.0.0.tgz) | MIT notice; no reciprocal source requirement |
| `flat-cache` | 4.0.1 | development | `MIT` | [npm tarball](https://registry.npmjs.org/flat-cache/-/flat-cache-4.0.1.tgz) | MIT notice; no reciprocal source requirement |
| `flatted` | 3.4.4 | development | `ISC` | [npm tarball](https://registry.npmjs.org/flatted/-/flatted-3.4.4.tgz) | ISC notice; no reciprocal source requirement |
| `fsevents` | 2.3.2 | development / optional | `MIT` | [npm tarball](https://registry.npmjs.org/fsevents/-/fsevents-2.3.2.tgz) | MIT notice; no reciprocal source requirement |
| `fsevents` | 2.3.3 | development / optional | `MIT` | [npm tarball](https://registry.npmjs.org/fsevents/-/fsevents-2.3.3.tgz) | MIT notice; no reciprocal source requirement |
| `glob-parent` | 6.0.2 | development | `ISC` | [npm tarball](https://registry.npmjs.org/glob-parent/-/glob-parent-6.0.2.tgz) | ISC notice; no reciprocal source requirement |
| `html-entities` | 2.6.0 | runtime | `MIT` | [npm tarball](https://registry.npmjs.org/html-entities/-/html-entities-2.6.0.tgz) | MIT notice; no reciprocal source requirement |
| `ignore` | 5.3.2 | development | `MIT` | [npm tarball](https://registry.npmjs.org/ignore/-/ignore-5.3.2.tgz) | MIT notice; no reciprocal source requirement |
| `ignore` | 7.0.6 | development | `MIT` | [npm tarball](https://registry.npmjs.org/ignore/-/ignore-7.0.6.tgz) | MIT notice; no reciprocal source requirement |
| `imurmurhash` | 0.1.4 | development | `MIT` | [npm tarball](https://registry.npmjs.org/imurmurhash/-/imurmurhash-0.1.4.tgz) | MIT notice; no reciprocal source requirement |
| `is-arrayish` | 0.3.4 | runtime | `MIT` | [npm tarball](https://registry.npmjs.org/is-arrayish/-/is-arrayish-0.3.4.tgz) | MIT notice; no reciprocal source requirement |
| `is-extglob` | 2.1.1 | development | `MIT` | [npm tarball](https://registry.npmjs.org/is-extglob/-/is-extglob-2.1.1.tgz) | MIT notice; no reciprocal source requirement |
| `is-glob` | 4.0.3 | development | `MIT` | [npm tarball](https://registry.npmjs.org/is-glob/-/is-glob-4.0.3.tgz) | MIT notice; no reciprocal source requirement |
| `isexe` | 2.0.0 | development | `ISC` | [npm tarball](https://registry.npmjs.org/isexe/-/isexe-2.0.0.tgz) | ISC notice; no reciprocal source requirement |
| `json-buffer` | 3.0.1 | development | `MIT` | [npm tarball](https://registry.npmjs.org/json-buffer/-/json-buffer-3.0.1.tgz) | MIT notice; no reciprocal source requirement |
| `json-schema-traverse` | 0.4.1 | development | `MIT` | [npm tarball](https://registry.npmjs.org/json-schema-traverse/-/json-schema-traverse-0.4.1.tgz) | MIT notice; no reciprocal source requirement |
| `json-stable-stringify-without-jsonify` | 1.0.1 | development | `MIT` | [npm tarball](https://registry.npmjs.org/json-stable-stringify-without-jsonify/-/json-stable-stringify-without-jsonify-1.0.1.tgz) | MIT notice; no reciprocal source requirement |
| `keyv` | 4.5.4 | development | `MIT` | [npm tarball](https://registry.npmjs.org/keyv/-/keyv-4.5.4.tgz) | MIT notice; no reciprocal source requirement |
| `levn` | 0.4.1 | development | `MIT` | [npm tarball](https://registry.npmjs.org/levn/-/levn-0.4.1.tgz) | MIT notice; no reciprocal source requirement |
| `lightningcss` | 1.33.0 | development | `MPL-2.0` | [npm tarball](https://registry.npmjs.org/lightningcss/-/lightningcss-1.33.0.tgz) | MPL notice; disclose modified MPL-covered files if conveyed |
| `lightningcss-android-arm64` | 1.33.0 | development / optional | `MPL-2.0` | [npm tarball](https://registry.npmjs.org/lightningcss-android-arm64/-/lightningcss-android-arm64-1.33.0.tgz) | MPL notice; disclose modified MPL-covered files if conveyed |
| `lightningcss-darwin-arm64` | 1.33.0 | development / optional | `MPL-2.0` | [npm tarball](https://registry.npmjs.org/lightningcss-darwin-arm64/-/lightningcss-darwin-arm64-1.33.0.tgz) | MPL notice; disclose modified MPL-covered files if conveyed |
| `lightningcss-darwin-x64` | 1.33.0 | development / optional | `MPL-2.0` | [npm tarball](https://registry.npmjs.org/lightningcss-darwin-x64/-/lightningcss-darwin-x64-1.33.0.tgz) | MPL notice; disclose modified MPL-covered files if conveyed |
| `lightningcss-freebsd-x64` | 1.33.0 | development / optional | `MPL-2.0` | [npm tarball](https://registry.npmjs.org/lightningcss-freebsd-x64/-/lightningcss-freebsd-x64-1.33.0.tgz) | MPL notice; disclose modified MPL-covered files if conveyed |
| `lightningcss-linux-arm-gnueabihf` | 1.33.0 | development / optional | `MPL-2.0` | [npm tarball](https://registry.npmjs.org/lightningcss-linux-arm-gnueabihf/-/lightningcss-linux-arm-gnueabihf-1.33.0.tgz) | MPL notice; disclose modified MPL-covered files if conveyed |
| `lightningcss-linux-arm64-gnu` | 1.33.0 | development / optional | `MPL-2.0` | [npm tarball](https://registry.npmjs.org/lightningcss-linux-arm64-gnu/-/lightningcss-linux-arm64-gnu-1.33.0.tgz) | MPL notice; disclose modified MPL-covered files if conveyed |
| `lightningcss-linux-arm64-musl` | 1.33.0 | development / optional | `MPL-2.0` | [npm tarball](https://registry.npmjs.org/lightningcss-linux-arm64-musl/-/lightningcss-linux-arm64-musl-1.33.0.tgz) | MPL notice; disclose modified MPL-covered files if conveyed |
| `lightningcss-linux-x64-gnu` | 1.33.0 | development / optional | `MPL-2.0` | [npm tarball](https://registry.npmjs.org/lightningcss-linux-x64-gnu/-/lightningcss-linux-x64-gnu-1.33.0.tgz) | MPL notice; disclose modified MPL-covered files if conveyed |
| `lightningcss-linux-x64-musl` | 1.33.0 | development / optional | `MPL-2.0` | [npm tarball](https://registry.npmjs.org/lightningcss-linux-x64-musl/-/lightningcss-linux-x64-musl-1.33.0.tgz) | MPL notice; disclose modified MPL-covered files if conveyed |
| `lightningcss-win32-arm64-msvc` | 1.33.0 | development / optional | `MPL-2.0` | [npm tarball](https://registry.npmjs.org/lightningcss-win32-arm64-msvc/-/lightningcss-win32-arm64-msvc-1.33.0.tgz) | MPL notice; disclose modified MPL-covered files if conveyed |
| `lightningcss-win32-x64-msvc` | 1.33.0 | development / optional | `MPL-2.0` | [npm tarball](https://registry.npmjs.org/lightningcss-win32-x64-msvc/-/lightningcss-win32-x64-msvc-1.33.0.tgz) | MPL notice; disclose modified MPL-covered files if conveyed |
| `locate-path` | 6.0.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/locate-path/-/locate-path-6.0.0.tgz) | MIT notice; no reciprocal source requirement |
| `magic-string` | 0.30.21 | development | `MIT` | [npm tarball](https://registry.npmjs.org/magic-string/-/magic-string-0.30.21.tgz) | MIT notice; no reciprocal source requirement |
| `minimatch` | 10.2.6 | development | `BlueOak-1.0.0` | [npm tarball](https://registry.npmjs.org/minimatch/-/minimatch-10.2.6.tgz) | BlueOak license terms; no reciprocal source requirement |
| `ms` | 2.1.3 | development | `MIT` | [npm tarball](https://registry.npmjs.org/ms/-/ms-2.1.3.tgz) | MIT notice; no reciprocal source requirement |
| `nanoid` | 3.3.18 | development | `MIT` | [npm tarball](https://registry.npmjs.org/nanoid/-/nanoid-3.3.18.tgz) | MIT notice; no reciprocal source requirement |
| `natural-compare` | 1.4.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/natural-compare/-/natural-compare-1.4.0.tgz) | MIT notice; no reciprocal source requirement |
| `node-html-better-parser` | 1.5.9 | runtime | `MIT` | [npm tarball](https://registry.npmjs.org/node-html-better-parser/-/node-html-better-parser-1.5.9.tgz) | MIT notice; no reciprocal source requirement |
| `obug` | 2.1.4 | development | `MIT` | [npm tarball](https://registry.npmjs.org/obug/-/obug-2.1.4.tgz) | MIT notice; no reciprocal source requirement |
| `optionator` | 0.9.4 | development | `MIT` | [npm tarball](https://registry.npmjs.org/optionator/-/optionator-0.9.4.tgz) | MIT notice; no reciprocal source requirement |
| `p-limit` | 3.1.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/p-limit/-/p-limit-3.1.0.tgz) | MIT notice; no reciprocal source requirement |
| `p-locate` | 5.0.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/p-locate/-/p-locate-5.0.0.tgz) | MIT notice; no reciprocal source requirement |
| `pako` | 2.2.0 | runtime | `(MIT AND Zlib)` | [npm tarball](https://registry.npmjs.org/pako/-/pako-2.2.0.tgz) | MIT and Zlib notices; identify altered Zlib-derived source |
| `path-exists` | 4.0.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/path-exists/-/path-exists-4.0.0.tgz) | MIT notice; no reciprocal source requirement |
| `path-key` | 3.1.1 | development | `MIT` | [npm tarball](https://registry.npmjs.org/path-key/-/path-key-3.1.1.tgz) | MIT notice; no reciprocal source requirement |
| `pathe` | 2.0.3 | development | `MIT` | [npm tarball](https://registry.npmjs.org/pathe/-/pathe-2.0.3.tgz) | MIT notice; no reciprocal source requirement |
| `picocolors` | 1.1.1 | development | `ISC` | [npm tarball](https://registry.npmjs.org/picocolors/-/picocolors-1.1.1.tgz) | ISC notice; no reciprocal source requirement |
| `picomatch` | 4.0.7 | development | `MIT` | [npm tarball](https://registry.npmjs.org/picomatch/-/picomatch-4.0.7.tgz) | MIT notice; no reciprocal source requirement |
| `playwright` | 1.62.1 | development | `Apache-2.0` | [npm tarball](https://registry.npmjs.org/playwright/-/playwright-1.62.1.tgz) | Apache license/NOTICE and change notices; no reciprocal source requirement |
| `playwright-core` | 1.62.1 | development | `Apache-2.0` | [npm tarball](https://registry.npmjs.org/playwright-core/-/playwright-core-1.62.1.tgz) | Apache license/NOTICE and change notices; no reciprocal source requirement |
| `postcss` | 8.5.26 | development | `MIT` | [npm tarball](https://registry.npmjs.org/postcss/-/postcss-8.5.26.tgz) | MIT notice; no reciprocal source requirement |
| `prelude-ls` | 1.2.1 | development | `MIT` | [npm tarball](https://registry.npmjs.org/prelude-ls/-/prelude-ls-1.2.1.tgz) | MIT notice; no reciprocal source requirement |
| `punycode` | 2.3.1 | development | `MIT` | [npm tarball](https://registry.npmjs.org/punycode/-/punycode-2.3.1.tgz) | MIT notice; no reciprocal source requirement |
| `rolldown` | 1.2.6 | development | `MIT` | [npm tarball](https://registry.npmjs.org/rolldown/-/rolldown-1.2.6.tgz) | MIT notice; no reciprocal source requirement |
| `semver` | 7.8.5 | development | `ISC` | [npm tarball](https://registry.npmjs.org/semver/-/semver-7.8.5.tgz) | ISC notice; no reciprocal source requirement |
| `shebang-command` | 2.0.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/shebang-command/-/shebang-command-2.0.0.tgz) | MIT notice; no reciprocal source requirement |
| `shebang-regex` | 3.0.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/shebang-regex/-/shebang-regex-3.0.0.tgz) | MIT notice; no reciprocal source requirement |
| `siginfo` | 2.0.0 | development | `ISC` | [npm tarball](https://registry.npmjs.org/siginfo/-/siginfo-2.0.0.tgz) | ISC notice; no reciprocal source requirement |
| `simple-swizzle` | 0.2.4 | runtime | `MIT` | [npm tarball](https://registry.npmjs.org/simple-swizzle/-/simple-swizzle-0.2.4.tgz) | MIT notice; no reciprocal source requirement |
| `source-map-js` | 1.2.1 | development | `BSD-3-Clause` | [npm tarball](https://registry.npmjs.org/source-map-js/-/source-map-js-1.2.1.tgz) | BSD notice/disclaimer and no endorsement; no reciprocal source requirement |
| `stackback` | 0.0.2 | development | `MIT` | [npm tarball](https://registry.npmjs.org/stackback/-/stackback-0.0.2.tgz) | MIT notice; no reciprocal source requirement |
| `std-env` | 4.2.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/std-env/-/std-env-4.2.0.tgz) | MIT notice; no reciprocal source requirement |
| `tagged-tag` | 1.0.0 | runtime | `MIT` | [npm tarball](https://registry.npmjs.org/tagged-tag/-/tagged-tag-1.0.0.tgz) | MIT notice; no reciprocal source requirement |
| `tinybench` | 2.9.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/tinybench/-/tinybench-2.9.0.tgz) | MIT notice; no reciprocal source requirement |
| `tinyexec` | 1.3.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/tinyexec/-/tinyexec-1.3.0.tgz) | MIT notice; no reciprocal source requirement |
| `tinyglobby` | 0.2.17 | development | `MIT` | [npm tarball](https://registry.npmjs.org/tinyglobby/-/tinyglobby-0.2.17.tgz) | MIT notice; no reciprocal source requirement |
| `tinyrainbow` | 3.1.1 | development | `MIT` | [npm tarball](https://registry.npmjs.org/tinyrainbow/-/tinyrainbow-3.1.1.tgz) | MIT notice; no reciprocal source requirement |
| `ts-api-utils` | 2.5.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/ts-api-utils/-/ts-api-utils-2.5.0.tgz) | MIT notice; no reciprocal source requirement |
| `tslib` | 2.8.1 | runtime | `0BSD` | [npm tarball](https://registry.npmjs.org/tslib/-/tslib-2.8.1.tgz) | 0BSD notice; no reciprocal source requirement |
| `type-check` | 0.4.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/type-check/-/type-check-0.4.0.tgz) | MIT notice; no reciprocal source requirement |
| `type-fest` | 5.8.0 | runtime | `(MIT OR CC0-1.0)` | [npm tarball](https://registry.npmjs.org/type-fest/-/type-fest-5.8.0.tgz) | MIT option selected; preserve MIT notice |
| `typescript` | 6.0.3 | development | `Apache-2.0` | [npm tarball](https://registry.npmjs.org/typescript/-/typescript-6.0.3.tgz) | Apache license/NOTICE and change notices; no reciprocal source requirement |
| `typescript-eslint` | 8.68.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/typescript-eslint/-/typescript-eslint-8.68.0.tgz) | MIT notice; no reciprocal source requirement |
| `undici-types` | 8.3.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/undici-types/-/undici-types-8.3.0.tgz) | MIT notice; no reciprocal source requirement |
| `uri-js` | 4.4.1 | development | `BSD-2-Clause` | [npm tarball](https://registry.npmjs.org/uri-js/-/uri-js-4.4.1.tgz) | BSD notice/disclaimer; no reciprocal source requirement |
| `vite` | 8.2.2 | development | `MIT` | [npm tarball](https://registry.npmjs.org/vite/-/vite-8.2.2.tgz) | MIT notice; no reciprocal source requirement |
| `vitest` | 4.1.11 | development | `MIT` | [npm tarball](https://registry.npmjs.org/vitest/-/vitest-4.1.11.tgz) | MIT notice; no reciprocal source requirement |
| `which` | 2.0.2 | development | `ISC` | [npm tarball](https://registry.npmjs.org/which/-/which-2.0.2.tgz) | ISC notice; no reciprocal source requirement |
| `why-is-node-running` | 2.3.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/why-is-node-running/-/why-is-node-running-2.3.0.tgz) | MIT notice; no reciprocal source requirement |
| `word-wrap` | 1.2.5 | development | `MIT` | [npm tarball](https://registry.npmjs.org/word-wrap/-/word-wrap-1.2.5.tgz) | MIT notice; no reciprocal source requirement |
| `yocto-queue` | 0.1.0 | development | `MIT` | [npm tarball](https://registry.npmjs.org/yocto-queue/-/yocto-queue-0.1.0.tgz) | MIT notice; no reciprocal source requirement |
| `zxing-wasm` | 3.1.3 | runtime | `MIT` | [npm tarball](https://registry.npmjs.org/zxing-wasm/-/zxing-wasm-3.1.3.tgz) | MIT notice; no reciprocal source requirement |

## Compatibility conclusion

No license incompatibility was identified for the selected portal code:

- MIT, BSD, ISC, 0BSD, Zlib, Apache-2.0, and the selected MIT option for
  dual-licensed packages can be distributed with AGPL-3.0-or-later code when
  their notices and terms are preserved.
- MPL-2.0 and BlueOak-1.0.0 occur only in build/test tooling, not intentionally
  in the browser or production server layers.
- AGPL-3.0-only Cobalt and optional rimgo execute as separate processes and are
  not linked into or relicensed as portal code. The local SearXNG hook executes
  inside an AGPL-3.0-or-later process and uses the same compatible
  AGPL-3.0-or-later license; its exact integration source must remain
  available to network users.
- Cobalt's GPL-covered static FFmpeg is supplied in Cobalt's own upstream
  image. Do not copy that binary into the portal image or republish Cobalt
  without completing a separate binary/source compliance review.

## Modification and source-disclosure procedure

1. Update the source repository first; do not patch a running container by
   hand.
2. Record the upstream tag, full commit, image digest, license, and date.
3. Mark changed upstream files prominently and retain their notices.
4. Publish the complete preferred source, dependency lockfiles, and build and
   installation scripts for the exact deployed revision.
5. Put the modified fork or source-visible integration URL in the structured
   catalog and public Software page before enabling the service.
6. Rebuild `THIRD_PARTY_NOTICES.md` whenever npm or container pins change.
7. Check `portal/package-lock.json` for missing or non-FOSS license fields and
   inspect compiled/native artifacts separately; an npm field alone does not
   describe embedded native code.

## Known license/provenance limitations

- The `zxing-wasm` 3.1.3 tag pins ZXing-C++ and Zint, but its build recipe does
  not pin stb. The exact stb revision in the published WASM therefore cannot be
  derived from that tag alone. The WASM digest and applicable permissive notice
  are recorded so deployed bytes remain identifiable.
- Upstream Cobalt declares `AGPL-3.0`, a deprecated ambiguous SPDX expression.
  This project treats it as **AGPL-3.0-only** rather than assuming a later-
  version grant.
- The Cobalt image's `ffmpeg-static` package identifies FFmpeg 6.1.1, but this
  repository did not independently reconstruct the static binary or audit all
  configure flags/codecs. Pulling the official image is supported; mirroring or
  redistributing it requires that additional review and a valid source offer.
- Container distro/runtime packages are bounded by immutable image digests but
  are not reproduced as a second package-level SBOM in this repository. Keep
  upstream image metadata and scan/export a current SBOM before any image
  redistribution.
