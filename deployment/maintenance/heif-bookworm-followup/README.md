# Native Bookworm HEIF repair — 12 October 2026

Released by the root maintainer on 2026-10-12 after complete source publication,
native/application checks and exact-image production health gates. Release
image: `sha256:425207d99ef6ed8b442d8fafe7ed021d78a2e00b92de39fd4e7080fa7701adbb`.
Root maintains the private decisions ledger, Compose pins and overlay ordering.

## Exact change

`libheif1 1.15.1-1+deb12u1` → `1.15.1-1+deb12u1+utilibre1` for Gathio's
existing native database image only. The signed Debian baseline and all three
prior Debian patches remain. Two upstream one-line changes are backported:

- [CVE-2025-68431: overlay width](https://github.com/strukturag/libheif/commit/b8c12a7b70f46c9516711a988483bed377b78d46).
- [CVE-2026-32882: alpha stride](https://github.com/strukturag/libheif/commit/22b6266bf03a9f016f84a9b57b80e1dd7c79d64a).

Only the source filename is adapted; added/deleted fix code is byte-for-byte
upstream. `verify-source.mjs` pins original/adapted patches and authenticated
source archives. No codec/plugin removal, foreign-distribution binary, runtime
network download, daemon/configuration change or schema migration.

## Evidence and limits

The native build uses Bookworm libc 2.36 and the existing isolated compiler,
2 CPU / 2 GiB. All 211 exported symbols, SONAME, ten NEEDED entries and BIND_NOW
match the original library exactly. Three vendor patch files match exactly.
The unchanged enabled upstream Catch suite passes 14 assertions in one case;
the upstream-disabled encoder cases are **not** counted as tested. A separate
ordinary overlay/alpha fixture and original-header HEVC/AV1 RGBA encode/decode
roundtrips pass against both original and repaired libraries.

The actual GDAL HEIC import reads dimensions, all RGB pixels and alpha. A
separate **pre-existing AVIF reader failure** also reproduced on the unchanged
baseline: GDAL 3.6.2 treats a valid zero-byte reader call as an error and emits
`No 'meta' box`. Official GDAL fix
[154b1cbb](https://github.com/OSGeo/gdal/commit/154b1cbbfbbe0a0b19c5b64e99d2e9493db9a016)
changes its read-count handling. The libheif repair does not claim to fix GDAL.
The diagnostic wrapper is confined to disposable synthetic tests, not shipped.

`stage.mjs` layers on the exact completed HDF5 candidate, preserving all earlier
TIFF, LDAP and Xlib repairs. It checks all unrelated package versions,
configuration and runtime bytes. `application.mjs` checks actual GDAL inventory,
four existing bounded driver fixtures, HEIC, native libheif HEVC/AV1,
PostGIS/DocumentDB, projection, raster import/export, read-only SQL roles and a
synthetic database dump/restore. No production documents/DB rows are used.

## Reproduce / release

Private evidence is under
`/var/lib/utilibre-maintenance/heif-bookworm-followup-20261012`.
`prepare-build.sh` operates only on its named compiler work directory. After
package tests, `debian/rules clean` removes intermediate build products before
creating the full quilt source package; it does not remove application data.

Run `native.mjs`, then `stage.mjs`, `application.mjs`, and the source-offer helper.
Root publishes corresponding source before using `release.mjs prepare/apply`.
The helper uses the established namespace/health/recreate/rollback gates. A
rollback restores the exact predecessor image/Compose pin, retaining volumes.
Do not upgrade automatically past the custom package without either retaining
these exact fixes or proving the upstream replacement includes them. Re-run
native consumers and strict fresh-scan proof for every changed image/version.

Other libheif findings require individual source-path and installed-artifact
assessment; this package is not a blanket source-version waiver.
