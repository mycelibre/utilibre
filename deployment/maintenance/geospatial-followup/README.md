# Native geospatial security follow-up (2026-10-12)

This finite recipe repairs existing native components without removing the
features that use them, migrating Debian/PostgreSQL, or changing account data.
Private evidence and source artifacts live at
`/var/lib/utilibre-maintenance/geospatial-followup-20261012/`.

## PostGIS — built, tested and released

The Gathio DocumentDB image's `postgresql-17-postgis-3` package is now
`3.6.0+dfsg-3.pgdg12+1+utilibre1`. PostgreSQL remains **17.11**, PostGIS's SQL
extension remains **3.6.0**, and its existing scripts package is unchanged.
The exact release completed **2026-10-12T13:15:24.746Z**. The immediate image was
`utilibre-gathio-documentdb:postgis-security-20261012`, digest
`sha256:c20d59a84f6e3921666e5aa4f26323673f79c1959911ea7c1577db182c4d3d6d`.
Later reviewed security overlays may supersede this image; use their receipts
instead of rolling back their unrelated fixes.

Source authentication is PGDG's signed archive InRelease → Sources.bz2 → the
exact installed release's source checksums. The archived DSC is unsigned, so it
is **not** accepted merely because it downloaded over HTTPS.

The [stable FlatGeobuf repair](https://github.com/postgis/postgis/commit/53e273faeb440176eee83f76319b48afb0b86834)
addresses [CVE-2026-73515](https://security-tracker.debian.org/tracker/CVE-2026-73515).
Five earlier stable FlatGeobuf commits are prerequisites: correct allocation,
PostgreSQL character conversion, quoted table/column identifiers, schema
validation and type handling. Their exact IDs/digests are in `spec.json`.
Only FlatGeobuf hunks from the broader PostgreSQL-19 compatibility commit are
included. After applying the chain, **all seven source/regression files match
the final upstream commit byte-for-byte**. No security hunk is omitted.

Only Debian packaging targets are narrowed to the installed PostgreSQL major;
upstream rules and hardening options remain intact. The native `.so` libraries
and matching LLVM bitcode are rebuilt together. Complete corresponding source
is retained in the candidate at `/usr/local/share/postgis-security/`.

Checks completed:

- Two full upstream SQL regression sets, **346 tests each, zero failures**.
- **51,395 C-unit assertions**, no failures.
- All five native modules retain exactly their exported function and ELF
  dependency boundaries; the main module retains 1,169 exports.
- All unrelated package versions, PostgreSQL engine files, DocumentDB files and
  installed SQL files remain byte-identical. Existing curl/XML/SQLite patches
  are not replaced by builder packages.
- On the actual candidate: exact upstream FlatGeobuf malformed/valid-input
  regression, native dump/restore and extension uninstall pass.
- Mixed BSON/geometry synthetic data, projection and logical dump/reload pass.
  Standard read-only-role and denied-DELETE checks use a separate PostGIS
  database; DocumentDB's internal grants are not relaxed.
- Live exact-image native health, unchanged Compose configuration, native
  version queries and existing Gathio HTTP 200 all pass. No application/user
  workflow coverage beyond these observations is claimed.

The normal release helper imports existing health, namespace-companion and
rollback guards. It only changes the PostgreSQL image scalar in
`deployment/calendar/compose.gathio.yaml`. There were no namespace companions
to recreate for this release. It does not alter the security decision ledger.

Reproduction, with a reviewed exact base and adequate free space:

```sh
node deployment/maintenance/geospatial-followup/acquire.mjs
node deployment/maintenance/geospatial-followup/build.mjs --prepare
node deployment/maintenance/geospatial-followup/build.mjs --authenticate
docker exec maintenance-postgis-native-20261012 sh -c 'cd /work && dpkg-source -x source/postgis_3.6.0+dfsg-3.pgdg12+1.dsc source-tree'
node deployment/maintenance/geospatial-followup/patch.mjs
docker exec maintenance-postgis-native-20261012 sh /recipe/compile.sh
node deployment/maintenance/geospatial-followup/stage.mjs
node deployment/maintenance/geospatial-followup/check.mjs
```

The scripts fail on source/base drift and use an explicitly named disposable
builder. Do not rerun source extraction/patch preparation on an already prepared
tree. Builds are limited to **2 CPUs / 4 GiB**, and release requires at least
8 GiB free disk. Two builder-only library downgrades match Debian development
headers; neither is copied into the candidate, and the package-delta gate
rejects any runtime downgrade. Source/test work is not mounted into production.

`release.mjs prepare`, `pin`, then `apply` are separate reviewed release stages.
The automatic failure path restores the previous exact image scalar and
recreates only the selected service/namespace companions, preserving volumes.
For a later manual rollback, inspect the **latest** release chain first: do not
revert subsequent Python/OpenSSL/etc. fixes by blindly restoring this release's
old curl-only image. No database/data restore is part of an image rollback.

## GDAL — built, tested and released

The completed guarded release uses
`utilibre-gathio-documentdb:gdal-security-20261012`, image
`sha256:fd9252c7293a388f00349c1f5d53e1f692e316e0dd7901ad0b6e00bd4a954a26`.
Exact live image, database versions, existing application HTTP 200 and unchanged
Compose configuration passed. No schema, volume or retention changes.

The vulnerable native sibling `libgdal32` is distinct from the data-only
`gdal-data`/`gdal-plugins` component-attribution reviews. Exact Debian source
**3.6.2+dfsg-1** is authenticated with the Debian maintainer signature. The
target remains `libgdal.so.32`; no driver or functionality is disabled.

The three bounded upstream repairs are:

- [netCDF attribute lengths](https://github.com/OSGeo/gdal/commit/c49254dc6380af2f02ff43ca79e3cf7c1bc82f01), CVE-2026-49014.
- [HDF4 swath metadata](https://github.com/OSGeo/gdal/commit/9491e794f1757f08063ea2f7a274ad2994afa636), CVE-2026-8086.
- [HDF4 grid metadata](https://github.com/OSGeo/gdal/commit/184f77dbcc74118c062c05e464c88161d3c37b9b), CVE-2026-8087.

Both HDF4 native patch contents are unchanged, with hunk offsets explicitly
bound to their named functions. Zero fuzz alone was insufficient: the old source
contains repeated loop text, and an initial candidate put one guard in another
function. The existing malformed-file test caught it before deployment.
`hdf-hunk-targets.mjs` and its four tests prevent that ambiguous placement.
netCDF requires four
context-only adaptations to 3.6.2 and two equivalent mutable-string bindings for
its C++11 build; the whole upstream repair remains present. The changes and
upstream checksums are explicit in `gdal-patch.mjs` and private provenance.

Three exact upstream EHmetagroup prerequisites (`950cd2a0`, `4cfbcf82`,
`f1911cfc`) also retain null-pointer guards needed by the older source.
`gdal-hdf-prerequisites.mjs` verifies complete upstream hunks with zero fuzz.
The earlier rejected source/build/test artifacts remain private. The resulting
source offer contains the corrected complete Debian quilt series, not the
rejected candidate.

The native probe uses fictional GeoJSON/netCDF and GeoTIFF round trips, the two
exact upstream malformed HDF4 fixtures, and synthetic oversized netCDF
attributes. The isolated unpatched baseline passes valid files and reproduces
stack corruption on oversized netCDF attributes; the malformed HDF4 swath
fixture also terminates the old native reader. The grid fixture does not crash
the unsanitized baseline, so its successful run is compatibility evidence, not
an independently reproduced memory-safety failure. Baseline testing uses no
network, a read-only image, tmpfs output, disabled core dumps and a 256 MiB cap;
it does not query production or another operator's service.

The native Debian build's five CTest programs passed, followed by all four
native cases (valid files, oversized netCDF, malformed HDF swath and grid).
All **210** drivers, **5,935** exported functions and linked dependencies remain.
PostGIS raster import/export, projection, DocumentDB typed data, read-only-role
denial, FlatGeobuf regression and synthetic dump/restore passed. PostgreSQL stays
17.11 and DocumentDB's actual native extension version stays **0.107-0**.
These bounded checks are not an exhaustive GDAL format audit.

Reproduction extends the same isolated Bookworm builder:

```sh
docker exec maintenance-postgis-native-20261012 apt-get install -y --no-install-recommends debian-keyring
node deployment/maintenance/geospatial-followup/gdal-acquire.mjs
docker exec maintenance-postgis-native-20261012 sh /recipe/gdal-prepare.sh
node deployment/maintenance/geospatial-followup/gdal-patch.mjs
node deployment/maintenance/geospatial-followup/gdal-dependency-config.mjs
node deployment/maintenance/geospatial-followup/gdal-hdf-prerequisites.mjs
docker exec maintenance-postgis-native-20261012 sh /recipe/gdal-compile.sh
docker exec maintenance-postgis-native-20261012 cc -std=c11 -O2 -Wall -Wextra -Werror -I/usr/include/gdal /recipe/gdal-probe.c -lgdal -lnetcdf -lm -o /work/gdal-fixtures/gdal-probe
```

Copy the repository's fictional GeoJSON to `gdal-fixtures/fictional.geojson`,
then run the compiled probe with `--create /work/gdal-fixtures` **once** in
the builder to generate the synthetic netCDF inputs. Do not overwrite the
fixtures after recording the baseline: candidate checks require identical
input hashes. `gdal-acquire.mjs` needs the trusted Debian keyring installed by
the builder preparation; it verifies the source files and upstream HDF4
fixtures rather than silently replacing differing existing artifacts.

`gdal-base.json` pins the reviewed live predecessor. After a new overlay lands,
review its receipt and update this exact base before staging; never use a
moving tag or replace an intervening repair. The candidate/release gates are:

```sh
node deployment/maintenance/geospatial-followup/gdal-baseline.mjs
node deployment/maintenance/geospatial-followup/gdal-stage.mjs
node deployment/maintenance/geospatial-followup/gdal-check.mjs
node deployment/maintenance/geospatial-followup/gdal-release.mjs prepare
node deployment/maintenance/geospatial-followup/gdal-release.mjs pin
node deployment/maintenance/geospatial-followup/gdal-release.mjs apply
```

Do not interpret a successful build as a GDAL release. Candidate ABI/package,
driver, consumer and restore evidence must pass before a separate exact-image
release. Current completion evidence is in the private receipt files, not an
assumed whole-image safety or uptime claim.

## Scanner reconciliation and future updates

`review.mjs` writes **only** `native-reviews.json` in the private evidence
directory. It requires a fresh completed scan matching the current live image,
the exact Gathio role, passed release ancestry, source/patch/check receipts,
and every installed native package payload file matching the retained tested
`.deb`. The inherited image deliberately excludes non-runtime documentation
and lintian files. The reviewer verifies the exact candidate/live dpkg exclusion
configuration and those files' absence; runtime files and copyright notices
remain mandatory. It emits seven-day `mitigated` proposals for only the named repaired
PostGIS/GDAL findings. Applying those proposals is a separate operator step;
raw findings, source-sibling attribution and unrelated CVEs remain untouched.
Nine focused policy tests reject unrelated packages/CVEs, removed drivers,
unreviewed dependencies, ABI drift and duplicate/incomplete inventories.

A later upstream image must either contain these upstream repairs or receive
the maintained exact backports and the same consumer tests. Version strings
alone do not prove this. Once upstream supplies the fixes, retire the local
overlay only after a fresh source/package comparison and native regression
run. Do not automatically reapply old patches with fuzz to a new source tree.

The complete released PostGIS source is available at
`/utilibre-source/security-postgis-native-20261012-source.tar.gz` on the shared
source origin. It contains 9,778,384 bytes, SHA-256
`fc24488b9266f72278671626e3dab10da5113a327e427905e1c1ba0b004c75ba`.
`publish-source.mjs postgis` produced this additive offer; the separate `gdal`
mode refuses publication until that native release passes. No private receipts,
credentials or database contents are included.
