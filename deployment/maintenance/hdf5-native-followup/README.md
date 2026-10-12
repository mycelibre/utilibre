# Native HDF5 follow-up (12 October 2026)

Bounded repair for the installed Gathio Bookworm libraries, not a framework or
database upgrade. Root maintainer owns production approval/application. This
directory does not own shared Compose, advisory or vulnerability-ledger edits.

## Exact source and change

`spec.json` pins the signed Debian `hdf5 1.10.8+repack1-1` source, its three file
hashes, the developer signing fingerprint, base image and patch. The signing key
has subsequently expired; the original signature was valid when made on
18 December 2022. `prepare.mjs` checks `VALIDSIG` and every source hash.

[Ubuntu's CVE-2018-11205 record](https://ubuntu.com/security/CVE-2018-11205)
links upstream [46cedc2](https://github.com/HDFGroup/hdf5/commit/46cedc2eb03ad7cd6e8404f5e6b526588436f946).
[Debian's record](https://security-tracker.debian.org/tracker/CVE-2018-11205)
still identifies Bookworm's installed version as affected. Checked 12 October
2026. The fix replaces chunk-layout assertions with normal dimension and offset
validation in `H5Dbtree.c` and `H5Dchunk.c`. Only unchanged context is adapted for
1.10.8 (including its original `FUNC_ENTER_STATIC` scope). Every upstream added
and removed byte is preserved; all six hunks apply with zero fuzz. Existing
Debian patches and versioned symbol maps remain intact.

No other HDF5 CVE is covered. No exploit is run and no absence-of-use waiver is
claimed: GDAL actually links this library. The version is
`1.10.8+repack1-1+utilibre1`; only the two already-installed serial C/HL packages
are eligible for the application overlay.

## Rebuild and gates

The approved disposable compiler is pinned in `spec.json`, capped at two CPU and
4 GiB memory. Preserve its unrelated PostGIS/GDAL trees. `prepare.mjs` accepts
the earlier authenticated assessment files or the `sources/` sibling contained
in the published source archive. On another machine adapt only work paths and
the locally created native Bookworm compiler identity; never substitute a newer
distribution's binaries. Source upstream is Debian's `pool/main/h/hdf5/`.
An independently reproducible native starting point is the already reviewed
Bookworm image `node@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20`,
with the recipe's build dependencies. The source offer includes native buildinfo
to identify exact installed build-package versions. The original shared compiler
also contains unrelated earlier geospatial build products; they are not required
to build the HDF5 packages. Its identity is an evidence pin, not a public image
distribution promise. The native consumer fixture needs stock old-header HDF5,
netCDF and GDAL development packages, not another application backend.

1. Run `node deployment/maintenance/hdf5-native-followup/prepare.mjs`.
2. Inside that compiler, run `recipe/install-build-deps.sh` then `recipe/build.sh`
   from `/work/hdf5-native-followup`; save complete output as `build.log` there.
   The compiler's original curl development selection changes to OpenSSL to
   preserve the installed HDF5 `libcurl.so.4` boundary, not GDAL's GnuTLS boundary.
   This affects only the disposable compiler, not the running applications.
3. The Debian `-B` serial package build retains C, HL, C++, Fortran and JNI tests.
   Supported empty `OMPIARCHS`/`MPICHARCHS` disable uninstalled MPI variants. `-d`
   bypasses only the source's unconditional build-dependency check for those MPI
   variants. The complete serial dependencies are installed explicitly. No
   `nocheck` or disabled serial test gate is used. Doc-only packages and MPI
   variants are not part of the target or this acceptance claim.
   Upstream-configured optional-feature skips remain visible in the individual
   test logs and `skippedSubcaseEvidence`; successful program completion does
   not mean every optional subcase ran (for example external AWS credentials).
   Drop `CAP_DAC_OVERRIDE`/`CAP_DAC_READ_SEARCH` for the build command: otherwise
   root incorrectly succeeds at the upstream JNI read-only-file test. The first
   local attempt exposed this; all 16 `TestH5Fbasic` cases passed unchanged with
   these capabilities removed. `resume-permission-check.sh` retains genuine
   completed test stamps and reruns the previously failing full JNI script;
   initial diagnostics remain private. This is a compiler privilege correction,
   not a test waiver or a production permission change.
   The old Debian configure helper creates generated symlinks non-idempotently;
   resume removes only the 13 named generated helper symlinks, verifies they are
   symlinks to the expected helper family, then invokes the ordinary full native
   package build. Source, binaries and actual test stamps are preserved; native
   buildinfo is generated normally. No test failure is suppressed.
4. `collect.mjs` exports the packages, native buildinfo, clean corresponding source
   package and test evidence. Its tiny valid-file fixture compiles against the
   original Debian headers and tests compressed/version-1 B-tree chunks, HL
   attributes/readback, dataset extension/hyperslabs, and netCDF/GDAL consumers.
5. `stage.mjs` builds an offline image on the exact current TIFF-fixed parent.
   It requires equal exports, SONAME and dependencies; no other runtime package,
   configuration, application or native-library bytes may change. Both old and
   new images run the same old-header fixture, without a network.
6. `application.mjs` adapts the established synthetic Gathio fixture paths only:
   all GDAL drivers and existing netCDF/HDF4 regression inputs, PostGIS geometry
   and raster import/export, DocumentDB typed data, read-only role isolation,
   upstream FlatGeobuf regression and native dump/drop/restore. Uses disposable
   tmpfs, no production records or outside network. HDF5-specific roundtrips are
   separately required; HDF4 alone would not prove HDF5 compatibility.
7. `source-offer.mjs` prepares, then `--publish` exposes an allowlisted source-only
   archive. `release.mjs prepare` verifies evidence and existing production health
   without changing it. Parent maintainer reviews and runs `release.mjs apply`
   through the existing serial release process. Never run overlapping releases.

Live application configuration and all data volumes remain unchanged. Release
checks the exact two library hashes, native PostgreSQL/PostGIS/DocumentDB versions
and existing web HTTP success. The established release helper restores the prior
image pin and recreates namespace-dependent containers if a gate fails. A later
manual rollback uses the previous exact `spec.baseRef`, preserving data; it also
restores the old vulnerability, so do not leave that state unexplained.

Private receipts live under `spec.work`. Their status—not the presence of this
recipe—establishes completed checks/deployment. `review.mjs` only prepares exact
finding keys after a fresh completed scan, passed release, live byte checks and
proven successive overlays. The strict policy accepts this CVE, package version
and Gathio role only. Root registers it in the shared applier; raw findings remain.

Keep 8 GiB free throughout staging/release. Build-time Java/Fortran/tool binaries
and test outputs are not installed into the application image. The public source
archive intentionally excludes private logs, credentials and user data.

## Candidate verification completed

12 October 2026: 150 upstream program/script completion records, with optional
subcase skips retained in the logs. The corrected full build passed; first-run
root-permission and intermediate helper diagnostics are preserved separately.
This count is not a claim that all optional subcases ran. No production release
is implied by these candidate results; see the root-owned `release.json`.

- Candidate `utilibre-gathio-documentdb:hdf5-security-20261012`, image
  `sha256:c6c67d08d16390454a108b8120ca0bf2931896c69581d1723e0e8a4cfe27b596`.
- `libhdf5-103-1` package SHA256
  `6aa8136619bafc64714a49ba3b21b70b892c1dda1a1f458c4ea327b92aaebbe2`;
  `libhdf5-hl-100` package SHA256
  `c1062b0b46a55d81f3ad05391e95c9f7559ada77c610661e1ee5748a0761469d`.
- C/HL versioned exports: 3276/202, exactly unchanged. SONAMEs and all six/two
  direct dependencies are unchanged; existing patched TIFF/GDAL/OpenLDAP and
  all other runtime libraries, packages, application/configuration bytes remain.
- Both old and new images passed the same original-header valid-file HDF5,
  compressed chunks, high-level attributes, extension/hyperslab, netCDF and
  actual GDAL HDF5/netCDF readback fixture without a network.
- All 210 GDAL drivers retained; four existing regression cases passed. Native
  PostGIS raster roundtrip/projection, DocumentDB typed data, two upstream
  FlatGeobuf tests, denied writes for a read-only role and synthetic native
  dump/drop/restore passed in networkless tmpfs. No production records used.
- New C-library SHA256
  `2702141d10085eda2f2b287abf3ad8072afa6fe2d49967c9951ba07a1187cf04`;
  HL-library SHA256
  `03c3c50ca66e5950bb77d9c2991007e57b9651ff8c1c3776f24748bcff464f89`.
