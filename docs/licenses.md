# Licensing and source inventory

Review date: 2026-09-03

This is the operational license inventory for Utilibre. It is based on the
current npm lockfile, immutable Compose image/build references, package license
files, and official upstream repositories. It is not legal advice.

## Upstream-FOSS-only policy

Every cataloged end-user tool must be an independently maintained,
self-hostable Free and Open Source Software application with a verified source
repository and license. Utilibre does not create substitute tools. Original
Utilibre code is limited to cataloging, localization, routing, configuration,
privacy and availability disclosure, narrowly scoped gateways, tests, and
security or deployment glue around upstream applications.

A permissively licensed programming library or a browser/Node platform API is
not, by itself, enough to qualify a Utilibre tool. If no suitable upstream FOSS
application exists, the capability is not published. The automated policy gate
in the portal test suite checks the catalog's structured upstream fields, but
source and license review remains a human release requirement.

## Utilibre integration code

Copyright © 2026 Mycelibre contributors.

Original portal, server, integration, configuration, scripts, tests, and
documentation in this repository are licensed under **AGPL-3.0-or-later**. The
complete license text is in `LICENSE`. This grant does not relicense separate
upstream applications or their dependency closures.

The Utilibre identity assets under `portal/public/brand/` are excluded from
that software and documentation grant. Their inclusion does not grant a right
to use the Utilibre name, logos, or marks outside this project. See
`THIRD_PARTY_NOTICES.md` for the exact boundary.

The following local changes remain integration or hardening work rather than
independent end-user tools:

- `config/searxng/sitecustomize.py` is a source-visible runtime logging hook
  that discards an untrusted rendered-record tail after a recognized query
  marker.
- `config/redlib/` contains the tracked patch that rejects scheme-relative and
  backslash settings redirects, plus the reproducible build context.
- `deployment/utilibre/config/rsshub/` contains the source-equivalent patch
  that makes generated feed links use the configured public origin.
- The Cobalt portal surface is a bilingual, bounded gateway to the independently
  maintained Cobalt API; extraction and media processing remain Cobalt's work.

Because modified SearXNG, Redlib, and RSSHub behavior is offered over a
network, the public source offer must include the exact upstream revision,
local changes, and build/deployment material.

## Root Compose application inventory

| Application | Reviewed version | License | Official source | Local status |
| --- | --- | --- | --- | --- |
| Cobalt | `11.7.1-a636575` | AGPL-3.0-only, interpreted conservatively from upstream's deprecated `AGPL-3.0` expression | <https://github.com/imputnet/cobalt/tree/a636575b09de1fc55d9b8cd98cac88f5f2f16b42> | Official image; configuration and bounded portal gateway only |
| SearXNG | `2026.8.22-9fea41204` | AGPL-3.0-or-later | <https://github.com/searxng/searxng/tree/9fea41204fdfa7a5cfa15b0ebd12904c520478ce> | Official image with the disclosed local logging hook |
| Valkey | `9.1.1` | BSD-3-Clause | <https://github.com/valkey-io/valkey/tree/9.1.1> | Internal, unmodified, persistence disabled |
| Anubis | `1.27.0` | MIT | <https://github.com/TecharoHQ/anubis/tree/d39e26cedcc96bea5e4915297c756e7eec74aaf7> | Unmodified challenge/gate in front of Redlib |
| Redlib | commit `a4d36e954cf1bd64f209cd8868c5a29edc81b374` | AGPL-3.0-only | <https://github.com/redlib-org/redlib/tree/a4d36e954cf1bd64f209cd8868c5a29edc81b374> | Source-built with the disclosed redirect-hardening patch |
| rimgo | `1.4.2` | AGPL-3.0-only | <https://codeberg.org/rimgo/rimgo/src/tag/v1.4.2> | Optional profile; not publicly enabled |

The Cobalt image contains `ffmpeg-static` 5.3.0, which identifies FFmpeg 6.1.1
static binaries. Its package is GPL-3.0-or-later; the binary's precise license
also depends on its build flags and codecs. Pulling the official Cobalt image
is distinct from mirroring or redistributing it. Complete a separate
binary/source compliance review before redistribution.

## Separately managed hosted applications

The authoritative versions, immutable image digests, source commits,
configuration status, and corresponding-source notes are in
[`deployment/utilibre/SOURCE_MANIFEST.md`](../deployment/utilibre/SOURCE_MANIFEST.md).

| Application | Reviewed version | License | Official source |
| --- | --- | --- | --- |
| ntfy | `2.28.0` | Apache-2.0 or GPL-2.0 | <https://github.com/binwiederhier/ntfy/tree/v2.28.0> |
| BentoPDF | `2.8.8` | AGPL-3.0-only path used by Utilibre | <https://github.com/alam00000/bentopdf/tree/f96cd4e5166f3d51393dfe9f3c440b5bb77802f1> |
| VERT | commit `e0ffd34310f9c988b16e22334b13e18de030b0ae` | AGPL-3.0-only | <https://github.com/VERT-sh/VERT/tree/e0ffd34310f9c988b16e22334b13e18de030b0ae> |
| OmniTools | `0.6.0` | MIT | <https://github.com/iib0011/omni-tools/tree/v0.6.0> |
| Healthchecks | `4.3` | BSD-3-Clause | <https://github.com/healthchecks/healthchecks/tree/v4.3> |
| PairDrop | `1.11.2` | GPL-3.0-only, used conservatively pending resolution of conflicting ISC package metadata | <https://github.com/schlagmichdoch/PairDrop/tree/v1.11.2> |
| FreshRSS | `1.29.1` | upstream declares deprecated `AGPL-3.0` | <https://github.com/FreshRSS/FreshRSS/tree/1.29.1> |
| RSSHub | commit `40aca9548e99eefd519ff7abbb937560fc037c95` | upstream declares deprecated `AGPL-3.0` | <https://github.com/DIYgod/RSSHub/tree/40aca9548e99eefd519ff7abbb937560fc037c95> |
| PrivateBin | `2.0.6` | Zlib | <https://github.com/PrivateBin/PrivateBin/tree/2.0.6> |
| Wakapi | `2.17.6` | MIT | <https://github.com/muety/wakapi/tree/2.17.6> |
| PostgreSQL | `17.11` | PostgreSQL License | <https://github.com/postgres/postgres/tree/REL_17_11> |
| Valkey | `9.1.1` | BSD-3-Clause | <https://github.com/valkey-io/valkey/tree/9.1.1> |

BentoPDF and VERT currently fetch some executable FOSS runtime assets from
jsDelivr for particular operations. That external delivery is disclosed in
the catalog and deployment manifest. Mirroring those pinned assets remains the
required follow-up if “self-hosted” is applied to every runtime byte rather
than to the application itself.

## Portal browser and npm dependencies

The current portal has **no npm runtime dependencies** and bundles no
third-party end-user tool library. `portal/package-lock.json` contains only
development or optional packages. Two development dependencies intentionally
contribute static assets to the production build:

| Package / font | Version | License | Source |
| --- | --- | --- | --- |
| `@fontsource-variable/newsreader` | `5.3.0` | OFL-1.1 | <https://github.com/fontsource/font-files/tree/main/fonts/variable/newsreader> |
| `@fontsource-variable/atkinson-hyperlegible-next` | `5.3.0` | OFL-1.1 | <https://github.com/fontsource/font-files/tree/main/fonts/variable/atkinson-hyperlegible-next> |

The direct build and test dependencies are:

| Package | Version | License |
| --- | --- | --- |
| `vite` | `8.2.2` | MIT |
| `typescript` | `6.0.3` | Apache-2.0 |
| `eslint` / `@eslint/js` | `10.9.1` / `10.0.1` | MIT |
| `typescript-eslint` | `8.68.0` | MIT |
| `vitest` | `4.1.11` | MIT |
| `@playwright/test` | `1.62.1` | Apache-2.0 |
| `@types/node` | `26.4.0` | MIT |

The exact development closure and registry artifacts remain authoritative in
`portal/package-lock.json`. At this review it contains 161 resolved dependency
entries: 113 MIT, 18 Apache-2.0, 12 MPL-2.0, 7 ISC, 6 BSD-2-Clause, 2
BSD-3-Clause, 2 OFL-1.1, and 1 BlueOak-1.0.0. Optional platform packages are
included in those totals; none is an active portal tool dependency.

## Reviewed but not installed

| Application | Reviewed version | License | Source |
| --- | --- | --- | --- |
| Invidious | `2.20260804.1` | AGPL-3.0-only | <https://github.com/iv-org/invidious/tree/v2.20260804.1> |
| Invidious Companion | reviewed official 2026-08 build | AGPL-3.0-only | <https://github.com/iv-org/invidious-companion> |
| Crab Fit | commit `628f9eefc300bf1ed3d6cc3323332c2ed9b8a350` | GPL-3.0-only | <https://github.com/GRA0007/crab.fit/tree/628f9eefc300bf1ed3d6cc3323332c2ed9b8a350> |

No code or assets from these deferred applications are delivered by the
portal. A FOSS license alone does not authorize deployment: maintenance,
security, privacy, resource, and public-abuse review must also pass.

## Source-offer and attribution practice

1. `SOURCE_CODE_URL` must identify the exact public source corresponding to the
   deployed portal and integration revision.
2. Preserve upstream copyright, license, and NOTICE files when redistributing
   third-party packages or images.
3. For a modified AGPL service, publish the exact upstream source, local
   changes, lockfiles, and build/install scripts at no charge to network users.
4. Record every selected tag or commit, immutable image digest, license,
   purpose, data flow, and modification state before public activation.
5. Keep project names factual and credit upstream work without implying
   affiliation or authorship.
6. Re-run the catalog FOSS-policy gate and update this inventory whenever a
   service or dependency changes.

## Known license and provenance limitations

- PairDrop's top-level license and package metadata disagree; Utilibre applies
  GPL-3.0-only conservatively until upstream clarifies the conflict.
- Cobalt and several other projects use deprecated ambiguous SPDX expressions;
  this inventory does not silently infer an “or later” grant.
- The Cobalt FFmpeg binary and container OS/runtime packages are identified by
  immutable artifact digests but are not reproduced as a second package-level
  SBOM here. Export and archive a current SBOM before mirroring an image.
- An npm license field or a public repository is not sufficient evidence by
  itself. Review the actual license text, source revision, compiled artifacts,
  maintenance state, and self-hosting path before adding a service.
