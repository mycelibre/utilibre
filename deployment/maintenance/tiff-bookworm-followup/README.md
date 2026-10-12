# Gathio: native Bookworm TIFF maintenance

Prepared and deployed by the root maintainer on 12 October 2026. Exact live
image: `sha256:74e3254fe7b2a31b528b61e676356e3499c9df4483c9719465584f8a396bd585`.

The existing Gathio database has `libtiff6 4.5.0-6+deb12u4`. Debian currently
identifies CVE-2026-12912 and CVE-2026-36849 as unfixed on that baseline. The
official fixes touch newer PixarLog arithmetic and nineteen codec/API files;
direct zero-fuzz application is not possible. The available SUSE 4.0.9 backport
contains only the first of the four PixarLog fixes. Rather than maintain a new
security fork, the reviewed alternative is **official TIFF 4.7.2**, compiled
against Bookworm's existing libc and codecs using Debian's signed 4.7.2-1
source package and unchanged packaging, except for the local changelog version.

Candidate: `libtiff6 4.7.2-1~deb12u1+utilibre1`, SHA-256
`021924719404ab10898658badc268ab89cadc36fe910c29d83bcb9ce09e70f2f`.
The runtime overlay changes this one package only. No TIFF tools, development
packages, newer-distribution binaries, libc upgrade, app upgrade, settings,
database migration, retention change, or telemetry is introduced.

## Evidence and limits

- The maintainer-signed Debian source verifies with Debian's packaged keyring
  (`7D887DC8BA7BBBA7B835E3BADCE310E7864CC8BF`). Input hashes are pinned.
- Native build ran as `nobody`, network disconnected, 2 CPUs / 2 GiB.
- All **109 upstream tests passed**, zero skips/failures/errors.
- All **199 old versioned exports** remain; 213 exports in the fixed library.
  `libtiff.so.6`, all ten NEEDED libraries, and BIND_NOW remain unchanged.
- The exact old Debian series has **22 patches**. Eleven affect the library;
  each fix is present or explicitly reviewed as safely superseded. Other patches
  affect CLI tools/documentation excluded from this runtime overlay.
- An old-4.5-header native consumer round-trips eight codecs, dimensions and
  pixels against both libraries, and checks the fixed compression-ratio API.
- The full Gathio candidate additionally checks GDAL driver parity, existing
  bounded GDAL fixtures, PostGIS FlatGeobuf upstream tests, real GTiff raster
  import/export, geometry transformation, DocumentDB typed data, read-only
  role isolation and a synthetic logical dump/restore. Receipts record results;
  a container starting is not sufficient.
- CVE-2023-52355 is a separate documentation issue, **not** claimed as a code
  repair here. No exploitation, live privilege change, or real user-data test.

Private receipts: `/var/lib/utilibre-maintenance/tiff-bookworm-followup-20261012`.
Source/diagnostic logs contain no user content; raw operator artifacts are not
published. Source publication uses an explicit allowlist.

## Reproduce / release

`acquire.sh` acquires the authenticated old Debian baseline and official fixes
for comparison. `prepare-build.sh` reuses the isolated Bookworm compiler left
by `sudo-followup`, fetches only compiler dependencies there, disconnects its
network and runs `build-inner.sh`. The previously acquired, pinned official
4.7.2 source is reused from `penpot-native-followup`; no foreign binary is used.
`vendor-audit.mjs`, `native.mjs`, `stage.mjs`, then `application.mjs` must pass.

The isolated image is `utilibre-gathio-documentdb:tiff-security-20261012`,
based on the exact OpenLDAP successor declared in `stage.mjs`, preserving
the earlier Xlib, GDAL, PostGIS and other repairs. **Do not rebase implicitly.**
If the predecessor changes, pin and rerun stage/application evidence first.

`prepare-source-offer.mjs` prepares complete upstream source, Debian packaging
and public recipes. The root maintainer reviews its checksum, runs it with
`--publish`, and verifies the public download. Source is available at
`https://tools.utilibre.org/utilibre-source/security-tiff-bookworm-20261012-source-v2.tar.gz`
only after that publish step.

The original source archive and release receipts remain immutable. The v2
archive corrects the advisory year in the explanatory README/audit recipe;
compiled source, binary package, test evidence and live image are unchanged.
The original descriptive audit record's `CVE-2026-52355` was a transcription
error, not another vulnerability and not a claimed code fix. Additive
`documentation-correction.json` records this correction and the actual
upstream documentation resolution for CVE-2023-52355.

After the OpenLDAP predecessor is live, the root maintainer runs
`node deployment/maintenance/tiff-bookworm-followup/release.mjs prepare`, then
`.../release.mjs apply`. The helper gates freshness, exact packages, source,
previous runtime bytes, configuration, namespace companions and live health.
It retains the predecessor and automatically restores its exact image pin if
health fails. No data schema changes; rollback is the exact predecessor image,
not a database restore. Keep normal saved-account backups unchanged.

## Primary sources

- <https://security-tracker.debian.org/tracker/CVE-2026-12912>
- <https://security-tracker.debian.org/tracker/CVE-2026-36849>
- <https://security-tracker.debian.org/tracker/CVE-2023-52355>
- <https://gitlab.com/libtiff/libtiff/-/commit/ba2b04b114c5dd945107ccc613cedfcca3af73bb>
- <https://gitlab.com/libtiff/libtiff/-/commit/51fa6dfe93f20da0d38f079fbc61c7c960bcbc16>
- <https://gitlab.com/libtiff/libtiff/-/commit/f9bda11bf2fc819b971517582666d56f18b1bc3f>
- <https://gitlab.com/libtiff/libtiff/-/commit/90601d9a23382d98f3695ec14441145c37a77574>
- <https://gitlab.com/libtiff/libtiff/-/commit/eedba405d3695b52faae65994c5904f228eca0bf>
- <https://deb.debian.org/debian/pool/main/t/tiff/tiff_4.7.2-1.dsc>
- <https://api.opensuse.org/public/source/SUSE:SLE-15-SP5:Update/tiff/tiff-CVE-2026-12912.patch?expand=1>
