# Public reference readers — 24 November 2026

## Scope and inputs

This release prepares Wikimore 0.1.27 (`70b39146f36f54317ccda71fcc007caa5a555a1e`),
Freetar 0.22.0 (`0418035548a5d42f6252621514cd0949a7845b1b`), and the
already-integrated Structables, refreshed from 0.4.5 to 0.4.6
(`2f6b7965b2427d4d57d65388bd5fd7f0a4358661`). The latter keeps the
existing `structables.utilibre.org` address; the suggested `diy` alias is not
needed. All use pinned source, exact patches and hash-pinned runtime wheels.
The proposed `wiki.utilibre.org` address was already occupied by BreezeWiki,
so Wikimore uses `wikimore.utilibre.org` and the existing route is preserved.
Their Alpine 3.24 runtime updates (`libcrypto3`/`libssl3` 3.5.9-r1 and
`zlib` 1.4-r0) are fetched by exact filename and SHA-256, then installed
without network access during the image build. Structables also updates
`soupsieve` from 3.0.4 to locked 4.1.
The Python base is pinned by OCI digest; Wikimore's local Leaflet package is
version 1.9.4 with SHA-256
`84c65a256e50657896f54c33bd857b6849ebe94c817803be818bf32a3dde0b77`.
See each `deployment/{wikimore,freetar,structables}/README.md` for build,
limits, source and rollback. No production account or user data is migrated.

## Private checks observed

- The three candidate images built without network after controlled source,
  Alpine-package and wheel downloads. Freetar's three, Wikimore's four and Structables' nine
  offline regression checks passed. Compose validation passed for all three.
- The first Wikimore source-archive request revealed a streamed-response 500.
  A focused regression reproduced it; the corrected build now returns the
  complete archive. All three source-archive routes return 200 from their
  private backends. Publishing the same Wikimore archive twice produced
  identical SHA-256 bytes (`21a8140620af5dbf1ed09b750d62ea8f04d9934dd156feabf56d58c065faeba3`).
- Offline Trivy 0.76.2 found **zero** vulnerabilities in the final three
  image artifacts using its 23 November 2026 database snapshot (SHA-256
  `f4bd5852164d046530373ad0b66a42c447f9e9393adaa6e7b75fa432b863f889`).
  This is a dated scan result, not a future security guarantee. It replaced
  an earlier scan with one high Structables parser finding and OS package
  findings. JSON reports are retained privately under
  `/var/lib/utilibre-maintenance/reference-readers-20261124/`.
- Freetar's direct Ultimate Guitar search for `guantanamera` returned 43 local
  tab links; opening the first produced a readable chord sheet. The tested
  browser journey displayed 71 chord spans.
- Wikimore's Spanish search and `Volcán de Fuego` article returned 200. The
  article produced 21 local image links; five tested images decoded as JPEG or
  PNG. Wikimedia's static map endpoint returned 403, so that particular map
  remains an upstream limitation.
- Structables' paper-airplane search returned results and its selected project
  displayed numbered steps and 25 media links. Five full images returned
  complete JPEG data; the browser showed a loaded 1024-pixel step picture.
  The 0.4.6 upstream change to `embedType` had hidden all ordinary images;
  the local patch recognizes the observed native `NONE` image type. A regression
  fixture checks that behavior. The October image-access blocker is resolved
  for these tested examples, not every possible upstream project.
- Playwright Chromium desktop and iPhone-sized emulation completed the three
  reading/practice journeys with no unrelated browser requests or page script
  errors. Physical phone use and full provider reliability remain unverified.
- Candidate memory after private journeys: Structables about 78 MiB,
  Freetar about 36 MiB, Wikimore about 90 MiB. This is a small observation,
  not a load test or concurrency claim. At that point the VM had 21 GiB
  available RAM and 80 GiB available root-disk space.
- All three release images now run behind private IP ports 3242–3244 and their
  health routes and representative project/article routes return 200. The
  external Caddy site blocks and public HTTPS journeys remain to be checked.

## Privacy and maintenance

Browser assets are local. The readers have no analytics, accounts or persistent
content database. Containers disable request logs. The selected upstream
content source sees the Utilibre server connection; only the selected public
search/page/media request is sent. Query words can appear in native search URLs
and the browser history; no-referrer headers restrict link leakage. Freetar
favorites stay in browser localStorage and export to a user-controlled JSON
file. Wikimore and Structables cache public source data in bounded worker
memory. Their media and browser caches are separate. No content backup is
created. Edge/provider operational processing is described in the general
Utilibre privacy policy, not claimed to be anonymous.

The current patches are application-specific: Freetar escapes source chord
markup and imported favorites, removes an optional minifier dependency and
blocks provider redirects; Wikimore self-hosts Leaflet, rewrites Wikimedia
thumbnails and bounds its media transport; Structables retains its prior
sanitizer and request boundary and fixes the 0.4.6 image type regression.
Upstream project status of these local patches is unknown; none has been
represented as accepted upstream.

## Release boundary

The separate edge Caddy VM is not SSH-accessible from this VM. The private
backends can be activated and checked here, but public HTTPS and upstream
instance-list submissions require the three reviewed Caddy site blocks,
followed by public-route/browser checks. Catalogue IDs must remain disabled
until those checks pass. Maintainer acceptance of instance submissions is
external and cannot be asserted by Utilibre.
