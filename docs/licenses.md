# Licensing and source inventory

Review date: 2026-09-03

This is the operational license inventory for Utilibre after the access-gap
strategic reset. It is based on the npm lockfile, immutable Compose image/build
references, package license files, and official upstream repositories. It is
not legal advice.

## Utilibre integration code

Copyright © 2026 Mycelibre contributors.

Original portal, server, integration, configuration, scripts, tests, and
documentation in this repository are licensed under **AGPL-3.0-or-later**.
The complete text is in [`LICENSE`](../LICENSE). This grant does not relicense
separate upstream applications or their dependency closures.

The Utilibre identity assets under `portal/public/brand/` are excluded from
that grant. Their inclusion does not grant rights to use the Utilibre name,
logos, or marks outside this project. See
[`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).

The current local application changes are integration or hardening work:

- `config/searxng/sitecustomize.py` is a source-visible runtime logging hook
  that reduces accidental query disclosure; and
- `config/redlib/` contains a tracked redirect-hardening patch and reproducible
  build context.

Because modified SearXNG and Redlib behavior is offered over a network, the
public source offer must include the exact upstream revisions, local changes,
and build/deployment material.

The additional Compose project now uses unmodified upstream images. RSSHub is
internal FreshRSS support and no longer includes the former public-origin
patch.

## Root Compose inventory

| Component | Reviewed version | License | Official source | Local status |
| --- | --- | --- | --- | --- |
| SearXNG | `2026.8.22-9fea41204` | AGPL-3.0-or-later | <https://github.com/searxng/searxng/tree/9fea41204fdfa7a5cfa15b0ebd12904c520478ce> | Official image with disclosed local logging hook |
| Valkey | `9.1.1` | BSD-3-Clause | <https://github.com/valkey-io/valkey/tree/9.1.1> | Internal, unmodified, persistence disabled |
| Anubis | `1.27.0` | MIT | <https://github.com/TecharoHQ/anubis/tree/d39e26cedcc96bea5e4915297c756e7eec74aaf7> | Unmodified gate in front of Redlib |
| Redlib | commit `a4d36e954cf1bd64f209cd8868c5a29edc81b374` | AGPL-3.0-only | <https://github.com/redlib-org/redlib/tree/a4d36e954cf1bd64f209cd8868c5a29edc81b374> | Source-built with disclosed redirect hardening |
| Node.js portal runtime | `24.14.0` on Alpine 3.23 | Node.js MIT; Alpine packages retain their licenses | <https://github.com/nodejs/node/tree/v24.14.0> | Official base with Utilibre application layer |

## Additional application inventory

The authoritative digest and source list is
[`deployment/utilibre/SOURCE_MANIFEST.md`](../deployment/utilibre/SOURCE_MANIFEST.md).

| Component | Reviewed version | License | Official source | Role |
| --- | --- | --- | --- | --- |
| FreshRSS | `1.29.1` | upstream declares `AGPL-3.0` | <https://github.com/FreshRSS/FreshRSS/tree/1.29.1> | Operated persistent feed reader |
| RSSHub | commit `40aca9548e99eefd519ff7abbb937560fc037c95` | upstream declares `AGPL-3.0` | <https://github.com/DIYgod/RSSHub/tree/40aca9548e99eefd519ff7abbb937560fc037c95> | Internal FreshRSS support; no public route |
| PrivateBin | `2.0.6` | Zlib | <https://github.com/PrivateBin/PrivateBin/tree/2.0.6> | Operated encrypted-paste service |
| PostgreSQL | `17.11` | PostgreSQL License | <https://github.com/postgres/postgres/tree/REL_17_11> | Internal FreshRSS database |
| Valkey | `9.1.1` | BSD-3-Clause | <https://github.com/valkey-io/valkey/tree/9.1.1> | Internal ephemeral RSSHub cache |

## Portal browser and npm dependencies

The portal bundles no third-party end-user tool library. Two npm packages
contribute self-hosted font assets to the production build:

| Package / font | Version | License | Source |
| --- | --- | --- | --- |
| `@fontsource-variable/newsreader` | `5.3.0` | OFL-1.1 | <https://github.com/fontsource/font-files/tree/main/fonts/variable/newsreader> |
| `@fontsource-variable/atkinson-hyperlegible-next` | `5.3.0` | OFL-1.1 | <https://github.com/fontsource/font-files/tree/main/fonts/variable/atkinson-hyperlegible-next> |

Direct build/test dependencies include Vite (MIT), TypeScript (Apache-2.0),
ESLint (MIT), typescript-eslint (MIT), Vitest (MIT), Playwright (Apache-2.0),
and `@types/node` (MIT). Exact versions, transitive packages, integrity hashes,
and optional platform packages are authoritative in
`portal/package-lock.json`.

## Source-offer and attribution practice

1. `SOURCE_CODE_URL` identifies the exact public source corresponding to the
   deployed portal and integration revision.
2. Preserve upstream copyright, license, and NOTICE files when redistributing
   packages or images.
3. For a modified AGPL service, publish exact upstream source, local changes,
   lockfiles, and build/install scripts at no charge to network users.
4. Record every deployed tag/commit, image digest, license, purpose, data flow,
   and modification state before public activation.
5. Keep project names factual and never imply affiliation or authorship.
6. Move a removed component out of the active inventory without erasing the
   notices needed for any archived copy still distributed.
7. Re-run the catalog policy gate and update this inventory whenever a service
   or dependency changes.

An npm license field, repository URL, or FOSS license alone is not sufficient
admission evidence. Review the actual license text, source revision, compiled
artifact, access gap, maintenance, security, privacy, resource use, and
self-hosting path.
