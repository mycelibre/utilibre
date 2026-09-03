# Utilibre source and license manifest

Deployment inventory initially verified on 2026-08-30 and reconciled with the
running containers on 2026-09-03. The `@sha256` values below are
the immutable references used by `compose.yaml`, not convenience tags. Unless
explicitly noted, Utilibre changes only deployment configuration and does not
modify upstream application code or branding.

This is a top-level application/artifact inventory, not a generated SBOM of
every OS package and transitive dependency inside third-party images. Immutable
digests identify the reviewed artifacts; upstream lockfiles, license files, and
image metadata remain necessary for dependency-level review, especially before
mirroring or redistributing an image.

## Deployed public applications

### ntfy

- Public URL: `https://notify.utilibre.org`
- Purpose: programmable push notifications
- Upstream/source: <https://github.com/binwiederhier/ntfy>
- License: dual licensed `Apache-2.0` / `GPL-2.0` (as declared by the image)
- Selected version/source tag: `v2.28.0`
- Image: `docker.io/binwiederhier/ntfy:v2.28.0`
- Digest: `sha256:6ef4b819f722fccdc036af611c4774cfdc2de821ab74fdd48bbf4c9d6f8973da`
- Source commit: `10cb6506f836dbb00bb77e3b52669f6ace37f555` (official
  `v2.28.0` tag); the image does not declare a revision label
- Modification: no source changes; local `server.yml` supplies public URL,
  persistence, anonymous posture, proxy mode, and resource limits
- Corresponding source: upstream release tag; no local fork

### BentoPDF

- Public URL: `https://pdf.utilibre.org`
- Purpose: browser-side PDF tools
- Upstream/source: <https://github.com/alam00000/bentopdf>
- License path used: `AGPL-3.0-only`, as declared by the pinned package; no
  commercial license was assumed
- Selected version: `v2.8.8`
- Image: `ghcr.io/alam00000/bentopdf:2.8.8`
- Digest: `sha256:6ef493c8e3bdbaa26c9bfcec330377ae95116fa00660ca0342769063197b1952`
- Corresponding source commit: `f96cd4e5166f3d51393dfe9f3c440b5bb77802f1`
- Modification: the application files and image remain intact. Utilibre mounts
  copies of the pinned image's two Nginx security-header includes with only
  COOP/COEP omitted, so the public Caddy edge emits exactly one coherent pair
  instead of combining the upstream `credentialless` policy with the edge's
  `require-corp` policy. The local includes live under `config/bentopdf/`.
- Public source/build material: the exact
  [upstream source commit](https://github.com/alam00000/bentopdf/tree/f96cd4e5166f3d51393dfe9f3c440b5bb77802f1)
  plus the local Nginx include copies under `config/bentopdf/`
- Runtime privacy note: the tested text-to-PDF operation kept document content
  local but fetched pinned PyMuPDF/Pyodide runtime assets from jsDelivr.
- Configured browser runtime packages: `@bentopdf/pymupdf-wasm@0.11.16`,
  `@bentopdf/gs-wasm@0.1.1`, and `coherentpdf@2.5.5`. BentoPDF's pinned source
  describes the underlying PyMuPDF, Ghostscript, and CoherentPDF components as
  AGPL-3.0; this repository does not mirror those CDN packages or claim an
  independent dependency-level SBOM for them.
- Licensing note: upstream documents both AGPL and commercial paths for this
  public build. Utilibre uses the documented `AGPL-3.0-only` licensing path,
  preserves attribution, and
  must make the complete corresponding source available to network users. The
  inherited image labels report an nginx-base revision rather than the BentoPDF
  release revision; the retained signed/tagged source checkout above is the
  authoritative source mapping.

### VERT

- Public URL: `https://convert.utilibre.org`
- Purpose: browser-side file conversion
- Upstream/source: <https://github.com/VERT-sh/VERT>
- License: `AGPL-3.0-only`
- Selected version: no stable tag was available; exact reviewed revision
  `e0ffd34310f9c988b16e22334b13e18de030b0ae`
- Local image: `utilibre-vert:e0ffd343`
- Local image digest/ID: `sha256:49f563b350839e8128ba470020045849c59ee2f3305820140be406c3133d1437`
- Modification: application source unchanged. Utilibre adds
  `Dockerfile.utilibre` and production build arguments that leave Plausible,
  Stripe, donation, and server-conversion endpoints empty and disable supported
  external integration settings. The pinned Bun 1.3.14 builder is used, and
  lifecycle scripts are skipped during dependency installation because Bun's
  Node-compatibility runner hit `SIGILL` in optional native postinstall probes
  on the VM's non-AVX virtual CPU. The lockfile already selects the required
  Linux binaries, and the production build and local conversions passed.
- Corresponding source/build context: the public Git submodule at
  `deployment/utilibre/src/vert`, pinned to the exact revision above, plus
  `config/vert/Dockerfile.utilibre`. GitHub-generated archives omit submodule
  contents; use `git clone --recurse-submodules` or the exact upstream commit
  link rather than treating a parent-repository ZIP as complete source.
- Build command: `docker compose build --no-cache vert`
- Builder: `docker.io/oven/bun:1.3.14@sha256:e10577f0db68676a7024391c6e5cb4b879ebd17188ab750cf10024a6d700e5c4`
- Runtime: `docker.io/library/nginx:stable-alpine@sha256:97d490c12ba55b4946b01546d1c3ed324e8d41ab1c9fcb2a616aa470620e5b46`
- Publication obligation: publish the exact source tree and deployment
  Dockerfile under AGPL before enabling public network use.
- Runtime privacy note: tested image and Markdown conversions did not upload
  files or contact `vertd`, but the bundle fetched FFmpeg JavaScript/WASM from
  jsDelivr. The build flag does not suppress that upstream CDN loader.
- Configured browser runtime package: `@ffmpeg/core@0.12.10`. Its JavaScript and
  WebAssembly are fetched from jsDelivr rather than mirrored here; this
  repository does not independently record the embedded FFmpeg build flags or
  a dependency-level SBOM for that CDN artifact.

### OmniTools

- Public URL: `https://tools.utilibre.org`
- Purpose: browser-side everyday utilities
- Upstream/source: <https://github.com/iib0011/omni-tools>
- License: `MIT`
- Selected version: `v0.6.0`
- Image: `docker.io/iib0011/omni-tools:0.6.0`
- Digest: `sha256:ceb5acc317daf387634f7f212cefe4722fd1243ad1cba74203f25254195b6c69`
- Source commit: `922b28ce154e8f22da4a721472889717a95f7562` (OCI revision)
- Modification: none; deployment settings only
- Corresponding source: upstream repository/tag; no local fork

### Healthchecks

- Public URL: `https://monitor.utilibre.org`
- Purpose: cron and job monitoring
- Upstream/source: <https://github.com/healthchecks/healthchecks>
- License: `BSD-3-Clause`
- Selected version: `v4.3`
- Image: `docker.io/healthchecks/healthchecks:v4.3`
- Digest: `sha256:cd7bcd94350818b3944f82eb5995f48bdeab8c8627977578a569ffa73f56f56f`
- Source commit: `099f9c38a581df1863d9cb4e9266423cc7d33f18`
- Modification: none; production configuration, closed registration, and a
  dedicated PostgreSQL role/database
- Corresponding source: upstream repository/tag; no local fork

### PairDrop

- Public URL: `https://send.utilibre.org`
- Purpose: WebRTC device-to-device transfer when network conditions permit
- Upstream/source: <https://github.com/schlagmichdoch/PairDrop>
- License: the repository's top-level license text is `GPL-3.0-only`, while its
  package metadata declares `ISC`. This upstream metadata conflict is recorded
  rather than silently resolved; this inventory treats the release
  conservatively as `GPL-3.0-only` pending upstream clarification.
- Selected version: `v1.11.2`
- Image: `ghcr.io/schlagmichdoch/pairdrop:v1.11.2`
- Digest: `sha256:c4b30977264a76e335740089e693a52a0d0d616330dec7f93c7b96beef7b4a02`
- Source commit: `4862ba3067be1a0f2e0d1e94861dc9200b5bfeea`
- Modification: none; no TURN server or third-party TURN credentials
- Pinned public source: the exact
  [upstream source commit](https://github.com/schlagmichdoch/PairDrop/tree/4862ba3067be1a0f2e0d1e94861dc9200b5bfeea);
  there is no local source change
- Maintenance note: the pinned release dates to 2025. It passed private
  deployment tests, but should be re-evaluated regularly rather than treated as
  indefinitely maintained.

### FreshRSS

- Public URL: `https://rss.utilibre.org`
- Purpose: RSS reader
- Upstream/source: <https://github.com/FreshRSS/FreshRSS>
- License: upstream package metadata declares the deprecated expression
  `AGPL-3.0`; this manifest does not infer an “only” or “or later” variant
- Selected version: `1.29.1`
- Image: `docker.io/freshrss/freshrss:1.29.1`
- Digest: `sha256:ab6b363102ccdbc39f6a62db926f567c61a5289bf25ba460f1c34423d8cc1a4d`
- Source commit: `b2c50115baa36c217e939ee3ea8ecfae52f91abd`
- Modification: none; external persistent data/extensions and a dedicated
  PostgreSQL role/database
- Pinned public source: the exact
  [upstream source commit](https://github.com/FreshRSS/FreshRSS/tree/b2c50115baa36c217e939ee3ea8ecfae52f91abd);
  there is no local source change

### RSSHub

- Public URL: `https://feeds.utilibre.org`
- Purpose: generate RSS feeds from supported public routes
- Upstream/source: <https://github.com/DIYgod/RSSHub>
- License: upstream package metadata declares the deprecated expression
  `AGPL-3.0`; this manifest does not infer an “only” or “or later” variant
- Selected version: upstream publishes a rolling image; exact reviewed source
  revision `40aca9548e99eefd519ff7abbb937560fc037c95`
- Base image: `ghcr.io/diygod/rsshub@sha256:0e0ee34e7288664ada039a816835ee28cc86767412d2c23f64e37a7320908f6c`
- Deployed derived image: `utilibre-rsshub:40aca954-public-origin-p2`
- Local image ID: `sha256:c7dec0f7cc88d4fb56a7b1247084680d7894da77d57d5842310bb600cb8de2bc`
- Modification: the small source-equivalent patch in
  `config/rsshub/rsshub-public-origin.patch` makes generated feed self-links use
  the configured public HTTPS origin. The derived-image build applies the same
  change to the pinned upstream bundle and fails if its exact patch point moves.
  The public source offer must include the pinned upstream tree, this patch,
  runtime patcher, Dockerfile, Compose wiring, and update/rollback instructions.
- Public source/build material: the exact
  [upstream source commit](https://github.com/DIYgod/RSSHub/tree/40aca9548e99eefd519ff7abbb937560fc037c95)
  plus `config/rsshub/` in this repository
- Auxiliary services deliberately absent: Browserless, Chromium, and Puppeteer

### PrivateBin

- Public URL: `https://paste.utilibre.org`
- Purpose: browser-encrypted text pastes
- Upstream/source: <https://github.com/PrivateBin/PrivateBin>
- Container source: <https://github.com/PrivateBin/docker-nginx-fpm-alpine>
- License: PrivateBin uses the `Zlib` license; the official container declares
  `zlib-acknowledgement`
- Selected version/source tag: `2.0.6`
- Image: `docker.io/privatebin/nginx-fpm-alpine:2.0.6`
- Digest: `sha256:13290e2f04bfd98cf8fc7e8d216fb76b2b2d12373d4923b859cd41c2d984fde8`
- Source commit: `921ab83f268add709413a87206e4e1c2e3c2063d` (official,
  verified annotated `2.0.6` tag); the image does not declare a revision label
- Modification: no source changes; external `conf.php` limits size and expiry,
  disables discussions/uploads, and uses filesystem persistence
- Corresponding source: upstream repositories/tags; no local fork

### Wakapi

- Public URL: `https://wakapi.utilibre.org`
- Purpose: WakaTime-compatible coding statistics
- Upstream/source: <https://github.com/muety/wakapi>
- License: `MIT`
- Selected version: `2.17.6`
- Image: `ghcr.io/muety/wakapi:2.17.6`
- Digest: `sha256:00662767731a6797d4be02cbc6c3f32b7ff8d0c683ee10ec5612856d4efbb3bf`
- Source commit: `ce91eac2c2d9b29a00873554d2ecef76f10b9087`
- Modification: none; production settings, closed signup, 12-month retention,
  and a dedicated PostgreSQL role/database
- Corresponding source: upstream repository/tag; no local fork

## Shared data services

### PostgreSQL

- Purpose: isolated databases/roles for Healthchecks, FreshRSS, Wakapi, and the
  unused reserved Crab Fit database
- Upstream/source: <https://github.com/postgres/postgres>
- License: PostgreSQL License
- Selected version: `17.11-alpine`
- Image: `docker.io/library/postgres:17.11-alpine`
- Digest: `sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73`
- Source revision: `083ac033419f690758508e08c1736089384bbee8`
  (official `REL_17_11` tag); exact image digest is the deployed artifact
- Modification: no source changes; conservative server parameters and an
  initialization script create separate least-privilege roles/databases

### Valkey

- Purpose: disposable RSSHub cache; not shared with SearXNG
- Upstream/source: <https://github.com/valkey-io/valkey>
- License: `BSD-3-Clause`
- Selected version: `9.1.1-alpine`
- Image: `docker.io/valkey/valkey:9.1.1-alpine`
- Digest: `sha256:de31910896150d5e754a07d57d227cfdde4e258ddd0d1aa4607f2d2f95843715`
- Source revision: `d27f9ba65a04e80d9c417112a7621fc98a56f70d`
  (official `9.1.1` tag); exact image digest is the deployed artifact
- Modification: no source changes; persistence disabled, 256 MiB cache with
  `allkeys-lru`

## Deferred application

### Crab Fit — not deployed

- Intended URLs: `https://when.utilibre.org` and
  `https://when-api.utilibre.org`
- Upstream/source: <https://github.com/GRA0007/crab.fit>
- License: `GPL-3.0-only` (top-level GNU GPL version 3 license and upstream
  README declaration)
- Reviewed source commit: `628f9eefc300bf1ed3d6cc3323332c2ed9b8a350`
- Deployment state: no image, container, port listener, active DNS route, or
  active Caddy block
- Build re-check (2026-08-30): amd64 is supported and is not the blocker. The
  locked SQL API builds on amd64 with Rust 1.70, but fails with current Rust
  1.98 because its 2023 dependency lock is stale. The frontend builds on Node
  24, but its locked dependency audit reports 48 known vulnerabilities: one
  critical and 16 high.
- Reason: the repository has no release tags and the reviewed branch has not
  been maintained since 2023. The API logs the full database URL (including
  credentials), and its limiter sees the edge socket rather than a trusted
  forwarded client address. The frontend mounts Vercel Analytics, includes
  hard-coded `crab.fit` functional URLs and an external Google Cloud Function,
  carries stale English-only privacy text, and has incomplete Spanish. A safe
  deployment would be a substantive maintained fork and dependency/security
  project, not a configuration change.
- Database note: the shared PostgreSQL initializer reserves a separate
  `crabfit` role/database, but no application connects to it.

## Source-disclosure checklist before public launch

- Publish this deployment repository, including `compose.yaml`, configuration
  without secrets, `Dockerfile.utilibre`, and its license notices.
- Publish or otherwise offer the exact BentoPDF, VERT, and RSSHub source/build
  material identified above to network users.
- Preserve all upstream attribution and source links in the applications and
  Utilibre portal.
- Never publish `.env`, `secrets/`, database dumps, backup archives, owner
  topics, API keys, or credentials.
- Re-run the license review whenever a version or image digest changes.
