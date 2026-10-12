# Native GDAL AVIF reader follow-up

Prepared on 2026-10-12; root-maintainer release is separate from preparation.
Only `libgdal32` changes from `3.6.2+dfsg-1+utilibre1` to
`3.6.2+dfsg-1+utilibre2` in the existing Gathio native database image.
The predecessor is the completed HDF5 → HEIF image, not an older mutable tag.

The genuine AVIF fixture already decoded through libheif but GDAL's callback
rejected its valid zero-byte read. Apply the exact one-line upstream repair
[154b1cbbfbbe0a0b19c5b64e99d2e9493db9a016](https://github.com/OSGeo/gdal/commit/154b1cbbfbbe0a0b19c5b64e99d2e9493db9a016),
without source adaptation. This is a functional repair, not a new CVE waiver.

## Preserved security and compatibility

- Authenticated Debian 3.6.2 baseline and all earlier vendor/native fixes remain.
- Complete old/new applied-source comparison permits exactly the reader's one
  line, one new patch/series entry and the new Debian changelog entry. All 3,358
  other files, including original public headers and six netCDF/HDF security
  source files, are byte-identical.
- Prior fixes remain `c49254dc` (CVE-2026-49014), `9491e794` (CVE-2026-8086),
  `184f77db` (CVE-2026-8087), and EHmetagroup prerequisites `950cd2a0`,
  `4cfbcf82`, `f1911cfc`. Their existing context/C++11 adaptations are unchanged.
- SONAME, all 5,935 public exports, 48 existing dependencies and 210 drivers
  remain; specifically keep the original GnuTLS libcurl dependency. Do not
  install an OpenSSL libcurl replacement into production.
- Unrelated packages, runtime files and `/etc` configuration are compared.
- Five enabled upstream build tests pass. Native fixtures exercise HEIC and
  AVIF dimensions, RGBA pixels/alpha, old-header codecs, all four earlier
  GDAL regression cases, and real PostGIS/DocumentDB raster/projection,
  role boundaries and synthetic dump/restore. No real user data is used.

The earlier malformed-grid fixture did not crash the unsanitized original:
that remains source-plus-compatibility evidence, not an invented reproduction.
The reviewer covers only the three named old GDAL findings at this exact new
package version/role/image, after proving unchanged prior repairs and current
payload. Raw findings and unrelated CVEs are never hidden.

## Reproduction and release

The isolated Bookworm native compiler/source cache from `geospatial-followup`
is reused only after its owner releases it. Restore `libcurl4-gnutls-dev`
before `build.sh` if an HDF5 build temporarily used OpenSSL development headers.
Keep 2 CPU/2 GiB compiler bounds and at least 8 GiB root free space.

Run `build.sh` inside that compiler, then `source.mjs`, `stage.mjs`, and
`application.mjs`. The source verifier compares fresh unpacked old/new quilt
packages, not a dirty build tree. Prepare the complete source offer, publish
and verify its bytes, then root runs `release.mjs prepare` and `apply`.
No schema migration, new network endpoint, credentials, telemetry, or resource
limit changes are involved. Exact source hashes and private proof paths are
in the scripts and immutable receipts.

The established release helper includes health/native/namespace dependency
checks and exact-image rollback. On failure return only the database image pin
to `utilibre-gathio-documentdb:heif-security-20261012`; preserve data and other
services. No database recovery or data deletion is part of this change.

Fresh-scan review: `review.mjs` emits proposals only. It never edits the private
security ledger. New updates must preserve or supersede the same native fixes;
a version string or inherited image label is not proof.
