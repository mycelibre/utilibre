# Third-party notices

This file records third-party software used by or referenced from this
repository. The inventory was checked against `portal/package-lock.json`, the
pinned container references in `compose.yaml`, and the upstream sources on
2026-09-03.

The portal and integration code in this repository are licensed under
AGPL-3.0-or-later; see `LICENSE`. The development-assistance disclosure and
project role are recorded in [`TRANSPARENCY.md`](TRANSPARENCY.md). Each
component below remains under its own license. Nothing here grants rights to
an upstream name, logo, or trademark.
The Cobalt web frontend, assets, mascot, and branding are not included.

The separately managed `deployment/utilibre` Compose stack has its own exact
application, image, source-revision, license, and modification inventory in
[`deployment/utilibre/SOURCE_MANIFEST.md`](deployment/utilibre/SOURCE_MANIFEST.md).
That manifest covers ntfy, BentoPDF, VERT, OmniTools, Healthchecks, PairDrop,
FreshRSS, RSSHub, PrivateBin, Wakapi, PostgreSQL, Valkey, and the deferred Crab
Fit review; those applications are not bundled into the portal browser assets.

## Project-supplied identity assets

Copyright © 2026 Mycelibre contributors applies to this repository's original
software and documentation.

The Utilibre logo kit under `portal/public/brand/` was supplied by the user for
this project. The files were copied unchanged from the supplied kit. Its
included README identifies the official coral as `#D85A30`, the neutral dark
as `#2C2C2A`, and says the horizontal wordmark was converted to vector
outlines. These identity assets are explicitly excluded from the
AGPL-3.0-or-later grant covering this repository's original software and
documentation. All rights in the identity assets remain reserved by their
respective owner or owners; their presence here does not grant a trademark
license or rights to use the Utilibre identity outside this project.

## Self-hosted font assets

The following exact npm packages are build-time dependencies. When imported
by the portal stylesheet or entry module, Vite copies their CSS and WOFF2 font
files into the production build so browsers load them from the Utilibre origin;
no runtime font CDN is required.

| Package / font | Version | License | Source |
| --- | --- | --- | --- |
| `@fontsource-variable/newsreader` / Newsreader | 5.3.0 | SIL Open Font License 1.1 | <https://github.com/fontsource/font-files/tree/main/fonts/variable/newsreader>; font project: <https://github.com/productiontype/Newsreader> |
| `@fontsource-variable/atkinson-hyperlegible-next` / Atkinson Hyperlegible Next | 5.3.0 | SIL Open Font License 1.1 | <https://github.com/fontsource/font-files/tree/main/fonts/variable/atkinson-hyperlegible-next>; font project: <https://github.com/googlefonts/atkinson-hyperlegible-next> |

Newsreader carries this notice:

> Copyright 2020 The Newsreader Project Authors
> (<http://github.com/productiontype/Newsreader>).

Atkinson Hyperlegible Next carries this notice:

> Copyright 2020-2024 The Atkinson Hyperlegible Next Project Authors
> (<https://github.com/googlefonts/atkinson-hyperlegible-next>).

Both font packages include the following terms:

### SIL Open Font License 1.1

Version 1.1 - 26 February 2007

#### Preamble

The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership with
others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The fonts,
including any derivative works, can be bundled, embedded, redistributed
and/or sold with any software provided that any reserved names are not used
by derivative works. The fonts and derivatives, however, cannot be released
under any other type of license. The requirement for fonts to remain under
this license does not apply to any document created using the fonts or their
derivatives.

#### Definitions

"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may include
source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting, or
substituting -- in part or in whole -- any of the components of the Original
Version, by changing formats or by porting the Font Software to a new
environment.

"Author" refers to any designer, engineer, programmer, technical writer or
other person who contributed to the Font Software.

#### Permission & Conditions

Permission is hereby granted, free of charge, to any person obtaining a copy
of the Font Software, to use, study, copy, merge, embed, modify, redistribute,
and sell modified and unmodified copies of the Font Software, subject to the
following conditions:

1. Neither the Font Software nor any of its individual components, in
   Original or Modified Versions, may be sold by itself.
2. Original or Modified Versions of the Font Software may be bundled,
   redistributed and/or sold with any software, provided that each copy
   contains the above copyright notice and this license. These can be
   included either as stand-alone text files, human-readable headers or in
   the appropriate machine-readable metadata fields within text or binary
   files as long as those fields can be easily viewed by the user.
3. No Modified Version of the Font Software may use the Reserved Font Name(s)
   unless explicit written permission is granted by the corresponding
   Copyright Holder. This restriction only applies to the primary font name
   as presented to the users.
4. The name(s) of the Copyright Holder(s) or the Author(s) of the Font
   Software shall not be used to promote, endorse or advertise any Modified
   Version, except to acknowledge the contribution(s) of the Copyright
   Holder(s) and the Author(s) or with their explicit written permission.
5. The Font Software, modified or unmodified, in part or in whole, must be
   distributed entirely under this license, and must not be distributed under
   any other license. The requirement for fonts to remain under this license
   does not apply to any document created using the Font Software.

#### Termination

This license becomes null and void if any of the above conditions are not
met.

#### Disclaimer

THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF COPYRIGHT, PATENT,
TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE LIABLE FOR
ANY CLAIM, DAMAGES OR OTHER LIABILITY, INCLUDING ANY GENERAL, SPECIAL,
INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, WHETHER IN AN ACTION OF
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF THE USE OR INABILITY TO USE
THE FONT SOFTWARE OR FROM OTHER DEALINGS IN THE FONT SOFTWARE.

## Browser-delivered runtime software

The production browser bundle includes or may include the following code. The
libraries are not source-patched; Vite performs ordinary bundling and
minification. The `zxing-wasm` binary is copied verbatim from the pinned npm
package and self-hosted.

| Component | Version | License | Source |
| --- | --- | --- | --- |
| @cantoo/pdf-lib | 2.9.1 | MIT | <https://github.com/cantoo-scribe/pdf-lib> |
| @noble/hashes | 2.3.0 | MIT | <https://github.com/paulmillr/noble-hashes> |
| @pdf-lib/standard-fonts | 1.0.0 | MIT | <https://github.com/Hopding/standard-fonts> |
| @pdf-lib/upng | 1.0.1 | MIT | <https://github.com/Hopding/upng> |
| color | 4.2.3 | MIT | <https://github.com/Qix-/color> |
| color-convert | 2.0.1 | MIT | <https://github.com/Qix-/color-convert> |
| color-name | 1.1.4 | MIT | <https://github.com/colorjs/color-name> |
| color-string | 1.9.1 | MIT | <https://github.com/Qix-/color-string> |
| html-entities | 2.6.0 | MIT | <https://github.com/mdevils/html-entities> |
| is-arrayish | 0.3.4 | MIT | <https://github.com/Qix-/node-is-arrayish> |
| node-html-better-parser | 1.5.9 | MIT | <https://github.com/Sharcoux/node-html-parser> |
| pako | 2.2.0 | MIT AND Zlib | <https://github.com/nodeca/pako> |
| simple-swizzle | 0.2.4 | MIT | <https://github.com/Qix-/node-simple-swizzle> |
| tagged-tag | 1.0.0 | MIT | <https://github.com/sindresorhus/tagged-tag> |
| tslib | 2.8.1 | 0BSD | <https://github.com/microsoft/tslib> |
| type-fest | 5.8.0 | MIT OR CC0-1.0; this distribution relies on the MIT option | <https://github.com/sindresorhus/type-fest> |
| yaml | 2.9.0 | ISC | <https://github.com/eemeli/yaml/tree/v2.9.0> |
| @types/emscripten | 1.41.5 | MIT; compile-time declarations only | <https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/emscripten> |
| zxing-wasm | 3.1.3 | MIT | <https://github.com/Sec-ant/zxing-wasm/tree/v3.1.3> |
| ZXing-C++ embedded in zxing-wasm | commit `a17fd9dc65d6aa0dd2f660fdfca7a6a6613d938f` | Apache-2.0 | <https://github.com/zxing-cpp/zxing-cpp/tree/a17fd9dc65d6aa0dd2f660fdfca7a6a6613d938f> |
| Zint/libzueci backend embedded in ZXing-C++ | commit `55541e139e62b9209b71cd9b0ba9010cec28b1d9` | BSD-3-Clause | <https://github.com/zint/zint/tree/55541e139e62b9209b71cd9b0ba9010cec28b1d9> |
| stb_image and stb_image_write embedded in zxing-wasm | exact upstream revision not recorded by the zxing-wasm 3.1.3 build recipe | Public domain or MIT; this distribution relies on the MIT option | <https://github.com/nothings/stb> |

The checked `zxing_full.wasm` has SHA-256
`23f1b4a6b683742623b1e945993fdf8b49a1a3b5ae2719cc70389164d50f70d7`.
`zxing-wasm` exports the same digest and the ZXing-C++ commit shown above. Its
tagged CMake recipe fetches `stb` without a commit, so the exact stb revision in
the published binary is an upstream provenance limitation. stb's applicable
MIT terms are reproduced below.

### yaml 2.9.0 ISC notice

The following text is reproduced exactly from `yaml@2.9.0`'s installed
`LICENSE` file:

> Copyright Eemeli Aro <eemeli@gmail.com>
>
> Permission to use, copy, modify, and/or distribute this software for any purpose
> with or without fee is hereby granted, provided that the above copyright notice
> and this permission notice appear in all copies.
>
> THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
> REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
> FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
> INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
> OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
> TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
> THIS SOFTWARE.

### MIT notices

The MIT terms below apply to the MIT components above and to the Anubis
container/challenge entry in the service inventory below. Copyright notices
preserved from their packages or source trees include:

- Copyright (c) 2019 Andrew Dillon (`@cantoo/pdf-lib`)
- Copyright (c) 2022 Paul Miller (`@noble/hashes`)
- Copyright (c) 2018 Andrew Dillon (`@pdf-lib/standard-fonts`)
- Copyright (c) 2017 Photopea (`@pdf-lib/upng`)
- Copyright (c) Microsoft Corporation (`@types/emscripten`)
- Copyright (c) 2012 Heather Arthur (`color`)
- Copyright (c) 2011-2016 Heather Arthur (`color-convert`)
- Copyright (c) 2015 Dmitry Ivanov (`color-name`)
- Copyright (c) 2011 Heather Arthur (`color-string`)
- Copyright (c) 2021 Dulin Marat (`html-entities`)
- Copyright (c) 2015 JD Ballard (`is-arrayish`)
- Copyright 2019 Tao Qiufeng (`node-html-better-parser`)
- Copyright (c) 2014-2017 Vitaly Puzrin and Andrei Tuputcyn (`pako`,
  excluding its Zlib-licensed ported code)
- Copyright (c) 2015 Josh Junon (`simple-swizzle`)
- Copyright (c) Sindre Sorhus (`tagged-tag` and `type-fest`)
- Copyright (c) 2023 Ze-Zheng Wu (`zxing-wasm`)
- Copyright (c) 2017 Sean Barrett (`stb_image` and `stb_image_write`)
- Copyright (c) 2025 Xe Iaso <me@xeiaso.net> (Anubis challenge/gate software)

> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in
> all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.

### pako ported Zlib code

The `pako` `lib/zlib` port is based on Zlib 1.3.2. Copyright (C) 1995-2013
Jean-loup Gailly and Mark Adler; JavaScript port contributions copyright (C)
2014-2017 Vitaly Puzrin and Andrey Tupitsin.

> This software is provided 'as-is', without any express or implied warranty.
> In no event will the authors be held liable for any damages arising from the
> use of this software.
>
> Permission is granted to anyone to use this software for any purpose,
> including commercial applications, and to alter it and redistribute it
> freely, subject to the following restrictions:
>
> 1. The origin of this software must not be misrepresented; you must not claim
>    that you wrote the original software. If you use this software in a
>    product, an acknowledgment in the product documentation would be
>    appreciated but is not required.
> 2. Altered source versions must be plainly marked as such, and must not be
>    misrepresented as being the original software.
> 3. This notice may not be removed or altered from any source distribution.

### tslib 0BSD notice

Copyright (c) Microsoft Corporation.

> Permission to use, copy, modify, and/or distribute this software for any
> purpose with or without fee is hereby granted.
>
> THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
> REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
> AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
> INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
> LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
> OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
> PERFORMANCE OF THIS SOFTWARE.

### ZXing-C++ Apache-2.0 notice

ZXing-C++ is copyright its contributors, including Nu-book Inc., the ZXing
authors, Axel Waggershauser, and other contributors identified in the source.
The wrapper file used to construct the WebAssembly binary carries copyrights
for Nu-book Inc., Axel Waggershauser, and Ze-Zheng Wu. It is licensed under
Apache License 2.0. The complete license text follows later in this file.

### Zint/libzueci BSD-3-Clause notice

The embedded Zint backend is copyright (C) 2008-2025 Robin Stuart and its
contributors. Embedded libzueci code is copyright (C) 2022 gitlost and other
copyright holders identified in the source.

> Redistribution and use in source and binary forms, with or without
> modification, are permitted provided that the following conditions are met:
>
> 1. Redistributions of source code must retain the above copyright notice,
>    this list of conditions and the following disclaimer.
> 2. Redistributions in binary form must reproduce the above copyright
>    notice, this list of conditions and the following disclaimer in the
>    documentation and/or other materials provided with the distribution.
> 3. Neither the name of the project nor the names of its contributors may be
>    used to endorse or promote products derived from this software without
>    specific prior written permission.
>
> THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
> AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
> IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
> ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
> LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
> CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
> SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
> INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
> CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
> ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
> POSSIBILITY OF SUCH DAMAGE.

## Build and test tools

These packages are development dependencies and are not intentionally shipped
in the production portal image. Their exact transitive versions and registry
artifacts are recorded in `portal/package-lock.json`.

| Component | Version | License | Source |
| --- | --- | --- | --- |
| Vite | 8.2.2 | MIT | <https://github.com/vitejs/vite> |
| TypeScript | 6.0.3 | Apache-2.0 | <https://github.com/microsoft/TypeScript> |
| ESLint / @eslint/js | 10.9.1 / 10.0.1 | MIT | <https://github.com/eslint/eslint> |
| typescript-eslint | 8.68.0 | MIT | <https://github.com/typescript-eslint/typescript-eslint> |
| Vitest | 4.1.11 | MIT | <https://github.com/vitest-dev/vitest> |
| Playwright | 1.62.1 | Apache-2.0 | <https://github.com/microsoft/playwright> |
| @types/node | 26.4.0 | MIT | <https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node> |

Development-only transitive packages additionally use MIT, Apache-2.0,
BSD-2-Clause, BSD-3-Clause, ISC, MPL-2.0, BlueOak-1.0.0, and 0BSD-compatible
licenses. A complete name/version/license grouping is in `docs/licenses.md`;
the lockfile remains the authoritative resolution record.

## Containerized and reviewed services

Compose references pulled images by version and digest. Redlib is instead
built from an exact official source commit/checksum and digest-pinned builder
and runtime bases, then receives the tracked local redirect hardening patch.
Every application retains its own license. The deployed SearXNG runtime also
loads this repository's source-visible logging hook. Both modified network
services are disclosed below.

| Component | Pinned/reviewed version | License | Source | Modification status |
| --- | --- | --- | --- | --- |
| Cobalt API | 11.7.1, source commit `a636575b09de1fc55d9b8cd98cac88f5f2f16b42` | AGPL-3.0-only (upstream uses the deprecated `AGPL-3.0` identifier without an “or later” grant) | <https://github.com/imputnet/cobalt/tree/a636575b09de1fc55d9b8cd98cac88f5f2f16b42> | Unmodified image; local configuration only |
| ffmpeg-static used by Cobalt | 5.3.0, carrying FFmpeg 6.1.1 static binaries | GPL-3.0-or-later package; the binary's own build license/source must also be preserved | <https://github.com/eugeneware/ffmpeg-static/tree/5.3.0> and <https://ffmpeg.org/> | Supplied inside upstream Cobalt image, not modified here |
| SearXNG | 2026.8.22-9fea41204, source commit `9fea41204fdfa7a5cfa15b0ebd12904c520478ce`, + local log-redaction hook | AGPL-3.0-or-later | <https://github.com/searxng/searxng/tree/9fea41204fdfa7a5cfa15b0ebd12904c520478ce>; local hook: `config/searxng/sitecustomize.py` | Official image unchanged; after recognizing a query marker, the locally authored hook discards the untrusted remainder of the rendered log record |
| Valkey | 9.1.1 | BSD-3-Clause; individual files can carry other compatible notices identified by SPDX metadata | <https://github.com/valkey-io/valkey/tree/9.1.1> | Unmodified image; persistence disabled and `/data` supplied as tmpfs by local runtime configuration |
| Anubis | 1.27.0, commit `d39e26cedcc96bea5e4915297c756e7eec74aaf7`, image `ghcr.io/techarohq/anubis:v1.27.0@sha256:8828275668b7bc675679f100970f9714f731388fbbf66ae94de8aca952e3fc4a` | MIT | <https://github.com/TecharoHQ/anubis/tree/d39e26cedcc96bea5e4915297c756e7eec74aaf7> | Unmodified official image; local policy/environment configuration only. Its first-party challenge UI is delivered on the Redlib origin |
| Redlib | official commit `a4d36e954cf1bd64f209cd8868c5a29edc81b374` (2026-04-24), local image `public-utility-redlib:0.36.0-a4d36e9-p1` + redirect hardening | AGPL-3.0-only | <https://github.com/redlib-org/redlib/tree/a4d36e954cf1bd64f209cd8868c5a29edc81b374>; local patch/build context: `config/redlib/` | Built from source and modified locally to reject scheme-relative/backslash settings redirects; runtime configuration also disables application HSTS expiry, indexing, RSS, HLS, and autoplay |
| rimgo (optional profile) | 1.4.2, commit `d2be8e221522dfe7a06452e2002dcf6dad569d1a` | AGPL-3.0-only | <https://codeberg.org/rimgo/rimgo/src/tag/v1.4.2> | Unmodified image; not enabled by default |
| Node.js portal runtime | 24.14.0 on Alpine 3.23 | Node.js MIT; Alpine packages retain their own licenses | <https://github.com/nodejs/node/tree/v24.14.0> and <https://github.com/nodejs/docker-node> | Official base image; application added in a new image layer |

Cobalt's exact upstream lockfile contains its full JavaScript dependency
closure. Its README specifically acknowledges FFmpeg, youtube.js, Express, and
the other direct API dependencies. Any operator who redistributes the Cobalt
image rather than merely pulling it from upstream must also satisfy every
license and source-offer obligation in that image, particularly the GPL terms
for the static FFmpeg build.

`config/searxng/sitecustomize.py` is original integration code licensed
AGPL-3.0-or-later with the rest of this repository. Compose mounts it read-only
and places its directory on `PYTHONPATH`; Python loads it at interpreter
startup. It replaces the log-record factory so, after recognizing a rendered
`q`/`query` marker or URL query, the untrusted remainder of that record is
discarded before Docker receives operational logs.
The hook does not modify the pinned image on disk, but it changes the SearXNG
service's runtime behavior. Network users must be able to obtain the exact
project revision containing the hook and Compose wiring through
`SOURCE_CODE_URL`, as well as the pinned upstream SearXNG source.

Redlib's complete corresponding source is the pinned upstream tree plus the
tracked patch and Docker build/deployment material under `config/redlib/` and
`compose.yaml`. The locally built image is a modified AGPL-3.0-only work
offered over a network. `SOURCE_CODE_URL` must therefore expose all of that
material, including the exact Cargo lockfile and build instructions, at no
charge to network users. Preserve upstream copyright/license notices and mark
the redirect change as local; do not describe this image as an unmodified
official Redlib release.

Reviewed but not installed:

| Component | Reviewed version | License | Source |
| --- | --- | --- | --- |
| Invidious | 2.20260804.1, commit `48c6110a83fc788b4199daf737279b71950cc0db` | AGPL-3.0-only | <https://github.com/iv-org/invidious/tree/v2.20260804.1> |
| Invidious Companion | reviewed official 2026-08 build | AGPL-3.0-only | <https://github.com/iv-org/invidious-companion> |

No code or assets from these deferred projects are distributed by the portal.

## Source-offer and attribution practice

- Before public launch, configure `SOURCE_CODE_URL` to the exact public source
  corresponding to the deployed portal revision. This supports the portal's
  AGPL section 13 offer to remote users.
- Keep this file with source and binary distributions. Preserve upstream
  copyright, license, and NOTICE files when redistributing third-party
  packages or container images.
- If an AGPL service is patched or its runtime is altered by locally loaded
  code, publish the complete corresponding integration/modified source and
  build/install scripts at no charge to network users, identify the change and
  date, and link that source from the public Software page.
- Cobalt, Valkey, Anubis, and rimgo use configuration-only integration. SearXNG's
  local `sitecustomize.py` hook changes runtime logging behavior even though
  the official container image bytes remain unchanged. Redlib is the other
  explicit exception: it is source-built with a local security patch and is a
  modified binary distribution/network service.
- Factual project names identify dependencies only. Do not copy upstream
  branding or imply affiliation.

## Apache License 2.0

```text

                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   APPENDIX: How to apply the Apache License to your work.

      To apply the Apache License to your work, attach the following
      boilerplate notice, with the fields enclosed by brackets "[]"
      replaced with your own identifying information. (Don't include
      the brackets!)  The text should be enclosed in the appropriate
      comment syntax for the file format. We also recommend that a
      file or class name and description of purpose be included on the
      same "printed page" as the copyright notice for easier
      identification within third-party archives.

   Copyright [yyyy] [name of copyright owner]

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
```
