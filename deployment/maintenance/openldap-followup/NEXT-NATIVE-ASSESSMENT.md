# Gathio HEIF/HDF5 follow-up assessment

2026-10-12. Assessment only: no new package installed, no production service
restarted, no vulnerability decision applied. TIFF is handled separately.

The running database image contains `libheif1 1.15.1-1+deb12u1`,
`libhdf5-103-1 1.10.8+repack1-1` and `libhdf5-hl-100` of the same version.
`ldd` on its native GDAL confirms real linkage to all three libraries; they
cannot be dismissed merely because the application is a calendar.

Live library hashes observed:

- HEIF: `7a436c824a91b2deee3f080eeadcf307bf7e3c0f8e671c09272dc916a856a51b`.
- HDF5: `8768aa43001857ae8d05cd717c40d3eb79cdfaa5319dc32fa3e9a984cef40fa9`.
- HDF5 HL: `b926ac43a866aa419256e0b4ffe4ca526e9b9117869d7dab39d1b34feaa3fc08`.

`assess-next-native.mjs` downloads the exact Debian source and validates its
DSC signature against the archive-provided Debian developer/maintainer
keyrings, then validates both tarball SHA-256 values and extracts all existing
Debian patches. Evidence and patch dry runs are in the private
`openldap-followup-20261012/next-assessment/source-assessment.json`.

## HDF5: a narrow backport is feasible

[Ubuntu's CVE-2018-11205 record](https://ubuntu.com/security/CVE-2018-11205)
identifies upstream
[46cedc2eb03ad7cd6e8404f5e6b526588436f946](https://github.com/HDFGroup/hdf5/commit/46cedc2eb03ad7cd6e8404f5e6b526588436f946)
as its fix. It replaces malformed-file assertions with native error handling
inside two existing chunk/B-tree functions. No public API or new dependency
is added. The unmodified patch fails two hunks against Debian 1.10.8 because
unchanged formatting and entry macros differ. A context-only refresh retains
**every upstream added/deleted byte**, preserves 1.10.8's `FUNC_ENTER_STATIC`,
and dry-runs all six hunks with zero fuzz. Adjusted patch SHA-256:
`ed1e9cb11ad2e3f25e89e2d318dfff3ecab8fe82a36774b4e05f3bd22553b87d`.

This is preparation, not a tested binary or a claim of full remediation.
Next gate: native Bookworm build preserving serial-library SONAMEs/exported
symbols and dependencies, ordinary chunked dataset/hyperslab/HL read-write
tests, the relevant upstream suites, then actual GDAL/HDF5 and database
restore checks. Do not switch the entire image to HDF5 1.14/2.x merely to
remove the finding; that introduces a wider ABI transition.

Debian still lists Bookworm as vulnerable, not fixed:
<https://security-tracker.debian.org/tracker/CVE-2018-11205>.

## libheif: two definite small repairs; separate scope checks

Two vulnerable overlay expressions are present in the authenticated 1.15.1
source (`libheif/heif_image.cc`). These official fixes each change one line,
and both dry-run with zero fuzz after a **filename-only** mapping from the
later upstream `libheif/pixelimage.cc` path:

- [CVE-2025-68431](https://security-tracker.debian.org/tracker/CVE-2025-68431):
  [b8c12a7b70f46c9516711a988483bed377b78d46](https://github.com/strukturag/libheif/commit/b8c12a7b70f46c9516711a988483bed377b78d46),
  correct copied overlay width. Path-only patch SHA-256
  `8f43ea824d2b350bfdb8251df4e22abc1a5bb2394b861d090b279e7458d4da35`.
- [CVE-2026-32882](https://security-tracker.debian.org/tracker/CVE-2026-32882):
  [22b6266bf03a9f016f84a9b57b80e1dd7c79d64a](https://github.com/strukturag/libheif/commit/22b6266bf03a9f016f84a9b57b80e1dd7c79d64a),
  use the alpha plane's own stride. Exact checksums are in the private record.

Native 1.15.1 backport/build is preferable to installing newer-distribution
binaries. Required gates: preserve Debian patches, old C exports/SONAME and
codec dependencies; ordinary HEVC/AVIF/overlay/alpha roundtrips; upstream
tests; GDAL format access and database restore. No exploit fixture was run.

The remaining high rows require individual scope evidence, not a waiver:

| Advisory | Source inspection and next proof |
| --- | --- |
| CVE-2026-32740 | The reported newer `copy_image_to` subsampled-chroma path is absent. 1.15.1 assembles tiles in RGB/4:4:4 and uses different copy code. Verify the exact signed binary/source mapping and normal tiled-image behavior before a not-affected decision. The tracker-linked integer-overflow commit is not sufficient evidence for this distinct rounding issue. |
| CVE-2026-32741 | `MaskImageCodec`/`mski` decoding is absent from this source; require exact package/binary provenance before classifying. |
| CVE-2026-41071 | `SampleAuxInfoReader` is absent. Debian's own note says introduced in 1.20.0, while its Bookworm source table still labels vulnerable. Reconcile exact source/binary identity. |
| CVE-2026-47178 | Upstream range starts at 1.19.0. The named uncompressed tile decoder is absent from 1.15.1; prove exact installed component before classifying. |
| CVE-2026-84450 | Upstream range starts at 1.19.0; named tiling API is absent in source and native exported symbols. This is specific to that path, not a statement that all crop code is safe. |
| CVE-2026-84451 | Upstream range starts at 1.19.0; uncompressed tile decoder is absent. Require exact byte/package proof; do not generalize to other libheif findings. |

The assessment did not inspect or clear every lower-severity or temporary
libheif advisory. Source absence alone is not a completed runtime review.
No new code paths should be added by a broad upgrade merely to satisfy an
overbroad source-package match.
