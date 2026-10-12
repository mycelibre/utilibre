# Gathio's database dependency repair — 11 October 2026

Target image: `utilibre-gathio-documentdb:17.11-0.107.0-aom-security-20261011`,
`sha256:4e0932f601d929d237445f5699b9f7b456bf453b995ada1ed86d238708332d15`.
PostgreSQL **17.11**, DocumentDB **0.107.0**, application bytes, permissions,
network boundaries and data format are unchanged. This layers signed Debian
`libaom3` **3.14.1-1** onto the separately tested same-version
[SQLite backport](../sqlite-final/README.md).

This layer was deployed and passed its public create/ICS/delete gate. The
current production image then adds the separately verified
[XML backport](../xml-final/README.md), preserving this AOM/SQLite repair.
Use that final release receipt and current Compose pin for maintenance; this
document records the intermediate layer's provenance and compatibility tests.

The codec is an indirect PostGIS/GDAL dependency, through installed libavif
and libheif; simply removing it would break that dependency chain. Debian's
[CVE-2023-6879 record](https://security-tracker.debian.org/tracker/CVE-2023-6879)
identifies the multithreaded encoder defect and fixed releases. Signed isolated
APT indexes authenticated the exact binary; SHA-256 is pinned in the Dockerfile.
The required libc version is compatible with the existing runtime. No host APT
source was changed and no distribution upgrade was performed.

## Compatibility evidence, including its boundary

This is **not a universal drop-in replacement** for every old AOM program.
Nineteen helper exports were removed upstream; the old diagnostic `aom-tools`
CLI uses some of them. That CLI is absent from production. The first strict
all-symbols comparison rejected the candidate, prompting actual-consumer
verification, not suppression of the failed check.

The final gate inventories ELF `DT_NEEDED` consumers across installed library
and executable locations and requires exactly the existing libavif/libheif
pair. It checks their removed-symbol references and all relocations, as well
as GDAL's. Both old native application interfaces work with the new library:
AVIF encode/decode preserves the fictional YUV pixels exactly, while HEIF
encode/decode produces a readable PNG (not asserted pixel-identical).
PostGIS/GDAL initialization and a native point query pass. A fictional BSON
record passes permission denial and dump/restore. The full application-file
hash and native image configuration are unchanged.

These are small bounded compatibility checks, not every GDAL format, external
input or concurrency benchmark. A future additional codec consumer requires
its own review. No broad ABI guarantee or unrelated vulnerability waiver is
implied.

## Release and rollback

Private evidence is in
`/var/lib/utilibre-maintenance/aom-final-20261011/`: `checks.json` and
`release.json`. The latter is the authority for whether deployment passed.
A fresh consistent Gathio backup was made using its existing backup script;
the final candidate reopened that backup in an isolated network-none stack.
Two new fictional events, an image, editing, ICS import/export and token
denial passed there; no existing record was enumerated or modified.

`release.mjs prepare` binds those receipts to the exact image and normalized
Compose settings. After changing only the PostgreSQL image pin, `apply`
recreates that service, verifies native health and package versions, then
checks a newly generated public event/ICS/deletion flow. Failure restores
the exact prior same-engine image and verifies its health; it never restores
or deletes live data automatically.

The previous pin is
`utilibre-gathio-documentdb:17.11-0.107.0-gosu-security-20261011-p2`.
For emergency rollback, restore only that pin and recreate `postgres` with
the established Compose file and `--no-deps --no-build --pull never`, then
repeat the native check. Previous dependency vulnerabilities return; use only
when necessary for recovery. Preserve the existing data and backup.

Reproduction: obtain the checksum-pinned signed Debian `.deb`, verify base
image `sha256:6d370f60be2c84f5ea6c44fb2e475da18f4f97af6bdc6c234aa2a0cdfd8b04ef`,
build the checked-in Dockerfile with `--network=none`, and run `check.mjs`.
The old signed AVIF/HEIF CLI packages used by that test are fixtures only;
none were added to the production image.
